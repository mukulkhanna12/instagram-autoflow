import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { registerOrGetAccess, createLoginCode } from "@/lib/otp";
import { sendEmail, otpEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

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

  const { email } = parsed.data;

  // Registers the address on first sight. Anyone may sign up; only an approved
  // account is sent a code, so nothing is emailed while they're pending.
  const access = await registerOrGetAccess(email);
  if (access === "pending") {
    return NextResponse.json({ ok: true, status: "pending" });
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

  return NextResponse.json({ ok: true, status: "approved", ...(showCode ? { devCode: code } : {}) });
}
