"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Plus, Trash2, Info } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhonePreview } from "@/components/phone-preview";
import { ReelStrip, ReelPickerModal } from "@/components/reel-picker";
import {
  upsertTrigger, uid, commentSource, loadDefaults, DEFAULT_COMMENT_REPLIES,
  type Trigger, type FlowNode, type TriggerReel,
} from "@/lib/trigger-store";

/**
 * Creating a trigger: only the three questions that can't be guessed.
 *
 * Which reel, which keyword and what gets posted publicly are decisions unique
 * to this trigger. The messages that follow are not — they come from the saved
 * defaults, and the canvas is a better place to change them because that's
 * where you can see them in context and branch off them.
 *
 * So this form stops at three steps and hands over. The trigger it creates is a
 * draft, never live, so an unfinished flow can't start DMing anyone.
 */

const STEPS = [
  { title: "Which reel should this watch?", hint: "The flow runs when someone comments on it." },
  { title: "What in a comment starts it?", hint: "Narrow it to a keyword, or respond to everything." },
  { title: "Reply publicly under the comment?", hint: "Optional, but it shows others the flow is live." },
];

export default function NewTriggerPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [browsing, setBrowsing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("Untitled trigger");
  const [reels, setReels] = useState<TriggerReel[] | null>(null);

  const [reel, setReel] = useState<TriggerReel | null>(null);
  const [keywordMode, setKeywordMode] = useState<"specific" | "any">("specific");
  const [keywords, setKeywords] = useState("");
  const [publicReply, setPublicReply] = useState(true);
  const [replies, setReplies] = useState<string[]>([...DEFAULT_COMMENT_REPLIES]);

  // The messages aren't asked for here — they come from the saved defaults and
  // are edited on the canvas, where they can be seen in context.
  const [defaults] = useState(() => loadDefaults());

  useEffect(() => {
    fetch("/api/instagram/posts").then((r) => r.json())
      .then(({ posts }) => setReels((posts ?? []).map((p: { id: string; caption?: string; thumbnail_url?: string; media_url?: string }) => ({
        id: p.id, caption: p.caption, thumbnail: p.thumbnail_url ?? p.media_url,
      }))))
      .catch(() => setReels([]));
  }, []);

  /**
   * The graph this form describes — also what feeds the live preview.
   *
   * The three messages come straight from the defaults so the trigger lands on
   * the canvas already complete and sendable; the payoff link is the one thing
   * left blank, because only you know where it points.
   */
  function buildNodes(): FlowNode[] {
    const trg = uid("trg"), m1 = uid("msg"), cond = uid("cnd"), m2 = uid("msg");
    const words = keywordMode === "specific"
      ? keywords.split(",").map((k) => k.trim()).filter(Boolean)
      : [];

    return [
      {
        id: trg, type: "trigger", next: m1,
        sources: [{
          ...commentSource(),
          reel, include: words, exclude: [],
          autoReply: publicReply,
          replies: publicReply ? replies.filter(Boolean) : [],
        }],
      },
      {
        id: m1, type: "message", title: "Opening DM", text: defaults.opener.text,
        buttons: [{ id: uid("btn"), label: defaults.opener.button, kind: "next", next: cond }],
      },
      { id: cond, type: "condition", label: "Do they follow you?", yes: m2, no: null },
      {
        id: m2, type: "message", title: "The payoff", text: defaults.payoff.text,
        buttons: [{ id: uid("btn"), label: defaults.payoff.button, kind: "link", url: "" }],
      },
    ];
  }

  function save() {
    setSaving(true);
    const t: Trigger = {
      id: uid("tg"), name: name.trim() || "Untitled trigger",
      // Always a draft: the payoff link is still empty at this point.
      status: "draft", updatedAt: Date.now(), nodes: buildNodes(),
    };
    upsertTrigger(t);
    router.push(`/triggers/${t.id}`);
  }

  const last = step === STEPS.length - 1;

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-8 pt-6 pb-4 shrink-0">
          <button onClick={() => router.push("/triggers")} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-4 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> All triggers
          </button>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-xl font-bold text-gray-900 bg-transparent w-full max-w-xl focus:outline-none focus:bg-gray-50 rounded px-2 py-1 -ml-2"
          />
        </div>

        {/* Step rail — click any dot to jump */}
        <div className="px-8 shrink-0">
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                title={s.title}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === step ? "bg-brand-500 w-10" : i < step ? "bg-brand-300 w-6" : "bg-gray-200 w-6 hover:bg-gray-300"
                }`}
              />
            ))}
            <span className="text-[11px] text-gray-400 ml-2">Step {step + 1} of {STEPS.length}</span>
          </div>
        </div>

        {/* The current question */}
        <div className="flex-1 overflow-y-auto px-8 py-6 min-h-0">
          <div className="max-w-xl">
            <h2 className="text-lg font-bold text-gray-900">{STEPS[step].title}</h2>
            <p className="text-xs text-gray-400 mt-1 mb-5">{STEPS[step].hint}</p>

            {step === 0 && (
              <div className="space-y-2.5">
                <Choice selected label="A specific reel">
                  <ReelStrip
                    reels={reels} selected={reel}
                    onSelect={setReel}
                    onBrowse={() => setBrowsing(true)}
                  />
                </Choice>
                <Choice disabled label="Any reel" note="Every reel on the account" />
                <Choice disabled label="Your next reel" note="Whatever you post next" />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-2.5">
                <Choice selected={keywordMode === "specific"} label="A specific word or words" onClick={() => setKeywordMode("specific")}>
                  <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Enter a word or multiple" />
                  <p className="text-[11px] text-gray-400 mt-1.5">Use commas to separate words. Not case-sensitive.</p>
                  <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
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
                <Choice selected={keywordMode === "any"} label="Any comment" note="Every comment starts the flow" onClick={() => setKeywordMode("any")} />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-2.5">
                <Choice selected={publicReply} label="Yes — reply in the feed" onClick={() => setPublicReply(true)}>
                  <div className="space-y-2">
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
                </Choice>
                <Choice selected={!publicReply} label="No public reply" note="Only the DM goes out" onClick={() => setPublicReply(false)} />

                <div className="flex items-start gap-2 text-[11px] text-gray-500 bg-gray-50 rounded-lg p-3 mt-4">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
                  <span>
                    That&apos;s everything this form needs. Saving creates the trigger as a
                    <strong> draft</strong> with the standard opening DM, follow check and payoff
                    already in place — you finish the wording and add the payoff link on the canvas,
                    then set it live.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Arrows */}
        <div className="px-8 py-4 border-t border-gray-100 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:border-gray-300 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))}
            disabled={last}
            className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:border-gray-300 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-[11px] text-gray-400 ml-1">{STEPS[step].title}</span>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/triggers")}>Cancel</Button>
            {last ? (
              <Button size="sm" onClick={save} loading={saving}>
                <Check className="w-4 h-4" /> Create draft &amp; open canvas
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep(step + 1)}>
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <aside className="w-[320px] shrink-0 border-l border-gray-100 bg-white overflow-y-auto">
        <div className="p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4 text-center">Preview</p>
          <PhonePreview nodes={buildNodes()} username="mkexplores_" />
        </div>
      </aside>

      {browsing && (
        <ReelPickerModal
          reels={reels} selected={reel}
          onPick={setReel}
          onClose={() => setBrowsing(false)}
        />
      )}
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
        disabled ? "border-gray-200 bg-gray-50/60 opacity-60"
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
