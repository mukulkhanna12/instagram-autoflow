import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { backfillComments } from "@/lib/backfill";

const bodySchema = z.object({ dryRun: z.boolean().optional() });

/**
 * Catch up on comments this reel already had before it was configured.
 *
 * `dryRun` reports what would happen without sending anything, so the UI can
 * show a confirmation with real numbers rather than a vague warning.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const dryRun = parsed.data.dryRun ?? false;

  const igAccount = await db.instagramAccount.findFirst({ where: { userId: session.user.id } });
  if (!igAccount) return NextResponse.json({ error: "No Instagram account" }, { status: 404 });

  const automation = await db.postAutomation.findFirst({
    where: { id, igAccountId: igAccount.id },
  });
  if (!automation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Sending to a reel that's switched off would DM people for a flow the user
  // has deliberately paused. A dry run is fine either way.
  if (!automation.isActive && !dryRun) {
    return NextResponse.json(
      { error: "Switch this reel Live before processing its old comments" },
      { status: 400 }
    );
  }

  const result = await backfillComments(automation, igAccount, { dryRun });

  if (!dryRun) {
    await db.postAutomation.update({
      where: { id },
      data: { backfilledAt: new Date() },
    });
  }

  return NextResponse.json({ result });
}
