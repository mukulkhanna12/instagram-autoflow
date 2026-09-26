import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";

/**
 * Instagram accounts connected in workspaces you own — the ones you could move
 * into a workspace. Excludes the current workspace unless ?all=1 (the New
 * workspace dialog asks before the new one exists, so "current" is a source).
 */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireWorkspace();
  if (error) return error;

  const all = req.nextUrl.searchParams.get("all") === "1";
  const owned = ctx.workspaces.filter((w) => w.role === "owner" && (all || w.id !== ctx.workspace.id));
  const accounts = owned.length
    ? await db.instagramAccount.findMany({
        where: { workspaceId: { in: owned.map((w) => w.id) } },
        select: { username: true, profilePicUrl: true, workspaceId: true },
      })
    : [];

  return NextResponse.json({
    accounts: accounts.map((a) => ({
      username: a.username,
      profilePicUrl: a.profilePicUrl,
      workspaceId: a.workspaceId,
      workspaceName: owned.find((w) => w.id === a.workspaceId)?.name ?? "",
    })),
  });
}
