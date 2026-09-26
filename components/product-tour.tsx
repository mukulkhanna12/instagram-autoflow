"use client";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The first-run product tour: a spotlight on each part of the app with a short
 * explanation, stepped with Next / Back (or ← →, Esc to close).
 *
 * It points only at things present on every signed-in page — the sidebar, the
 * top bar and the edge tabs — so it can start from anywhere. Steps whose
 * target isn't on screen (a phone layout, say) are shown centred instead.
 *
 * Starts on its own once per user (User.tourSeenAt), right after the welcome
 * quick-start is closed, and can be replayed with startProductTour() — the
 * profile menu does that.
 */

const START_EVENT = "autoflow:start-tour";

export function startProductTour() {
  window.dispatchEvent(new Event(START_EVENT));
}

interface Step {
  /** data-tour value of the element to highlight; none = a centred card. */
  target?: string;
  title: string;
  body: React.ReactNode;
}

const STEPS: Step[] = [
  {
    title: "Welcome to AutoFlow 👋",
    body: "A one-minute tour of where everything lives. Use Next and Back, or your arrow keys — you can leave any time.",
  },
  {
    target: "workspace",
    title: "Your workspace",
    body: "Everything for one Instagram account lives in a workspace. Invite people to help from here, or create another workspace for a second account — like a client's.",
  },
  {
    target: "new-automation",
    title: "Create",
    body: "Start a new automation from here: a reel you've already posted, your next reel, or a ready-made playbook.",
  },
  {
    target: "nav-dashboard",
    title: "Dashboard",
    body: "Your home: people reached, messages sent, new follows, and every automation with a pause button.",
  },
  {
    target: "nav-triggers",
    title: "Automations",
    body: "Build a complete automation — reel, keyword and every message — with a live phone preview. The Upcoming reels tab here holds flows for reels you haven't posted yet.",
  },
  {
    target: "nav-analytics",
    title: "Analytics",
    body: "Go deeper: trends over time, your best reels, when people comment, and why any message failed.",
  },
  {
    target: "nav-posts",
    title: "Reels",
    body: "Every reel on your account. Pick one to set up its comment reply, DMs and follow gate — then switch it Live.",
  },
  {
    target: "nav-playbooks",
    title: "Playbooks",
    body: "Ready-made automations with every message written. Choose one, paste your link, pick the reel — done.",
  },
  {
    target: "search",
    title: "Search anything",
    body: "Jump to any page, playbook or action. Press ⌘K (Ctrl K on Windows) from anywhere.",
  },
  {
    target: "dock",
    title: "Stats & Help",
    body: "Quick stats for any reel, and a help assistant with answers from our guides — always one click away on the right.",
  },
  {
    target: "profile",
    title: "Your account",
    body: "Your profile, sign-in options and Log out. You can replay this tour from here any time.",
  },
  {
    title: "You're all set 🎉",
    body: "Best first step: open Playbooks, pick one, and set up a reel. It takes about a minute.",
  },
];

interface Rect { top: number; left: number; width: number; height: number }

const PAD = 8;
const CARD_W = 340;

export function ProductTour({ autoStart }: { autoStart: boolean }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const begin = useCallback(() => { setI(0); setOpen(true); }, []);

  // Replays, and the start right after the welcome quick-start closes.
  useEffect(() => {
    window.addEventListener(START_EVENT, begin);
    return () => window.removeEventListener(START_EVENT, begin);
  }, [begin]);

  // First visit when there's no quick-start to wait for.
  useEffect(() => {
    if (!autoStart) return;
    const t = setTimeout(begin, 600);
    return () => clearTimeout(t);
  }, [autoStart, begin]);

  const step = STEPS[i];

  const measure = useCallback(() => {
    if (!step?.target) return setRect(null);
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    const r = el?.getBoundingClientRect();
    if (!r || r.width === 0 || r.height === 0) return setRect(null);
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [step]);

  useLayoutEffect(() => {
    if (!open) return;
    document.querySelector(`[data-tour="${step?.target}"]`)?.scrollIntoView({ block: "nearest" });
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, i, measure, step]);

  const finish = useCallback(() => {
    setOpen(false);
    fetch("/api/onboarding/tour", { method: "POST" }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") setI((n) => (n < STEPS.length - 1 ? n + 1 : n));
      else if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish]);

  if (!open || !step) return null;

  const last = i === STEPS.length - 1;

  // Put the card beside the highlight: right of it if there's room, else left,
  // else below. Clamped to the viewport.
  let cardStyle: React.CSSProperties = { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  if (rect && typeof window !== "undefined") {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 16;
    let left: number;
    let top = rect.top;
    if (rect.left + rect.width + gap + CARD_W <= vw - 12) left = rect.left + rect.width + gap;
    else if (rect.left - gap - CARD_W >= 12) left = rect.left - gap - CARD_W;
    else { left = rect.left; top = rect.top + rect.height + gap; }
    left = Math.max(12, Math.min(left, vw - CARD_W - 12));
    top = Math.max(12, Math.min(top, vh - 260));
    cardStyle = { left, top };
  }

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Product tour">
      {/* Dimmed page, with a hole cut around the highlighted element */}
      {rect ? (
        <div
          className="fixed rounded-2xl ring-2 ring-lime transition-all duration-300 pointer-events-none"
          style={{ ...rect, boxShadow: "0 0 0 9999px rgba(8, 20, 13, 0.62)" }}
        />
      ) : (
        <div className="fixed inset-0 bg-[rgba(8,20,13,0.62)]" />
      )}
      {/* Clicks outside the card do nothing — the tour is left with Skip or Esc */}
      <div className="fixed inset-0" />

      <div
        className="fixed w-[340px] max-w-[calc(100vw-24px)] rounded-3xl bg-white p-6 shadow-2xl transition-all duration-300"
        style={cardStyle}
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-100 text-brand-900 text-[11px] font-extrabold px-2.5 py-1">
            <Sparkles className="w-3 h-3" /> {i + 1} of {STEPS.length}
          </span>
          <button onClick={finish} aria-label="Close the tour" className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-4 text-lg font-extrabold text-gray-950">{step.title}</p>
        <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{step.body}</p>

        {/* Progress */}
        <div className="mt-5 flex gap-1">
          {STEPS.map((_, n) => (
            <span key={n} className={cn("h-1.5 rounded-full transition-all", n === i ? "w-6 bg-brand-700" : n < i ? "w-1.5 bg-brand-300" : "w-1.5 bg-gray-200")} />
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2">
          {i === 0 ? (
            <button onClick={finish} className="text-sm font-semibold text-gray-500 hover:text-gray-900 cursor-pointer">Skip tour</button>
          ) : (
            <button onClick={() => setI(i - 1)} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-gray-200 text-sm font-bold text-gray-700 hover:border-gray-300 cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          <button
            onClick={() => (last ? finish() : setI(i + 1))}
            className="ml-auto inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-lime text-gray-950 text-sm font-extrabold hover:bg-lime-400 cursor-pointer"
          >
            {last ? "Get started" : i === 0 ? "Start the tour" : "Next"} {!last && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
