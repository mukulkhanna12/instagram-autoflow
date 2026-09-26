import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Everything the dashboard shows beyond the per-automation stats that
 * /api/automations already returns: a 7-day activity series, the latest
 * people in a flow, the next prepared flow, and whether to show quick start.
 *
 * `tz` is the browser's getTimezoneOffset() so "today" is the viewer's today,
 * not UTC's.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id!;

  const tz = Number(req.nextUrl.searchParams.get("tz") ?? 0);
  const offsetMs = (Number.isFinite(tz) ? Math.max(-840, Math.min(840, tz)) : 0) * 60 * 1000;

  const [user, igAccount] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { quickStartSeenAt: true } }),
    getWorkspaceContext().then((ctx) => (ctx?.igAccount ? { id: ctx.igAccount.id, username: ctx.igAccount.username } : null)),
  ]);

  // Local-midnight boundaries for the last 7 days, oldest first.
  const now = Date.now();
  const localToday = Math.floor((now - offsetMs) / DAY_MS) * DAY_MS + offsetMs;
  const start = localToday - 6 * DAY_MS;

  const empty = {
    quickStart: !user?.quickStartSeenAt,
    username: igAccount?.username ?? null,
    activity: Array.from({ length: 7 }, (_, i) => ({ date: new Date(start + i * DAY_MS).toISOString(), count: 0 })),
    recent: [],
    nextFlow: null,
    queued: 0,
    states: { greeted: 0, follow_requested: 0, completed: 0 },
  };
  if (!igAccount) return NextResponse.json(empty);

  const inAccount = { automation: { igAccountId: igAccount.id } };

  const [touched, recent, nextFlow, queued, grouped] = await Promise.all([
    // Anyone whose comment started a flow in the window. lastCommentAt is
    // stamped on every (re)start; rows from before it existed fall back to
    // when the conversation was created.
    db.conversation.findMany({
      where: {
        ...inAccount,
        OR: [{ lastCommentAt: { gte: new Date(start) } }, { lastCommentAt: null, createdAt: { gte: new Date(start) } }],
      },
      select: { lastCommentAt: true, createdAt: true },
    }),
    db.conversation.findMany({
      where: inAccount,
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        igUsername: true,
        state: true,
        updatedAt: true,
        automation: { select: { id: true, postCaption: true, postThumbnail: true } },
      },
    }),
    db.queuedFlow.findFirst({
      where: { igAccountId: igAccount.id },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, keywords: true },
    }),
    db.queuedFlow.count({ where: { igAccountId: igAccount.id } }),
    // Where everyone currently is in their flow, for the completion gauge.
    db.conversation.groupBy({ by: ["state"], where: inAccount, _count: { _all: true } }),
  ]);

  const states = { ...empty.states };
  for (const g of grouped) {
    if (g.state === "greeted" || g.state === "follow_requested" || g.state === "completed") {
      states[g.state] = g._count._all;
    }
  }

  const activity = empty.activity.map((d) => ({ ...d }));
  for (const c of touched) {
    const t = (c.lastCommentAt ?? c.createdAt).getTime();
    const i = Math.floor((t - start) / DAY_MS);
    if (i >= 0 && i < 7) activity[i].count++;
  }

  return NextResponse.json({ ...empty, activity, recent, nextFlow, queued, states });
}
