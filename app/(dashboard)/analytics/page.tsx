"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarDays, Clock, Crown, Flame, Heart,
  MessageCircle, MousePointerClick, Play, Repeat2, Sparkles, Target, Trophy, UserPlus, Users, Zap,
} from "lucide-react";
import { cn, truncate } from "@/lib/utils";
import { Panel } from "@/components/dashboard/cards";
import { Funnel, Heatmap, Legend, Ring, SERIES, Sparkline, TrendChart, hourLabel } from "@/components/analytics/charts";
import { AnalyticsSkeleton } from "@/components/skeletons";
import { Highlight, Kpi, Thumb } from "@/components/analytics/tiles";
import { ReelPicker } from "@/components/analytics/reel-picker";
import { Compare } from "@/components/analytics/compare";
import { busiestDay, delta as pctChange, peakSlot } from "@/lib/insights";
import { PageHeader } from "@/components/ui/page-header";

// ─── Types (mirror /api/analytics) ────────────────────────────────────────────

interface Summary {
  contacts: number; clicked: number; gated: number; completed: number; failed: number;
  clickRate: number; completionRate: number;
}
interface Reel {
  id: string; postCaption: string | null; postThumbnail: string | null; isActive: boolean; createdAt: string;
  commentsHandled: number; greetingSent: number; greetingClicked: number;
  followSent: number; followClicked: number; detailsSent: number; followsGained: number;
  contacts: number; // all time
}
interface Data {
  range: RangeKey;
  selected: string[]; // empty = every reel
  window: { start: string; end: string };
  summary: Summary;
  previous: Summary | null;
  trend: { points: { date: string; contacts: number; completed: number }[]; bucketDays: number };
  heatmap: number[][];
  reels: (Summary & { automationId: string })[];
  audience: { unique: number; returning: number; firstTimers: number };
  previousAudience: { unique: number; returning: number; firstTimers: number } | null;
  superfans: { igUserId: string; igUsername: string | null; reels: number; completed: number; lastAt: string }[];
  failures: { reason: string; count: number }[];
  automations: Reel[];
}

const RANGES = [
  { key: "1d", label: "Today", prev: "yesterday" },
  { key: "7d", label: "7 days", prev: "the previous 7 days" },
  { key: "30d", label: "30 days", prev: "the previous 30 days" },
  { key: "90d", label: "90 days", prev: "the previous 90 days" },
  { key: "all", label: "All time", prev: "" },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "reels", label: "Reels" },
  { key: "compare", label: "Compare" },
  { key: "audience", label: "Audience" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Rough time a person spends replying to a comment and sending the DMs by hand. */
const MANUAL_SECONDS_PER_CONTACT = 60;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <Analytics />
    </Suspense>
  );
}

