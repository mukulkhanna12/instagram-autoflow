import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { setWorkspaceCookie } from "@/lib/workspace-cookie";

/** Every workspace you belong to, and which one you're in. */
export async function GET() {
  const { ctx, error } = await requireWorkspace();
  if (error) return error;
  return NextResponse.json({
    current: { id: ctx.workspace.id, name: ctx.workspace.name, role: ctx.role },
    workspaces: ctx.workspaces,
  });
}

const createSchema = z.object({ name: z.string().trim().min(1).max(60) });

/** A new, empty workspace with you as owner — and switch into it. */
export async function POST(req: NextRequest) {
  const { ctx, error } = await requireWorkspace();
  if (error) return error;

  const body = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Give the workspace a name (60 characters max)" }, { status: 400 });

  const owned = await db.workspace.count({ where: { ownerId: ctx.userId } });
  if (owned >= 10) return NextResponse.json({ error: "You can own up to 10 workspaces" }, { status: 429 });

  const workspace = await db.workspace.create({
    data: {
      name: body.data.name,
      ownerId: ctx.userId,
      members: { create: { userId: ctx.userId, role: "owner" } },
    },
    select: { id: true, name: true },
  });
  return setWorkspaceCookie(NextResponse.json({ workspace }), workspace.id);
}
