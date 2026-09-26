"use client";
import Image from "next/image";
import { ArrowDownRight, ArrowUpRight, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { delta as pctChange } from "@/lib/insights";
import { Sparkline } from "@/components/analytics/charts";

/** Stat tiles shared by the Analytics page and the quick-stats panel. */

export function Highlight({
  icon: Icon, label, value, note, thumb, onClick, compact,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  note: string;
  thumb?: string | null;
  onClick?: () => void;
  /** Tighter padding for the quick-stats panel. */
  compact?: boolean;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "text-left bg-white flex items-start min-w-0",
        compact ? "rounded-2xl p-3.5 gap-3" : "rounded-3xl p-5 gap-4",
        onClick && "cursor-pointer hover:shadow-lg transition-shadow"
      )}
    >
      {thumb ? (
        <span className={cn("relative rounded-xl overflow-hidden bg-gray-100 shrink-0", compact ? "w-9 h-9" : "w-11 h-11")}>
          <Image src={thumb} alt="" fill unoptimized className="object-cover" />
        </span>
      ) : (
        <span className={cn("rounded-xl bg-lime-100 text-brand-800 flex items-center justify-center shrink-0", compact ? "w-9 h-9" : "w-11 h-11")}>
          <Icon className={compact ? "w-4 h-4" : "w-5 h-5"} />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{label}</p>
        <p className={cn("font-extrabold text-gray-950 truncate mt-0.5", compact ? "text-[15px]" : "text-lg")}>{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{note}</p>
      </div>
    </Tag>
  );
}

export function Kpi({
  icon: Icon, label, value, raw, prev, vs, note, spark, sparkColor, invert, points, compact,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  raw?: number;
  prev?: number | null;
  vs: string;
  note?: string;
  spark?: number[];
  sparkColor?: string;
  invert?: boolean; // lower is better (failures)
  points?: boolean; // compare in percentage points, not relative %
  compact?: boolean; // quick-stats panel: smaller, no sparkline
}) {
  const cur = raw ?? (typeof value === "number" ? value : 0);
  const change = prev === undefined || prev === null ? null : points ? Math.round((cur - prev) * 10) / 10 : pctChange(cur, prev ?? null);
  const good = change === null || change === 0 ? null : invert ? change < 0 : change > 0;

  return (
    <div className={cn("bg-white flex flex-col", compact ? "rounded-2xl p-4 gap-2" : "rounded-3xl p-5 gap-3")}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-600">{label}</p>
        <span className="w-8 h-8 rounded-full bg-[#f3f4f1] flex items-center justify-center">
          <Icon className="w-4 h-4 text-gray-500" />
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className={cn("font-extrabold tracking-tight text-gray-950 tabular-nums", compact ? "text-3xl" : "text-4xl")}>{value}</p>
        {!compact && spark && spark.some((v) => v > 0) && <Sparkline values={spark} color={sparkColor} />}
      </div>
      <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
        {change !== null && vs ? (
          <>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-bold rounded-full px-1.5 py-0.5",
                good === null ? "bg-gray-100 text-gray-600" : good ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              )}
            >
              {change > 0 ? <ArrowUpRight className="w-3 h-3" /> : change < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
              {change > 0 ? "+" : ""}
              {change}
              {points ? " pts" : "%"}
            </span>
            {compact ? "" : `vs ${vs}`}
          </>
        ) : (
          note ?? (vs ? (compact ? "New" : `New vs ${vs}`) : "All time")
        )}
        {change !== null && note && <span className="text-gray-400">· {note}</span>}
      </p>
    </div>
  );
}

export function Thumb({ src }: { src?: string | null }) {
  return (
    <div className="relative w-11 h-11 rounded-xl bg-gray-100 overflow-hidden shrink-0">
      {src ? (
        <Image src={src} alt="" fill unoptimized className="object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
          <MessageCircle className="w-4 h-4 text-lime" />
        </div>
      )}
    </div>
  );
}
