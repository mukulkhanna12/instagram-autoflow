"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Heart, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The hero's phone, played out: a comment lands, gets a like and a public
 * reply, then the DM thread builds up — typing dots before each message, the
 * follow gate, their tap, the link — and loops. Tilts a little towards the
 * pointer for depth. With reduced motion it shows the finished thread, still.
 * Handles and wording are illustrative.
 */

// What's visible at each beat, and how long each beat lasts (ms).
const BEATS = [700, 900, 900, 1100, 1300, 1300, 1000, 1300, 3200] as const;
//              0 comment · 1 heart · 2 reply · 3 typing · 4 dm1 · 5 dm2 · 6 tap · 7 dm3 · 8 hold

export function DmMockup() {
  const [beat, setBeat] = useState(BEATS.length - 1);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [still, setStill] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setStill(reduce);
    if (reduce) return;
    setBeat(0);
  }, []);

  useEffect(() => {
    if (still) return;
    const t = setTimeout(() => setBeat((b) => (b + 1) % BEATS.length), BEATS[beat]);
    return () => clearTimeout(t);
  }, [beat, still]);

  function onMove(e: React.PointerEvent) {
    if (still || !box.current) return;
    const r = box.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 10, y: px * 12 });
  }

  const at = (n: number) => still || beat >= n;
  const typing = !still && (beat === 3 || beat === 6);

  return (
    <div
      ref={box}
      onPointerMove={onMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      className="relative mx-auto w-full max-w-[340px] [perspective:1200px]"
    >
      <div className="absolute -inset-6 rounded-[3rem] bg-lime/40 blur-2xl" aria-hidden />
      <div
        className="relative rounded-[3rem] bg-gray-950 p-2.5 shadow-2xl transition-transform duration-300 ease-out [transform-style:preserve-3d] ring-1 ring-white/10"
        style={{ transform: `rotateX(${tilt.x + 4}deg) rotateY(${tilt.y - 8}deg)` }}
      >
        {/* Side buttons: action + volume on the left, power on the right */}
        <span className="absolute -left-[3px] top-24 w-[3px] h-7 rounded-l bg-gray-800" aria-hidden />
        <span className="absolute -left-[3px] top-36 w-[3px] h-12 rounded-l bg-gray-800" aria-hidden />
        <span className="absolute -left-[3px] top-52 w-[3px] h-12 rounded-l bg-gray-800" aria-hidden />
        <span className="absolute -right-[3px] top-40 w-[3px] h-16 rounded-r bg-gray-800" aria-hidden />

        <div className="relative rounded-[2.5rem] bg-white overflow-hidden flex flex-col">
          {/* Status bar + island */}
          <div className="relative flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold text-gray-900 shrink-0">
            <span>9:41</span>
            <span className="absolute left-1/2 -translate-x-1/2 top-2 w-20 h-5 rounded-full bg-gray-950" aria-hidden />
            <span className="flex items-center gap-1" aria-hidden>
              <span className="w-3.5 h-2 rounded-[2px] bg-gray-900" />
              <span className="w-5 h-2.5 rounded-[3px] border border-gray-900 p-px"><span className="block h-full w-3/4 rounded-[1px] bg-gray-900" /></span>
            </span>
          </div>
          {/* Comment on the reel */}
          <div className="px-5 pt-3 pb-4 border-b border-gray-100 min-h-[112px] shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Comments</p>
            <div className={cn("flex gap-3 transition-all duration-500", at(0) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")}>
              <span className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center shrink-0">P</span>
              <div className="flex-1">
                <p className="text-[13px]"><span className="font-bold">priya.makes</span> LINK please! 🙏</p>
                <div className={cn("flex gap-2.5 mt-3 transition-all duration-500", at(2) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")}>
                  <span className="w-6 h-6 rounded-full bg-lime text-brand-900 text-[10px] font-extrabold flex items-center justify-center shrink-0">AF</span>
                  <p className="text-[13px]"><span className="font-bold">you</span> Sent you a DM! 📩</p>
                </div>
              </div>
              <Heart
                className={cn(
                  "w-4 h-4 shrink-0 mt-1 transition-all duration-300",
                  at(1) ? "text-rose-500 fill-rose-500 scale-100" : "text-gray-300 scale-75"
                )}
              />
            </div>
          </div>

          {/* DM thread */}
          <div className="h-[300px] px-4 py-4 flex flex-col justify-end gap-2.5 bg-[#fafbf8] overflow-hidden">
            <Pop show={at(4)}><Bubble>Hey Priya! 👋 Here&apos;s the guide you asked for.</Bubble></Pop>
            <Pop show={at(5)}>
              <Bubble>
                Follow me first so you never miss the next one 🙏
                <span className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-white text-gray-950 text-[11px] font-bold py-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> I&apos;ve followed
                </span>
              </Bubble>
            </Pop>
            <Pop show={at(6)} right>
              <span className="inline-block rounded-2xl rounded-br-md bg-brand-600 text-white text-[13px] px-3 py-1.5">Done ✓</span>
            </Pop>
            <Pop show={at(7)}>
              <Bubble>
                Here you go 🎉
                <span className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-lime text-gray-950 text-[11px] font-bold py-1.5">
                  Get the guide <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Bubble>
            </Pop>
            {typing && (
              <div className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md bg-gray-200/80 px-3 py-2.5" aria-hidden>
                {[0, 150, 300].map((d) => (
                  <span key={d} className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Pop({ show, right, children }: { show: boolean; right?: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <div className={cn("animate-pop", right && "text-right")}>
      {children}
    </div>
  );
}

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[82%] rounded-2xl rounded-bl-md bg-gray-200/80 text-gray-900 text-[13px] px-3 py-2">
      {children}
    </div>
  );
}
