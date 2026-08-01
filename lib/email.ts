/**
 * Transactional email via Resend's REST API (no SDK dependency — just fetch).
 *
 * If `RESEND_API_KEY` isn't set (e.g. local dev), the message is logged instead
 * of sent, so the login flow still works without an email provider configured.
 */

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  // Resend lets you send to your own account address from onboarding@resend.dev
  // without verifying a domain, which is enough for a single-user login.
  const from = process.env.EMAIL_FROM ?? "AutoFlow <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY not set — not sending. Would send to ${to}: "${subject}"\n${text ?? html}`
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!res.ok) {
    throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
  }
}

/** Build the login-code email. */
export function otpEmail(code: string): { subject: string; html: string; text: string } {
  const subject = `Your AutoFlow login code: ${code}`;
  const text =
    `Your AutoFlow login code is ${code}.\n\n` +
    `It expires in 10 minutes. If you didn't request this, you can ignore this email.`;
  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:420px;margin:0 auto;padding:24px">
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:20px;font-weight:700;color:#111827">AutoFlow</div>
    </div>
    <p style="color:#374151;font-size:14px;margin:0 0 16px">Here's your login code:</p>
    <div style="font-size:34px;font-weight:700;letter-spacing:8px;color:#111827;text-align:center;background:#f3f4f6;border-radius:12px;padding:18px 0;margin-bottom:16px">${code}</div>
    <p style="color:#6b7280;font-size:12px;margin:0">It expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
  </div>`;
  return { subject, html, text };
}
