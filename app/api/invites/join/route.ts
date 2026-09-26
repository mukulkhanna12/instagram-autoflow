import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { joinWithInvite } from "@/lib/invites";
import { LIMITS, clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({ token: z.string().min(10).max(200) });

const MESSAGES = {
  not_found: "This invite link isn't valid.",
  expired: "This invite has expired — ask for a new one.",
  revoked: "This invite was cancelled — ask for a new one.",
  accepted: "This invite has already been used.",
} as const;

/**
 * Join a workspace from its invite link, signed out. The link was emailed to
 * the invited address, so opening it and agreeing is enough to join; the
 * account is created (approved) if it's new. This does not sign anyone in —
 * they log in afterwards as usual. Limited per device.
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(LIMITS.inviteJoin, clientIp(req.headers));
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many attempts from this device. Try again shortly." }, { status: 429 });
  }

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: MESSAGES.not_found }, { status: 400 });

  const joined = await joinWithInvite(body.data.token);
  if (!joined.ok) return NextResponse.json({ error: MESSAGES[joined.reason], reason: joined.reason }, { status: 400 });
  return NextResponse.json({ ok: true, email: joined.user.email });
}
