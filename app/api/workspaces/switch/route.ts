import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspace } from "@/lib/workspace";
import { setWorkspaceCookie } from "@/lib/workspace-cookie";

const schema = z.object({ workspaceId: z.string().min(1) });

/** Switch to another workspace you belong to. */
export async function POST(req: NextRequest) {
  const { ctx, error } = await requireWorkspace();
  if (error) return error;

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success || !ctx.workspaces.some((w) => w.id === body.data.workspaceId)) {
    return NextResponse.json({ error: "Not a workspace you belong to" }, { status: 404 });
  }
  return setWorkspaceCookie(NextResponse.json({ ok: true }), body.data.workspaceId);
}
