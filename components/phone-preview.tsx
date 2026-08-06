"use client";
import { useState } from "react";
import Image from "next/image";
import { Heart, MessageCircle, Send, Bookmark, ChevronLeft, ImageIcon } from "lucide-react";
import type { FlowNode } from "@/lib/trigger-store";
import { renderMergeTags } from "./trigger-nodes";

/**
 * A phone mock that plays the configured flow back — what the commenter
 * actually sees, rather than what the graph looks like.
 *
 * Three views because the flow crosses three surfaces: the reel itself, the
 * public comment reply, and the DM thread. Seeing the DM assembled from the
 * real message nodes is the fastest way to spot a flow that reads badly.
 */

type Tab = "post" | "comments" | "dm";

export function PhonePreview({ nodes, username }: { nodes: FlowNode[]; username: string }) {
  const [tab, setTab] = useState<Tab>("dm");

  const trigger = nodes.find((n): n is Extract<FlowNode, { type: "trigger" }> => n.type === "trigger");
  const reel = trigger?.reel ?? null;

  // Walk the graph the way a follower would: first message, then whichever
  // branch a "yes" leads to. Enough to make the thread feel real.
  const thread: Array<Extract<FlowNode, { type: "message" }>> = [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let cursor: string | null | undefined = trigger?.next;
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const n = byId.get(cursor);
    if (!n) break;
    if (n.type === "message") {
      thread.push(n);
      cursor = n.buttons.find((b) => b.kind === "next")?.next ?? null;
    } else if (n.type === "condition") {
      cursor = n.yes;
    } else break;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-[268px] h-[540px] rounded-[2rem] bg-gray-900 p-2 shadow-xl ring-1 ring-black/5">
        <div className="relative w-full h-full rounded-[1.6rem] bg-black overflow-hidden flex flex-col">
          {/* status bar */}
          <div className="flex items-center justify-between px-4 pt-2 pb-1 text-[10px] text-white/90 shrink-0">
            <span>4:34</span>
            <div className="w-14 h-3.5 bg-black rounded-full -mt-0.5" />
            <span className="tracking-tight">▮▮▮ ▮</span>
          </div>

          {tab === "post" && <PostView reel={reel} username={username} />}
          {tab === "comments" && <CommentsView trigger={trigger} username={username} />}
          {tab === "dm" && <DmView thread={thread} username={username} />}
        </div>
      </div>

      <div className="inline-flex bg-gray-100 rounded-full p-0.5">
        {(["post", "comments", "dm"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "dm" ? "DM" : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Header({ username }: { username: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 shrink-0">
      <ChevronLeft className="w-4 h-4 text-white/70" />
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 shrink-0" />
      <span className="text-xs font-semibold text-white">{username}</span>
    </div>
  );
}

function PostView({ reel, username }: { reel: { caption?: string; thumbnail?: string } | null; username: string }) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header username={username} />
      <div className="relative flex-1 bg-gray-800 min-h-0">
        {reel?.thumbnail ? (
          <Image src={reel.thumbnail} alt="" fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <ImageIcon className="w-7 h-7 text-white/20" />
            <p className="text-[11px] text-white/40">No reel chosen for this trigger yet</p>
          </div>
        )}
      </div>
      <div className="px-3 py-2 shrink-0">
        <div className="flex items-center gap-3 text-white/90">
          <Heart className="w-4 h-4" />
          <MessageCircle className="w-4 h-4" />
          <Send className="w-4 h-4" />
          <Bookmark className="w-4 h-4 ml-auto" />
        </div>
        <p className="text-[10px] text-white/60 mt-1.5 line-clamp-2">
          {reel?.caption || "Your caption appears here"}
        </p>
      </div>
    </div>
  );
}

function CommentsView({
  trigger, username,
}: {
  trigger?: Extract<FlowNode, { type: "trigger" }>;
  username: string;
}) {
  const keyword = trigger?.keywords.split(",")[0]?.trim();
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header username={username} />
      <div className="px-3 py-2 border-b border-white/10 shrink-0">
        <p className="text-[11px] font-semibold text-white text-center">Comments</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-white/20 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-white/50">someone_new</p>
            <p className="text-[11px] text-white">{keyword || "Love this!"}</p>
          </div>
        </div>

        {trigger?.replyToComment && (
          <div className="flex gap-2 pl-6">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-white/50">{username}</p>
              <p className="text-[11px] text-white">
                {trigger.commentReply || "Your public reply appears here"}
              </p>
            </div>
          </div>
        )}
        {!trigger?.replyToComment && (
          <p className="text-[10px] text-white/30 pl-8">Public reply is switched off</p>
        )}
      </div>
    </div>
  );
}

function DmView({
  thread, username,
}: {
  thread: Array<Extract<FlowNode, { type: "message" }>>;
  username: string;
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header username={username} />
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {thread.length === 0 && (
          <p className="text-[11px] text-white/30 text-center mt-8">
            No messages in this flow yet
          </p>
        )}
        {thread.map((m, i) => (
          <div key={m.id} className="space-y-1.5">
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 shrink-0 self-end" />
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-white/10 px-3 py-2">
                <p className="text-[11px] text-white leading-relaxed whitespace-pre-line">
                  {renderMergeTags(m.text)}
                </p>
                {m.buttons.map((b) => (
                  <div
                    key={b.id}
                    className="mt-1.5 rounded-xl bg-white/10 border border-white/10 px-3 py-1.5 text-center text-[11px] text-white"
                  >
                    {b.label || "Button"}
                  </div>
                ))}
              </div>
            </div>
            {/* Their tap comes back as a reply — that's what opens the window. */}
            {i < thread.length - 1 && m.buttons.some((b) => b.kind === "next") && (
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-br-sm bg-brand-600 px-3 py-1.5 text-[11px] text-white">
                  {m.buttons.find((b) => b.kind === "next")?.label || "Tapped"}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="px-3 py-2 border-t border-white/10 shrink-0">
        <div className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] text-white/40">Message…</div>
      </div>
    </div>
  );
}
