"use client";
import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Analytics charts. Plain SVG + HTML, no chart library.
 *
 * Series colours are fixed per entity, never per rank: "Commented" is always
 * brand green, "Got the link" always olive. The pair was run through the
 * dataviz palette validator (CVD ΔE 20+); olive sits under 3:1 on the page, so
 * both series are also direct-labelled and carry a legend.
 */
export const SERIES = {
  contacts: { label: "Commented", color: "#2e7d4f" },
  completed: { label: "Got the link", color: "#879f0b" },
} as const;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function hourLabel(h: number) {
  const suffix = h < 12 ? "am" : "pm";
  const n = h % 12 === 0 ? 12 : h % 12;
  return `${n}${suffix}`;
}

function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => v / s <= 4)!;
  return Math.ceil(v / step) * step;
}

// ─── Trend: two areas, crosshair + one tooltip for both series ────────────────

export function TrendChart({
  points, bucketDays,
}: {
  points: { date: string; contacts: number; completed: number }[];
  bucketDays: number;
}) {
  const W = 720, H = 260, L = 36, R = 12, T = 16, B = 28;
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const max = niceMax(Math.max(1, ...points.map((p) => p.contacts)));
  const n = points.length;
  const x = (i: number) => L + (n <= 1 ? (W - L - R) / 2 : (i / (n - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);

  const path = (key: "contacts" | "completed") =>
    points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join("");
  const area = (key: "contacts" | "completed") =>
    `${path(key)}L${x(n - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;

  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const labelEvery = Math.max(1, Math.ceil(n / 7));
  const fmt = (d: string, long = false) =>
    new Date(d).toLocaleDateString(undefined, long ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric", month: "short" });

  function onMove(e: React.PointerEvent) {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box || n === 0) return;
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = n <= 1 ? 0 : Math.round(((px - L) / (W - L - R)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  const last = points[n - 1];
  const h = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto touch-none select-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="Comments and completed flows over time"
      >
        <defs>
          {(["contacts", "completed"] as const).map((k) => (
            <linearGradient key={k} id={`trend-${k}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={SERIES[k].color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={SERIES[k].color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e7e9e4" strokeDasharray={t === 0 ? undefined : "3 4"} />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" className="fill-gray-400 text-[11px] tabular-nums">
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text key={p.date} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-gray-400 text-[11px]">
              {fmt(p.date)}
            </text>
          ) : null
        )}
        <path d={area("contacts")} fill="url(#trend-contacts)" />
        <path d={area("completed")} fill="url(#trend-completed)" />
        <path d={path("contacts")} fill="none" stroke={SERIES.contacts.color} strokeWidth={2} strokeLinejoin="round" />
        <path d={path("completed")} fill="none" stroke={SERIES.completed.color} strokeWidth={2} strokeLinejoin="round" />
        {h && hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={T} y2={y(0)} stroke="#9ca39a" strokeWidth={1} />
            {(["contacts", "completed"] as const).map((k) => (
              <circle key={k} cx={x(hover)} cy={y(h[k])} r={4.5} fill={SERIES[k].color} stroke="#fff" strokeWidth={2} />
            ))}
          </g>
        )}
        {/* Direct labels on the latest point, so identity never rests on colour alone. */}
        {last && hover === null && (
          <>
            <circle cx={x(n - 1)} cy={y(last.contacts)} r={4} fill={SERIES.contacts.color} stroke="#fff" strokeWidth={2} />
            <circle cx={x(n - 1)} cy={y(last.completed)} r={4} fill={SERIES.completed.color} stroke="#fff" strokeWidth={2} />
          </>
        )}
      </svg>

      {h && hover !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 rounded-xl bg-gray-950 text-white px-3.5 py-2.5 shadow-xl text-xs min-w-[150px]"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: `translateX(${hover > n / 2 ? "calc(-100% - 12px)" : "12px"})`,
          }}
        >
          <p className="text-gray-400 mb-1.5">
            {bucketDays > 1 ? `Week of ${fmt(h.date)}` : fmt(h.date, true)}
          </p>
          {(["contacts", "completed"] as const).map((k) => (
            <p key={k} className="flex items-center gap-2 py-0.5">
              <span className="w-3 h-0.5 rounded-full" style={{ background: SERIES[k].color }} />
              <span className="font-bold tabular-nums text-sm">{h[k]}</span>
              <span className="text-gray-400">{SERIES[k].label}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; value?: number | string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-[4px]" style={{ background: i.color }} />
          {i.label}
          {i.value !== undefined && <span className="font-bold text-gray-950 tabular-nums">{i.value}</span>}
        </span>
      ))}
    </div>
  );
}

