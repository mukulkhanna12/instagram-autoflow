import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { buildStats, type StateCounts } from "@/lib/analytics";

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
  return NextResponse.json({ automation: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const automation = await getAutomationForUser(id, session.user.id);
  if (!automation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.postAutomation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
