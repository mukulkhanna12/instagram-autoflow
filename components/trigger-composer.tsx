"use client";
import { forwardRef, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Check, ChevronDown, FileText, Film, GitBranch, Link2, MessageCircle, Plus,
  Sparkles, Trash2, UserCheck, Wand2, AlertCircle, ToggleLeft, ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageInput } from "@/components/message-input";
import { ReelStrip, ReelPickerModal } from "@/components/reel-picker";
import { IgPhonePreview, type DmFocus, type PreviewTab } from "@/components/ig-phone-preview";
import { MAX_BUTTONS } from "@/lib/buttons";
import { PLAYBOOKS, BUTTON_TITLE_MAX, playbookFields } from "@/lib/playbooks";
import {
  OPENER_SUGGESTIONS, FOLLOW_SUGGESTIONS, PAYOFF_SUGGESTIONS, REPLY_SUGGESTIONS, KEYWORD_SUGGESTIONS,
  type DmSuggestion,
} from "@/lib/dm-suggestions";
import { composeProblems, toNodes, type ComposeState } from "@/lib/trigger-compose";
import { upsertTrigger, uid, type TriggerReel } from "@/lib/trigger-store";
import { cn } from "@/lib/utils";

/**
 * The one-page trigger editor — an alternative to the step-by-step form and the
 * canvas, used for both creating and editing.
 *
 * Every setting is on the page as a numbered section. The rail at the top
 * jumps straight to any of them, a closed section shows its current value in
 * one line, and whichever section is open drives the phone: the reel shows the
 * Post tab, keywords and replies show Comments, and each DM shows the thread
 * scrolled to that message.
 */

type SectionId = "reel" | "keywords" | "reply" | "opener" | "gate" | "payoff";

const SECTIONS: Array<{ id: SectionId; title: string; icon: React.ComponentType<{ className?: string }>; tab: PreviewTab; dm?: DmFocus }> = [
  { id: "reel", title: "Which reel?", icon: Film, tab: "post" },
  { id: "keywords", title: "What in a comment starts it?", icon: MessageCircle, tab: "comments" },
  { id: "reply", title: "Public reply", icon: Sparkles, tab: "comments" },
  { id: "opener", title: "Opening DM", icon: Wand2, tab: "dm", dm: "opener" },
  { id: "gate", title: "Follow check", icon: UserCheck, tab: "dm", dm: "gate" },
  { id: "payoff", title: "And they get a DM with", icon: Link2, tab: "dm", dm: "payoff" },
];

