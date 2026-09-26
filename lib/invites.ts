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

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
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
  | { ok: true; url: string; emailed: boolean }
  | { ok: false; reason: "already_member" | "limited" };

export async function createInvite(opts: {
  workspace: { id: string; name: string };
  email: string;
  invitedBy: { id: string; name: string | null; email: string };
}): Promise<CreateInviteResult> {
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
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    }),
  ]);

  const url = inviteUrl(token);
  let emailed = true;
  try {
    await sendInviteEmail({ to: email, url, workspaceName: opts.workspace.name, inviter: opts.invitedBy });
  } catch (err) {
    // The link is still valid and shown to the owner to share by hand.
    console.error("Invite email failed:", err);
    emailed = false;
  }
  return { ok: true, url, emailed };
}

async function sendInviteEmail(opts: {
  to: string;
  url: string;
  workspaceName: string;
  inviter: { name: string | null; email: string };
}) {
  const who = opts.inviter.name && opts.inviter.name !== "AutoFlow" ? opts.inviter.name : opts.inviter.email;
  const subject = `${who} invited you to ${opts.workspaceName} on AutoFlow`;
  const text =
    `${who} invited you to join "${opts.workspaceName}" on AutoFlow, to help run its Instagram automations.\n\n` +
    `Accept the invite: ${opts.url}\n\nThis link works once and expires in 7 days.`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <p style="font-size:16px;color:#111827;margin:0 0 8px"><strong>${escapeHtml(who)}</strong> invited you to join</p>
      <p style="font-size:22px;font-weight:800;color:#0b2316;margin:0 0 16px">${escapeHtml(opts.workspaceName)}</p>
      <p style="color:#374151;font-size:14px;margin:0 0 24px">on AutoFlow, to help run its Instagram automations.</p>
      <a href="${opts.url}" style="display:inline-block;background:#dcfb4b;color:#111827;font-weight:800;padding:12px 22px;border-radius:999px;text-decoration:none">Accept invite</a>
      <p style="color:#9ca3af;font-size:12px;margin:24px 0 0">This link works once and expires in 7 days. If you weren't expecting it, ignore this email.</p>
    </div>`;
  await sendEmail({ to: opts.to, subject, html, text });
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
  ]);
  return { ok: true, workspaceId: inv.workspaceId };
}
