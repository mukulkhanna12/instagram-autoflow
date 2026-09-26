/**
 * Workspace invitations.
 *
 * An invite is for one email address and carries a random token in its link.
 * Only the token's SHA-256 is stored, so the database alone can't be used to
 * join a workspace. Links are single-use and expire after 7 days; sending a new
 * invite to the same address retires the old link. Nothing is deleted:
 * revoking stamps revokedAt, accepting stamps acceptedAt.
 *
 * Accepting an invite also approves the account — an invite from a workspace
 * owner stands in for the manual approval new sign-ups otherwise wait for.
 */
import crypto from "crypto";
import { db, dbUnfiltered } from "./db";
import { normalizeEmail } from "./otp";
import { sendEmail } from "./email";

/** How long an invite link stays valid — the same 7 days for everyone. */
export const INVITE_EXPIRY_HOURS = [24, 72, 168] as const;
export type InviteExpiryHours = (typeof INVITE_EXPIRY_HOURS)[number];
export const DEFAULT_EXPIRY_HOURS: InviteExpiryHours = 168;
export const INVITE_TTL_MS = DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000;

export function isInviteExpiryHours(v: unknown): v is InviteExpiryHours {
  return typeof v === "number" && (INVITE_EXPIRY_HOURS as readonly number[]).includes(v);
}

/** "in 24 hours", "in 3 days", "in 7 days". */
export function expiryLabel(hours: number): string {
  return hours < 48 ? `in ${hours} hours` : `in ${Math.round(hours / 24)} days`;
}

/**
 * The expiry as a date and time in the inviter's timezone (sent by their
 * browser), for the email — e.g. "Sat, 4 Oct, 3:06 AM (Asia/Kolkata)".
 * Falls back to UTC when the zone is missing or unknown.
 */
export function formatExpiry(at: Date, timeZone?: string): string {
  const fmt = (tz: string) =>
    new Intl.DateTimeFormat("en-GB", {
      weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz,
    }).format(at);
  try {
    if (timeZone) return `${fmt(timeZone)} (${timeZone})`;
  } catch {
    // Unknown zone — fall through to UTC.
  }
  return `${fmt("UTC")} (UTC)`;
}
export const MAX_INVITES_PER_DAY = 20;

export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

export function hashInviteToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function newInviteToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** Where an invite stands. Accepted and revoked win over expiry. */
export function inviteStatus(
  inv: { acceptedAt: Date | null; revokedAt: Date | null; expiresAt: Date },
  now = new Date()
): InviteStatus {
  if (inv.acceptedAt) return "accepted";
  if (inv.revokedAt) return "revoked";
  if (inv.expiresAt <= now) return "expired";
  return "pending";
}

