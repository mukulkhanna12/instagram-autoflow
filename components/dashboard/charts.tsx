import { cn } from "@/lib/utils";

/**
 * 6.png's pill bar chart. Days with nothing are drawn hatched rather than as a
 * stub, so an empty week still reads as a week. Today is the darkest bar.
 */
export function ActivityBars({ days }: { days: { date: string; count: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const peak = days.reduce((best, d, i) => (d.count > days[best].count ? i : best), 0);
  return (
    <div className="flex items-end justify-between gap-3 h-52 pt-8">
      {days.map((d, i) => {
        const today = i === days.length - 1;
        const h = d.count === 0 ? 55 : 30 + (d.count / max) * 70;
        const label = new Date(d.date).toLocaleDateString(undefined, { weekday: "narrow" });
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-3 h-full justify-end">
            <div className="relative w-full max-w-[60px] flex-1 flex items-end">
              {d.count > 0 && i === peak && (
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[11px] font-bold text-brand-800 bg-brand-50 border border-brand-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                  {d.count}
                </span>
              )}
              <div
                title={`${new Date(d.date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}: ${d.count}`}
                style={{ height: `${h}%` }}
                className={cn(
                  "w-full rounded-full",
                  d.count === 0 ? "hatch" : today ? "bg-brand-900" : i === peak ? "bg-brand-300" : "bg-brand-600"
                )}
              />
            </div>
            <span className={cn("text-sm", today ? "font-bold text-gray-950" : "text-gray-400")}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 6.png's half-donut. Three segments over a 180° arc: finished (green),
 * waiting on the follow gate (dark), and greeted-but-not-clicked (hatched).
 */
export function CompletionGauge({
  completed, gated, greeted,
}: {
  completed: number;
  gated: number;
  greeted: number;
}) {
  const total = completed + gated + greeted;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const R = 80;
  const C = Math.PI * R; // half circumference
  const seg = (n: number) => (total ? (n / total) * C : 0);
  const a = seg(completed);
  const b = seg(gated);
  const c = total ? C - a - b : C;

  return (
    <div>
      <div className="relative mx-auto w-full max-w-[260px]">
        <svg viewBox="0 0 200 112" className="w-full">
          <defs>
            <pattern id="gauge-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#fff" />
              <rect width="2" height="6" fill="#c9ccc6" />
            </pattern>
          </defs>
          {/* The arc runs left → right over the top, so green leads from the left. */}
          <Arc R={R} len={c} offset={a + b} stroke="url(#gauge-hatch)" C={C} />
          <Arc R={R} len={b} offset={a} stroke="#123522" C={C} />
          <Arc R={R} len={a} offset={0} stroke="#2e7d4f" C={C} />
        </svg>
        <div className="absolute inset-x-0 bottom-1 text-center">
          <p className="text-4xl font-extrabold tracking-tight text-gray-950">{pct}%</p>
          <p className="text-sm text-gray-500 -mt-0.5">got the link</p>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-5 text-sm text-gray-600">
        <Legend swatch="bg-brand-500" label="Got the link" value={completed} />
        <Legend swatch="bg-brand-900" label="At follow gate" value={gated} />
        <Legend swatch="hatch border border-gray-300" label="Opened DM only" value={greeted} />
      </div>
    </div>
  );
}

function Arc({ R, len, offset, stroke, C }: { R: number; len: number; offset: number; stroke: string; C: number }) {
  if (len <= 0) return null;
  return (
    <path
      d={`M ${100 - R} 100 A ${R} ${R} 0 0 1 ${100 + R} 100`}
      fill="none"
      stroke={stroke}
      strokeWidth={30}
      strokeLinecap="butt"
      strokeDasharray={`${len} ${C * 2}`}
      strokeDashoffset={-offset}
    />
  );
}

function Legend({ swatch, label, value }: { swatch: string; label: string; value: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn("w-3.5 h-3.5 rounded-full", swatch)} />
      {label} <span className="font-bold text-gray-950">{value}</span>
    </span>
  );
}
