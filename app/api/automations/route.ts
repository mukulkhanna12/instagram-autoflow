import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { buildStats, type StateCounts } from "@/lib/analytics";

const createSchema = z.object({
  postId: z.string(),
  postUrl: z.string().optional(),
  postCaption: z.string().optional(),
  postThumbnail: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const igAccount = await db.instagramAccount.findFirst({ where: { userId: session.user.id } });
  if (!igAccount) return NextResponse.json({ automations: [] });

  const automations = await db.postAutomation.findMany({
    where: { igAccountId: igAccount.id },
    include: { _count: { select: { conversations: true } } },
    orderBy: { createdAt: "desc" },
  });

  // One grouped query for every automation's conversation states, then fold the
  // per-step funnel onto each automation.
  const ids = automations.map((a) => a.id);
  const grouped = ids.length
    ? await db.conversation.groupBy({
        by: ["automationId", "state"],
        where: { automationId: { in: ids } },
        _count: { _all: true },
      })
    : [];

  const countsById = new Map<string, StateCounts>(
    ids.map((id) => [id, { greeted: 0, follow_requested: 0, completed: 0 }])
  );
  for (const g of grouped) {
    const c = countsById.get(g.automationId);
    if (c && (g.state === "greeted" || g.state === "follow_requested" || g.state === "completed")) {
      c[g.state] = g._count._all;
    }
  }

  const withStats = automations.map((a) => ({
    ...a,
    stats: buildStats(a, countsById.get(a.id)!),
  }));

  return NextResponse.json({ automations: withStats });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const igAccount = await db.instagramAccount.findFirst({ where: { userId: session.user.id } });
  if (!igAccount) return NextResponse.json({ error: "No Instagram account" }, { status: 404 });

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  // `_count` matters: the reels grid drops this straight into the list it
  // renders, and reads `_count.conversations` on every card. Returning a bare
  // automation crashed the page the moment it was created.
  const automation = await db.postAutomation.upsert({
    where: { igAccountId_postId: { igAccountId: igAccount.id, postId: body.data.postId } },
    create: { igAccountId: igAccount.id, ...body.data },
    update: body.data,
    include: { _count: { select: { conversations: true } } },
  });

  return NextResponse.json({ automation });
}