export function inviteUrl(token: string): string {
  const base = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/+$/, "")}/invite/${token}`;
}

const livePending = (now = new Date()) => ({ acceptedAt: null, revokedAt: null, expiresAt: { gt: now } });

export type CreateInviteResult =
  | { ok: true; url: string; emailed: boolean; expiresAt: string }
  | { ok: false; reason: "already_member" | "limited" };

export async function createInvite(opts: {
  workspace: { id: string; name: string };
  email: string;
  invitedBy: { id: string; name: string | null; email: string };
  expiryHours?: InviteExpiryHours;
  /** The inviter's IANA timezone, so the email shows the expiry in their local time. */
  timeZone?: string;
}): Promise<CreateInviteResult> {
  const hours = opts.expiryHours ?? DEFAULT_EXPIRY_HOURS;
  const email = normalizeEmail(opts.email);

  const already = await db.membership.findFirst({
    where: { workspaceId: opts.workspace.id, user: { email } },
    select: { id: true },
  });
  if (already) return { ok: false, reason: "already_member" };

  const today = await db.invite.count({
    where: { workspaceId: opts.workspace.id, createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  if (today >= MAX_INVITES_PER_DAY) return { ok: false, reason: "limited" };

  const token = newInviteToken();
  await db.$transaction([
    // Only the newest link for an address works.
    db.invite.updateMany({
      where: { workspaceId: opts.workspace.id, email, ...livePending() },
      data: { revokedAt: new Date() },
    }),
    db.invite.create({
      data: {
        workspaceId: opts.workspace.id,
        email,
        role: "member",
        tokenHash: hashInviteToken(token),
        invitedById: opts.invitedBy.id,
        expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
      },
    }),
  ]);

  const url = inviteUrl(token);
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  let emailed = true;
  try {
    await sendInviteEmail({
      to: email, url, workspaceName: opts.workspace.name, inviter: opts.invitedBy,
      expires: `${formatExpiry(expiresAt, opts.timeZone)} · ${expiryLabel(hours)}`,
    });
  } catch (err) {
    // The link is still valid and shown to the owner to share by hand.
    console.error("Invite email failed:", err);
    emailed = false;
  }
  return { ok: true, url, emailed, expiresAt: expiresAt.toISOString() };
}

export interface InviteEmailInput {
  to: string;
  url: string;
  workspaceName: string;
  inviter: { name: string | null; email: string };
  /** Already formatted, e.g. "Sat, 4 Oct, 3:06 AM (Asia/Kolkata) · in 7 days". */
  expires: string;
}

async function sendInviteEmail(opts: InviteEmailInput) {
  await sendEmail(renderInviteEmail(opts));
}

/** The invite email's subject, HTML and plain-text versions. Pure, for tests and previews. */
export function renderInviteEmail(opts: InviteEmailInput): { to: string; subject: string; html: string; text: string } {
  return buildInviteEmail(opts);
}

function buildInviteEmail(opts: {
  to: string;
  url: string;
  workspaceName: string;
  inviter: { name: string | null; email: string };
  /** Already formatted, e.g. "Sat, 4 Oct, 3:06 AM (Asia/Kolkata) · in 7 days". */
  expires: string;
}) {
  const who = opts.inviter.name && opts.inviter.name !== "AutoFlow" ? opts.inviter.name : opts.inviter.email;
  const ws = escapeHtml(opts.workspaceName);
  const initial = escapeHtml((opts.workspaceName.trim()[0] ?? "W").toUpperCase());
  const subject = `${who} invited you to join ${opts.workspaceName} on AutoFlow`;
  const text = [
    `${who} invited you to join "${opts.workspaceName}" on AutoFlow.`,
    ``,
    `You'll be able to build and run its Instagram automations together — replies, DMs and follow-gated links.`,
    ``,
    `Join the workspace: ${opts.url}`,
    ``,
    `This link works once and expires ${opts.expires}.`,
    `If you weren't expecting this invite, you can ignore this email.`,
  ].join("\n");
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f3f4f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f1;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
        <tr><td style="padding:0 4px 18px">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="width:32px;height:32px;border-radius:9px;background:#dcfb4b;text-align:center;vertical-align:middle;font-size:18px;font-weight:800;color:#123522">&#9889;</td>
            <td style="padding-left:10px;font-size:17px;font-weight:800;color:#0b2316">AutoFlow</td>
          </tr></table>
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:24px;padding:36px 32px">
          <p style="margin:0;font-size:15px;color:#4b5563"><strong style="color:#111827">${escapeHtml(who)}</strong> invited you to join</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:14px 0 18px"><tr>
            <td style="width:48px;height:48px;border-radius:14px;background:#123522;color:#dcfb4b;text-align:center;vertical-align:middle;font-size:22px;font-weight:800">${initial}</td>
            <td style="padding-left:14px;font-size:24px;font-weight:800;color:#0b2316">${ws}</td>
          </tr></table>
          <p style="margin:0 0 26px;font-size:15px;line-height:1.6;color:#4b5563">
            You&#39;ll build and run its Instagram automations together — comment replies, DMs and follow-gated links.
            No setup needed: open the link, agree, and you&#39;re in.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:#dcfb4b">
            <a href="${opts.url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:800;color:#111827;text-decoration:none">Join ${ws} &rarr;</a>
          </td></tr></table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;background:#f7f8f5;border-radius:14px">
            <tr><td style="padding:14px 16px;font-size:13px;color:#4b5563">
              &#9203; <strong style="color:#111827">Expires ${escapeHtml(opts.expires)}</strong><br>
              <span style="color:#6b7280">This link works once, only for ${escapeHtml(opts.to)}.</span>
            </td></tr>
          </table>
          <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#9ca3af">
            Button not working? Paste this into your browser:<br>
            <a href="${opts.url}" style="color:#1d5535;word-break:break-all">${opts.url}</a>
          </p>
        </td></tr>
        <tr><td style="padding:18px 8px 0;font-size:12px;line-height:1.6;color:#9ca3af;text-align:center">
          If you weren&#39;t expecting this invite, you can ignore this email — nothing happens unless you click.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  return { to: opts.to, subject, html, text };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** An invite as the public invite page sees it. */
