/**
 * Email-OTP login codes, plus the manual approval gate in front of them.
 *
 * Sign-up is open: any email may register, which creates an unapproved `User`
 * row. Nothing is emailed and nothing can be signed into until that row is
 * approved by hand in the database (`isApproved = true`). Once approved, the
 * person is a separate tenant with their own Instagram account and flows.
 *
 * `ALLOWED_LOGIN_EMAIL` is now only a bootstrap: that one address is approved
 * automatically so the owner can never lock themselves out of a fresh database.
 *
 * A 6-digit code is generated, hashed (HMAC-SHA256 with `NEXTAUTH_SECRET`) and
 * stored — the plaintext only ever exists long enough to be emailed. Codes
 * expire in 10 minutes, are capped at a handful per hour per email, and each
 * code tolerates only a few wrong guesses before it is discarded, so the
 * six-digit space can't be brute-forced within a code's short life.
 */

import crypto from "crypto";
import { db } from "./db";

const CODE_TTL_MS = 10 * 60 * 1000; // codes are valid for 10 minutes
const MAX_CODES_PER_HOUR = 5; // stops the inbox being flooded with codes
const MAX_ATTEMPTS = 5; // wrong guesses tolerated before a code is binned

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Where an email stands with the approval gate. */
export type AccessStatus = "approved" | "pending";

/**
 * The bootstrap owner address. It is auto-approved on sight so a fresh
 * deployment always has one account that can get in. Everyone else waits.
 */
export function isBootstrapEmail(email: string): boolean {
  const allowed = process.env.ALLOWED_LOGIN_EMAIL;
  if (!allowed) return false;
  return normalizeEmail(email) === normalizeEmail(allowed);
}

/**
 * Register the email if it's new, and report whether it may sign in.
 *
 * A brand-new address gets an unapproved `User` row — that *is* the sign-up.
 * Nothing is emailed to it and nothing is exposed; it simply waits for a human
 * to approve it in the database.
 */
export async function registerOrGetAccess(email: string): Promise<AccessStatus> {
  const e = normalizeEmail(email);
  const bootstrap = isBootstrapEmail(e);

  const existing = await db.user.findUnique({
    where: { email: e },
    select: { isApproved: true },
  });

  if (!existing) {
    await db.user.create({
      data: {
        email: e,
        name: "AutoFlow",
        isApproved: bootstrap,
        approvedAt: bootstrap ? new Date() : null,
      },
    });
    return bootstrap ? "approved" : "pending";
  }

  // A pre-existing bootstrap row — one created before this gate existed, or
  // before the env var was set — is brought up to approved on sight. Already
  // approved rows are left alone so `approvedAt` records the real moment.
  if (!existing.isApproved && bootstrap) {
    await db.user.update({
      where: { email: e },
      data: { isApproved: true, approvedAt: new Date() },
    });
    return "approved";
  }

  return existing.isApproved ? "approved" : "pending";
}

/**
 * Read-only approval check, used again at sign-in so a code issued moments
 * before an account was revoked still can't be redeemed.
 */
export async function isApprovedEmail(email: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: { isApproved: true },
  });
  return user?.isApproved === true;
}

function hashCode(code: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? "dev-secret";
  return crypto.createHmac("sha256", secret).update(code).digest("hex");
}

function generateCode(): string {
  // Cryptographically random 6-digit code, zero-padded so every value is 6 chars.
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * Issue a new login code for an allow-listed email.
 * Returns the plaintext code to email, or null if the per-hour cap is hit.
 */
export async function createLoginCode(email: string): Promise<string | null> {
  const e = normalizeEmail(email);

  // Drop anything already expired so counts below only see live codes.
  await db.loginCode.deleteMany({ where: { email: e, expiresAt: { lt: new Date() } } });

  const recent = await db.loginCode.count({
    where: { email: e, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= MAX_CODES_PER_HOUR) return null;

  const code = generateCode();
  await db.loginCode.create({
    data: {
      email: e,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  return code;
}

/**
 * Verify a submitted code against the newest live code for the email.
 * On success every code for the email is consumed and `true` is returned.
 * A wrong guess increments the attempt counter; once it's exhausted the code
 * is discarded, so a fresh one must be requested.
 */
export async function verifyLoginCode(email: string, code: string): Promise<boolean> {
  const e = normalizeEmail(email);

  const record = await db.loginCode.findFirst({
    where: { email: e, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return false;

  if (record.attempts >= MAX_ATTEMPTS) {
    await db.loginCode.delete({ where: { id: record.id } });
    return false;
  }

  // Both sides are 64-char hex (32 bytes), so lengths always match.
  const matches = crypto.timingSafeEqual(
    Buffer.from(record.codeHash, "hex"),
    Buffer.from(hashCode(code), "hex")
  );

  if (!matches) {
    await db.loginCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  await db.loginCode.deleteMany({ where: { email: e } });
  return true;
}
