"use client";
import { useEffect, useState } from "react";
import { ArrowLeftRight, Crown, Flame, Scale } from "lucide-react";
import { cn, truncate } from "@/lib/utils";
import { peakSlot } from "@/lib/insights";
import { Funnel, LinesChart, hourLabel } from "@/components/analytics/charts";
import { ReelPicker, type PickerReel } from "@/components/analytics/reel-picker";
import { Panel } from "@/components/dashboard/cards";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Two reels, head to head, over the same date range. Each side is its own
 * /api/analytics call scoped to one reel, so every number here means exactly
 * what it means on the rest of the page.
 *
 * A is brand green, B violet — validated as a pair (CVD ΔE 25), and every
 * mark is also labelled A/B so colour is never the only cue.
 */
export const SIDE = {
  a: { color: "#2e7d4f", soft: "bg-[#2e7d4f]/10", tag: "A" },
  b: { color: "#7c3aed", soft: "bg-[#7c3aed]/10", tag: "B" },
} as const;

interface Summary {
  contacts: number; clicked: number; gated: number; completed: number; failed: number;
  clickRate: number; completionRate: number;
}
interface Side {
  summary: Summary;
  trend: { points: { date: string; contacts: number; completed: number }[]; bucketDays: number };
  heatmap: number[][];
  audience: { unique: number; returning: number; firstTimers: number };
}
export interface CompareReel extends PickerReel {
  greetingSent: number; followSent: number; detailsSent: number; followsGained: number;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function Compare({
  reels, range, a, b, onChange,
}: {
  reels: CompareReel[];
  range: string;
  a: string | null;
  b: string | null;
  onChange: (a: string | null, b: string | null) => void;
}) {
  const [sides, setSides] = useState<{ a: Side | null; b: Side | null }>({ a: null, b: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!a || !b) return;
    let cancelled = false;
    setLoading(true);
    const get = (id: string) =>
      fetch(`/api/analytics?${new URLSearchParams({ range, reels: id, tz: String(new Date().getTimezoneOffset()) })}`).then((r) =>
        r.ok ? (r.json() as Promise<Side>) : Promise.reject(r.status)
      );
    Promise.all([get(a), get(b)])
      .then(([da, db]) => !cancelled && setSides({ a: da, b: db }))
      .catch(() => !cancelled && setSides({ a: null, b: null }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [a, b, range]);

  if (reels.length < 2) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl">
        <Scale className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="font-bold text-gray-900">You need two reels to compare</p>
        <p className="text-sm text-gray-500 mt-1">Set up another reel and come back.</p>
      </div>
    );
  }

  const ra = reels.find((r) => r.id === a);
  const rb = reels.find((r) => r.id === b);
  const both = sides.a && sides.b ? { a: sides.a, b: sides.b } : null;

  return (
    <div className="space-y-5">
      {/* The two slots */}
      <div className="rounded-3xl bg-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-3">
        <ReelPicker
          mode="single"
          label="Reel A"
          accent={SIDE.a.color}
          reels={reels}
          value={a ? [a] : []}
          disabledIds={b ? [b] : []}
          onChange={([id]) => onChange(id, b)}
          className="flex-1 min-w-0"
        />
        <button
          onClick={() => onChange(b, a)}
          className="self-center w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-950 hover:border-gray-400 cursor-pointer shrink-0"
          aria-label="Swap A and B"
          title="Swap"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>
        <ReelPicker
          mode="single"
          label="Reel B"
          accent={SIDE.b.color}
          reels={reels}
          value={b ? [b] : []}
          disabledIds={a ? [a] : []}
          onChange={([id]) => onChange(a, id)}
          align="right"
          className="flex-1 min-w-0"
        />
      </div>

      {!ra || !rb ? (
        <p className="text-center text-gray-500 py-10">Pick a reel for each side.</p>
      ) : !both ? (
        loading ? <CompareSkeleton /> : <p className="text-center text-gray-500 py-10">Couldn&apos;t load one of the reels.</p>
      ) : (
        <div className={cn("space-y-5 transition-opacity", loading && "opacity-50")}>
          <Verdict a={both.a} b={both.b} ra={ra} rb={rb} />
          <HeadToHead a={both.a} b={both.b} ra={ra} rb={rb} />

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <Panel
              title="Comments over time"
              className="xl:col-span-8"
              action={<SideLegend ra={ra} rb={rb} />}
            >
              <LinesChart
                dates={both.a.trend.points.map((p) => p.date)}
                bucketDays={both.a.trend.bucketDays}
                series={[
                  { label: `A · ${name(ra, 24)}`, color: SIDE.a.color, values: both.a.trend.points.map((p) => p.contacts) },
                  { label: `B · ${name(rb, 24)}`, color: SIDE.b.color, values: both.b.trend.points.map((p) => p.contacts) },
                ]}
              />
            </Panel>
            <Panel title="Best time to post" className="xl:col-span-4">
              <div className="space-y-3">
                {(["a", "b"] as const).map((k) => {
                  const peak = peakSlot(both[k].heatmap);
                  return (
                    <div key={k} className={cn("rounded-2xl p-4 flex items-center gap-3", SIDE[k].soft)}>
                      <Tag side={k} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500 truncate">{name(k === "a" ? ra : rb, 30)}</p>
                        <p className="font-extrabold text-gray-950">
                          {peak ? `${DAYS[peak.day]} · ${hourLabel(peak.hour)}` : "Not enough comments"}
                        </p>
                      </div>
                      <Flame className="w-5 h-5 text-gray-400" />
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {(["a", "b"] as const).map((k) => {
              const s = both[k].summary;
              return (
                <Panel key={k} title="Funnel" action={<span className="flex items-center gap-2 text-sm text-gray-500"><Tag side={k} /> {name(k === "a" ? ra : rb, 26)}</span>}>
                  <Funnel
                    steps={[
                      { label: "Commented", hint: "got a reply + DM", value: s.contacts },
                      { label: "Tapped the DM", hint: "opened the flow", value: s.clicked },
                      { label: "Got the link", hint: "followed + delivered", value: s.completed },
                    ]}
                  />
                </Panel>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** One or two plain-English lines on who's winning, and by how much. */
function Verdict({ a, b, ra, rb }: { a: Side; b: Side; ra: CompareReel; rb: CompareReel }) {
  const sa = a.summary, sb = b.summary;
  const lines: React.ReactNode[] = [];

  if (sa.contacts + sb.contacts === 0) {
    lines.push("Neither reel got comments in this period — try a longer range");
  } else {
    const [hi, lo, hiK] = sa.contacts >= sb.contacts ? [sa, sb, "a" as const] : [sb, sa, "b" as const];
    if (hi.contacts !== lo.contacts) {
      lines.push(
        <>
          <Tag side={hiK} inline /> pulls{" "}
          <strong>{lo.contacts ? `${ratio(hi.contacts, lo.contacts)}× the comments` : `${hi.contacts} comments to none`}</strong>
        </>
      );
    }
    // Conversion only means something with a handful of people on each side.
    if (sa.contacts >= 3 && sb.contacts >= 3 && sa.completionRate !== sb.completionRate) {
      const k = sa.completionRate > sb.completionRate ? "a" : "b";
      const w = k === "a" ? sa : sb, l = k === "a" ? sb : sa;
      lines.push(
        <>
          <Tag side={k} inline /> turns comments into links{" "}
          <strong>{l.completionRate ? `${ratio(w.completionRate, l.completionRate)}× better` : "while the other hasn't yet"}</strong>{" "}
          ({w.completionRate}% vs {l.completionRate}%)
        </>
      );
    }
    if (!lines.length) lines.push("Neck and neck — these two are performing the same");
  }

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gray-950 text-white p-6 sm:p-7">
      <div aria-hidden className="absolute -left-10 -top-16 w-56 h-56 rounded-full blur-3xl opacity-40" style={{ background: SIDE.a.color }} />
      <div aria-hidden className="absolute -right-10 -bottom-16 w-56 h-56 rounded-full blur-3xl opacity-40" style={{ background: SIDE.b.color }} />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lime/80 flex items-center gap-2">
          <Scale className="w-3.5 h-3.5" /> The verdict
        </p>
        <ul className="mt-3 space-y-1.5 text-xl sm:text-2xl font-extrabold leading-snug">
          {lines.map((l, i) => (
            <li key={i}>{l}.</li>
          ))}
        </ul>
        <p className="text-sm text-gray-400 mt-3">
          A = {name(ra, 40)} · B = {name(rb, 40)}
        </p>
      </div>
    </section>
  );
}

/** Mirrored bars: A grows left, B grows right, the better side gets a crown. */
function HeadToHead({ a, b, ra, rb }: { a: Side; b: Side; ra: CompareReel; rb: CompareReel }) {
  const sa = a.summary, sb = b.summary;
  const rows: { label: string; a: number; b: number; unit?: string; lowerBetter?: boolean; lifetime?: boolean }[] = [
    { label: "Comments", a: sa.contacts, b: sb.contacts },
    { label: "Unique people", a: a.audience.unique, b: b.audience.unique },
    { label: "Tap rate", a: sa.clickRate, b: sb.clickRate, unit: "%" },
    { label: "Got the link", a: sa.completed, b: sb.completed },
    { label: "Conversion", a: sa.completionRate, b: sb.completionRate, unit: "%" },
    { label: "Stuck at follow gate", a: sa.gated, b: sb.gated, lowerBetter: true },
    { label: "Failed DMs", a: sa.failed, b: sb.failed, lowerBetter: true },
    { label: "DMs sent", a: ra.greetingSent + ra.followSent + ra.detailsSent, b: rb.greetingSent + rb.followSent + rb.detailsSent, lifetime: true },
    { label: "Follows earned", a: ra.followsGained, b: rb.followsGained, lifetime: true },
  ];
  const wins = { a: 0, b: 0 };
  for (const r of rows) {
    if (r.a === r.b) continue;
    const aBetter = r.lowerBetter ? r.a < r.b : r.a > r.b;
    wins[aBetter ? "a" : "b"]++;
  }

  return (
    <section className="rounded-3xl bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-lg font-bold text-gray-950">Head to head</h2>
        <p className="text-sm text-gray-500">
          Wins: <strong className="text-gray-950"><Tag side="a" inline /> {wins.a}</strong>
          <span className="mx-2 text-gray-300">|</span>
          <strong className="text-gray-950"><Tag side="b" inline /> {wins.b}</strong>
        </p>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-x-3 sm:gap-x-5 items-center text-xs font-semibold uppercase tracking-[0.1em] text-gray-400 pb-2 border-b border-gray-100">
        <span className="text-right truncate"><Tag side="a" inline /> {name(ra, 26)}</span>
        <span className="w-28 sm:w-36" />
        <span className="truncate"><Tag side="b" inline /> {name(rb, 26)}</span>
      </div>
      <ul className="divide-y divide-gray-50">
        {rows.map((r) => {
          const max = Math.max(1, r.a, r.b);
          const aBetter = r.a !== r.b && (r.lowerBetter ? r.a < r.b : r.a > r.b);
          const bBetter = r.a !== r.b && !aBetter;
          return (
            <li key={r.label} className="grid grid-cols-[1fr_auto_1fr] gap-x-3 sm:gap-x-5 items-center py-2.5">
              <Bar value={r.a} max={max} unit={r.unit} side="a" win={aBetter} />
              <span className="w-28 sm:w-36 text-center text-sm font-semibold text-gray-700 leading-tight">
                {r.label}
                {r.lifetime && <span className="block text-[10px] font-medium text-gray-400">all time</span>}
                {r.lowerBetter && <span className="block text-[10px] font-medium text-gray-400">lower is better</span>}
              </span>
              <Bar value={r.b} max={max} unit={r.unit} side="b" win={bBetter} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Bar({ value, max, unit, side, win }: { value: number; max: number; unit?: string; side: "a" | "b"; win: boolean }) {
  const w = value > 0 ? Math.max((value / max) * 100, 3) : 0;
  const num = (
    <span className={cn("text-sm tabular-nums whitespace-nowrap flex items-center gap-1", win ? "font-extrabold text-gray-950" : "font-semibold text-gray-500")}>
      {side === "b" && win && <Crown className="w-3.5 h-3.5 text-amber-500" />}
      {value}
      {unit}
      {side === "a" && win && <Crown className="w-3.5 h-3.5 text-amber-500" />}
    </span>
  );
  return (
    <div className={cn("flex items-center gap-2", side === "a" && "flex-row-reverse")}>
      <div className={cn("flex-1 h-3 rounded-full bg-[#f1f2ee] overflow-hidden flex", side === "a" && "justify-end")}>
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${w}%`, background: SIDE[side].color, opacity: win ? 1 : 0.45 }}
        />
      </div>
      <span className={cn("w-16", side === "a" ? "flex justify-end" : "")}>{num}</span>
    </div>
  );
}

function SideLegend({ ra, rb }: { ra: CompareReel; rb: CompareReel }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
      {(["a", "b"] as const).map((k) => (
        <span key={k} className="flex items-center gap-2 min-w-0">
          <span className="w-3 h-3 rounded-[4px] shrink-0" style={{ background: SIDE[k].color }} />
          <span className="truncate max-w-[160px]">{SIDE[k].tag} · {name(k === "a" ? ra : rb, 22)}</span>
        </span>
      ))}
    </div>
  );
}

function Tag({ side, inline }: { side: "a" | "b"; inline?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md text-white font-extrabold shrink-0",
        inline ? "w-5 h-5 text-[11px] align-[2px]" : "w-7 h-7 text-xs"
      )}
      style={{ background: SIDE[side].color }}
    >
      {SIDE[side].tag}
    </span>
  );
}

function CompareSkeleton() {
  return (
    <div role="status" className="space-y-5">
      <span className="sr-only">Loading comparison</span>
      <Skeleton className="h-36 rounded-3xl" />
      <Skeleton className="h-96 rounded-3xl" />
    </div>
  );
}

const name = (r: CompareReel, n: number) => (r.postCaption ? truncate(r.postCaption.replace(/\s+/g, " "), n) : "Untitled reel");

function ratio(x: number, y: number) {
  const r = x / y;
  return r >= 10 ? Math.round(r) : Math.round(r * 10) / 10;
}
