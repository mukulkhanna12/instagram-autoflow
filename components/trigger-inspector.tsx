"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ChevronLeft, ChevronRight, Pencil, Plus, X, ImageIcon, Check, Trash2, Loader2, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import type { FlowNode, TriggerReel } from "@/lib/trigger-store";

/**
 * The editing drawer for a selected card.
 *
 * A trigger opens as a read-only summary first — most visits are to check what
 * a trigger does, not to change it — and only becomes a form once Edit is
 * pressed. That form is a three-step wizard because the three questions are
 * genuinely sequential: which reel, what starts it, what happens publicly.
 * Messages and the follow check are simple enough to edit directly.
 */

type Patch = (id: string, up: Partial<FlowNode>) => void;

export function TriggerInspector({
  node, allNodes, msgIndex, patch, onClose, onDelete, onAddButton, setNodes, reels, loadReels,
}: {
  node: FlowNode;
  allNodes: FlowNode[];
  msgIndex: (id: string) => number;
  patch: Patch;
  onClose: () => void;
  onDelete: (id: string) => void;
  onAddButton: (id: string) => void;
  setNodes: (fn: (prev: FlowNode[]) => FlowNode[]) => void;
  reels: TriggerReel[] | null;
  loadReels: () => void;
}) {
  const [mode, setMode] = useState<"summary" | "edit">("summary");
  const [step, setStep] = useState(0);

  const title =
    node.type === "trigger" ? "When someone comments"
    : node.type === "condition" ? "Follow check"
    : `Message #${msgIndex(node.id)}`;

  return (
    <div className="w-[360px] shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header — tinted so the drawer reads as a different surface to the canvas */}
      <div className="bg-brand-50 border-b border-brand-100 px-4 py-3.5 flex items-center gap-2 shrink-0">
        <button onClick={onClose} className="text-brand-700/60 hover:text-brand-800 cursor-pointer">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-bold text-gray-900 truncate flex-1">{title}</p>
        {node.type === "trigger" && mode === "summary" && (
          <Pencil className="w-3.5 h-3.5 text-brand-700/50" />
        )}
      </div>

      {node.type === "trigger" ? (
        mode === "summary" ? (
          <TriggerSummary node={node} onEdit={() => { setMode("edit"); setStep(0); }} patch={patch} />
        ) : (
          <TriggerWizard
            node={node} step={step} setStep={setStep} patch={patch}
            onDone={() => setMode("summary")}
            reels={reels} loadReels={loadReels}
          />
        )
      ) : node.type === "message" ? (
        <MessageEditor
          node={node} patch={patch} setNodes={setNodes}
          onAddButton={() => onAddButton(node.id)} onDelete={() => onDelete(node.id)}
        />
      ) : (
        <div className="p-5">
          <p className="text-xs text-gray-500 leading-relaxed">
            Instagram only reveals whether someone follows you once they&apos;ve messaged you, and
            their button tap is that message. So this check can only sit after a button — never
            straight after the comment.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Trigger: read-only summary ─────────────────────────────────────────── */

function TriggerSummary({
  node, onEdit, patch,
}: {
  node: Extract<FlowNode, { type: "trigger" }>;
  onEdit: () => void;
  patch: Patch;
}) {
  return (
    <>
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <Numbered n={1} label="When someone comments on">
          <div className="rounded-xl border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-800 mb-2">A specific reel</p>
            {node.reel ? (
              <>
                <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                  {node.reel.thumbnail
                    ? <Image src={node.reel.thumbnail} alt="" fill className="object-cover" />
                    : <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className="w-6 h-6 text-gray-300" /></div>}
                </div>
                <p className="text-[11px] text-gray-500 mt-2 line-clamp-2">{node.reel.caption || "No caption"}</p>
              </>
            ) : (
              <p className="text-[11px] text-gray-400">No reel chosen yet</p>
            )}
          </div>
        </Numbered>

        <Numbered n={2} label="And their comment">
          <div className="rounded-xl border border-gray-200 p-3 space-y-3">
            {node.include.length > 0 ? (
              <>
                <p className="text-xs text-gray-600">
                  Comments <strong>include</strong> these keywords:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {node.include.map((k) => <Chip key={k}>{k}</Chip>)}
                </div>
              </>
            ) : (
              <p className="text-xs font-semibold text-gray-800">Any comment</p>
            )}
            {node.exclude.length > 0 && (
              <>
                <p className="text-xs text-gray-600">
                  But <strong>never</strong> when it contains:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {node.exclude.map((k) => <Chip key={k} tone="red">{k}</Chip>)}
                </div>
              </>
            )}
          </div>
        </Numbered>

        <Numbered n={3} label="And publicly you reply">
          <div className="rounded-xl border border-gray-200 p-3 space-y-2">
            {node.replyEnabled && node.replies.filter(Boolean).length > 0 ? (
              <>
                <p className="text-[11px] text-gray-500">One of these, picked at random:</p>
                {node.replies.filter(Boolean).map((r, i) => (
                  <p key={i} className="text-xs text-gray-800 bg-gray-50 rounded-lg px-2.5 py-1.5">{r}</p>
                ))}
              </>
            ) : (
              <p className="text-xs text-gray-500">No public reply</p>
            )}
          </div>
        </Numbered>
      </div>

      <div className="border-t border-gray-100 p-4 flex items-center gap-3 shrink-0">
        <label className="flex items-center gap-2 cursor-pointer mr-auto">
          <input
            type="checkbox"
            checked={node.replyEnabled}
            onChange={(e) => patch(node.id, { replyEnabled: e.target.checked } as Partial<FlowNode>)}
            className="cursor-pointer"
          />
          <span className="text-[11px] text-gray-500">Public reply</span>
        </label>
        <Button size="sm" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5" /> Edit
        </Button>
      </div>
    </>
  );
}

/* ── Trigger: 3-step wizard ─────────────────────────────────────────────── */

const STEPS = [
  "Which reel should this watch?",
  "What in a comment starts it?",
  "Reply publicly under the comment?",
];

function TriggerWizard({
  node, step, setStep, patch, onDone, reels, loadReels,
}: {
  node: Extract<FlowNode, { type: "trigger" }>;
  step: number;
  setStep: (n: number) => void;
  patch: Patch;
  onDone: () => void;
  reels: TriggerReel[] | null;
  loadReels: () => void;
}) {
  return (
    <>
      <div className="px-5 pt-4 shrink-0">
        <p className="text-[11px] text-gray-400">Step {step + 1} of {STEPS.length}</p>
        <div className="h-1 rounded-full bg-gray-100 mt-1.5 overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <h3 className="text-base font-bold text-gray-900 mt-4 leading-snug">{STEPS[step]}</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {step === 0 && <StepReel node={node} patch={patch} reels={reels} loadReels={loadReels} />}
        {step === 1 && <StepKeywords node={node} patch={patch} />}
        {step === 2 && <StepReplies node={node} patch={patch} />}
      </div>

      <div className="border-t border-gray-100 p-4 flex items-center gap-2 shrink-0">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:border-gray-300 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))}
          disabled={step === STEPS.length - 1}
          className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:border-gray-300 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <Button size="sm" className="ml-auto" onClick={onDone}>
          <Check className="w-3.5 h-3.5" /> Done
        </Button>
      </div>
    </>
  );
}

function StepReel({
  node, patch, reels, loadReels,
}: {
  node: Extract<FlowNode, { type: "trigger" }>;
  patch: Patch;
  reels: TriggerReel[] | null;
  loadReels: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const [q, setQ] = useState("");

  // Fetched when this step is first reached — not on page load.
  useEffect(() => { if (reels === null) loadReels(); }, [reels, loadReels]);

  const filtered = (reels ?? []).filter((r) => !q || (r.caption ?? "").toLowerCase().includes(q.toLowerCase()));
  const shown = showAll || q ? filtered : filtered.slice(0, 6);

  return (
    <div className="space-y-3">
      <OptionCard selected title="A specific reel">
        {reels === null ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-brand-500" /></div>
        ) : (
          <>
            {(reels.length > 6 || q) && (
              <div className="relative mb-2.5">
                <Search className="w-3.5 h-3.5 text-gray-300 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search captions…"
                  className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400"
                />
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              {shown.map((r) => {
                const active = node.reel?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => patch(node.id, { reel: r } as Partial<FlowNode>)}
                    className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer group"
                  >
                    {r.thumbnail
                      ? <Image src={r.thumbnail} alt="" fill className="object-cover" />
                      : <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className="w-4 h-4 text-gray-300" /></div>}
                    <span className={`absolute inset-0 ring-2 rounded-lg transition-all ${
                      active ? "ring-brand-500" : "ring-transparent group-hover:ring-brand-300"
                    }`} />
                    <span className={`absolute top-1.5 right-1.5 w-4 h-4 rounded-full border-2 transition-all ${
                      active ? "bg-brand-500 border-white" : "bg-white/70 border-white"
                    }`} />
                  </button>
                );
              })}
            </div>
            {!showAll && !q && filtered.length > 6 && (
              <button onClick={() => setShowAll(true)} className="text-xs text-brand-600 font-medium mt-2.5 cursor-pointer">
                Show all {filtered.length}
              </button>
            )}
            {filtered.length === 0 && <p className="text-xs text-gray-400 py-4 text-center">No reels found.</p>}
          </>
        )}
      </OptionCard>

      <OptionCard disabled title="Any reel" note="Every reel on the account runs this flow" />
      <OptionCard disabled title="Your next reel" note="Attaches to whatever you post next" />
    </div>
  );
}

function StepKeywords({ node, patch }: { node: Extract<FlowNode, { type: "trigger" }>; patch: Patch }) {
  const anyComment = node.include.length === 0;
  return (
    <div className="space-y-3">
      <OptionCard selected={!anyComment} title="Specific keywords" onClick={() => {
        if (anyComment) patch(node.id, { include: ["prompt"] } as Partial<FlowNode>);
      }}>
        <div className="space-y-3">
          <KeywordBox
            label={<>Comments <strong>include</strong> these keywords:</>}
            words={node.include}
            onChange={(w) => patch(node.id, { include: w } as Partial<FlowNode>)}
          />
          <KeywordBox
            label={<>Comments <strong>exclude</strong> these keywords:</>}
            words={node.exclude}
            tone="red"
            onChange={(w) => patch(node.id, { exclude: w } as Partial<FlowNode>)}
          />
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Keywords aren&apos;t case-sensitive — &ldquo;Hello&rdquo; and &ldquo;hello&rdquo; are the same.
          </p>
        </div>
      </OptionCard>

      <OptionCard
        selected={anyComment}
        title="Any comment"
        note="Every comment on the reel starts the flow"
        onClick={() => patch(node.id, { include: [] } as Partial<FlowNode>)}
      />
    </div>
  );
}

function StepReplies({ node, patch }: { node: Extract<FlowNode, { type: "trigger" }>; patch: Patch }) {
  const set = (replies: string[]) => patch(node.id, { replies } as Partial<FlowNode>);
  return (
    <div className="space-y-3">
      <OptionCard
        selected={node.replyEnabled}
        title="Yes — rotate several replies"
        onClick={() => patch(node.id, { replyEnabled: true } as Partial<FlowNode>)}
      >
        <div className="space-y-2">
          {node.replies.map((r, i) => (
            <div key={i} className="flex gap-1.5">
              <Input
                value={r}
                onChange={(e) => set(node.replies.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder="Sent you a DM! 📩"
              />
              {node.replies.length > 1 && (
                <button
                  onClick={() => set(node.replies.filter((_, j) => j !== i))}
                  className="text-gray-300 hover:text-red-500 shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => set([...node.replies, ""])}
            className="w-full rounded-lg border border-dashed border-gray-300 py-2 text-xs text-gray-400 hover:border-brand-400 hover:text-brand-600 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3 h-3" /> Add a reply
          </button>
          <p className="text-[11px] text-gray-400">
            Identical replies can get flagged as spam, so one is picked at random each time.
          </p>
        </div>
      </OptionCard>

      <OptionCard
        selected={!node.replyEnabled}
        title="No public reply"
        note="Only the DM goes out"
        onClick={() => patch(node.id, { replyEnabled: false } as Partial<FlowNode>)}
      />
    </div>
  );
}

/* ── Message editor ─────────────────────────────────────────────────────── */

function MessageEditor({
  node, patch, setNodes, onAddButton, onDelete,
}: {
  node: Extract<FlowNode, { type: "message" }>;
  patch: Patch;
  setNodes: (fn: (prev: FlowNode[]) => FlowNode[]) => void;
  onAddButton: () => void;
  onDelete: () => void;
}) {
  const editButton = (bid: string, up: Partial<{ label: string; kind: "next" | "link"; url: string }>) =>
    setNodes((prev) => prev.map((n) =>
      n.id === node.id && n.type === "message"
        ? { ...n, buttons: n.buttons.map((b) => (b.id === bid ? { ...b, ...up } : b)) }
        : n));

  return (
    <>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <Input
          label="Card title"
          value={node.title}
          onChange={(e) => patch(node.id, { title: e.target.value } as Partial<FlowNode>)}
        />
        <Textarea
          label="Message"
          rows={5}
          value={node.text}
          onChange={(e) => patch(node.id, { text: e.target.value } as Partial<FlowNode>)}
          hint="Use {{full_name}} or {{username}}"
        />
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Buttons</p>
          {node.buttons.length === 0 && (
            <p className="text-[11px] text-gray-400 mb-2">No buttons — sends as plain text.</p>
          )}
          {node.buttons.map((b) => (
            <div key={b.id} className="rounded-lg border border-gray-200 p-3 mb-2 space-y-2">
              <Input value={b.label} onChange={(e) => editButton(b.id, { label: e.target.value })} />
              <div className="flex gap-1.5">
                {(["next", "link"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => editButton(b.id, { kind: k })}
                    className={`flex-1 text-[11px] py-1.5 rounded-md border cursor-pointer transition-colors ${
                      b.kind === k ? "bg-brand-50 border-brand-300 text-brand-700 font-medium" : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {k === "next" ? "Opens a message" : "Opens a link"}
                  </button>
                ))}
              </div>
              {b.kind === "link" && (
                <Input value={b.url ?? ""} placeholder="https://…" onChange={(e) => editButton(b.id, { url: e.target.value })} />
              )}
              <button
                onClick={() => setNodes((prev) => prev.map((n) =>
                  n.id === node.id && n.type === "message" ? { ...n, buttons: n.buttons.filter((x) => x.id !== b.id) } : n))}
                className="text-[11px] text-gray-400 hover:text-red-500 cursor-pointer"
              >
                Remove button
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full" onClick={onAddButton}>
            <Plus className="w-3.5 h-3.5" /> Add button
          </Button>
        </div>
      </div>
      <div className="border-t border-gray-100 p-4 shrink-0">
        <Button variant="outline" size="sm" className="w-full" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5 text-red-400" /> Delete this step
        </Button>
      </div>
    </>
  );
}

/* ── bits ───────────────────────────────────────────────────────────────── */

function Numbered({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2.5">
        <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-[11px] font-bold flex items-center justify-center shrink-0">
          {n}
        </span>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
      </div>
      <div className="pl-[34px]">{children}</div>
    </div>
  );
}

function Chip({ children, tone = "brand" }: { children: React.ReactNode; tone?: "brand" | "red" }) {
  return (
    <span className={`text-[11px] font-medium rounded-full px-2.5 py-1 ${
      tone === "red" ? "bg-red-50 text-red-600" : "bg-violet-100 text-violet-700"
    }`}>
      {children}
    </span>
  );
}

function OptionCard({
  selected, disabled, title, note, children, onClick,
}: {
  selected?: boolean;
  disabled?: boolean;
  title: string;
  note?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`rounded-xl border p-3.5 transition-all ${
        disabled
          ? "border-gray-150 bg-gray-50/60 opacity-60"
          : selected
          ? "border-brand-400 ring-1 ring-brand-200 bg-white cursor-pointer"
          : "border-gray-200 bg-white hover:border-gray-300 cursor-pointer"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${
          selected ? "border-brand-500 bg-brand-500 ring-2 ring-white ring-inset" : "border-gray-300"
        }`} />
        <p className="text-xs font-semibold text-gray-900">{title}</p>
        {disabled && (
          <span className="ml-auto text-[9px] font-bold tracking-wide text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
            SOON
          </span>
        )}
      </div>
      {note && <p className="text-[11px] text-gray-400 pl-[22px]">{note}</p>}
      {children && <div className="mt-2.5">{children}</div>}
    </div>
  );
}

function KeywordBox({
  label, words, onChange, tone,
}: {
  label: React.ReactNode;
  words: string[];
  onChange: (w: string[]) => void;
  tone?: "red";
}) {
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  function commit() {
    const v = draft.trim();
    if (v && !words.includes(v)) onChange([...words, v]);
    setDraft("");
    setAdding(false);
  }

  return (
    <div className="rounded-lg border border-gray-200 p-2.5">
      <p className="text-[11px] text-gray-600 mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {words.map((w) => (
          <span key={w} className={`group text-[11px] font-medium rounded-full pl-2.5 pr-1.5 py-1 flex items-center gap-1 ${
            tone === "red" ? "bg-red-50 text-red-600" : "bg-violet-100 text-violet-700"
          }`}>
            {w}
            <button onClick={() => onChange(words.filter((x) => x !== w))} className="opacity-50 hover:opacity-100 cursor-pointer">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {adding ? (
          <input
            autoFocus value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(""); setAdding(false); } }}
            placeholder="keyword"
            className="text-[11px] rounded-full border border-brand-300 px-2.5 py-1 w-24 focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="text-[11px] rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-gray-400 hover:border-brand-400 hover:text-brand-600 cursor-pointer"
          >
            + Keyword
          </button>
        )}
      </div>
    </div>
  );
}
