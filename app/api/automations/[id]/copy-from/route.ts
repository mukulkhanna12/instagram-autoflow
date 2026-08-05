import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { pickContent } from "@/lib/automation-fields";

const bodySchema = z.object({ sourceId: z.string() });

/**
 * Copy another reel's message setup onto this one.
 *
 * Only the editable content moves across — not the live/off switch, and not the
 * analytics counters, which belong to the reel that earned them. Both reels are
 * checked against the signed-in user's account so one user can't read another's
 * flow by guessing an id.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const { sourceId } = body.data;
  if (sourceId === id) {
    return NextResponse.json({ error: "Cannot copy a reel onto itself" }, { status: 400 });
  }

  const igAccount = await db.instagramAccount.findFirst({ where: { userId: session.user.id } });
  if (!igAccount) return NextResponse.json({ error: "No Instagram account" }, { status: 404 });

  // Both must belong to this account — fetched together so a mismatch can't
  // leak which ids exist.
  const [target, source] = await Promise.all([
    db.postAutomation.findFirst({ where: { id, igAccountId: igAccount.id } }),
    db.postAutomation.findFirst({ where: { id: sourceId, igAccountId: igAccount.id } }),
  ]);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!source) return NextResponse.json({ error: "Source reel not found" }, { status: 404 });

  const automation = await db.postAutomation.update({
    where: { id },
    data: pickContent(source),
  });

  return NextResponse.json({ automation });
}