function Analytics() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const range = (RANGES.find((r) => r.key === params.get("range"))?.key ?? "7d") as RangeKey;
  const reelsParam = params.get("reels") ?? "";
  const cmp = (params.get("cmp") ?? "").split(",");
  const tab = (TABS.find((t) => t.key === params.get("tab"))?.key ?? "overview") as TabKey;

  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams({ range, reels: reelsParam, tz: String(new Date().getTimezoneOffset()) });
    fetch(`/api/analytics?${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: Data) => {
        if (!cancelled) {
          setData(d);
          setError(false);
        }
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [range, reelsParam]);

  function set(next: Partial<Record<"range" | "reels" | "tab" | "cmp", string>>) {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      const isDefault = !v || (k === "range" && v === "7d") || (k === "tab" && v === "overview");
      if (isDefault) q.delete(k);
      else q.set(k, v!);
    }
    const s = q.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }

  if (!data) {
    if (error) return <LoadError />;
    return <AnalyticsSkeleton />;
  }

  const rangeMeta = RANGES.find((r) => r.key === range)!;
  const reelsById = new Map(data.automations.map((a) => [a.id, a]));

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader title="Analytics" subtitle="How your reels turn comments into conversations, followers and clicks." />

      {/* Filters: one row, above everything they scope. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1 rounded-full bg-white p-1 border border-gray-200" role="radiogroup" aria-label="Date range">
          <CalendarDays className="w-4 h-4 text-gray-400 ml-2.5 mr-1" />
          {RANGES.map((r) => (
            <button
              key={r.key}
              role="radio"
              aria-checked={range === r.key}
              onClick={() => set({ range: r.key })}
              className={cn(
                "h-9 px-4 rounded-full text-sm font-semibold transition-colors cursor-pointer",
                range === r.key ? "bg-brand-800 text-white" : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        {tab !== "compare" && (
          <ReelPicker
            reels={data.automations}
            value={data.selected}
            onChange={(ids) => set({ reels: ids.join(",") })}
            className="w-full sm:w-[320px]"
          />
        )}
        {loading && <span className="text-sm text-gray-400 animate-pulse">Updating…</span>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => set({ tab: t.key })}
            className={cn(
              "relative px-4 pb-3 pt-1 text-[15px] font-semibold whitespace-nowrap cursor-pointer transition-colors",
              tab === t.key ? "text-gray-950" : "text-gray-400 hover:text-gray-700"
            )}
          >
            {t.label}
            {tab === t.key && <span className="absolute left-2 right-2 -bottom-px h-[3px] rounded-full bg-brand-700" />}
          </button>
        ))}
      </div>

      {/* Refetch keeps the frame: the old numbers dim instead of vanishing. */}
      <div className={cn("transition-opacity", loading && "opacity-50 pointer-events-none")}>
        {tab === "overview" && <Overview data={data} rangeMeta={rangeMeta} reelsById={reelsById} onReel={(id) => set({ reels: id })} />}
        {tab === "reels" && <Reels data={data} reelsById={reelsById} onReel={(id) => set({ reels: id, tab: "overview" })} />}
        {tab === "compare" && (
          <Compare
            reels={data.automations}
            range={range}
            // Default match-up: the two reels with the most comments ever.
            {...compareSlots(cmp, data.automations)}
            onChange={(a, b) => set({ cmp: [a ?? "", b ?? ""].join(",") })}
          />
        )}
        {tab === "audience" && <Audience data={data} rangeMeta={rangeMeta} />}
      </div>
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function Overview({
  data, rangeMeta, reelsById, onReel,
}: {
  data: Data;
  rangeMeta: (typeof RANGES)[number];
  reelsById: Map<string, Reel>;
  onReel: (id: string) => void;
}) {
  const s = data.summary;
  const p = data.previous;
  const pts = data.trend.points;
  const peak = peakSlot(data.heatmap);
  const busiest = busiestDay(pts);
  const bestReel = data.reels.find((r) => r.contacts > 0);
  const bestReelMeta = bestReel ? reelsById.get(bestReel.automationId) : undefined;
  const minutesSaved = Math.round((s.contacts * MANUAL_SECONDS_PER_CONTACT) / 60);

  if (data.automations.length === 0) return <EmptyState />;

  return (
    <div className="space-y-5">
      <Hero data={data} rangeMeta={rangeMeta} minutesSaved={minutesSaved} />

      {/* Standout facts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Highlight
          icon={Trophy}
          label="Star reel"
          value={bestReelMeta ? (bestReelMeta.postCaption ? truncate(bestReelMeta.postCaption, 28) : "Untitled reel") : "—"}
          note={bestReel ? `${bestReel.contacts} comments · ${bestReel.completionRate}% got the link` : "No comments in this period"}
          thumb={bestReelMeta?.postThumbnail}
          onClick={bestReel && data.selected.length !== 1 ? () => onReel(bestReel.automationId) : undefined}
        />
        <Highlight
          icon={Flame}
          label="Peak time"
          value={peak ? `${DAY_NAMES[peak.day].slice(0, 3)} · ${hourLabel(peak.hour)}` : "—"}
          note={peak ? `Post just before ${hourLabel(peak.hour)} to catch the rush` : "Needs a few comments first"}
        />
        <Highlight
          icon={CalendarDays}
          label={data.trend.bucketDays > 1 ? "Busiest week" : "Busiest day"}
          value={busiest ? new Date(busiest.date).toLocaleDateString(undefined, { weekday: data.trend.bucketDays > 1 ? undefined : "short", day: "numeric", month: "short" }) : "—"}
          note={busiest ? `${busiest.contacts} ${busiest.contacts === 1 ? "person" : "people"} started a flow, ${busiest.completed} got the link` : "Nobody started a flow in this period"}
        />
        <Highlight
          icon={Target}
          label="Conversion"
          value={s.contacts ? `1 in ${Math.max(1, Math.round(s.contacts / Math.max(1, s.completed)))}` : "—"}
          note={s.completed ? "commenters walks away with your link" : s.contacts ? "Nobody has finished the flow yet" : "No comments in this period"}
        />
      </div>

      {/* KPI tiles with change vs the previous window */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi icon={MessageCircle} label="Comments handled" value={s.contacts} prev={p?.contacts} vs={rangeMeta.prev} spark={pts.map((x) => x.contacts)} />
        <Kpi icon={MousePointerClick} label="Tapped the DM" value={`${s.clickRate}%`} raw={s.clickRate} prev={p?.clickRate} vs={rangeMeta.prev} note={`${s.clicked} people`} points />
        <Kpi icon={Sparkles} label="Got the link" value={s.completed} prev={p?.completed} vs={rangeMeta.prev} spark={pts.map((x) => x.completed)} sparkColor={SERIES.completed.color} />
        <Kpi icon={AlertTriangle} label="Failed DMs" value={s.failed} prev={p?.failed} vs={rangeMeta.prev} invert note={s.failed ? "Why — see below" : "All clear"} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <Panel
          title={data.trend.bucketDays > 1 ? "Weekly momentum" : "Daily momentum"}
          className="xl:col-span-8"
          action={
            <Legend
              items={[
                { label: SERIES.contacts.label, color: SERIES.contacts.color, value: s.contacts },
                { label: SERIES.completed.label, color: SERIES.completed.color, value: s.completed },
              ]}
            />
          }
        >
          <TrendChart points={pts} bucketDays={data.trend.bucketDays} />
        </Panel>

        <Panel title="The funnel" className="xl:col-span-4">
          <Funnel
            steps={[
              { label: "Commented", hint: "got a reply + DM", value: s.contacts },
              { label: "Tapped the DM", hint: "opened the flow", value: s.clicked },
              { label: "Got the link", hint: "followed + delivered", value: s.completed },
            ]}
          />
          <p className="text-xs text-gray-400 mt-5 leading-relaxed">
            {s.gated > 0
              ? <><strong className="text-gray-700">{s.gated}</strong> {s.gated === 1 ? "person is" : "people are"} stuck at the follow gate right now — they tapped but haven&apos;t followed yet.</>
              : "Nobody is waiting at the follow gate right now."}
          </p>
        </Panel>

        <Panel
          title="When people start your flows"
          className="xl:col-span-8"
          action={<span className="text-xs text-gray-400">Each person once per reel, at their latest comment · your local time</span>}
        >
          <Heatmap grid={data.heatmap} />
        </Panel>

        <Panel title="Where they are now" className="xl:col-span-4">
          <Ring
            center={`${Math.round(s.completionRate)}%`}
            caption="finished"
            segments={[
              { label: "Got the link", value: s.completed, color: "#2e7d4f" },
              { label: "At the follow gate", value: s.gated, color: "#879f0b" },
              { label: "Haven't tapped yet", value: s.contacts - s.clicked, color: "#c9ccc6" },
            ]}
          />
        </Panel>
      </div>
      <Failures data={data} />
    </div>
  );
}

function Hero({ data, rangeMeta, minutesSaved }: { data: Data; rangeMeta: (typeof RANGES)[number]; minutesSaved: number }) {
  const s = data.summary;
  const d = pctChange(s.contacts, data.previous?.contacts ?? null);
  const period = rangeMeta.key === "1d" ? "today" : rangeMeta.key === "all" ? "so far" : `in the last ${rangeMeta.label}`;

  let headline: React.ReactNode;
  if (s.contacts === 0) {
    headline = <>Quiet {rangeMeta.key === "1d" ? "day" : "stretch"} — no new comments {period}.</>;
  } else {
    headline = (
      <>
        Your reels started <Em>{s.contacts}</Em> conversation{s.contacts === 1 ? "" : "s"} {period}
        {d !== null && d !== 0 && (
          <> — <Em>{d > 0 ? `up ${d}%` : `down ${Math.abs(d)}%`}</Em></>
        )}
        .
      </>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 text-white p-6 sm:p-8">
      <div aria-hidden className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-lime/10 blur-2xl" />
      <div aria-hidden className="absolute right-10 -bottom-24 w-72 h-72 rounded-full border-[28px] border-white/[0.04]" />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lime-200/80">The short version</p>
          <p className="text-xl sm:text-2xl font-extrabold leading-snug mt-2">{headline}</p>
          {s.contacts > 0 && (
            <p className="text-brand-100 mt-3">
              <strong className="text-white">{s.completed}</strong> walked away with your link
              {s.gated > 0 && <>, <strong className="text-white">{s.gated}</strong> are one follow away</>}.
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <HeroChip icon={Clock} value={formatMinutes(minutesSaved)} label="of manual DMs saved" />
          <HeroChip icon={Zap} value={`${s.completionRate}%`} label="comment → link" />
        </div>
      </div>
    </section>
  );
}

function Em({ children }: { children: React.ReactNode }) {
  return <span className="text-lime">{children}</span>;
}

function HeroChip({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/10 backdrop-blur px-4 py-3 min-w-[130px]">
      <Icon className="w-4 h-4 text-lime mb-2" />
      <p className="text-2xl font-extrabold tabular-nums leading-none">{value}</p>
      <p className="text-xs text-brand-100 mt-1">{label}</p>
    </div>
  );
}

// ─── Reels ────────────────────────────────────────────────────────────────────

type ReelSort = "contacts" | "completionRate" | "clickRate" | "followsGained";

function Reels({ data, reelsById, onReel }: { data: Data; reelsById: Map<string, Reel>; onReel: (id: string) => void }) {
  const [sort, setSort] = useState<ReelSort>("contacts");

  // Every reel, including ones with no comments in the window, so a quiet reel
  // is visibly quiet rather than missing.
  const rows = useMemo(() => {
    const inWindow = new Map(data.reels.map((r) => [r.automationId, r]));
    const scope = inScope(data);
    const empty = { contacts: 0, clicked: 0, gated: 0, completed: 0, failed: 0, clickRate: 0, completionRate: 0 };
    return scope
      .map((a) => ({ reel: a, ...(inWindow.get(a.id) ?? empty) }))
      .sort((x, y) => (sort === "followsGained" ? y.reel.followsGained - x.reel.followsGained : y[sort] - x[sort]));
  }, [data, sort]);

  if (data.automations.length === 0) return <EmptyState />;
  const max = Math.max(1, ...rows.map((r) => r.contacts));
  const totalFollows = data.automations.reduce((n, a) => n + a.followsGained, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MiniStat icon={Play} label="Reels with comments" value={`${data.reels.length} / ${rows.length}`} />
        <MiniStat icon={UserPlus} label="Follows earned by the gate" value={totalFollows} note="All time" />
        <MiniStat
          icon={Crown}
          label="Top converter"
          value={(() => {
            const top = [...data.reels].filter((r) => r.contacts >= 3).sort((a, b) => b.completionRate - a.completionRate)[0];
            return top ? `${top.completionRate}%` : "—";
          })()}
          note="Best comment → link rate (3+ comments)"
        />
      </div>

      <section className="rounded-3xl bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6 pb-4">
          <h2 className="text-lg font-bold text-gray-950">Reel leaderboard</h2>
          <label className="flex items-center gap-2 text-sm text-gray-500">
            Sort by
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as ReelSort)}
              className="h-9 px-3 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-800 cursor-pointer"
            >
              <option value="contacts">Most comments</option>
              <option value="completionRate">Best conversion</option>
              <option value="clickRate">Best tap rate</option>
              <option value="followsGained">Most follows (all time)</option>
            </select>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="bg-[#fafbf8] border-y border-gray-200 text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400">
                <th className="px-6 py-3 text-left w-10">#</th>
                <th className="px-3 py-3 text-left">Reel</th>
                <th className="px-3 py-3 text-left w-[28%]">Comments</th>
                <th className="px-3 py-3 text-center">Tap rate</th>
                <th className="px-3 py-3 text-center">Got the link</th>
                <th className="px-3 py-3 text-center" title="Lifetime counters — not filtered by date">DMs sent*</th>
                <th className="px-3 py-3 text-center" title="Lifetime counters — not filtered by date">Follows*</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, i) => (
                <tr key={r.reel.id} onClick={() => onReel(r.reel.id)} className="hover:bg-[#fafbf8] cursor-pointer">
                  <td className="px-6 py-4">
                    <Rank n={i + 1} />
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Thumb src={r.reel.postThumbnail} />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-950 truncate max-w-[260px]">
                          {r.reel.postCaption ? truncate(r.reel.postCaption, 40) : "Untitled reel"}
                        </p>
                        <p className="text-xs text-gray-400">{r.reel.isActive ? "Live" : "Paused"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2.5 rounded-full bg-[#f1f2ee] overflow-hidden">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${(r.contacts / max) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right font-bold text-gray-950 tabular-nums">{r.contacts}</span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-center font-semibold tabular-nums text-gray-800">{r.contacts ? `${r.clickRate}%` : "—"}</td>
                  <td className="px-3 py-4 text-center">
                    {r.contacts ? <RatePill v={r.completionRate} /> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-4 text-center tabular-nums text-gray-600">{r.reel.greetingSent + r.reel.followSent + r.reel.detailsSent}</td>
                  <td className="px-3 py-4 text-center tabular-nums text-gray-600">{r.reel.followsGained}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-6 py-4 text-xs text-gray-400 border-t border-gray-100">
          * Lifetime totals — Instagram-side counters aren&apos;t timestamped, so they ignore the date filter. Click a reel to focus every chart on it.
        </p>
      </section>
    </div>
  );
}

function Rank({ n }: { n: number }) {
  const medal = ["bg-lime text-gray-950", "bg-brand-100 text-brand-800", "bg-[#f1f2ee] text-gray-700"][n - 1];
  return (
    <span className={cn("w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-extrabold", medal ?? "text-gray-400")}>
      {n}
    </span>
  );
}

function RatePill({ v }: { v: number }) {
  const cls = v >= 50 ? "bg-emerald-50 text-emerald-700" : v >= 20 ? "bg-lime-50 text-lime-600" : "bg-amber-50 text-amber-700";
  return <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums", cls)}>{v}%</span>;
}

// ─── Audience ─────────────────────────────────────────────────────────────────

function Audience({ data, rangeMeta }: { data: Data; rangeMeta: (typeof RANGES)[number] }) {
  const a = data.audience;
  const loyalty = a.unique ? Math.round((a.returning / a.unique) * 100) : 0;
  const perPerson = a.unique ? (data.summary.contacts / a.unique).toFixed(1) : "0";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi icon={Users} label="Unique people" value={a.unique} prev={data.previousAudience?.unique} vs={rangeMeta.prev} />
        <Kpi icon={Repeat2} label="Came back on another reel" value={a.returning} prev={data.previousAudience?.returning} vs={rangeMeta.prev} note={`${loyalty}% of your audience`} />
        <Kpi icon={Heart} label="Reels per person" value={perPerson} vs="" note="How many of your reels the average commenter engaged with" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <Panel title="New vs returning" className="xl:col-span-5">
          <Ring
            center={`${loyalty}%`}
            caption="returning"
            segments={[
              { label: "Returning fans", value: a.returning, color: "#2e7d4f" },
              { label: "First-timers", value: a.firstTimers, color: "#879f0b" },
            ]}
          />
          <p className="text-sm text-gray-500 mt-6 leading-relaxed">
            {a.unique === 0
              ? "No commenters in this period yet."
              : loyalty >= 20
                ? "A real core is forming — these people keep showing up across your reels."
                : "Most commenters are new faces. Great for reach; a series or recurring keyword can turn them into regulars."}
          </p>
        </Panel>

        <Panel title="Superfans" className="xl:col-span-7" action={<span className="text-xs text-gray-400">Commented on 2+ reels</span>}>
          {data.superfans.length === 0 ? (
            <div className="py-10 text-center">
              <Crown className="w-10 h-10 mx-auto text-gray-200" />
              <p className="font-semibold text-gray-700 mt-3">No superfans yet</p>
              <p className="text-sm text-gray-400 mt-1">Anyone who comments on more than one of your reels shows up here.</p>
            </div>
          ) : (
            <ol className="space-y-3">
              {data.superfans.map((f, i) => (
                <li key={f.igUserId} className="flex items-center gap-3">
                  <Rank n={i + 1} />
                  <span className="w-10 h-10 rounded-full bg-lime-100 text-brand-800 font-bold flex items-center justify-center shrink-0">
                    {(f.igUsername ?? "?")[0]?.toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    {f.igUsername ? (
                      <a
                        href={`https://instagram.com/${encodeURIComponent(f.igUsername)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-gray-950 hover:text-brand-700 truncate block"
                      >
                        @{f.igUsername}
                      </a>
                    ) : (
                      <p className="font-semibold text-gray-950">Instagram user</p>
                    )}
                    <p className="text-xs text-gray-400">Last seen {timeAgo(f.lastAt)}</p>
                  </div>
                  <span className="text-sm text-gray-600 tabular-nums whitespace-nowrap">
                    <strong className="text-gray-950">{f.reels}</strong> reels
                  </span>
                  <span className="text-xs font-semibold text-brand-700 bg-brand-50 rounded-full px-2 py-0.5 tabular-nums whitespace-nowrap">
                    {f.completed} {f.completed === 1 ? "link" : "links"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <FollowGate data={data} />
    </div>
  );
}

