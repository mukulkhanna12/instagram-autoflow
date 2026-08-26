import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { buildStats, type StateCounts } from "@/lib/analytics";
import { buttonsSchema } from "@/lib/schemas";
import { backfillComments } from "@/lib/backfill";

/** Tally an automation's conversations by state for the analytics funnel. */
async function stateCounts(automationId: string): Promise<StateCounts> {
  const grouped = await db.conversation.groupBy({
    by: ["state"],
    where: { automationId },
    _count: { _all: true },
  });
  const counts: StateCounts = { greeted: 0, follow_requested: 0, completed: 0 };
  for (const g of grouped) {
    if (g.state === "greeted" || g.state === "follow_requested" || g.state === "completed") {
      counts[g.state] = g._count._all;
    }
  }
  return counts;
}

const updateSchema = z.object({
  isActive: z.boolean().optional(),
  keywords: z.string().optional(),
  commentReplyText: z.string().optional(),
  commentReplyText2: z.string().optional(),
  commentReplyText3: z.string().optional(),
  greetingMessage: z.string().optional(),
  greetingButtonText: z.string().optional(),
  followMessage: z.string().optional(),
  followButtonText: z.string().optional(),
  followRetryMessage: z.string().optional(),
  detailsMessage: z.string().optional(),
  detailsButtonEnabled: z.boolean().optional(),
  detailsButtons: buttonsSchema.optional(),
  detailsButtonText: z.string().optional(),
  detailsUrl: z.string().optional(),
});

async function getAutomationForUser(id: string, userId: string) {
  const igAccount = await db.instagramAccount.findFirst({ where: { userId } });
  if (!igAccount) return null;
  return db.postAutomation.findFirst({ where: { id, igAccountId: igAccount.id } });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const automation = await getAutomationForUser(id, session.user.id);
  if (!automation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const conversations = await db.conversation.findMany({
    where: { automationId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const stats = buildStats(automation, await stateCounts(id));

  return NextResponse.json({ automation, conversations, stats });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const automation = await getAutomationForUser(id, session.user.id);
  if (!automation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = updateSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const updated = await db.postAutomation.update({ where: { id }, data: body.data });

  // First time this reel is switched Live, sweep the comments it already had —
  // the webhook only ever fires for comments that arrive after configuration,
  // so without this everyone who commented beforehand is silently skipped.
  // Guarded by backfilledAt so toggling off and on again doesn't re-run it.
  if (body.data.isActive === true && !automation.isActive && !automation.backfilledAt) {
    const igAccount = await db.instagramAccount.findFirst({ where: { userId: session.user.id } });
    if (igAccount) {
      try {
        const result = await backfillComments(updated, igAccount);
        await db.postAutomation.update({ where: { id }, data: { backfilledAt: new Date() } });
        return NextResponse.json({ automation: updated, backfill: result });
      } catch (err) {
        // Going Live is the user's actual request — a failed sweep must not
        // fail it. They can retry from the button in the editor.
        console.error("auto-backfill failed:", err);
      }
    }
  }

  return NextResponse.json({ automation: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const automation = await getAutomationForUser(id, session.user.id);
  if (!automation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Soft delete: the row and its Conversation history stay, hidden from every
  // read by the extension in lib/db.ts. Configuring this reel again revives it.
  await db.postAutomation.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), isActive: false },
  });
  return NextResponse.json({ success: true });
}
