import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canRemove, isRole } from "@/lib/roles";
import { personalWorkspaceId, requireWorkspace } from "@/lib/workspace";
import { setWorkspaceCookie } from "@/lib/workspace-cookie";

/**
 * Remove someone from the current workspace — or, with your own id, leave it.
 * A soft delete: the membership is flagged, and a new invite revives it.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const { ctx, error } = await requireWorkspace();
  if (error) return error;

  const target = await db.membership.findFirst({ where: { workspaceId: ctx.workspace.id, userId } });
  if (!target || !isRole(target.role)) return NextResponse.json({ error: "Not a member" }, { status: 404 });

  const leaving = userId === ctx.userId;
  if (leaving && target.role === "owner") {
    return NextResponse.json({ error: "The owner can't leave their own workspace" }, { status: 400 });
  }
  // Everyone needs somewhere to land: you can't leave your last workspace.
  if (leaving && ctx.workspaces.length <= 1) {
    return NextResponse.json(
      { error: "This is your only workspace. Create one of your own first, then you can leave.", reason: "last_workspace" },
      { status: 400 }
    );
  }
  if (!leaving && !canRemove(ctx.role, target.role)) {
    return NextResponse.json({ error: "Only the owner can remove people" }, { status: 403 });
  }

  await db.membership.update({ where: { id: target.id }, data: { isDeleted: true, deletedAt: new Date() } });

  const res = NextResponse.json({ ok: true });
  // Leaving drops you back into your own workspace.
  return leaving ? setWorkspaceCookie(res, personalWorkspaceId(ctx.userId)) : res;
}