/** The follow gate's lifetime record — counters only, so not date-filtered. */
function FollowGate({ data }: { data: Data }) {
  const scope = inScope(data);
  const t = scope.reduce(
    (acc, a) => ({ asked: acc.asked + a.followSent, taps: acc.taps + a.followClicked, gained: acc.gained + a.followsGained }),
    { asked: 0, taps: 0, gained: 0 }
  );
  return (
    <Panel title="Follow gate, all time" action={<span className="text-xs text-gray-400">Not affected by the date filter</span>}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GateStat label="Asked to follow" value={t.asked} note="Follow prompts sent" />
        <GateStat label="Tapped “I've followed”" value={t.taps} note="Including repeat taps" />
        <GateStat label="New followers earned" value={t.gained} note={t.asked ? `${Math.round((t.gained / t.asked) * 100)}% of prompts turned into a follow` : "Nobody gated yet"} accent />
      </div>
    </Panel>
  );
}

function GateStat({ label, value, note, accent }: { label: string; value: number; note: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl p-4", accent ? "bg-lime-50 border border-lime-200" : "bg-[#f7f8f5]")}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-extrabold text-gray-950 tabular-nums mt-1">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{note}</p>
    </div>
  );
}

// ─── Small shared bits ────────────────────────────────────────────────────────

function MiniStat({ icon: Icon, label, value, note }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; note?: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 flex items-center gap-4">
      <span className="w-11 h-11 rounded-xl bg-lime-100 text-brand-800 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-extrabold text-gray-950 tabular-nums">{value}</p>
        {note && <p className="text-xs text-gray-400">{note}</p>}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 bg-white rounded-3xl">
      <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
      <p className="font-bold text-gray-900">No automations to measure yet</p>
      <p className="text-sm text-gray-500 mt-1">
        <Link href="/posts" className="text-brand-700 font-semibold underline">Set up a reel</Link> and its numbers will land here.
      </p>
    </div>
  );
}

