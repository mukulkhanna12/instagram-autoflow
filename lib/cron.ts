import type { NextRequest } from "next/server";

/**
 * Vercel Cron calls scheduled routes with `Authorization: Bearer $CRON_SECRET`
 * when `CRON_SECRET` is set. Verify it so these endpoints can't be triggered by
 * anyone who knows the URL. Requires the secret to be configured — no secret,
 * no access.
 */
export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
