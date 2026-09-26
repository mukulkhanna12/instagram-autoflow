import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";

/**
 * Disconnect the Instagram account — a soft delete.
 *
 * The row stays, flagged, and so does every automation, queued flow and
 * conversation hanging off it. They vanish from the dashboard because the
 * soft-delete extension hides children of a disconnected account, and they all
 * come back the moment the same account is reconnected. Nothing is destroyed.
 */
export async function DELETE() {
  // Pausing every automation at once is the owner's call.
  const { ctx, error } = await requireWorkspace("owner");
  if (error) return error;

  await db.instagramAccount.updateMany({
    where: { workspaceId: ctx.workspace.id, isDeleted: false },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