function LoadError() {
  return (
    <div className="p-8">
      <div className="rounded-3xl bg-white p-10 text-center">
        <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
        <p className="font-bold text-gray-900 mt-3">Couldn&apos;t load analytics</p>
        <button onClick={() => location.reload()} className="mt-4 h-10 px-5 rounded-full bg-brand-700 text-white font-bold cursor-pointer">
          Try again
        </button>
      </div>
    </div>
  );
}

/** The reels the filter covers: the selection, or every reel when none is picked. */
function inScope(data: Data) {
  return data.selected.length ? data.automations.filter((a) => data.selected.includes(a.id)) : data.automations;
}

/** Compare's A and B from the URL, falling back to the two reels with the most comments ever. */
function compareSlots(cmp: string[], reels: Reel[]) {
  const ids = new Set(reels.map((r) => r.id));
  const ranked = [...reels].sort((x, y) => y.contacts - x.contacts).map((r) => r.id);
  const a = ids.has(cmp[0]) ? cmp[0] : ranked[0] ?? null;
  const b = ids.has(cmp[1]) && cmp[1] !== a ? cmp[1] : ranked.find((id) => id !== a) ?? null;
  return { a, b };
}

function formatMinutes(m: number) {
  if (m < 60) return `${m}m`;
  const h = m / 60;
  return h < 10 ? `${h.toFixed(1)}h` : `${Math.round(h)}h`;
}

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// ─── Why DMs failed ──────────────────────────────────────────────────────────

