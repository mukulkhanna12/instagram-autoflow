import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, dbUnfiltered } from "@/lib/db";
import { isWorkspaceColor } from "@/lib/workspace-colors";
import { personalWorkspaceId, requireWorkspace } from "@/lib/workspace";
import { setWorkspaceCookie } from "@/lib/workspace-cookie";

/** The current workspace's settings, for Settings → General. */
export async function GET() {
  const { ctx, error } = await requireWorkspace();
  if (error) return error;
  return NextResponse.json({
    workspace: { ...ctx.workspace },
    role: ctx.role,
    instagram: ctx.igAccount ? { username: ctx.igAccount.username } : null,
  });
}

const patchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  color: z.string().refine(isWorkspaceColor).optional(),
});

/** Rename or recolour the current workspace. Owner only. */
export async function PATCH(req: NextRequest) {
  const { ctx, error } = await requireWorkspace("owner");
  if (error) return error;

  const body = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Name must be 1–60 characters" }, { status: 400 });

  const workspace = await db.workspace.update({
    where: { id: ctx.workspace.id },
    data: body.data,
    select: { id: true, name: true, color: true },
  });
  return NextResponse.json({ workspace });
}

const deleteSchema = z.object({ confirmName: z.string() });

/**
 * Delete the current workspace. Owner only, and never your personal one.
 *
 * A soft delete like everything else: the workspace is flagged, which hides it
 * and every membership. Its Instagram account is disconnected in the same step
 * so no automation keeps replying to comments for a workspace nobody can see.
 */
export async function DELETE(req: NextRequest) {
  const { ctx, error } = await requireWorkspace("owner");
  if (error) return error;
  if (ctx.workspace.personal) {
    return NextResponse.json({ error: "Your own workspace can't be deleted" }, { status: 400 });
  }

  const body = deleteSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success || body.data.confirmName.trim() !== ctx.workspace.name) {
    return NextResponse.json({ error: "Type the workspace name exactly to confirm" }, { status: 400 });
  }

  const now = new Date();
  await dbUnfiltered.$transaction([
    dbUnfiltered.instagramAccount.updateMany({
      where: { workspaceId: ctx.workspace.id, isDeleted: false },
      data: { isDeleted: true, deletedAt: now },
    }),
    dbUnfiltered.invite.updateMany({
      where: { workspaceId: ctx.workspace.id, acceptedAt: null, revokedAt: null },
      data: { revokedAt: now },
    }),
    dbUnfiltered.workspace.update({ where: { id: ctx.workspace.id }, data: { isDeleted: true, deletedAt: now } }),
  ]);

  return setWorkspaceCookie(NextResponse.json({ ok: true }), personalWorkspaceId(ctx.userId));
}
