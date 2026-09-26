/**
 * Rate limiting by IP address for joining from an invite link. Login is never
 * limited per device — people on one shared network look like one device —
 * it relies on the 60-second resend timer, per-code guess limits and a
 * honeypot instead.
 *
 * Fixed windows, stored in the database (serverless instances share nothing in
 * memory). One row per action + IP; when its window has passed the same row is
 * reset rather than a new one written, so nothing ever needs deleting.
 */
import { db } from "./db";

export interface Limit {
  /** Name of the action, e.g. "otp-request". */
  action: string;
  /** Requests allowed per window. */
  max: number;
  windowMs: number;
}

export const LIMITS = {
  inviteJoin: { action: "invite-join", max: 15, windowMs: 10 * 60 * 1000 },
} satisfies Record<string, Limit>;

/** The caller's IP, as reported by the platform's proxy (Vercel sets these). */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Pure window maths, split out for tests. */
export function nextWindow(
  row: { count: number; windowStart: Date } | null,
  limit: Pick<Limit, "max" | "windowMs">,
  now = new Date()
): { count: number; windowStart: Date; allowed: boolean; retryAfterSec: number } {
  const fresh = !row || now.getTime() - row.windowStart.getTime() >= limit.windowMs;
  const windowStart = fresh ? now : row!.windowStart;
  const count = fresh ? 1 : row!.count + 1;
  const allowed = count <= limit.max;
  const retryAfterSec = allowed ? 0 : Math.ceil((windowStart.getTime() + limit.windowMs - now.getTime()) / 1000);
  return { count, windowStart, allowed, retryAfterSec };
}

/**
 * Count one request and say whether it's allowed. Fails open: if the limiter
 * itself errors, the request goes ahead rather than locking everyone out.
 */
export async function rateLimit(limit: Limit, ip: string): Promise<{ ok: boolean; retryAfterSec: number }> {
  const key = `${limit.action}:${ip}`;
  try {
    const row = await db.rateLimit.findUnique({ where: { key } });
    const next = nextWindow(row, limit);
    await db.rateLimit.upsert({
      where: { key },
      create: { key, count: next.count, windowStart: next.windowStart },
      update: { count: next.count, windowStart: next.windowStart },
    });
    return { ok: next.allowed, retryAfterSec: next.retryAfterSec };
  } catch (err) {
    console.error("Rate limiter unavailable:", err);
    return { ok: true, retryAfterSec: 0 };
  }
}