/** Shown on Overview only when something failed in the chosen period. */
function Failures({ data }: { data: Data }) {
  const maxFail = Math.max(1, ...data.failures.map((f) => f.count));
  return (
    <>
      {data.failures.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <Panel title="Why DMs failed" className="xl:col-span-5">
            <ul className="space-y-3">
              {data.failures.map((f) => (
                <li key={f.reason}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-gray-800">{f.reason}</span>
                    <span className="font-bold tabular-nums text-gray-950">{f.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#f1f2ee] overflow-hidden">
                    <div className="h-full rounded-full bg-red-400" style={{ width: `${(f.count / maxFail) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
          <section className="xl:col-span-7 rounded-3xl bg-amber-50 border border-amber-200 p-6">
            <p className="font-bold text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> What to do about them
            </p>
            <ul className="mt-3 space-y-2 text-sm text-amber-900/90 leading-relaxed">
              <li><strong>Rate limit</strong> — Meta allows 750 first DMs an hour per account. Those people were skipped; a reply to them later still works.</li>
              <li><strong>Messaging window closed</strong> — Instagram only lets you DM a commenter within 7 days of their comment.</li>
              <li><strong>Login expired / missing permission</strong> — reconnect Instagram in <Link href="/settings" className="underline font-semibold">Settings</Link>.</li>
              <li><strong>Person unreachable</strong> — they limited messages or their account is gone. Nothing to fix.</li>
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
