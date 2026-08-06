"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImageIcon, Loader2, Check, Plus, Trash2, Info } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { PhonePreview } from "@/components/phone-preview";
import {
  upsertTrigger, uid, commentSource,
  type Trigger, type FlowNode, type TriggerReel,
} from "@/lib/trigger-store";

/**
 * Creating a trigger is a plain scrolling form, not the canvas.
 *
 * The canvas is for reading and rearranging a flow that already exists; when
 * you're setting one up for the first time the questions are linear, and a form
 * beside a live phone preview answers them faster than dragging cards. The
 * canvas takes over from the edit screen.
 */
export default function NewTriggerPage() {
  const router = useRouter();

  const [name, setName] = useState("Untitled trigger");
  const [reels, setReels] = useState<TriggerReel[] | null>(null);
  const [showAll, setShowAll] = useState(false);

  const [reel, setReel] = useState<TriggerReel | null>(null);
  const [keywordMode, setKeywordMode] = useState<"specific" | "any">("specific");
  const [keywords, setKeywords] = useState("");
  const [publicReply, setPublicReply] = useState(true);
  const [replies, setReplies] = useState<string[]>(["Sent you a DM! 📩"]);

  const [openerOn, setOpenerOn] = useState(true);
  const [opener, setOpener] = useState(
    "Hey {{full_name}} 👋\n\nClick below and I'll send you the link in just a sec ✨"
  );
  const [openerButton, setOpenerButton] = useState("Send me the link");

  const [payoff, setPayoff] = useState("Awesome 🙌 Here's the link 👇");
  const [payoffButton, setPayoffButton] = useState("Click here");
  const [payoffUrl, setPayoffUrl] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/instagram/posts").then((r) => r.json())
      .then(({ posts }) => setReels((posts ?? []).map((p: { id: string; caption?: string; thumbnail_url?: string; media_url?: string }) => ({
        id: p.id, caption: p.caption, thumbnail: p.thumbnail_url ?? p.media_url,
      }))))
      .catch(() => setReels([]));
  }, []);

  /** The graph this form describes — also what feeds the live preview. */
  function buildNodes(): FlowNode[] {
    const trg = uid("trg"), m1 = uid("msg"), cond = uid("cnd"), m2 = uid("msg");
    const words = keywordMode === "specific"
      ? keywords.split(",").map((k) => k.trim()).filter(Boolean)
      : [];

    const nodes: FlowNode[] = [
      {
        id: trg, type: "trigger", next: openerOn ? m1 : m2,
        sources: [{
          ...commentSource(),
          reel, include: words, exclude: [],
          autoReply: publicReply,
          replies: replies.filter(Boolean),
        }],
      },
      { id: cond, type: "condition", label: "Do they follow you?", yes: m2, no: null },
      {
        id: m2, type: "message", title: "The payoff", text: payoff,
        buttons: payoffUrl.trim()
          ? [{ id: uid("btn"), label: payoffButton, kind: "link", url: payoffUrl }]
          : [],
      },
    ];

    if (openerOn) {
      nodes.splice(1, 0, {
        id: m1, type: "message", title: "Opening DM", text: opener,
        buttons: [{ id: uid("btn"), label: openerButton, kind: "next", next: cond }],
      });
    }
    return nodes;
  }

  function save() {
    setSaving(true);
    const t: Trigger = {
      id: uid("tg"), name: name.trim() || "Untitled trigger",
      status: "draft", updatedAt: Date.now(), nodes: buildNodes(),
    };
    upsertTrigger(t);
    router.push(`/triggers/${t.id}`);
  }

  const shown = showAll ? (reels ?? []) : (reels ?? []).slice(0, 8);

  return (
    <div className="flex h-screen">
      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="max-w-2xl mx-auto px-8 py-6">
          <button onClick={() => router.push("/triggers")} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-5 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> All triggers
          </button>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-xl font-bold text-gray-900 bg-transparent w-full focus:outline-none focus:bg-gray-50 rounded px-2 py-1 -ml-2 mb-8"
          />

          {/* 1 ── the reel */}
          <Section title="When someone comments on">
            <Choice selected label="A specific reel">
              {reels === null ? (
                <div className="py-8 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-brand-500" /></div>
              ) : reels.length === 0 ? (
                <p className="text-xs text-gray-400 py-4">No reels found on the account.</p>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    {shown.map((r) => {
                      const active = reel?.id === r.id;
                      return (
                        <button key={r.id} onClick={() => setReel(r)} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer group">
                          {r.thumbnail
                            ? <Image src={r.thumbnail} alt="" fill className="object-cover" />
                            : <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className="w-4 h-4 text-gray-300" /></div>}
                          <span className={`absolute inset-0 rounded-lg ring-2 transition-all ${active ? "ring-brand-500" : "ring-transparent group-hover:ring-brand-300"}`} />
                          <span className={`absolute top-1.5 right-1.5 w-4 h-4 rounded-full border-2 border-white ${active ? "bg-brand-500" : "bg-white/60"}`} />
                        </button>
                      );
                    })}
                  </div>
                  {!showAll && (reels?.length ?? 0) > 8 && (
                    <button onClick={() => setShowAll(true)} className="text-xs text-brand-600 font-medium mt-3 cursor-pointer">
                      Show all {reels?.length}
                    </button>
                  )}
                </>
              )}
            </Choice>
            <Choice disabled label="Any reel" note="Every reel on the account" />
            <Choice disabled label="Your next reel" note="Whatever you post next" />
          </Section>

          {/* 2 ── the comment */}
          <Section title="And this comment has">
            <Choice
              selected={keywordMode === "specific"}
              label="A specific word or words"
              onClick={() => setKeywordMode("specific")}
            >
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Enter a word or multiple" />
              <p className="text-[11px] text-gray-400 mt-1.5">Use commas to separate words.</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[11px] text-gray-400">For example:</span>
                {["Price", "Link", "Prompt"].map((w) => (
                  <button
                    key={w}
                    onClick={() => setKeywords((k) => (k ? `${k}, ${w.toLowerCase()}` : w.toLowerCase()))}
                    className="text-[11px] rounded-full border border-gray-200 px-2.5 py-0.5 text-gray-500 hover:border-brand-400 hover:text-brand-600 cursor-pointer"
                  >
                    {w}
                  </button>
                ))}
              </div>
            </Choice>
            <Choice selected={keywordMode === "any"} label="Any word" note="Every comment starts the flow" onClick={() => setKeywordMode("any")} />

            <Toggle
              on={publicReply} onChange={setPublicReply}
              label="Reply to their comment under the reel"
            />
            {publicReply && (
              <div className="space-y-2 pl-1">
                {replies.map((r, i) => (
                  <div key={i} className="flex gap-1.5">
                    <Input value={r} onChange={(e) => setReplies(replies.map((x, j) => (j === i ? e.target.value : x)))} placeholder="Sent you a DM! 📩" />
                    {replies.length > 1 && (
                      <button onClick={() => setReplies(replies.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500 shrink-0 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => setReplies([...replies, ""])} className="text-xs text-brand-600 font-medium cursor-pointer flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add another reply
                </button>
                <p className="text-[11px] text-gray-400">
                  Identical replies can get flagged as spam, so one is picked at random.
                </p>
              </div>
            )}
          </Section>

          {/* 3 ── the opening DM */}
          <Section title="They will get">
            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
              <Toggle on={openerOn} onChange={setOpenerOn} label="An opening DM" />
              {openerOn && (
                <>
                  <Textarea value={opener} onChange={(e) => setOpener(e.target.value)} rows={4} />
                  <Input value={openerButton} onChange={(e) => setOpenerButton(e.target.value)} placeholder="Send me the link" />
                  <div className="flex items-start gap-2 text-[11px] text-gray-500 bg-gray-50 rounded-lg p-2.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
                    <span>
                      Their tap on this button is what opens the DM window — it&apos;s also the only
                      moment Instagram will tell us whether they follow you.
                    </span>
                  </div>
                </>
              )}
            </div>
          </Section>

          {/* 4 ── the payoff */}
          <Section title="And then, they will get">
            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-800">A DM with a link</p>
              <Textarea value={payoff} onChange={(e) => setPayoff(e.target.value)} rows={3} placeholder="Write a message" />
              <Input value={payoffButton} onChange={(e) => setPayoffButton(e.target.value)} placeholder="Button label" />
              <Input value={payoffUrl} onChange={(e) => setPayoffUrl(e.target.value)} placeholder="https://…" hint="Leave empty to send plain text with no button" />
            </div>
          </Section>

          <div className="flex items-center gap-3 py-8 border-t border-gray-100">
            <Button variant="outline" size="sm" onClick={() => router.push("/triggers")}>Cancel</Button>
            <Button size="sm" className="ml-auto" onClick={save} loading={saving}>
              <Check className="w-4 h-4" /> Save trigger
            </Button>
          </div>
        </div>
      </div>

      <aside className="w-[320px] shrink-0 border-l border-gray-100 bg-white overflow-y-auto">
        <div className="p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4 text-center">Preview</p>
          <PhonePreview nodes={buildNodes()} username="mkexplores_" />
        </div>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-base font-bold text-gray-900 mb-3">{title}</h2>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Choice({
  selected, disabled, label, note, children, onClick,
}: {
  selected?: boolean;
  disabled?: boolean;
  label: string;
  note?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`rounded-xl border p-4 transition-all ${
        disabled ? "border-gray-150 bg-gray-50/60 opacity-60"
        : selected ? "border-brand-400 ring-1 ring-brand-200 bg-white cursor-pointer"
        : "border-gray-200 bg-white hover:border-gray-300 cursor-pointer"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${selected ? "border-brand-500 bg-brand-500 ring-2 ring-white ring-inset" : "border-gray-300"}`} />
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {disabled && <span className="ml-auto text-[9px] font-bold tracking-wide text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">SOON</span>}
      </div>
      {note && <p className="text-[11px] text-gray-400 mt-1 pl-[26px]">{note}</p>}
      {children && <div className="mt-3 pl-[26px]">{children}</div>}
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button onClick={() => onChange(!on)} className="w-full flex items-center gap-3 cursor-pointer">
      <span className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${on ? "bg-brand-500" : "bg-gray-200"}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
      <span className="text-sm font-medium text-gray-800">{label}</span>
    </button>
  );
}
