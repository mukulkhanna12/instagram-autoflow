"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle, ArrowLeft, ArrowRight, BarChart3, CalendarDays, Flame, MessageCircle,
  MousePointerClick, Pencil, Sparkles, Target, Trophy, X,
} from "lucide-react";
import { cn, truncate } from "@/lib/utils";
import { busiestDay, peakSlot } from "@/lib/insights";
import { Funnel, Legend, SERIES, TrendChart, hourLabel } from "@/components/analytics/charts";
import { Highlight, Kpi, Thumb } from "@/components/analytics/tiles";
import { Skeleton } from "@/components/ui/skeleton";
import { ReelPicker } from "@/components/analytics/reel-picker";

/**
 * Quick stats: a side panel with the headline numbers, reachable from every
 * dashboard page. The floating button opens it for all reels; anything else
 * (a reel row, the flow editor) opens it on one reel with openQuickStats(id).
 * "Full analytics" carries the same range and reel over to /analytics.
 */

const OPEN_EVENT = "autoflow:quick-stats";

export function openQuickStats(reelId?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { reels: reelId ? [reelId] : [] } }));
}

const RANGES = [
  { key: "7d", label: "7d", prev: "the previous 7 days" },
  { key: "30d", label: "30d", prev: "the previous 30 days" },
  { key: "90d", label: "90d", prev: "the previous 90 days" },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Summary {
  contacts: number; clicked: number; gated: number; completed: number; failed: number;
  clickRate: number; completionRate: number;
}
interface Data {
  selected: string[];
  summary: Summary;
  previous: Summary | null;
  trend: { points: { date: string; contacts: number; completed: number }[]; bucketDays: number };
  heatmap: number[][];
  reels: (Summary & { automationId: string })[];
  automations: { id: string; postCaption: string | null; postThumbnail: string | null; isActive: boolean; contacts: number }[];
}

export function QuickStats() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<RangeKey>("7d");
  const [reels, setReels] = useState<string[]>([]);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onOpen = (e: Event) => {
      setReels((e as CustomEvent<{ reels: string[] }>).detail?.reels ?? []);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  // Close on navigation, e.g. after "Full analytics" or "Edit flow".
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams({ range, reels: reels.join(","), tz: String(new Date().getTimezoneOffset()) });
    fetch(`/api/analytics?${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: Data) => !cancelled && setData(d))
      .catch(() => !cancelled && setData(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, range, reels]);

  // The full page already shows all of this.
  const onAnalyticsPage = pathname === "/analytics";
  const rangeMeta = RANGES.find((r) => r.key === range)!;
  const fullHref = `/analytics?${new URLSearchParams({ range, ...(reels.length ? { reels: reels.join(",") } : {}) })}`;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {!onAnalyticsPage && (
        <button
          onClick={() => openQuickStats()}
          className={cn(
            "fixed bottom-6 right-6 z-30 flex items-center gap-2 h-12 pl-4 pr-5 rounded-full",
            "bg-gray-950 text-white font-bold shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)]",
            "hover:bg-brand-900 transition-colors cursor-pointer",
            open && "opacity-0 pointer-events-none"
          )}
          aria-label="Open quick stats"
        >
          <span className="w-7 h-7 rounded-full bg-lime text-gray-950 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" strokeWidth={2.5} />
          </span>
          Stats
        </button>
      )}

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className="fixed right-0 top-0 z-50 h-full w-full sm:w-[460px] bg-[#f7f8f5] shadow-2xl flex flex-col outline-none data-[state=open]:animate-slide-in-right"
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="bg-white px-5 pt-5 pb-4 border-b border-gray-100 space-y-4">
            <div className="flex items-center gap-3">
              <Dialog.Title className="text-xl font-extrabold text-gray-950 flex-1">Quick stats</Dialog.Title>
              <div className="inline-flex rounded-full bg-[#f1f2ee] p-1" role="radiogroup" aria-label="Date range">
                {RANGES.map((r) => (
                  <button
                    key={r.key}
                    role="radio"
                    aria-checked={range === r.key}
                    onClick={() => setRange(r.key)}
                    className={cn(
                      "h-8 px-3 rounded-full text-sm font-bold cursor-pointer transition-colors",
                      range === r.key ? "bg-gray-950 text-lime" : "text-gray-500 hover:text-gray-950"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <Dialog.Close className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 cursor-pointer" aria-label="Close">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>
            <ReelScope data={data} reels={reels} onReels={setReels} />
          </div>

          {/* Body */}
          <div className={cn("flex-1 overflow-y-auto px-5 py-5 space-y-6 transition-opacity", loading && data && "opacity-50")}>
            {!data ? (
              loading ? <PanelSkeleton /> : <p className="text-sm text-gray-500 text-center py-10">Couldn&apos;t load stats.</p>
            ) : data.automations.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles className="w-10 h-10 mx-auto text-gray-300" />
                <p className="font-bold text-gray-900 mt-3">Nothing to measure yet</p>
                <p className="text-sm text-gray-500 mt-1">Set up a reel and its numbers will show up here.</p>
              </div>
            ) : (
              <Body data={data} rangeMeta={rangeMeta} onReel={(id) => setReels([id])} />
            )}
          </div>

          {/* Footer */}
          <div className="bg-white border-t border-gray-100 px-5 py-4">
            <Link
              href={fullHref}
              className="flex items-center justify-center gap-2 h-12 rounded-full bg-brand-700 text-white font-bold hover:bg-brand-800 transition-colors"
            >
              Full analytics <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** The reel picker, or — with exactly one reel — that reel with a way back and to its editor. */
function ReelScope({ data, reels, onReels }: { data: Data | null; reels: string[]; onReels: (ids: string[]) => void }) {
  const focused = reels.length === 1 ? data?.automations.find((a) => a.id === reels[0]) : undefined;
  if (focused) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={() => onReels([])}
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-950 hover:border-gray-400 cursor-pointer shrink-0"
          aria-label="Back to all reels"
          title="All reels"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Thumb src={focused.postThumbnail} />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-gray-950 truncate">{focused.postCaption ? truncate(focused.postCaption, 48) : "Untitled reel"}</p>
          <p className={cn("text-xs font-semibold", focused.isActive ? "text-emerald-600" : "text-gray-400")}>
            {focused.isActive ? "● Live" : "Paused"}
          </p>
        </div>
        <Link
          href={`/posts/${focused.id}`}
          className="h-8 px-3 rounded-full border border-gray-200 text-xs font-bold text-gray-700 hover:border-gray-950 inline-flex items-center gap-1.5 shrink-0"
        >
          <Pencil className="w-3 h-3" /> Edit flow
        </Link>
      </div>
    );
  }
  return <ReelPicker reels={data?.automations ?? []} value={reels} onChange={onReels} />;
}

function Body({ data, rangeMeta, onReel }: { data: Data; rangeMeta: (typeof RANGES)[number]; onReel: (id: string) => void }) {
  const s = data.summary;
  const p = data.previous;
  const peak = peakSlot(data.heatmap);
  const busiest = busiestDay(data.trend.points);
  const byId = new Map(data.automations.map((a) => [a.id, a]));
  const multi = data.selected.length !== 1;
  const star = multi ? data.reels.find((r) => r.contacts > 0) : undefined;
  const starMeta = star ? byId.get(star.automationId) : undefined;
  const top = multi ? data.reels.slice(0, 3) : [];

  return (
    <>
      <Section title="Highlights">
        <div className="grid grid-cols-2 gap-3">
          {multi ? (
            <Highlight
              compact
              icon={Trophy}
              label="Star reel"
              value={starMeta ? (starMeta.postCaption ? truncate(starMeta.postCaption, 18) : "Untitled reel") : "—"}
              note={star ? `${star.contacts} comments` : "No activity yet"}
              thumb={starMeta?.postThumbnail}
              onClick={star ? () => onReel(star.automationId) : undefined}
            />
          ) : (
            <Highlight
              compact
              icon={Target}
              label="Conversion"
              value={s.contacts ? `1 in ${Math.max(1, Math.round(s.contacts / Math.max(1, s.completed)))}` : "—"}
              note={s.contacts ? "get the link" : "No activity yet"}
            />
          )}
          <Highlight
            compact
            icon={Flame}
            label="Peak time"
            value={peak ? `${DAY_NAMES[peak.day]} · ${hourLabel(peak.hour)}` : "—"}
            note={peak ? `${peak.count} comments` : "No activity yet"}
          />
          <Highlight
            compact
            icon={CalendarDays}
            label="Busiest day"
            value={busiest ? new Date(busiest.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : "—"}
            note={busiest ? `${busiest.contacts} comments` : "No activity yet"}
          />
          <Highlight
            compact
            icon={Sparkles}
            label="Stuck at gate"
            value={String(s.gated)}
            note="one follow away"
          />
        </div>
      </Section>

      <Section title="Key metrics" note={`Change vs ${rangeMeta.prev}`}>
        <div className="grid grid-cols-2 gap-3">
          <Kpi compact icon={MessageCircle} label="Comments" value={s.contacts} prev={p?.contacts} vs={rangeMeta.prev} />
          <Kpi compact icon={MousePointerClick} label="Tap rate" value={`${s.clickRate}%`} raw={s.clickRate} prev={p?.clickRate} vs={rangeMeta.prev} points />
          <Kpi compact icon={Sparkles} label="Got the link" value={s.completed} prev={p?.completed} vs={rangeMeta.prev} />
          <Kpi compact icon={AlertTriangle} label="Failed DMs" value={s.failed} prev={p?.failed} vs={rangeMeta.prev} invert />
        </div>
      </Section>

      <Section title="Momentum">
        <div className="rounded-2xl bg-white p-4">
          <Legend
            items={[
              { label: SERIES.contacts.label, color: SERIES.contacts.color },
              { label: SERIES.completed.label, color: SERIES.completed.color },
            ]}
          />
          <div className="mt-2">
            <TrendChart points={data.trend.points} bucketDays={data.trend.bucketDays} />
          </div>
        </div>
      </Section>

      <Section title="Funnel">
        <div className="rounded-2xl bg-white p-4">
          <Funnel
            steps={[
              { label: "Commented", hint: "got a reply + DM", value: s.contacts },
              { label: "Tapped the DM", hint: "opened the flow", value: s.clicked },
              { label: "Got the link", hint: "followed + delivered", value: s.completed },
            ]}
          />
        </div>
      </Section>

      {top.length > 0 && (
        <Section title="Top reels" note="Tap one to focus on it">
          <ul className="rounded-2xl bg-white divide-y divide-gray-100 overflow-hidden">
            {top.map((r, i) => {
              const a = byId.get(r.automationId);
              return (
                <li key={r.automationId}>
                  <button
                    onClick={() => onReel(r.automationId)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#fafbf8] cursor-pointer"
                  >
                    <span className="w-5 text-xs font-extrabold text-gray-400 tabular-nums">{i + 1}</span>
                    <Thumb src={a?.postThumbnail} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-950 truncate">
                        {a?.postCaption ? truncate(a.postCaption, 34) : "Untitled reel"}
                      </p>
                      <p className="text-xs text-gray-400">{r.contacts} comments · {r.completionRate}% got the link</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <h3 className="text-[15px] font-bold text-gray-950">{title}</h3>
        {note && <span className="text-xs text-gray-400">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function PanelSkeleton() {
  return (
    <div role="status" className="space-y-6">
      <span className="sr-only">Loading stats</span>
      {[0, 1].map((k) => (
        <div key={k} className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ))}
      <Skeleton className="h-52 rounded-2xl" />
    </div>
  );
}
