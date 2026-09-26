import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";

const schema = z.object({ name: z.string().trim().min(1).max(60) });

/** Rename the current workspace. Owner only. */
export async function PATCH(req: NextRequest) {
  const { ctx, error } = await requireWorkspace("owner");
  if (error) return error;

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Name must be 1–60 characters" }, { status: 400 });

  const workspace = await db.workspace.update({
    where: { id: ctx.workspace.id },
    data: { name: body.data.name },
    select: { id: true, name: true },
  });
  return NextResponse.json({ workspace });
}
