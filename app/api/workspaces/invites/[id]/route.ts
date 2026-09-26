import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";

/** Cancel an invite that hasn't been accepted. Owner only; the row is kept. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, error } = await requireWorkspace("owner");
  if (error) return error;

  const { count } = await db.invite.updateMany({
    where: { id, workspaceId: ctx.workspace.id, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