// ─── Funnel: where people drop out of the flow ────────────────────────────────

export function Funnel({
  steps,
}: {
  steps: { label: string; hint: string; value: number }[];
}) {
  const top = Math.max(1, steps[0]?.value ?? 0);
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const w = (s.value / top) * 100;
        const prev = i > 0 ? steps[i - 1].value : null;
        const kept = prev ? Math.round((s.value / prev) * 100) : null;
        return (
          <li key={s.label}>
            <div className="flex items-end justify-between gap-3 mb-1.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{s.label}</p>
                <p className="text-xs text-gray-400">{s.hint}</p>
              </div>
              <p className="text-sm tabular-nums whitespace-nowrap">
                <span className="font-extrabold text-gray-950">{s.value}</span>
                {kept !== null && (
                  <span className={cn("ml-2 text-xs font-semibold", kept >= 50 ? "text-brand-700" : "text-amber-700")}>
                    {kept}% kept
                  </span>
                )}
              </p>
            </div>
            <div className="h-9 rounded-xl bg-[#f1f2ee] overflow-hidden" title={`${s.label}: ${s.value}`}>
              <div
                className="h-full rounded-xl transition-[width] duration-500"
                style={{
                  width: `${s.value > 0 ? Math.max(w, 2) : 0}%`,
                  background: ["#123522", "#236840", "#2e7d4f", "#879f0b"][i] ?? "#2e7d4f",
                }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ─── Heatmap: when people start a flow, day × hour ───────────────────────────
// One square per person per reel, at their latest triggering comment — not a
// count of every comment (see lib/insights.ts).

// Sequential, one hue light → dark (the brand ramp). Zero is its own neutral.
const HEAT = ["#eef6f1", "#b0d6bf", "#80bb97", "#4f9a6d", "#236840", "#123522"];

export function Heatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(0, ...grid.flat());
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  const shade = (v: number) => (v === 0 ? "#f1f2ee" : HEAT[Math.min(HEAT.length - 1, Math.ceil((v / max) * HEAT.length) - 1)]);

  return (
    <div>
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="min-w-[560px]">
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: "36px repeat(24, minmax(0, 1fr))" }}>
            {grid.map((hours, d) => (
              <div key={d} className="contents">
                <span className="text-[11px] text-gray-400 self-center">{DAYS[d]}</span>
                {hours.map((v, h) => (
                  <button
                    type="button"
                    key={h}
                    aria-label={`${DAYS[d]} ${hourLabel(h)}: ${v} ${v === 1 ? "person" : "people"}`}
                    onPointerEnter={() => setHover({ d, h })}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover({ d, h })}
                    onBlur={() => setHover(null)}
                    className={cn(
                      "aspect-square rounded-[4px] transition-transform",
                      hover?.d === d && hover?.h === h && "ring-2 ring-gray-950 ring-offset-1 scale-110"
                    )}
                    style={{ background: shade(v) }}
                  />
                ))}
              </div>
            ))}
            <span />
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="text-[10px] text-gray-400 text-center pt-1">
                {h % 3 === 0 ? hourLabel(h) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-xs text-gray-500">
        <p className="h-4">
          {hover ? (
            <>
              <strong className="text-gray-950 tabular-nums">{grid[hover.d][hover.h]}</strong>{" "}
              {grid[hover.d][hover.h] === 1 ? "person" : "people"} started a flow on {DAYS[hover.d]}s at {hourLabel(hover.h)}
            </>
          ) : (
            "Hover a square for the count"
          )}
        </p>
        <span className="flex items-center gap-1.5">
          Fewer
          {["#f1f2ee", ...HEAT].map((c) => (
            <span key={c} className="w-3.5 h-3.5 rounded-[4px]" style={{ background: c }} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}

// ─── Ring: share of a whole, with the number in the middle ────────────────────

export function Ring({
  segments, center, caption,
}: {
  segments: { label: string; value: number; color: string }[];
  center: string;
  caption: string;
}) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  const R = 52, C = 2 * Math.PI * R, GAP = total > 0 && segments.filter((s) => s.value > 0).length > 1 ? 3 : 0;
  const arcs = useMemo(() => {
    let offset = 0;
    return segments.map((s) => {
      const len = total ? (s.value / total) * C : 0;
      const arc = { ...s, len: Math.max(0, len - GAP), offset };
      offset += len;
      return arc;
    });
  }, [segments, total, C, GAP]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
          <circle cx={64} cy={64} r={R} fill="none" stroke="#f1f2ee" strokeWidth={14} />
          {arcs.map((a) =>
            a.len > 0 ? (
              <circle
                key={a.label}
                cx={64}
                cy={64}
                r={R}
                fill="none"
                stroke={a.color}
                strokeWidth={14}
                strokeDasharray={`${a.len} ${C}`}
                strokeDashoffset={-a.offset}
              >
                <title>{`${a.label}: ${a.value}`}</title>
              </circle>
            ) : null
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-extrabold tracking-tight text-gray-950 tabular-nums">{center}</p>
          <p className="text-[11px] text-gray-500 -mt-0.5">{caption}</p>
        </div>
      </div>
      <ul className="space-y-2.5 text-sm flex-1 min-w-[190px]">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-[4px] shrink-0" style={{ background: s.color }} />
            <span className="text-gray-600">{s.label}</span>
            <span className="ml-auto pl-3 font-bold text-gray-950 tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Sparkline for stat tiles ────────────────────────────────────────────────

export function Sparkline({ values, color = "#2e7d4f" }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const W = 120, H = 36;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * W).toFixed(1)},${(H - 2 - (v / max) * (H - 4)).toFixed(1)}`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-28 h-9" aria-hidden>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── Lines: one metric, several entities on one axis (Compare) ───────────────

export function LinesChart({
  dates, series, bucketDays,
}: {
  dates: string[];
  series: { label: string; color: string; values: number[] }[];
  bucketDays: number;
}) {
  const W = 720, H = 240, L = 36, R = 12, T = 16, B = 28;
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const n = dates.length;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const x = (i: number) => L + (n <= 1 ? (W - L - R) / 2 : (i / (n - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const ticks = [0, max / 2, max];
  const labelEvery = Math.max(1, Math.ceil(n / 6));
  const fmt = (d: string, long = false) =>
    new Date(d).toLocaleDateString(undefined, long ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric", month: "short" });

  function onMove(e: React.PointerEvent) {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box || n === 0) return;
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = n <= 1 ? 0 : Math.round(((px - L) / (W - L - R)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto touch-none select-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Comments over time: ${series.map((s) => s.label).join(" vs ")}`}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e7e9e4" strokeDasharray={t === 0 ? undefined : "3 4"} />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" className="fill-gray-400 text-[11px] tabular-nums">
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          </g>
        ))}
        {dates.map((d, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text key={d} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-gray-400 text-[11px]">
              {fmt(d)}
            </text>
          ) : null
        )}
        {series.map((s) => (
          <path
            key={s.label}
            d={s.values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("")}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={T} y2={y(0)} stroke="#9ca39a" />
            {series.map((s) => (
              <circle key={s.label} cx={x(hover)} cy={y(s.values[hover])} r={4.5} fill={s.color} stroke="#fff" strokeWidth={2} />
            ))}
          </g>
        )}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 rounded-xl bg-gray-950 text-white px-3.5 py-2.5 shadow-xl text-xs min-w-[170px]"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > n / 2 ? "calc(-100% - 12px)" : "12px"})` }}
        >
          <p className="text-gray-400 mb-1.5">{bucketDays > 1 ? `Week of ${fmt(dates[hover])}` : fmt(dates[hover], true)}</p>
          {series.map((s) => (
            <p key={s.label} className="flex items-center gap-2 py-0.5">
              <span className="w-3 h-0.5 rounded-full" style={{ background: s.color }} />
              <span className="font-bold tabular-nums text-sm">{s.values[hover]}</span>
              <span className="text-gray-400 truncate max-w-[140px]">{s.label}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
