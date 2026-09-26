import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { acceptInvite } from "@/lib/invites";
import { setWorkspaceCookie } from "@/lib/workspace-cookie";

const schema = z.union([z.object({ token: z.string().min(10).max(200) }), z.object({ id: z.string().min(1) })]);

const MESSAGES = {
  not_found: "This invite doesn't exist.",
  wrong_email: "This invite was sent to a different email address.",
  expired: "This invite has expired — ask for a new one.",
  revoked: "This invite was cancelled — ask for a new one.",
  accepted: "This invite has already been used.",
} as const;

/** Join a workspace from its invite link (token) or the in-app banner (id), and switch to it. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true } });
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const result = await acceptInvite(body.data, user);
  if (!result.ok) return NextResponse.json({ error: MESSAGES[result.reason], reason: result.reason }, { status: 400 });

  return setWorkspaceCookie(NextResponse.json({ ok: true }), result.workspaceId);
}