export function TriggerComposer({
  initial, triggerId, mode,
}: {
  initial: ComposeState;
  /** Set when editing; a new trigger gets its id on first save. */
  triggerId?: string;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [s, setS] = useState<ComposeState>(initial);
  const [open, setOpen] = useState<SectionId>(mode === "create" ? "reel" : "payoff");
  const [tab, setTab] = useState<PreviewTab>(mode === "create" ? "post" : "dm");
  const [follower, setFollower] = useState(true);
  const [reels, setReels] = useState<TriggerReel[] | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [username, setUsername] = useState("your.account");
  const [keywordDraft, setKeywordDraft] = useState("");
  const refs = useRef<Partial<Record<SectionId, HTMLDivElement | null>>>({});

  useEffect(() => {
    fetch("/api/instagram/posts").then((r) => r.json())
      .then(({ posts }) => setReels((posts ?? []).map((p: { id: string; caption?: string; thumbnail_url?: string; media_url?: string }) => ({
        id: p.id, caption: p.caption, thumbnail: p.thumbnail_url ?? p.media_url,
      }))))
      .catch(() => setReels([]));
    fetch("/api/instagram/account").then((r) => r.json())
      .then(({ account }) => account?.username && setUsername(account.username))
      .catch(() => {});
  }, []);

  const patch = (p: Partial<ComposeState>) => { setS((prev) => ({ ...prev, ...p })); setSavedAt(null); };

  function openSection(id: SectionId, scroll = false) {
    setOpen(id);
    const sec = SECTIONS.find((x) => x.id === id)!;
    setTab(sec.tab);
    // Looking at the follow message means looking at it as a non-follower.
    if (id === "gate") setFollower(false);
    if (scroll) refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const focus: DmFocus = SECTIONS.find((x) => x.id === open)?.dm ?? null;
  const problems = composeProblems(s);

  function save(status: ComposeState["status"]) {
    const id = triggerId ?? uid("tg");
    upsertTrigger({ id, name: s.name.trim() || "Untitled automation", status, updatedAt: Date.now(), nodes: toNodes(s) });
    setS((prev) => ({ ...prev, status }));
    setSavedAt(Date.now());
    if (!triggerId) router.replace(`/triggers/${id}/compose`);
  }

  function applyPlaybook(id: string) {
    const p = PLAYBOOKS.find((x) => x.id === id);
    if (!p) return;
    const f = playbookFields(p);
    patch({
      name: s.name === "Untitled automation" ? p.title : s.name,
      include: f.keywords.split(",").map((k) => k.trim()).filter(Boolean),
      autoReply: true,
      replies: [...p.replies],
      opener: { enabled: true, text: f.greetingMessage, button: f.greetingButtonText },
      gate: { enabled: s.gate.enabled, text: f.followMessage, button: f.followButtonText },
      payoff: {
        text: f.detailsMessage,
        // Keep links already pasted; otherwise start one with the playbook's label.
        links: s.payoff.links.some((l) => l.url.trim()) ? s.payoff.links : [{ label: p.link.title, url: "" }],
      },
    });
  }

  function addKeyword(raw: string) {
    const words = raw.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);
    if (!words.length) return;
    patch({ include: Array.from(new Set([...s.include, ...words])) });
    setKeywordDraft("");
  }

  const summary: Record<SectionId, string> = {
    reel: s.reel ? (s.reel.caption?.slice(0, 60) || "Reel selected") : "No reel picked yet",
    keywords: s.include.length ? s.include.map((k) => `“${k}”`).join(", ") : "Any comment",
    reply: s.autoReply ? `${s.replies.filter((r) => r.trim()).length} reply variant(s)` : "Off — DM only",
    opener: s.opener.enabled ? oneLine(s.opener.text) : "Off — straight to the final message",
    gate: s.opener.enabled && s.gate.enabled ? "On — non-followers are asked to follow first" : s.opener.enabled ? "Off — everyone gets the link" : "Needs the opening DM",
    payoff: `${oneLine(s.payoff.text)} · ${s.payoff.links.length} button${s.payoff.links.length === 1 ? "" : "s"}`,
  };

  return (
    // Fills the dashboard's content panel (viewport minus the 12px frame, the
    // 76px top bar and the gap) so the settings scroll on their own and the
    // phone stays in view beside them.
    <div className="flex h-[calc(100vh-112px)]">
      {/* ── Settings ─────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#f7f8f5]/95 backdrop-blur px-5 sm:px-8 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/triggers" className="text-gray-400 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></Link>
            <input
              value={s.name}
              onChange={(e) => patch({ name: e.target.value })}
              className="text-xl font-extrabold text-gray-950 bg-transparent min-w-0 flex-1 focus:outline-none focus:bg-white rounded-lg px-2 py-1 -ml-2"
              aria-label="Automation name"
            />
            <span className={cn(
              "text-xs font-bold rounded-full px-2.5 py-1",
              s.status === "live" ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"
            )}>
              {s.status === "live" ? "Live" : "Draft"}
            </span>
            {triggerId && (
              <Link href={`/triggers/${triggerId}`} className="text-xs font-semibold text-gray-500 hover:text-gray-900 inline-flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5" /> Open on canvas
              </Link>
            )}
            <Button variant="outline" size="sm" onClick={() => save("draft")}>
              {savedAt && s.status === "draft" ? <><Check className="w-4 h-4" /> Saved</> : "Save draft"}
            </Button>
            <Button size="sm" disabled={problems.length > 0} onClick={() => save("live")} title={problems.join(" · ")}>
              {savedAt && s.status === "live" ? <><Check className="w-4 h-4" /> Live</> : "Go live"}
            </Button>
          </div>

          {/* Jump straight to any setting */}
          <div className="mt-3 flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
            {SECTIONS.map((sec, i) => (
              <button
                key={sec.id}
                onClick={() => openSection(sec.id, true)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-xs font-semibold transition-colors cursor-pointer",
                  open === sec.id ? "bg-brand-900 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-brand-300"
                )}
              >
                <span className={cn("w-4 h-4 rounded-full text-[10px] flex items-center justify-center", open === sec.id ? "bg-lime text-gray-950" : "bg-gray-100")}>{i + 1}</span>
                {sec.title.replace("And they get a DM with", "Final DM").replace("What in a comment starts it?", "Keywords").replace("Which reel?", "Reel")}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 sm:px-8 py-6 space-y-3 max-w-2xl">
          {/* Shortcut: a whole flow from a playbook */}
          <div className="rounded-2xl bg-lime-50 border border-lime-200 px-4 py-3 flex items-center gap-3 flex-wrap">
            <Sparkles className="w-4 h-4 text-brand-700 shrink-0" />
            <p className="text-sm text-gray-800 flex-1 min-w-[180px]">Fill every message from a playbook</p>
            <select
              value=""
              onChange={(e) => applyPlaybook(e.target.value)}
              className="h-9 rounded-full border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 cursor-pointer"
              aria-label="Fill from a playbook"
            >
              <option value="" disabled>Choose…</option>
              {PLAYBOOKS.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.title} — {p.keyword}</option>)}
            </select>
          </div>

          {SECTIONS.map((sec, i) => (
            <Section
              key={sec.id}
              ref={(el) => { refs.current[sec.id] = el; }}
              n={i + 1}
              title={sec.title}
              icon={sec.icon}
              open={open === sec.id}
              summary={summary[sec.id]}
              onOpen={() => openSection(sec.id)}
            >
              {sec.id === "reel" && (
                <div className="space-y-2">
                  <ReelStrip reels={reels} selected={s.reel} onSelect={(r) => { patch({ reel: r }); setTab("post"); }} onBrowse={() => setBrowsing(true)} />
                  {s.reel && (
                    <button onClick={() => patch({ reel: null })} className="text-xs text-gray-400 hover:text-red-500 cursor-pointer">Clear selection</button>
                  )}
                </div>
              )}

              {sec.id === "keywords" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Pick active={s.include.length > 0 || keywordDraft !== ""} onClick={() => s.include.length === 0 && addKeyword("link")}>
                      Specific words
                    </Pick>
                    <Pick active={s.include.length === 0 && keywordDraft === ""} onClick={() => { patch({ include: [] }); setKeywordDraft(""); }}>
                      Any comment
                    </Pick>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.include.map((k) => (
                      <span key={k} className="inline-flex items-center gap-1 rounded-full bg-brand-900 text-white text-xs font-semibold pl-3 pr-1.5 h-7">
                        {k}
                        <button onClick={() => patch({ include: s.include.filter((x) => x !== k) })} className="w-4 h-4 rounded-full hover:bg-white/20 cursor-pointer" aria-label={`Remove ${k}`}>×</button>
                      </span>
                    ))}
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); addKeyword(keywordDraft); }} className="flex gap-2">
                    <Input value={keywordDraft} onChange={(e) => setKeywordDraft(e.target.value)} placeholder="Type a word and press Enter" />
                    <Button type="submit" variant="outline" size="md">Add</Button>
                  </form>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-gray-400">Popular:</span>
                    {KEYWORD_SUGGESTIONS.filter((k) => !s.include.includes(k)).map((k) => (
                      <button key={k} onClick={() => addKeyword(k)} className="text-[11px] rounded-full border border-gray-200 px-2.5 py-0.5 text-gray-600 hover:border-brand-400 hover:text-brand-700 cursor-pointer">
                        + {k}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400">Matches anywhere in the comment, any case — “link” also catches “send the LINK pls”.</p>
                </div>
              )}

              {sec.id === "reply" && (
                <div className="space-y-3">
                  <Toggle on={s.autoReply} onChange={(v) => patch({ autoReply: v })} label="Reply publicly under the comment" />
                  {s.autoReply && (
                    <>
                      {s.replies.map((r, j) => (
                        <div key={j} className="flex gap-1.5 items-center">
                          <Input value={r} onChange={(e) => patch({ replies: s.replies.map((x, k) => (k === j ? e.target.value : x)) })} placeholder="Sent you a DM! 📩" />
                          {s.replies.length > 1 && (
                            <button onClick={() => patch({ replies: s.replies.filter((_, k) => k !== j) })} className="text-gray-300 hover:text-red-500 cursor-pointer" aria-label="Remove reply">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button onClick={() => patch({ replies: [...s.replies, ""] })} className="text-xs text-brand-700 font-semibold inline-flex items-center gap-1 cursor-pointer mr-2">
                          <Plus className="w-3 h-3" /> Add variant
                        </button>
                        {REPLY_SUGGESTIONS.filter((r) => !s.replies.includes(r)).slice(0, 4).map((r) => (
                          <button
                            key={r}
                            onClick={() => patch({ replies: [...s.replies.filter((x) => x.trim()), r] })}
                            className="text-[11px] rounded-full border border-gray-200 px-2.5 py-0.5 text-gray-600 hover:border-brand-400 cursor-pointer"
                          >
                            + {r}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-400">One is picked at random each time — identical replies can get flagged as spam.</p>
                    </>
                  )}
                </div>
              )}

              {sec.id === "opener" && (
                <div className="space-y-3">
                  <Toggle
                    on={s.opener.enabled}
                    onChange={(v) => patch({ opener: { ...s.opener, enabled: v } })}
                    label="Send an opening message first"
                    note={s.opener.enabled ? undefined : "The final message goes out straight away. The follow check needs this on."}
                  />
                  {s.opener.enabled && (
                    <MessageEditor
                      text={s.opener.text}
                      button={s.opener.button}
                      suggestions={OPENER_SUGGESTIONS}
                      onChange={(text, button = s.opener.button) => patch({ opener: { ...s.opener, text, button } })}
                    />
                  )}
                </div>
              )}

              {sec.id === "gate" && (
                <div className="space-y-3">
                  {!s.opener.enabled ? (
                    <p className="text-sm text-gray-500 flex gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      Turn on the opening DM first — Instagram only tells us who follows after they tap a button.
                    </p>
                  ) : (
                    <>
                      <Toggle
                        on={s.gate.enabled}
                        onChange={(v) => patch({ gate: { ...s.gate, enabled: v } })}
                        label="Only send the link to followers"
                        note="People who don't follow yet get this message instead, and it repeats until they do."
                      />
                      {s.gate.enabled && (
                        <MessageEditor
                          text={s.gate.text}
                          button={s.gate.button}
                          suggestions={FOLLOW_SUGGESTIONS}
                          onChange={(text, button = s.gate.button) => patch({ gate: { ...s.gate, text, button } })}
                        />
                      )}
                    </>
                  )}
                </div>
              )}

              {sec.id === "payoff" && (
                <div className="space-y-3">
                  <MessageEditor
                    text={s.payoff.text}
                    suggestions={PAYOFF_SUGGESTIONS}
                    onChange={(text, button) => patch({
                      payoff: {
                        text,
                        // A template relabels the first button and keeps its link.
                        links: button !== undefined
                          ? [{ label: button, url: s.payoff.links[0]?.url ?? "" }, ...s.payoff.links.slice(1)]
                          : s.payoff.links,
                      },
                    })}
                  />
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-600">Link buttons <span className="text-gray-400 font-normal">· up to {MAX_BUTTONS}</span></p>
                    {s.payoff.links.map((l, j) => (
                      <div key={j} className="grid grid-cols-[1fr_1.4fr_auto] gap-1.5 items-start">
                        <Input
                          value={l.label}
                          maxLength={BUTTON_TITLE_MAX}
                          onChange={(e) => patch({ payoff: { ...s.payoff, links: s.payoff.links.map((x, k) => (k === j ? { ...x, label: e.target.value } : x)) } })}
                          placeholder="Button label"
                        />
                        <Input
                          value={l.url}
                          onChange={(e) => patch({ payoff: { ...s.payoff, links: s.payoff.links.map((x, k) => (k === j ? { ...x, url: e.target.value } : x)) } })}
                          placeholder="https://…"
                        />
                        <button
                          onClick={() => patch({ payoff: { ...s.payoff, links: s.payoff.links.filter((_, k) => k !== j) } })}
                          className="h-9 text-gray-300 hover:text-red-500 cursor-pointer"
                          aria-label="Remove button"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {s.payoff.links.length < MAX_BUTTONS && (
                      <button
                        onClick={() => patch({ payoff: { ...s.payoff, links: [...s.payoff.links, { label: "", url: "" }] } })}
                        className="text-xs text-brand-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add a button
                      </button>
                    )}
                  </div>
                </div>
              )}
            </Section>
          ))}

          {problems.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-bold mb-1">Before it can go live</p>
              <ul className="list-disc pl-5 space-y-0.5">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          )}
          <p className="text-[11px] text-gray-400 pt-2">
            Automations here are still a design preview — they save to this browser and don&apos;t send anything yet.
          </p>
        </div>
      </div>

      {/* ── Live preview ─────────────────────────── */}
      <aside
        className="hidden lg:flex w-[420px] shrink-0 h-full overflow-y-auto py-6 flex-col items-center justify-center border-l border-gray-100"
        style={{ backgroundImage: "radial-gradient(#d4d6d0 1px, transparent 1px)", backgroundSize: "18px 18px" }}
      >
        <p className="self-start px-6 mb-3 text-sm font-extrabold text-gray-950 shrink-0">Preview automation</p>
        <IgPhonePreview
          state={s}
          tab={tab}
          onTab={setTab}
          username={username}
          focus={focus}
          follower={follower}
          onFollower={setFollower}
        />
      </aside>

      {browsing && (
        <ReelPickerModal reels={reels} selected={s.reel} onPick={(r) => { patch({ reel: r }); setTab("post"); }} onClose={() => setBrowsing(false)} />
      )}
    </div>
  );
}

function oneLine(t: string) {
  const line = t.replace(/\s+/g, " ").trim();
  return line.length > 60 ? `${line.slice(0, 60)}…` : line || "Empty";
}

const Section = forwardRef<HTMLDivElement, {
  n: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  open: boolean;
  summary: string;
  onOpen: () => void;
  children: React.ReactNode;
}>(function Section({ n, title, icon: Icon, open, summary, onOpen, children }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "scroll-mt-32 rounded-3xl bg-white border transition-colors",
        open ? "border-brand-300 shadow-[0_8px_30px_-16px_rgba(18,53,34,0.35)]" : "border-gray-100 hover:border-gray-200"
      )}
    >
      <button onClick={onOpen} className="w-full flex items-center gap-3 px-5 py-4 text-left cursor-pointer">
        <span className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0", open ? "bg-brand-900 text-lime" : "bg-[#f3f4f1] text-gray-600")}>{n}</span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-gray-950 flex items-center gap-1.5"><Icon className="w-4 h-4 text-gray-400" /> {title}</p>
          {!open && <p className="text-xs text-gray-500 truncate mt-0.5">{summary}</p>}
        </div>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="px-5 pb-5 pl-[64px]">{children}</div>}
    </div>
  );
});

function Pick({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-11 rounded-2xl border text-sm font-semibold cursor-pointer transition-colors",
        active ? "border-brand-600 bg-brand-50 text-brand-800" : "border-gray-200 text-gray-600 hover:border-gray-300"
      )}
    >
      {children}
    </button>
  );
}

function Toggle({ on, onChange, label, note }: { on: boolean; onChange: (v: boolean) => void; label: string; note?: string }) {
  return (
    <button onClick={() => onChange(!on)} className="w-full flex items-start gap-3 text-left cursor-pointer">
      {on ? <ToggleRight className="w-8 h-8 text-brand-600 shrink-0 -mt-1" /> : <ToggleLeft className="w-8 h-8 text-gray-300 shrink-0 -mt-1" />}
      <span>
        <span className="block text-sm font-semibold text-gray-900">{label}</span>
        {note && <span className="block text-xs text-gray-500 mt-0.5">{note}</span>}
      </span>
    </button>
  );
}

/** A DM's text (and button), with the "Use template" suggestions from the reference. */
function MessageEditor({
  text, button, suggestions, onChange,
}: {
  text: string;
  /** Omitted for the final message, whose buttons are the link list below. */
  button?: string;
  suggestions: DmSuggestion[];
  onChange: (text: string, button?: string) => void;
}) {
  const [showTemplates, setShowTemplates] = useState(false);
  return (
    <div className="space-y-2.5">
      <button
        onClick={() => setShowTemplates((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 h-10 rounded-xl border px-4 text-sm font-bold cursor-pointer transition-colors",
          showTemplates ? "border-brand-600 bg-brand-50 text-brand-800" : "border-gray-200 text-gray-800 hover:border-gray-300"
        )}
      >
        <FileText className="w-4 h-4" /> Use template
      </button>

      {showTemplates && (
        <div className="rounded-2xl bg-[#f7f8f5] border border-gray-100 p-3 space-y-2">
          <p className="text-sm font-bold text-gray-900 px-1">Choose a template:</p>
          {suggestions.map((t) => (
            <button
              key={t.name}
              onClick={() => { onChange(t.text, t.button); setShowTemplates(false); }}
              className="w-full text-left rounded-xl bg-white border border-gray-100 px-4 py-3 hover:border-brand-300 cursor-pointer transition-colors"
            >
              <p className="font-bold text-gray-950 text-sm">{t.name}</p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                {t.text.replace(/\n+/g, " ")} <span className="text-brand-700 font-semibold">[{t.button}]</span>
              </p>
            </button>
          ))}
        </div>
      )}

      <MessageInput value={text} onChange={(v) => onChange(v, button)} rows={4} hint="Type { to add their name." />
      {button !== undefined && (
        <Input
          value={button}
          maxLength={BUTTON_TITLE_MAX}
          onChange={(e) => onChange(text, e.target.value)}
          hint={`Button · ${button.length}/${BUTTON_TITLE_MAX}`}
        />
      )}
    </div>
  );
}
