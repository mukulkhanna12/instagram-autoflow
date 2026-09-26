"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, Send, ArrowRight, ThumbsUp, ThumbsDown, Instagram, Sparkles, MessageCircleQuestion } from "lucide-react";
import { answerQuestion, searchArticles } from "@/lib/help/search";
import { SUPPORT, type Article } from "@/lib/help/articles";
import { cn } from "@/lib/utils";

const OPEN_EVENT = "autoflow:help-assistant";

/** Open the assistant from anywhere, optionally asking `question` straight away. */
export function openHelpAssistant(question?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { question } }));
}

const SUGGESTIONS = [
  "My automation isn't replying",
  "Why didn't they get my DM?",
  "How do keywords work?",
  "Reply to old comments",
  "Is it safe for my account?",
];

type Msg =
  | { id: number; from: "user"; text: string }
  | { id: number; from: "bot"; kind: "welcome" }
  | { id: number; from: "bot"; kind: "answer"; article: Article; snippet: string; related: Article[]; rated?: "up" | "down" }
  | { id: number; from: "bot"; kind: "unsure"; maybe: Article[] };

let nextId = 1;

/**
 * The floating help assistant. It answers from the help articles only — see
 * lib/help/search.ts for why there's no LLM behind it — and every answer links
 * to the full article. When it can't help, it says so and hands over to a human.
 */
export function HelpAssistant({ raised = false }: {
  /** Sit above another corner button (the dashboard's Quick stats) instead of in the corner. */
  raised?: boolean;
} = {}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, from: "bot", kind: "welcome" }]);
  const [thinking, setThinking] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function ask(question: string) {
    const q = question.trim();
    if (!q) return;
    const a = answerQuestion(q);
    const reply: Msg = a
      ? { id: nextId++, from: "bot", kind: "answer", ...a }
      : { id: nextId++, from: "bot", kind: "unsure", maybe: searchArticles(q, 3).map((h) => h.article) };
    setMsgs((m) => [...m, { id: nextId++, from: "user", text: q }]);
    setInput("");
    // The answer is instant; a beat of "typing" makes it read as a reply
    // rather than the panel jumping.
    setThinking(true);
    setTimeout(() => {
      setMsgs((m) => [...m, reply]);
      setThinking(false);
    }, 550);
  }

  function rate(id: number, rated: "up" | "down") {
    setMsgs((m) => m.map((x) => (x.id === id && x.from === "bot" && x.kind === "answer" ? { ...x, rated } : x)));
  }

  useEffect(() => {
    function onOpen(e: Event) {
      setOpen(true);
      const q = (e as CustomEvent<{ question?: string }>).detail?.question;
      if (q) ask(q);
    }
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open, thinking]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const asked = msgs.filter((m): m is Extract<Msg, { from: "user" }> => m.from === "user").map((m) => m.text);
  const followUps = SUGGESTIONS.filter((s) => !asked.includes(s)).slice(0, asked.length ? 3 : SUGGESTIONS.length);

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Help assistant"
          className={cn(
            "fixed z-50 inset-x-3 bottom-3 top-16 sm:inset-auto sm:right-6 sm:w-[400px] flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5",
            raised ? "sm:bottom-[9.5rem] sm:h-[min(640px,calc(100vh-11.5rem))]" : "sm:bottom-24 sm:h-[min(640px,calc(100vh-8rem))]"
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 bg-brand-900 px-5 py-4 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lime text-brand-900">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold leading-tight">AutoFlow Assistant</p>
              <p className="flex items-center gap-1.5 text-xs text-brand-100/80">
                <span className="h-1.5 w-1.5 rounded-full bg-lime" /> Instant answers from our help articles
              </p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1.5 text-brand-100 hover:bg-white/10 cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Conversation */}
          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto bg-[#f7f8f5] px-4 py-5">
            {msgs.map((m) =>
              m.from === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-700 px-4 py-2.5 text-[15px] text-white">{m.text}</p>
                </div>
              ) : (
                <BotBubble key={m.id}>
                  {m.kind === "welcome" && (
                    <div>
                      <p className="font-extrabold text-gray-950">Hi there! 👋</p>
                      <p className="mt-1">
                        Ask me anything about AutoFlow: setting up a reel, keywords, the follow gate, or why a DM
                        didn&apos;t send. Pick a question below or type your own.
                      </p>
                    </div>
                  )}
                  {m.kind === "answer" && (
                    <AnswerCard msg={m} onRate={(r) => rate(m.id, r)} onClose={() => setOpen(false)} />
                  )}
                  {m.kind === "unsure" && (
                    <div className="space-y-3">
                      <p>I couldn&apos;t find a clear answer to that in the help articles.</p>
                      {m.maybe.length > 0 && (
                        <div>
                          <p className="mb-1.5 text-sm text-gray-500">Maybe one of these?</p>
                          <ArticleLinks articles={m.maybe} onClick={() => setOpen(false)} />
                        </div>
                      )}
                      <ContactHuman />
                    </div>
                  )}
                </BotBubble>
              )
            )}

            {thinking && (
              <BotBubble>
                <span className="flex h-5 items-center gap-1" aria-label="Typing">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-brand-300" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
              </BotBubble>
            )}

            {!thinking && followUps.length > 0 && (
              <div className="flex flex-wrap gap-2 pl-10 pt-1">
                {asked.length > 0 && <p className="w-full text-xs font-semibold text-gray-400">Ask something else</p>}
                {followUps.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-brand-800 hover:border-brand-500 hover:bg-brand-50 cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); ask(input); }}
            className="flex items-center gap-2 border-t border-gray-100 bg-white p-3"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              aria-label="Your question"
              className="h-11 min-w-0 flex-1 rounded-full bg-[#f3f4f1] px-4 text-[15px] outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lime text-gray-950 hover:bg-lime-400 disabled:opacity-40 cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close help" : "Open help"}
        className={cn(
          "fixed z-50 flex h-14 items-center gap-2 rounded-full shadow-xl transition-all cursor-pointer",
          raised ? "bottom-[5.25rem] right-6" : "bottom-5 right-5 sm:bottom-6 sm:right-6",
          // On phones the open panel covers the screen and has its own close.
          open ? "hidden sm:flex w-14 justify-center bg-gray-950 text-white" : "bg-brand-700 pl-4 pr-5 text-white hover:bg-brand-800"
        )}
      >
        {open ? <X className="h-6 w-6" /> : <><MessageCircleQuestion className="h-6 w-6 text-lime" /><span className="font-bold">Help</span></>}
      </button>
    </>
  );
}

function BotBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-900 text-lime">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-[15px] leading-relaxed text-gray-800 shadow-sm ring-1 ring-gray-100">
        {children}
      </div>
    </div>
  );
}

function AnswerCard({
  msg, onRate, onClose,
}: {
  msg: Extract<Msg, { kind: "answer" }>;
  onRate: (r: "up" | "down") => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-brand-600">{msg.article.title}</p>
      <p className="whitespace-pre-line">{msg.snippet}</p>
      <Link
        href={`/help/${msg.article.slug}`}
        onClick={onClose}
        className="flex items-center justify-between gap-2 rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm font-bold text-brand-800 hover:bg-brand-100"
      >
        Read the full article <ArrowRight className="h-4 w-4" />
      </Link>

      {msg.related.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm text-gray-500">Related</p>
          <ArticleLinks articles={msg.related} onClick={onClose} />
        </div>
      )}

      <div className="border-t border-gray-100 pt-3">
        {!msg.rated && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            Did this answer it?
            <button onClick={() => onRate("up")} aria-label="Yes" className="rounded-full p-1.5 hover:bg-brand-50 hover:text-brand-700 cursor-pointer">
              <ThumbsUp className="h-4 w-4" />
            </button>
            <button onClick={() => onRate("down")} aria-label="No" className="rounded-full p-1.5 hover:bg-red-50 hover:text-red-600 cursor-pointer">
              <ThumbsDown className="h-4 w-4" />
            </button>
          </div>
        )}
        {msg.rated === "up" && <p className="text-sm font-semibold text-brand-700">Great, glad that helped! 🎉</p>}
        {msg.rated === "down" && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Sorry about that. Try asking another way, or reach a human:</p>
            <ContactHuman />
          </div>
        )}
      </div>
    </div>
  );
}

function ArticleLinks({ articles, onClick }: { articles: Article[]; onClick: () => void }) {
  return (
    <ul className="space-y-1">
      {articles.map((a) => (
        <li key={a.slug}>
          <Link href={`/help/${a.slug}`} onClick={onClick} className="group flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900">
            <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
            {a.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ContactHuman() {
  return (
    <a
      href={SUPPORT.instagramUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-bold text-gray-900 hover:border-gray-400"
    >
      <Instagram className="h-4 w-4 text-pink-600" />
      Message us on Instagram
      <span className="ml-auto font-medium text-gray-400">@{SUPPORT.instagram}</span>
    </a>
  );
}
