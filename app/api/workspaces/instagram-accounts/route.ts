import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";

/**
 * Instagram accounts connected in *other* workspaces you own — the ones you
 * could move into the current workspace.
 */
export async function GET() {
  const { ctx, error } = await requireWorkspace();
  if (error) return error;

  const owned = ctx.workspaces.filter((w) => w.role === "owner" && w.id !== ctx.workspace.id);
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
