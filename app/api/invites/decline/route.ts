import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/otp";

const schema = z.object({ id: z.string().min(1) });

/** Turn down an invite addressed to you. Stamped as revoked; nothing is deleted. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const me = await db.user.findUnique({ where: { id: session.user.id }, select: { email: true } });
  const { count } = await db.invite.updateMany({
    where: { id: body.data.id, email: normalizeEmail(me?.email ?? ""), acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
