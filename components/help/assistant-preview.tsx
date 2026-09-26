"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { HERO_DEMOS } from "@/lib/help/hero-demos";
import { articleBySlug } from "@/lib/help/articles";
import { Inline } from "./rich-text";
import { AskAssistantButton } from "./ask-assistant-button";
import { cn } from "@/lib/utils";

/**
 * The hero's assistant card, playing short conversations on a loop: the
 * question types itself into the input, is sent, the bot "types", the answer
 * lands, holds, and the next one starts.
 *
 * Everything hangs off one clock — ms since this conversation started — so the
 * progress bar and the animation can never drift apart. Hovering the card
 * pauses the clock; the bars under it jump to any conversation. With reduced
 * motion the answer shows straight away and only the swap remains.
 */

type Phase = "typing" | "thinking" | "answer" | "leaving";

const START_MS = 250;
const CHAR_MS = 38;
const SEND_MS = 250;
const THINK_MS = 600;
const HOLD_MS = 2000;
const LEAVE_MS = 400;

function timeline(question: string) {
  const typeEnd = START_MS + question.length * CHAR_MS;
  const thinkStart = typeEnd + SEND_MS;
  const answerStart = thinkStart + THINK_MS;
  const leaveStart = answerStart + HOLD_MS;
  return { thinkStart, answerStart, leaveStart, total: leaveStart + LEAVE_MS };
}

export function AssistantPreview() {
  const [index, setIndex] = useState(0);
  const [t, setT] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  const demo = HERO_DEMOS[index];
  const article = articleBySlug(demo.slug);
  const tl = timeline(demo.question);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (paused) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // Capped, so coming back to a backgrounded tab (where frames stop)
      // resumes the conversation instead of skipping through it.
      const dt = Math.min(now - last, 100);
      last = now;
      setT((x) => x + dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  // Past the end of this conversation → on to the next.
  useEffect(() => {
    if (t >= tl.total) go((index + 1) % HERO_DEMOS.length);
  }, [t, tl.total, index]);

  function go(i: number) {
    setIndex(i);
    setT(0);
  }

  const phase: Phase = reduced
    ? t < tl.leaveStart ? "answer" : "leaving"
    : t < tl.thinkStart ? "typing" : t < tl.answerStart ? "thinking" : t < tl.leaveStart ? "answer" : "leaving";
  const typed = Math.max(0, Math.min(demo.question.length, Math.floor((t - START_MS) / CHAR_MS)));
  const progress = Math.min(1, t / tl.total);

  const sent = phase !== "typing";
  const leaving = phase === "leaving";

  return (
    <div className="relative hidden lg:block">
      <style>{KEYFRAMES}</style>

      {/* Lime frame behind the card, drifting slowly. */}
      <div className="absolute -inset-4 rounded-[2.25rem] bg-lime/10 motion-safe:animate-[af-drift_9s_ease-in-out_infinite]" style={{ rotate: "2deg" }} />
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-lime/25 blur-3xl motion-safe:animate-[af-glow_5s_ease-in-out_infinite]" />

      <div className="relative motion-safe:animate-[af-float_7s_ease-in-out_infinite]">
        <div
          className="overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-black/30"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Header */}
          <div className="flex items-center gap-3 bg-brand-900 px-5 py-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime text-brand-900">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-extrabold text-white">AutoFlow Assistant</p>
              <p className="flex items-center gap-1.5 text-xs text-brand-100/70">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-lime opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-lime" />
                </span>
                {phase === "thinking" ? "Typing…" : "Answers instantly"}
              </p>
            </div>
          </div>

          {/* Conversation — fixed height so the card doesn't jump between answers. */}
          <div
            className={cn(
              "flex h-[292px] flex-col justify-end gap-3 overflow-hidden bg-[#f7f8f5] p-5 text-[14px] leading-relaxed transition-all duration-[450ms]",
              leaving ? "-translate-y-3 opacity-0" : "translate-y-0 opacity-100"
            )}
          >
            {sent && (
              <div key={`q${index}`} className="flex justify-end motion-safe:animate-[af-pop_.35s_ease-out]">
                <p className="rounded-2xl rounded-br-md bg-brand-700 px-4 py-2.5 text-white">{demo.question}</p>
              </div>
            )}

            {phase === "thinking" && (
              <div className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3.5 shadow-sm ring-1 ring-gray-100 motion-safe:animate-[af-pop_.3s_ease-out]">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-brand-300" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            )}

            {(phase === "answer" || leaving) && (
              <div key={`a${index}`} className="max-w-[92%] rounded-2xl rounded-bl-md bg-white p-4 text-gray-700 shadow-sm ring-1 ring-gray-100 motion-safe:animate-[af-rise_.5s_cubic-bezier(.2,.8,.2,1)]">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand-600">{article?.title}</p>
                <p className="mt-1.5"><Inline text={demo.answer} /></p>
                <Link
                  href={`/help/${demo.slug}`}
                  className="group mt-3 flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2 text-xs font-bold text-brand-800 hover:bg-brand-100"
                >
                  Read the full article <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Input — the question types itself here before it's "sent". */}
          <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-4">
            <p className="min-w-0 flex-1 truncate text-sm">
              {phase === "typing" && typed > 0 && !reduced ? (
                <span className="text-gray-900">
                  {demo.question.slice(0, typed)}
                  <span className="ml-px inline-block h-4 w-0.5 translate-y-0.5 bg-brand-600 motion-safe:animate-[af-caret_1s_steps(1)_infinite]" />
                </span>
              ) : (
                <span className="text-gray-400">Ask anything about AutoFlow…</span>
              )}
            </p>
            <AskAssistantButton label="Try it" className="h-9" />
          </div>
        </div>

        {/* Progress: one bar per conversation, the current one filling up. */}
        <div className="mt-5 flex items-center justify-center gap-2">
          {HERO_DEMOS.map((d, i) => (
            <button
              key={d.slug}
              onClick={() => go(i)}
              aria-label={`Show: ${d.question}`}
              className="group relative h-1.5 w-10 overflow-hidden rounded-full bg-white/15 cursor-pointer hover:bg-white/25"
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-lime"
                style={{ width: `${i < index ? 100 : i > index ? 0 : progress * 100}%` }}
              />
            </button>
          ))}
        </div>
        <p className={cn("mt-2 text-center text-xs text-brand-100/50 transition-opacity", paused ? "opacity-100" : "opacity-0")}>
          Paused
        </p>
      </div>
    </div>
  );
}

// Scoped by name (af-*) rather than added to tailwind.config.ts, so this
// component carries its own motion and doesn't touch shared config.
const KEYFRAMES = `
@keyframes af-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
@keyframes af-drift { 0%,100% { rotate: 2deg } 50% { rotate: 3.5deg; transform: translateY(4px) } }
@keyframes af-glow { 0%,100% { opacity: .5; transform: scale(1) } 50% { opacity: 1; transform: scale(1.15) } }
@keyframes af-pop { from { opacity: 0; transform: translateY(6px) scale(.96) } to { opacity: 1; transform: none } }
@keyframes af-rise { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
@keyframes af-caret { 50% { opacity: 0 } }
`;
