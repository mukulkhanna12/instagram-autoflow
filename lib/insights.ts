/**
 * The Analytics page's numbers, computed from Conversation rows.
 *
 * There is no event log: a conversation carries when its comment (re)started
 * the flow and the state it has reached since. So every date-filtered figure
 * here is "people whose comment landed in the window, and where they are now".
 * The per-step counters on PostAutomation have no timestamps, so they are only
 * ever shown as all-time totals, never filtered by date.
 */

export type FlowState = "greeted" | "follow_requested" | "completed";

export interface InsightRow {
  automationId: string;
  igUserId: string;
  igUsername: string | null;
  state: string;
  /** When their comment started the flow — lastCommentAt, else createdAt. */
  at: Date;
  lastError: string | null;
  lastErrorAt: Date | null;
}

export const RANGES = { "1d": 1, "7d": 7, "30d": 30, "90d": 90, all: null } as const;
export type RangeKey = keyof typeof RANGES;

export function isRangeKey(v: string | null): v is RangeKey {
  return v !== null && Object.prototype.hasOwnProperty.call(RANGES, v);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local-midnight bucket start for `t`, given the viewer's getTimezoneOffset(). */
export function localDayStart(t: number, offsetMs: number): number {
  return Math.floor((t - offsetMs) / DAY_MS) * DAY_MS + offsetMs;
}

/**
 * Window for a range key: [start, end) plus the equally long window before
 * it, for "vs previous period". `all` has no previous window.
 */
export function windowFor(range: RangeKey, now: number, offsetMs: number, earliest: number | null) {
  const end = localDayStart(now, offsetMs) + DAY_MS;
  const days = RANGES[range];
  if (days === null) {
    const first = earliest === null ? end - 7 * DAY_MS : localDayStart(earliest, offsetMs);
    return { start: Math.min(first, end - 7 * DAY_MS), end, prevStart: null as number | null };
  }
  const start = end - days * DAY_MS;
  return { start, end, prevStart: start - days * DAY_MS };
}

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

/** Percentage change from prev to cur; null when there's nothing to compare against. */
export function delta(cur: number, prev: number | null): number | null {
  if (prev === null) return null;
  if (prev === 0) return cur === 0 ? 0 : null;
  return Math.round(((cur - prev) / prev) * 100);
}

export interface Summary {
  contacts: number;
  clicked: number; // tapped the first DM's button (left "greeted")
  gated: number; // currently waiting at the follow gate
  completed: number; // got the link
  failed: number; // last DM send failed
  clickRate: number; // % of contacts who tapped
  completionRate: number; // % of contacts who got the link
}

export function summarize(rows: InsightRow[]): Summary {
  let clicked = 0, gated = 0, completed = 0, failed = 0;
  for (const r of rows) {
    if (r.state !== "greeted") clicked++;
    if (r.state === "follow_requested") gated++;
    if (r.state === "completed") completed++;
    if (r.lastError) failed++;
  }
  const contacts = rows.length;
  return {
    contacts, clicked, gated, completed, failed,
    clickRate: pct(clicked, contacts),
    completionRate: pct(completed, contacts),
  };
}

export interface TrendPoint { date: string; contacts: number; completed: number }

/**
 * One point per local day. Over ~120 days it switches to weekly buckets so
 * the chart stays readable; `bucketDays` says which.
 */
export function trend(rows: InsightRow[], start: number, end: number): { points: TrendPoint[]; bucketDays: number } {
  const days = Math.round((end - start) / DAY_MS);
  const bucketDays = days > 120 ? 7 : 1;
  const size = bucketDays * DAY_MS;
  const n = Math.ceil((end - start) / size);
  const points: TrendPoint[] = Array.from({ length: n }, (_, i) => ({
    date: new Date(start + i * size).toISOString(),
    contacts: 0,
    completed: 0,
  }));
  for (const r of rows) {
    const i = Math.floor((r.at.getTime() - start) / size);
    if (i < 0 || i >= n) continue;
    points[i].contacts++;
    if (r.state === "completed") points[i].completed++;
  }
  return { points, bucketDays };
}

/** 7×24 grid of comment counts, rows Monday-first, in the viewer's local time. */
export function heatmap(rows: InsightRow[], offsetMs: number): number[][] {
  const grid = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  for (const r of rows) {
    const local = new Date(r.at.getTime() - offsetMs);
    const day = (local.getUTCDay() + 6) % 7; // Mon = 0
    grid[day][local.getUTCHours()]++;
  }
  return grid;
}

export interface Peak { day: number; hour: number; count: number }

export function peakSlot(grid: number[][]): Peak | null {
  let best: Peak | null = null;
  grid.forEach((hours, day) =>
    hours.forEach((count, hour) => {
      if (count > 0 && (!best || count > best.count)) best = { day, hour, count };
    })
  );
  return best;
}

export function busiestDay(points: TrendPoint[]): TrendPoint | null {
  return points.reduce<TrendPoint | null>((b, p) => (p.contacts > 0 && (!b || p.contacts > b.contacts) ? p : b), null);
}

export interface ReelBreakdown extends Summary { automationId: string }

export function byReel(rows: InsightRow[]): ReelBreakdown[] {
  const groups = new Map<string, InsightRow[]>();
  for (const r of rows) {
    const g = groups.get(r.automationId);
    if (g) g.push(r);
    else groups.set(r.automationId, [r]);
  }
  return [...groups.entries()]
    .map(([automationId, g]) => ({ automationId, ...summarize(g) }))
    .sort((a, b) => b.contacts - a.contacts);
}

export interface Fan {
  igUserId: string;
  igUsername: string | null;
  reels: number; // distinct reels they commented on
  completed: number; // of those, how many flows they finished
  lastAt: string;
}

/**
 * People who came through more than one reel in the window — the audience
 * that keeps coming back. A conversation is one per person per reel, so
 * `reels` is exact.
 */
export function superfans(rows: InsightRow[], limit = 8): Fan[] {
  const fans = new Map<string, Fan>();
  for (const r of rows) {
    const f = fans.get(r.igUserId) ?? { igUserId: r.igUserId, igUsername: null, reels: 0, completed: 0, lastAt: r.at.toISOString() };
    f.reels++;
    if (r.state === "completed") f.completed++;
    if (r.igUsername) f.igUsername = r.igUsername;
    if (r.at.toISOString() > f.lastAt) f.lastAt = r.at.toISOString();
    fans.set(r.igUserId, f);
  }
  return [...fans.values()]
    .filter((f) => f.reels > 1)
    .sort((a, b) => b.reels - a.reels || b.completed - a.completed || (a.lastAt < b.lastAt ? 1 : -1))
    .slice(0, limit);
}

export interface Audience { unique: number; returning: number; firstTimers: number }

export function audience(rows: InsightRow[]): Audience {
  const perUser = new Map<string, number>();
  for (const r of rows) perUser.set(r.igUserId, (perUser.get(r.igUserId) ?? 0) + 1);
  let returning = 0;
  for (const n of perUser.values()) if (n > 1) returning++;
  return { unique: perUser.size, returning, firstTimers: perUser.size - returning };
}

/** Group failed sends by a short reason, most frequent first. */
export function failureReasons(rows: InsightRow[]): { reason: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.lastError) continue;
    const reason = classifyError(r.lastError);
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return [...counts.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
}

export function classifyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("limit") || m.includes("too many") || m.includes("#4") || m.includes("#613")) return "Rate limit";
  if (m.includes("window") || m.includes("outside of allowed") || m.includes("7 days")) return "Messaging window closed";
  if (m.includes("token") || m.includes("oauth") || m.includes("session")) return "Login expired";
  if (m.includes("permission") || m.includes("not allowed")) return "Missing permission";
  if (m.includes("user") && (m.includes("unavailable") || m.includes("not found") || m.includes("cannot"))) return "Person unreachable";
  return "Other";
}
