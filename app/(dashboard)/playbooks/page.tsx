"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, CornerDownRight, Film, Link2, MessageCircle, Search, Sparkles, UserCheck, Wand2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReelStrip, ReelPickerModal } from "@/components/reel-picker";
import type { TriggerReel } from "@/lib/trigger-store";
import {
  PLAYBOOKS, PLAYBOOK_CATEGORIES, BUTTON_TITLE_MAX, findPlaybook,
  type Playbook, type PlaybookCategory,
} from "@/lib/playbooks";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

type Filter = "all" | "popular" | PlaybookCategory;

/**
 * Playbooks: ready-made reel automations. Pick one, paste a link, choose the
 * reel — every message in the flow is already written.
 */
export default function PlaybooksPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [open, setOpenState] = useState<Playbook | null>(null);

  // Each playbook has its own link (/playbooks?playbook=recipe), so one can be
  // shared or linked to from elsewhere in the app and opens straight away.
  // Read from window rather than useSearchParams, which would need a Suspense
  // boundary around the whole page.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("playbook");
    const p = id ? findPlaybook(id) : undefined;
    if (p) setOpenState(p);
  }, []);

  function setOpen(p: Playbook | null) {
    setOpenState(p);
    const url = new URL(window.location.href);
    if (p) url.searchParams.set("playbook", p.id);
    else url.searchParams.delete("playbook");
    window.history.replaceState(null, "", url);
  }

  const matches = (p: Playbook) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return [p.title, p.pitch, p.keyword, ...(p.altKeywords ?? [])].some((t) => t.toLowerCase().includes(s));
  };

  const sections = useMemo(() => {
    const popular = { id: "popular" as const, label: "Most popular", blurb: "The ones creators reach for first.", items: PLAYBOOKS.filter((p) => p.featured) };
    const cats = PLAYBOOK_CATEGORIES.map((c) => ({ ...c, items: PLAYBOOKS.filter((p) => p.category === c.id) }));
    const all = [popular, ...cats];
    return (filter === "all" ? all : all.filter((s) => s.id === filter))
      .map((s) => ({ ...s, items: s.items.filter(matches) }))
      .filter((s) => s.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, q]);

  const chips: Array<{ id: Filter; label: string }> = [
    { id: "all", label: "All" },
    { id: "popular", label: "Most popular" },
    ...PLAYBOOK_CATEGORIES.map((c) => ({ id: c.id as Filter, label: c.label })),
  ];

  return (
    <div className="p-5 sm:p-8 max-w-7xl">
      <div className="flex flex-wrap items-end gap-4 justify-between">
        <PageHeader
          title="Playbooks"
          subtitle="Every message already written. Pick a playbook, paste your link, choose the reel — done."
          eyebrow={
            <p className="inline-flex items-center gap-1.5 rounded-full bg-lime px-3 py-1 text-xs font-bold text-gray-950">
              <Sparkles className="w-3.5 h-3.5" /> {PLAYBOOKS.length} ready to go
            </p>
          }
        />
        <label className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search — try “recipe” or “code”"
            className="w-full h-11 rounded-full bg-white border border-gray-200 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {chips.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={cn(
              "shrink-0 h-10 rounded-full px-4 text-sm font-semibold transition-colors cursor-pointer",
              filter === c.id
                ? "bg-brand-900 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-brand-300 hover:text-brand-700"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <p className="mt-5 text-xs font-medium text-gray-400">
        {(() => {
          const n = new Set(sections.flatMap((s) => s.items.map((p) => p.id))).size;
          return `${n} playbook${n === 1 ? "" : "s"}`;
        })()}
      </p>

      {sections.length === 0 && (
        <p className="mt-16 text-center text-gray-400">Nothing matches “{q}”.</p>
      )}

      {sections.map((s) => (
        <section key={s.id} className="mt-9">
          <h2 className="text-lg font-bold text-gray-950">{s.label}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{s.blurb}</p>
          <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {s.items.map((p) => <PlaybookCard key={`${s.id}-${p.id}`} p={p} onOpen={() => setOpen(p)} />)}
          </div>
        </section>
      ))}

      {open && <UsePlaybook p={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function PlaybookCard({ p, onOpen }: { p: Playbook; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group text-left rounded-3xl bg-white border border-gray-100 p-5 flex flex-col hover:border-brand-300 hover:shadow-[0_8px_30px_-12px_rgba(18,53,34,0.25)] transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <span className="w-11 h-11 rounded-2xl bg-[#f3f4f1] flex items-center justify-center text-2xl">{p.emoji}</span>
        <span className="rounded-full bg-lime-100 text-brand-900 text-[11px] font-bold px-2.5 py-1">
          Comment “{p.keyword}”
        </span>
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-gray-950">{p.title}</h3>
      <p className="mt-1 text-sm text-gray-500 leading-snug">{p.pitch}</p>

      <div className="mt-4 rounded-2xl bg-[#f7f8f5] p-3 flex-1">
        <div className="flex items-center gap-2">
          <Avatar handle={p.sample.handle} />
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">{p.sample.handle}</p>
            <p className="text-xs text-gray-500 truncate">{p.sample.comment}</p>
          </div>
        </div>
        <div className="mt-2 flex gap-1.5 pl-3">
          <CornerDownRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
          <div className="rounded-2xl rounded-tl-md bg-brand-900 text-white px-3 py-2.5 max-w-[85%]">
            <p className="text-xs leading-snug line-clamp-2">{p.payoff.split("\n")[0]}</p>
            <span className="mt-2 flex items-center justify-center gap-1 rounded-full bg-lime text-gray-950 text-[11px] font-bold px-3 py-1">
              {p.link.title} <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="flex flex-wrap gap-1 min-w-0">
          {p.worksWith.slice(0, 3).map((w) => (
            <span key={w} className="rounded-md bg-[#f3f4f1] px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">{w}</span>
          ))}
        </span>
        <span className="shrink-0 inline-flex items-center gap-1 text-sm font-bold text-brand-700 group-hover:gap-2 transition-all">
          Use <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </button>
  );
}

function Avatar({ handle }: { handle: string }) {
  // A stable pastel per handle, so the same fake commenter always looks the same.
  const hues = ["bg-lime-200", "bg-brand-100", "bg-amber-100", "bg-sky-100", "bg-rose-100", "bg-violet-100"];
  const i = [...handle].reduce((n, ch) => n + ch.charCodeAt(0), 0) % hues.length;
  return (
    <span className={cn("w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-gray-700", hues[i])}>
      {handle[0]?.toUpperCase()}
    </span>
  );
}

/** Setting a playbook up: trigger word, the link, and where it runs. */
function UsePlaybook({ p, onClose }: { p: Playbook; onClose: () => void }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(p.keyword);
  const [title, setTitle] = useState(p.link.title);
  const [url, setUrl] = useState("");
  const [where, setWhere] = useState<"reel" | "queue">("reel");
  const [reels, setReels] = useState<TriggerReel[] | null>(null);
  const [reel, setReel] = useState<TriggerReel | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/instagram/posts").then((r) => r.json())
      .then(({ posts }) => setReels((posts ?? []).map((x: { id: string; caption?: string; thumbnail_url?: string; media_url?: string; permalink?: string }) => ({
        id: x.id, caption: x.caption, thumbnail: x.thumbnail_url ?? x.media_url, permalink: x.permalink,
      }))))
      .catch(() => setReels([]));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !browsing) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, browsing]);

  const urlOk = /^https?:\/\/\S+\.\S+/i.test(url.trim());
  const canSave = urlOk && title.trim() && keyword.trim() && (where === "queue" || reel);

  async function submit(replace = false) {
    setSaving(true);
    setError(null);
    const r = reel as (TriggerReel & { permalink?: string }) | null;
    const res = await fetch("/api/playbooks/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playbookId: p.id,
        keyword,
        buttons: [{ title, url: url.trim() }],
        target: where === "queue"
          ? { kind: "queue" }
          : { kind: "reel", postId: r!.id, postUrl: r!.permalink, postCaption: r!.caption, postThumbnail: r!.thumbnail, replace },
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 409 && data.exists) {
      setSaving(false);
      if (confirm("This reel already has an automation. Replace its messages with this playbook? Its stats and Live switch stay as they are.")) {
        submit(true);
      }
      return;
    }
    if (!res.ok) {
      setSaving(false);
      setError(typeof data.error === "string" ? data.error : "Couldn't save that — check the link and try again.");
      return;
    }
    router.push(where === "queue" ? "/triggers?tab=upcoming" : `/posts/${data.automation.id}`);
  }

  const steps = [
    { icon: MessageCircle, label: "Public reply", text: p.replies[0] },
    { icon: Wand2, label: "First DM", text: p.greeting.replace(/\{\{\s*first_name\s*\}\}/g, p.sample.handle), button: p.greetingButton },
    { icon: UserCheck, label: "Follow check", text: `Not following yet? They're asked to follow first — then the ${p.noun} unlocks.` },
    { icon: Link2, label: "The payoff", text: p.payoff, button: title || p.link.title },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onClose}>
        <div
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={`Use the ${p.title} playbook`}
          className="relative w-full max-w-5xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[2rem] bg-white shadow-2xl grid md:grid-cols-[1fr_1.1fr]"
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-5 top-5 w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-950 cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* What will happen */}
          <div className="bg-brand-950 text-white p-6 sm:p-8 md:rounded-l-[2rem]">
            <span className="text-4xl">{p.emoji}</span>
            <h2 className="mt-3 text-2xl font-extrabold">{p.title}</h2>
            <p className="mt-1 text-sm text-white/60">{p.pitch}</p>
            <ol className="mt-6 space-y-4">
              {steps.map((s, i) => (
                <li key={s.label} className="flex gap-3">
                  <span className="w-8 h-8 shrink-0 rounded-full bg-white/10 flex items-center justify-center">
                    <s.icon className="w-4 h-4 text-lime" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">{i + 1}. {s.label}</p>
                    <p className="text-sm text-white/90 whitespace-pre-line mt-0.5">{s.text}</p>
                    {s.button && (
                      <span className="mt-2 inline-block rounded-full bg-lime text-gray-950 text-xs font-bold px-3 py-1">{s.button}</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-xs text-white/40">You can edit every message afterwards.</p>
          </div>

          {/* The three things only you know */}
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <p className="text-sm font-bold text-gray-950">1. Trigger word</p>
              <p className="text-xs text-gray-400 mt-0.5 mb-2">Comments containing it get the DM. Not case-sensitive.</p>
              <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} maxLength={40} />
            </div>

            <div>
              <p className="text-sm font-bold text-gray-950">2. Your link</p>
              <p className="text-xs text-gray-400 mt-0.5 mb-2">{p.link.hint}</p>
              <div className="space-y-2">
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={p.link.placeholder} autoFocus />
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={BUTTON_TITLE_MAX}
                  hint={`Button label · ${title.length}/${BUTTON_TITLE_MAX}`}
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-gray-950 mb-2">3. Where should it run?</p>
              <div className="grid grid-cols-2 gap-2">
                <WhereOption active={where === "reel"} onClick={() => setWhere("reel")} icon={Film} label="A posted reel" />
                <WhereOption active={where === "queue"} onClick={() => setWhere("queue")} icon={Sparkles} label="My next reel" />
              </div>
              <div className="mt-3">
                {where === "reel" ? (
                  <ReelStrip reels={reels} selected={reel} onSelect={setReel} onBrowse={() => setBrowsing(true)} />
                ) : (
                  <p className="text-xs text-gray-500 rounded-xl bg-[#f7f8f5] p-3">
                    Joins your <b>Upcoming reels</b> queue and attaches to the next reel you post — on its first comment.
                  </p>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button variant="lime" size="lg" className="w-full" disabled={!canSave} loading={saving} onClick={() => submit()}>
              {where === "queue" ? "Add to next reel" : "Set up this reel"} <ArrowRight className="w-4 h-4" />
            </Button>
            {where === "reel" && (
              <p className="text-xs text-gray-400 text-center -mt-3">It starts switched off — review it, then go Live.</p>
            )}
          </div>
        </div>
      </div>

      {browsing && (
        <ReelPickerModal reels={reels} selected={reel} onPick={setReel} onClose={() => setBrowsing(false)} />
      )}
    </>
  );
}

function WhereOption({
  active, onClick, icon: Icon, label,
}: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-12 rounded-2xl border text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors",
        active ? "border-brand-600 bg-brand-50 text-brand-800" : "border-gray-200 text-gray-600 hover:border-gray-300"
      )}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}
