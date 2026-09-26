import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";

const schema = z.object({ fromWorkspaceId: z.string().min(1) });

/**
 * Move the Instagram account from another workspace you own into the current
 * one — e.g. while setting up a new workspace. Its automations, prepared flows
 * and history move with it (they belong to the account). Owner of both only,
 * and the current workspace mustn't already have an account.
 */
export async function POST(req: NextRequest) {
  const { ctx, error } = await requireWorkspace("owner");
  if (error) return error;

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const from = ctx.workspaces.find((w) => w.id === body.data.fromWorkspaceId);
  if (!from || from.role !== "owner" || from.id === ctx.workspace.id) {
    return NextResponse.json({ error: "You can only move an account from a workspace you own" }, { status: 403 });
  }
  if (ctx.igAccount) {
    return NextResponse.json({ error: "This workspace already has an Instagram account" }, { status: 409 });
  }

  const { count } = await db.instagramAccount.updateMany({
    where: { workspaceId: from.id, isDeleted: false },
    data: { workspaceId: ctx.workspace.id },
  });
  if (count === 0) return NextResponse.json({ error: "That workspace has no Instagram account" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