export async function findInviteByToken(token: string) {
  if (!token || token.length > 200) return null;
  const inv = await db.invite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: {
      workspace: { select: { id: true, name: true, isDeleted: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  });
  if (!inv || inv.workspace.isDeleted) return null;
  return { ...inv, status: inviteStatus(inv) };
}

/** Is there a live invite for this address? Lets the sign-in gate approve it. */
export async function hasPendingInvite(email: string): Promise<boolean> {
  const n = await db.invite.count({ where: { email: normalizeEmail(email), ...livePending() } });
  return n > 0;
}

/** Live invites for a signed-in user, for the banner on every page. */
export async function pendingInvitesFor(email: string) {
  const invites = await db.invite.findMany({
    where: { email: normalizeEmail(email), ...livePending(), workspace: { isDeleted: false } },
    include: {
      workspace: { select: { name: true } },
      invitedBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return invites.map((i) => ({
    id: i.id,
    workspaceName: i.workspace.name,
    invitedBy: i.invitedBy.name && i.invitedBy.name !== "AutoFlow" ? i.invitedBy.name : i.invitedBy.email,
  }));
}

export type AcceptResult =
  | { ok: true; workspaceId: string }
  | { ok: false; reason: "not_found" | "wrong_email" | "expired" | "revoked" | "accepted" };

/**
 * Join the workspace. The invite must be live and addressed to this user's
 * email. Re-joining after being removed revives the old membership.
 */
export async function acceptInvite(
  where: { token: string } | { id: string },
  user: { id: string; email: string }
): Promise<AcceptResult> {
  const inv = "token" in where
    ? await db.invite.findUnique({ where: { tokenHash: hashInviteToken(where.token) } })
    : await db.invite.findUnique({ where: { id: where.id } });
  if (!inv) return { ok: false, reason: "not_found" };

  const status = inviteStatus(inv);
  if (status !== "pending") return { ok: false, reason: status };
  if (normalizeEmail(user.email) !== inv.email) return { ok: false, reason: "wrong_email" };

  const now = new Date();
  await dbUnfiltered.$transaction([
    dbUnfiltered.membership.upsert({
      where: { workspaceId_userId: { workspaceId: inv.workspaceId, userId: user.id } },
      create: { workspaceId: inv.workspaceId, userId: user.id, role: inv.role },
      // Never demote: an owner re-accepting a stray invite stays owner.
      update: { isDeleted: false, deletedAt: null },
    }),
    dbUnfiltered.invite.update({ where: { id: inv.id }, data: { acceptedAt: now, acceptedById: user.id } }),
    dbUnfiltered.user.updateMany({
      where: { id: user.id, isApproved: false },
      data: { isApproved: true, approvedAt: now },
    }),
    // Joining a team replaces the first-run survey: don't send them there later.
    dbUnfiltered.user.updateMany({
      where: { id: user.id, onboardedAt: null },
      data: { onboardedAt: now },
    }),
  ]);
  return { ok: true, workspaceId: inv.workspaceId };
}

export type JoinResult =
  | { ok: true; user: { id: string; email: string; name: string | null }; workspaceId: string }
  | { ok: false; reason: "not_found" | "expired" | "revoked" | "accepted" };

/**
 * Join straight from the invite link, signed out: the link was sent to this
 * address, so opening it and agreeing proves the email. Creates the account if
 * it's new (approved, and counted as onboarded) and accepts the invite. Doesn't
 * sign anyone in — they log in afterwards as usual. Single use.
 */
export async function joinWithInvite(token: string, name?: string): Promise<JoinResult> {
  const inv = await db.invite.findUnique({ where: { tokenHash: hashInviteToken(token) } });
  if (!inv) return { ok: false, reason: "not_found" };
  const status = inviteStatus(inv);
  if (status !== "pending") return { ok: false, reason: status };

  const now = new Date();
  const clean = name?.trim().slice(0, 60) || null;
  const user = await dbUnfiltered.user.upsert({
    where: { email: inv.email },
    create: { email: inv.email, name: clean ?? "AutoFlow", isApproved: true, approvedAt: now, onboardedAt: now },
    update: {},
    select: { id: true, email: true, name: true },
  });
  // A name typed on the join page replaces the placeholder, never a real name.
  if (clean && (!user.name || user.name === "AutoFlow")) {
    await dbUnfiltered.user.update({ where: { id: user.id }, data: { name: clean } });
    user.name = clean;
  }

  const accepted = await acceptInvite({ token }, user);
  if (!accepted.ok) return { ok: false, reason: accepted.reason === "wrong_email" ? "not_found" : accepted.reason };
  return { ok: true, user, workspaceId: accepted.workspaceId };
}
