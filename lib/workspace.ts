/**
 * The current workspace — who you are, which workspace you're working in, your
 * role there, and its Instagram account.
 *
 * Every route that used to find "my Instagram account" by user id now goes
 * through here, so access is decided in one place: a person reaches an account
 * only through a live membership of the workspace that owns it.
 *
 * Moving existing users over needs no migration script. The first time someone
 * without a workspace signs in, they get a personal one (as owner) and any
 * Instagram account they connected before workspaces existed moves into it.
 */
import { cache } from "react";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { InstagramAccount } from "@prisma/client";
import { auth } from "./auth";
import { db, dbUnfiltered } from "./db";
import { atLeast, isRole, type Role } from "./roles";

/** Remembers which workspace you last switched to. Validated on every read. */
export const WORKSPACE_COOKIE = "af_ws";

export interface WorkspaceSummary {
  id: string;
  name: string;
  color: string;
  role: Role;
}

export interface WorkspaceContext {
  userId: string;
  email: string;
  workspace: { id: string; name: string; ownerId: string; color: string; personal: boolean };
  role: Role;
  /** The workspace's live Instagram account, if one is connected. */
  igAccount: InstagramAccount | null;
  /** Every workspace you belong to, for the switcher. */
  workspaces: WorkspaceSummary[];
}

/** A personal workspace's id is derived from its owner, so creating it is idempotent. */
export const personalWorkspaceId = (userId: string) => `ws_${userId}`;

/**
 * Give a user their personal workspace if they have none, and move any
 * Instagram account from before workspaces into it. Safe to call repeatedly
 * and concurrently: the upserts can't create a second workspace or membership.
 */
export async function ensurePersonalWorkspace(user: { id: string; name: string | null; email: string }) {
  const [memberships, orphans] = await Promise.all([
    db.membership.count({ where: { userId: user.id } }),
    dbUnfiltered.instagramAccount.count({ where: { userId: user.id, workspaceId: null } }),
  ]);
  if (memberships > 0 && orphans === 0) return;

  const id = personalWorkspaceId(user.id);
  const first = user.name && user.name !== "AutoFlow" ? user.name.split(/\s+/)[0] : user.email.split("@")[0];
  await dbUnfiltered.workspace.upsert({
    where: { id },
    create: { id, name: `${first}'s workspace`, ownerId: user.id },
    update: {},
  });
  await dbUnfiltered.membership.upsert({
    where: { workspaceId_userId: { workspaceId: id, userId: user.id } },
    create: { workspaceId: id, userId: user.id, role: "owner" },
    update: {},
  });
  if (orphans > 0) {
    // Include disconnected rows too, so reconnecting later still finds them here.
    await dbUnfiltered.instagramAccount.updateMany({
      where: { userId: user.id, workspaceId: null },
      data: { workspaceId: id },
    });
  }
}

/** Cached per request: layouts and routes can all ask without repeating the queries. */
export const getWorkspaceContext = cache(async (): Promise<WorkspaceContext | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } });
  if (!user) return null;

  await ensurePersonalWorkspace(user);

  const memberships = await db.membership.findMany({
    where: { userId },
    include: { workspace: { select: { id: true, name: true, ownerId: true, color: true } } },
    orderBy: { createdAt: "asc" },
  });
  const valid = memberships.filter((m) => isRole(m.role));
  if (valid.length === 0) return null;

  const wanted = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  const active =
    valid.find((m) => m.workspaceId === wanted) ??
    valid.find((m) => m.workspaceId === personalWorkspaceId(userId)) ??
    valid[0];

  const igAccount = await db.instagramAccount.findFirst({
    where: { workspaceId: active.workspaceId },
    orderBy: { updatedAt: "desc" },
  });

  return {
    userId,
    email: user.email,
    workspace: { ...active.workspace, personal: active.workspaceId === personalWorkspaceId(userId) },
    role: active.role as Role,
    igAccount,
    workspaces: valid.map((m) => ({ id: m.workspace.id, name: m.workspace.name, color: m.workspace.color, role: m.role as Role })),
  };
});

/**
 * For API routes: the context, or the response to return instead —
 * 401 when signed out, 403 when the role falls short.
 */
export async function requireWorkspace(
  min: Role = "member"
): Promise<{ ctx: WorkspaceContext; error?: never } | { ctx?: never; error: NextResponse }> {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!atLeast(ctx.role, min)) {
    return { error: NextResponse.json({ error: "Only the workspace owner can do that" }, { status: 403 }) };
  }
  return { ctx };
}
