"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Gift, Send } from "lucide-react";
import { FEEDBACK_TYPES, MESSAGE_MAX, MESSAGE_MIN, type FeedbackType } from "@/lib/feedback";
import { cn } from "@/lib/utils";

const PLACEHOLDER: Record<FeedbackType, string> = {
  idea: "I'd love it if AutoFlow could…",
  feedback: "What's working well, or what could be better?",
  bug: "What happened, and what did you expect instead?",
  other: "Anything on your mind…",
};

/**
 * The feedback form on /feedback. Sends the
 * page you were on along with it, so the context isn't lost.
 */
export function FeedbackForm({ onSent, showPageLink = true }: { onSent?: () => void; showPageLink?: boolean }) {
  const path = usePathname();
  const [type, setType] = useState<FeedbackType>("idea");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, message, page: path }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Couldn't send that — try again.");
    setSent(true);
    setMessage("");
    onSent?.();
  }

  if (sent) {
    return (
      <div className="text-center py-4">
        <span className="mx-auto w-14 h-14 rounded-2xl bg-lime text-gray-950 flex items-center justify-center text-2xl">🙌</span>
        <p className="mt-4 text-lg font-extrabold text-gray-950">Thank you — we read every one.</p>
        <p className="mt-1.5 text-sm text-gray-500 max-w-sm mx-auto">
          If it helps us improve AutoFlow — an idea, a bug you found, or feedback on anything — we may thank you with a discount.
          You can follow its status any time.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button onClick={() => setSent(false)} className="h-10 px-4 rounded-full border border-gray-200 text-sm font-bold text-gray-700 hover:border-gray-300 cursor-pointer">
            Send another
          </button>
          {showPageLink && (
            <Link href="/feedback" className="h-10 px-4 rounded-full bg-gray-950 text-white text-sm font-bold inline-flex items-center gap-1.5 hover:bg-brand-900">
              See your feedback <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    );
  }

  const len = message.trim().length;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="What is it?">
        {(Object.keys(FEEDBACK_TYPES) as FeedbackType[]).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={cn(
              "h-11 rounded-2xl border text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors",
              type === t ? "border-brand-600 bg-brand-50 text-brand-800" : "border-gray-200 text-gray-600 hover:border-gray-300"
            )}
          >
            <span>{FEEDBACK_TYPES[t].emoji}</span> {FEEDBACK_TYPES[t].label}
          </button>
        ))}
      </div>

      <div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={MESSAGE_MAX}
          rows={5}
          placeholder={PLACEHOLDER[type]}
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
        />
        <p className="mt-1 text-right text-[11px] text-gray-400 tabular-nums">{len}/{MESSAGE_MAX}</p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-lime-50 border border-lime-200 px-4 py-3">
        <Gift className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-700 leading-relaxed">
          <b>We reward helpful input — not just ideas.</b> Found a bug, love (or don&apos;t love) the design,
          or have a suggestion? Anything that helps us improve AutoFlow may earn you a discount.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={busy || len < MESSAGE_MIN}
        className="w-full h-12 rounded-full bg-lime text-gray-950 font-extrabold hover:bg-lime-400 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 cursor-pointer"
      >
        <Send className="w-4 h-4" /> {busy ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
