import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";
import {
  audience, byReel, failureReasons, heatmap, isRangeKey, summarize, superfans, trend, windowFor,
  type InsightRow,
} from "@/lib/insights";

/**
 * Everything the Analytics page shows, for one date range and optionally one reel.
 *
 *   ?range=1d|7d|30d|90d|all   (default 7d)
 *   ?reels=<id>,<id>,…        (default: every reel; several are merged)
 *   ?tz=<getTimezoneOffset()> so days and hours are the viewer's, not UTC's
 *
 * Date-filtered figures come from Conversation rows (see lib/insights.ts); the
 * per-reel send/click counters are lifetime totals and are returned as such.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id!;

  const q = req.nextUrl.searchParams;
  const rangeParam = q.get("range");
  const range = isRangeKey(rangeParam) ? rangeParam : "7d";
  const tz = Number(q.get("tz") ?? 0);
  const offsetMs = (Number.isFinite(tz) ? Math.max(-840, Math.min(840, tz)) : 0) * 60 * 1000;

  void userId;
  const igAccount = (await getWorkspaceContext())?.igAccount ?? null;

  const automations = igAccount
    ? await db.postAutomation.findMany({
        where: { igAccountId: igAccount.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, postCaption: true, postThumbnail: true, isActive: true, createdAt: true,
          commentsHandled: true, greetingSent: true, greetingClicked: true,
          followSent: true, followClicked: true, detailsSent: true, followsGained: true,
          _count: { select: { conversations: true } },
        },
      })
    : [];

  // Only this user's own automations count; unknown ids are dropped rather
  // than leaking or erroring, and nothing left over means "every reel".
  const owned = new Set(automations.map((a) => a.id));
  const selected = [...new Set((q.get("reels") ?? "").split(",").filter((id) => owned.has(id)))];
  const ids = selected.length ? selected : automations.map((a) => a.id);

  const scope = { automationId: { in: ids } };
  const earliest = ids.length
    ? await db.conversation.aggregate({ where: scope, _min: { createdAt: true } })
    : null;
  const { start, end, prevStart } = windowFor(
    range,
    Date.now(),
    offsetMs,
    earliest?._min.createdAt?.getTime() ?? null
  );

  // Whose comment (re)started a flow in [from, to). Rows from before
  // lastCommentAt existed fall back to when the conversation was created.
  const inWindow = (from: number, to: number) => ({
    ...scope,
    OR: [
      { lastCommentAt: { gte: new Date(from), lt: new Date(to) } },
      { lastCommentAt: null, createdAt: { gte: new Date(from), lt: new Date(to) } },
    ],
  });

  const select = {
    automationId: true, igUserId: true, igUsername: true, state: true,
    lastCommentAt: true, createdAt: true, lastError: true, lastErrorAt: true,
  } as const;

  const [raw, prevRaw] = ids.length
    ? await Promise.all([
        db.conversation.findMany({ where: inWindow(start, end), select }),
        prevStart !== null
          ? db.conversation.findMany({ where: inWindow(prevStart, start), select })
          : Promise.resolve(null),
      ])
    : [[], prevStart !== null ? [] : null];

  const toRow = (c: (typeof raw)[number]): InsightRow => ({
    automationId: c.automationId,
    igUserId: c.igUserId,
    igUsername: c.igUsername,
    state: c.state,
    at: c.lastCommentAt ?? c.createdAt,
    lastError: c.lastError,
    lastErrorAt: c.lastErrorAt,
  });
  const rows = raw.map(toRow);
  const prevRows = prevRaw?.map(toRow) ?? null;

  return NextResponse.json({
    range,
    selected,
    window: { start: new Date(start).toISOString(), end: new Date(end).toISOString() },
    summary: summarize(rows),
    previous: prevRows ? summarize(prevRows) : null,
    trend: trend(rows, start, end),
    heatmap: heatmap(rows, offsetMs),
    reels: byReel(rows),
    audience: audience(rows),
    previousAudience: prevRows ? audience(prevRows) : null,
    superfans: superfans(rows),
    failures: failureReasons(rows),
    automations: automations.map(({ _count, ...a }) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      contacts: _count.conversations, // all time, for the reel picker
    })),
  });
}
