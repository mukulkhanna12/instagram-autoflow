import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, dbUnfiltered } from "@/lib/db";
import { z } from "zod";
import { buildStats, type StateCounts } from "@/lib/analytics";
import { getReelDefaults } from "@/lib/reel-defaults";

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

  // A reel configured by hand starts from the account's default messages
  // (Reels → Default messages), not from the column defaults. `update` stays
  // metadata-only: re-clicking Configure on a reel that already has an
  // automation must never overwrite the wording it has been given.
  const defaults = await getReelDefaults(igAccount.id);

  // A soft-deleted automation still occupies this reel's [igAccountId, postId]
  // slot, so Configure on a previously deleted reel revives that row rather
  // than colliding with it. Reviving resets the wording to the account
  // defaults — the reel is being set up afresh — while a re-click on a *live*
  // automation stays metadata-only and leaves its wording alone.
  const existing = await dbUnfiltered.postAutomation.findUnique({
    where: { igAccountId_postId: { igAccountId: igAccount.id, postId: body.data.postId } },
    select: { isDeleted: true },
  });
  const reviving = existing?.isDeleted === true;

  // `_count` matters: the reels grid drops this straight into the list it
  // renders, and reads `_count.conversations` on every card. Returning a bare
  // automation crashed the page the moment it was created.
  const automation = await db.postAutomation.upsert({
    where: { igAccountId_postId: { igAccountId: igAccount.id, postId: body.data.postId } },
    create: {
      igAccountId: igAccount.id,
      ...defaults,
      detailsButtons: defaults.detailsButtons ?? [],
      ...body.data,
    },
    update: reviving
      ? {
          ...defaults,
          detailsButtons: defaults.detailsButtons ?? [],
          ...body.data,
          isDeleted: false,
          deletedAt: null,
        }
      : body.data,
    include: { _count: { select: { conversations: true } } },
  });

  return NextResponse.json({ automation });
}
