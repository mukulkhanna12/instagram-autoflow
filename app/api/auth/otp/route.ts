import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { registerOrGetAccess, createLoginCode, resendWaitSeconds, RESEND_COOLDOWN_SEC } from "@/lib/otp";
import { LIMITS, clientIp, rateLimit } from "@/lib/rate-limit";
import { sendEmail, otpEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email().max(254),
  // Honeypot: hidden from people, so only a bot fills it in.
  website: z.string().optional(),
});

/**
 * Request a login code.
 *
 * Sign-up is open, so an unknown address is registered here rather than
 * rejected — but registering does not let anyone in. Only an approved account
 * is emailed a code; an unapproved one gets `status: "pending"` back and the
 * login page tells them to come back once they've been approved.
 */
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const { email, website } = parsed.data;

  // A filled honeypot is a bot. Answer like a normal pending sign-up so it
  // learns nothing — and do nothing at all.
  if (website) return NextResponse.json({ ok: true, status: "pending" });

  // Per-device limit, so one bot can't burn through sign-ups or codes.
  const limited = await rateLimit(LIMITS.otpRequest, clientIp(req.headers));
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many attempts from this device. Try again in ${Math.ceil(limited.retryAfterSec / 60)} min.` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  // Registers the address on first sight. Anyone may sign up; only an approved
  // account is sent a code, so nothing is emailed while they're pending.
  const access = await registerOrGetAccess(email);
  if (access === "limited") {
    return NextResponse.json(
      { error: "Sign-ups are busy right now. Please try again in an hour." },
      { status: 429 }
    );
  }
  if (access === "pending") {
    return NextResponse.json({ ok: true, status: "pending" });
  }

  // One code a minute per address. A request inside that minute doesn't send
  // another — the last code still works — it just says how long to wait.
  const wait = await resendWaitSeconds(email);
  if (wait > 0) {
    return NextResponse.json({ ok: true, status: "approved", resendIn: wait, reused: true });
  }

  const code = await createLoginCode(email);
  if (!code) {
    return NextResponse.json(
      { error: "Too many codes requested. Please wait a while and try again." },
      { status: 429 }
    );
  }

  try {
    const { subject, html, text } = otpEmail(code);
    await sendEmail({ to: email, subject, html, text });
  } catch (err) {
    console.error("Failed to send OTP email:", err);
    return NextResponse.json(
      { error: "Couldn't send the code right now. Please try again." },
      { status: 502 }
    );
  }

  // DEMO ONLY: surface the code in the response so a demo without an email
  // provider can still log in. Double-gated — impossible in production, and off
  // unless DEMO_SHOW_OTP=1 is set. Never enable this on a real deployment.
  const showCode =
    process.env.NODE_ENV !== "production" && process.env.DEMO_SHOW_OTP === "1";

  return NextResponse.json({
    ok: true,
    status: "approved",
    resendIn: RESEND_COOLDOWN_SEC,
    ...(showCode ? { devCode: code } : {}),
  });
}
