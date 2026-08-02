import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAllowedEmail, createLoginCode } from "@/lib/otp";
import { sendEmail, otpEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

/**
 * Request a login code. Emails a one-time code only if the address is the
 * allow-listed one — but always responds the same way so an outsider can't use
 * this endpoint to discover which email is allowed.
 */
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const { email } = parsed.data;

  // Not the allow-listed address: pretend success, send nothing.
  if (!isAllowedEmail(email)) {
    return NextResponse.json({ ok: true });
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

  return NextResponse.json({ ok: true, ...(showCode ? { devCode: code } : {}) });
}
