"use client";
import { forwardRef, useEffect, useRef } from "react";
import Image from "next/image";
import {
  ChevronLeft, Heart, Home, MessageCircle, Search, Send, SquarePlay, Bookmark, MoreHorizontal, Smile,
} from "lucide-react";
import type { ComposeState } from "@/lib/trigger-compose";
import { cn } from "@/lib/utils";

/**
 * The one-page editor's live preview: an Instagram-style phone that follows
 * whichever section is being edited — the reel, the comment thread, or the DM
 * conversation — and redraws on every keystroke.
 */

export type PreviewTab = "post" | "comments" | "dm";
/** Which DM is being edited, so the thread can scroll to it and ring it. */
export type DmFocus = "opener" | "gate" | "payoff" | null;

export function IgPhonePreview({
  state, tab, onTab, username, focus, follower, onFollower,
}: {
  state: ComposeState;
  tab: PreviewTab;
  onTab: (t: PreviewTab) => void;
  username: string;
  focus: DmFocus;
  /** Play the DM as someone who already follows, or as someone who doesn't yet. */
  follower: boolean;
  onFollower: (v: boolean) => void;
}) {
  const title = tab === "post" ? "Posts" : tab === "comments" ? "Comments" : username;
  const showGate = state.opener.enabled && state.gate.enabled;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-[290px] h-[590px] rounded-[3rem] bg-[#0d0f1c] p-[9px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)]">
        <div className="relative w-full h-full rounded-[2.5rem] bg-black overflow-hidden flex flex-col text-white">
          {/* Status bar + island */}
          <div className="relative flex items-center justify-between px-7 pt-3.5 pb-2 text-[13px] font-semibold shrink-0">
            <span>9:41</span>
            <span className="absolute left-1/2 -translate-x-1/2 top-2.5 w-24 h-6 rounded-full bg-black ring-1 ring-white/5" />
            <span className="flex items-center gap-1">
              <span className="w-4 h-2.5 rounded-[3px] bg-white" />
              <span className="w-6 h-3 rounded-[4px] border border-white/80 p-[1.5px]"><span className="block h-full w-4/5 rounded-[2px] bg-white" /></span>
            </span>
          </div>

          {/* App header */}
          <div className="relative flex items-center justify-center px-4 py-2 border-b border-white/10 shrink-0">
            <ChevronLeft className="absolute left-3 w-5 h-5" />
            {tab === "dm" ? (
              <div className="flex items-center gap-2">
                <Avatar />
                <div className="leading-tight">
                  <p className="text-[13px] font-bold">{username}</p>
                  <p className="text-[10px] text-white/50">Business chat</p>
                </div>
              </div>
            ) : (
              <div className="text-center leading-tight">
                <p className="text-[14px] font-bold">{title}</p>
                <p className="text-[10px] text-white/50">{username}</p>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            {tab === "post" && <PostView state={state} username={username} />}
            {tab === "comments" && <CommentsView state={state} username={username} />}
            {tab === "dm" && <DmView state={state} username={username} focus={focus} follower={follower} />}
          </div>

          {/* Instagram's bottom bar */}
          {tab !== "dm" && (
            <div className="flex items-center justify-around px-4 pt-2.5 pb-1 border-t border-white/10 shrink-0">
              <Home className="w-5 h-5" />
              <SquarePlay className="w-5 h-5" />
              <span className="relative"><Send className="w-5 h-5" /><span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" /></span>
              <Search className="w-5 h-5" />
              <span className="relative"><Avatar size="sm" /><span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" /></span>
            </div>
          )}
          <div className="flex justify-center pb-2 pt-2 shrink-0"><span className="w-28 h-1 rounded-full bg-white/60" /></div>
        </div>
      </div>

      <div className="inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-black/5">
        {(["post", "comments", "dm"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onTab(t)}
            className={cn(
              "px-6 h-10 rounded-full text-sm font-bold transition-colors cursor-pointer",
              tab === t ? "bg-[#0d0f1c] text-white" : "text-gray-500 hover:text-gray-900"
            )}
          >
            {t === "dm" ? "DM" : t === "post" ? "Post" : "Comments"}
          </button>
        ))}
      </div>

      {tab === "dm" && showGate && (
        <div className="inline-flex items-center gap-1 rounded-full bg-white/70 p-1 text-xs ring-1 ring-black/5">
          <span className="px-2 text-gray-400">Viewing as</span>
          {[true, false].map((v) => (
            <button
              key={String(v)}
              onClick={() => onFollower(v)}
              className={cn(
                "px-3 h-7 rounded-full font-semibold cursor-pointer",
                follower === v ? "bg-brand-700 text-white" : "text-gray-600 hover:text-gray-900"
              )}
            >
              {v ? "A follower" : "Not following"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Avatar({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <span className={cn(
      "rounded-full bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 p-[1.5px] shrink-0 inline-block",
      size === "sm" ? "w-5 h-5" : "w-7 h-7"
    )}>
      <span className="block w-full h-full rounded-full bg-gray-700 ring-1 ring-black" />
    </span>
  );
}

function PostView({ state, username }: { state: ComposeState; username: string }) {
  const reel = state.reel;
  if (!reel) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full rounded-xl border border-dashed border-white/30 px-5 py-8 text-center text-[13px] leading-relaxed text-white/60">
          You haven&apos;t picked a post or reel for your automation yet
        </div>
      </div>
    );
  }
  return (
    <div className="relative flex-1 min-h-0 bg-gray-900">
      {reel.thumbnail && <Image src={reel.thumbnail} alt="" fill unoptimized className="object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <div className="absolute right-3 bottom-16 flex flex-col items-center gap-4 text-white">
        <Heart className="w-6 h-6" />
        <MessageCircle className="w-6 h-6" />
        <Send className="w-6 h-6" />
        <Bookmark className="w-6 h-6" />
        <MoreHorizontal className="w-6 h-6" />
      </div>
      <div className="absolute left-3 right-14 bottom-3">
        <div className="flex items-center gap-2">
          <Avatar size="sm" />
          <span className="text-[12px] font-bold">{username}</span>
          <span className="text-[10px] rounded-md border border-white/60 px-1.5 py-0.5">Follow</span>
        </div>
        <p className="mt-1.5 text-[11px] text-white/85 line-clamp-2">{reel.caption || " "}</p>
      </div>
    </div>
  );
}

function CommentsView({ state, username }: { state: ComposeState; username: string }) {
  const keyword = state.include[0];
  const comment = keyword ? `${keyword.toUpperCase()} please 🙏` : "Love this! 😍";
  const reply = state.replies.find((r) => r.trim());
  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      {/* The reel, dimmed behind the sheet */}
      <div className="relative h-24 shrink-0 bg-gray-900 overflow-hidden">
        {state.reel?.thumbnail && <Image src={state.reel.thumbnail} alt="" fill unoptimized className="object-cover opacity-50" />}
      </div>
      <div className="flex-1 min-h-0 -mt-4 rounded-t-2xl bg-[#1c1c1e] flex flex-col">
        <div className="flex justify-center pt-2"><span className="w-9 h-1 rounded-full bg-white/30" /></div>
        <p className="text-center text-[13px] font-bold py-2 border-b border-white/10">Comments</p>
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-4">
          <div className="flex gap-2.5">
            <span className="w-7 h-7 rounded-full bg-sky-300/80 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px]"><b>jess.creates</b> <span className="text-white/40">1m</span></p>
              <p className="text-[12px] mt-0.5">{comment}</p>
              <p className="text-[10px] text-white/40 mt-1">Reply</p>
            </div>
            <Heart className="w-3.5 h-3.5 text-white/40 shrink-0 mt-1" />
          </div>

          {state.autoReply ? (
            <div className="flex gap-2.5 pl-9">
              <Avatar />
              <div className="min-w-0 flex-1">
                <p className="text-[11px]"><b>{username}</b> <span className="text-white/40">now</span></p>
                <p className="text-[12px] mt-0.5">
                  <span className="text-sky-300">@jess.creates</span> {reply || <span className="text-white/40">Your public reply appears here</span>}
                </p>
                {state.replies.filter((r) => r.trim()).length > 1 && (
                  <p className="text-[10px] text-lime mt-1">
                    1 of {state.replies.filter((r) => r.trim()).length} replies — picked at random
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="pl-9 text-[11px] text-white/35">No public reply — they only get the DM.</p>
          )}

          {!keyword && (
            <p className="text-[10px] text-white/35 text-center pt-2">Any comment starts the flow</p>
          )}
        </div>
        <div className="flex items-center gap-2 px-3 py-2 border-t border-white/10">
          <Avatar size="sm" />
          <div className="flex-1 rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-white/40">Add a comment…</div>
          <Smile className="w-4 h-4 text-white/50" />
        </div>
      </div>
    </div>
  );
}

/** Merge tags drawn the way the commenter will see them: filled with a sample name. */
function fill(text: string): string {
  return text
    .replace(/\{\{\s*(first[_\s]?name|name)\s*\}\}/gi, "Jess")
    .replace(/\{\{\s*last[_\s]?name\s*\}\}/gi, "Lee")
    .replace(/\{\{\s*full[_\s]?name\s*\}\}/gi, "Jess Lee")
    .replace(/\{\{\s*username\s*\}\}/gi, "jess.creates");
}

function DmView({
  state, username, focus, follower,
}: {
  state: ComposeState;
  username: string;
  focus: DmFocus;
  follower: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const refs = { opener: useRef<HTMLDivElement>(null), gate: useRef<HTMLDivElement>(null), payoff: useRef<HTMLDivElement>(null) };

  useEffect(() => {
    const el = focus ? refs[focus].current : null;
    const box = scroller.current;
    if (el && box) {
      // Show the whole bubble, buttons included; a bubble taller than the
      // screen shows from its top.
      const top = Math.min(el.offsetTop - 16, Math.max(0, el.offsetTop + el.offsetHeight - box.clientHeight + 16));
      box.scrollTo({ top, behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, follower, state.payoff.links.length, state.opener.enabled, state.gate.enabled]);

  const gate = state.opener.enabled && state.gate.enabled;

  return (
    <>
      <div ref={scroller} className="relative flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-3">
        <div className="flex flex-col items-center gap-1 pb-3">
          <span className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 p-[2px]"><span className="block w-full h-full rounded-full bg-gray-700 ring-2 ring-black" /></span>
          <p className="text-[13px] font-bold">{username}</p>
          <p className="text-[10px] text-white/40">Replied to your comment on their reel</p>
        </div>

        {state.opener.enabled && (
          <>
            <Bubble ref={refs.opener} active={focus === "opener"} text={state.opener.text} buttons={[state.opener.button]} />
            <Tap text={state.opener.button} />
          </>
        )}

        {gate && !follower && (
          <>
            <Bubble ref={refs.gate} active={focus === "gate"} text={state.gate.text} buttons={[state.gate.button]} />
            <Tap text={state.gate.button} />
          </>
        )}
        {gate && follower && focus === "gate" && (
          <p ref={refs.gate} className="text-center text-[10px] text-white/40 py-1">
            Followers skip this message — switch to “Not following” below
          </p>
        )}

        <Bubble
          ref={refs.payoff}
          active={focus === "payoff"}
          text={state.payoff.text}
          buttons={state.payoff.links.map((l) => l.label || "Button")}
          link
        />
      </div>
      <div className="flex items-center gap-2 px-3 py-2 shrink-0">
        <div className="flex-1 rounded-full bg-white/10 px-3 py-2 text-[11px] text-white/40">Message…</div>
      </div>
    </>
  );
}

const Bubble = forwardRef<HTMLDivElement, { text: string; buttons: string[]; active: boolean; link?: boolean }>(
  function Bubble({ text, buttons, active, link }, ref) {
    return (
      <div ref={ref} className="flex items-end gap-2">
        <Avatar size="sm" />
        <div className={cn(
          "max-w-[82%] rounded-2xl rounded-bl-md bg-[#262626] overflow-hidden transition-shadow",
          active && "ring-2 ring-lime ring-offset-2 ring-offset-black"
        )}>
          <p className="px-3 py-2 text-[12px] leading-relaxed whitespace-pre-line">
            {text.trim() ? fill(text) : <span className="text-white/35">Empty message</span>}
          </p>
          {buttons.map((b, i) => (
            <div key={i} className="border-t border-white/10 px-3 py-2 text-center text-[12px] font-semibold text-sky-300">
              {b}{link ? " ↗" : ""}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

function Tap({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="rounded-2xl rounded-br-md bg-[#3797f0] px-3 py-1.5 text-[12px]">{text || "Tapped"}</div>
    </div>
  );
}
