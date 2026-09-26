import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createInvite } from "@/lib/invites";
import { requireWorkspace } from "@/lib/workspace";

const schema = z.object({ email: z.string().trim().email().max(254) });

/** Invite someone by email. Owner only. Returns the link too, to share by hand. */
export async function POST(req: NextRequest) {
  const { ctx, error } = await requireWorkspace("owner");
  if (error) return error;

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  if (body.data.email.toLowerCase() === ctx.email.toLowerCase()) {
    return NextResponse.json({ error: "That's you — you're already here" }, { status: 400 });
  }

  const me = await db.user.findUnique({ where: { id: ctx.userId }, select: { id: true, name: true, email: true } });
  const result = await createInvite({ workspace: ctx.workspace, email: body.data.email, invitedBy: me! });

  if (!result.ok) {
    const msg = result.reason === "already_member" ? "They're already in this workspace" : "Too many invites today — try again tomorrow";
    return NextResponse.json({ error: msg }, { status: result.reason === "limited" ? 429 : 409 });
  }
  return NextResponse.json({ url: result.url, emailed: result.emailed });
}
