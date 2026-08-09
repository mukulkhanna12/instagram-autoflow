"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ChevronLeft, ChevronRight, Plus, X, ImageIcon, Check, Trash2, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { ReelStrip, ReelPickerModal } from "@/components/reel-picker";
import { MAX_BUTTONS } from "@/lib/buttons";
import { loadDefaults, uid } from "@/lib/trigger-store";
import type { FlowNode, TriggerReel, TriggerSource } from "@/lib/trigger-store";

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
  node, nodes, msgIndex, patch, onClose, onDelete, onAddButton, setNodes, reels, loadReels,
  editingSourceId, setEditingSourceId, patchSource, switchSourceKind, onSelectNode,
}: {
  node: FlowNode;
  nodes: FlowNode[];
  msgIndex: (id: string) => number;
  patch: Patch;
  onClose: () => void;
  onDelete: (id: string) => void;
  onAddButton: (id: string) => void;
  onSelectNode: (id: string) => void;
  setNodes: (fn: (prev: FlowNode[]) => FlowNode[]) => void;
  reels: TriggerReel[] | null;
  loadReels: () => void;
  editingSourceId: string | null;
  setEditingSourceId: (id: string | null) => void;
  patchSource: (sourceId: string, up: Partial<TriggerSource>) => void;
  switchSourceKind: (kind: "comment" | "dm") => void;
}) {
  const [step, setStep] = useState(0);

  const editingSource =
    node.type === "trigger" ? node.sources.find((x) => x.id === editingSourceId) ?? null : null;

  const title =
    node.type === "trigger"
      ? (editingSource
          ? (editingSource.kind === "comment" ? "Reel comment trigger" : "DM trigger")
          : "What starts this flow")
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
        {editingSource && (
          <button
            onClick={() => setEditingSourceId(null)}
            className="text-[11px] text-brand-700/70 hover:text-brand-800 cursor-pointer shrink-0"
          >
            Done
          </button>
        )}
      </div>

      {node.type === "trigger" ? (
        editingSource ? (
          <SourceWizard
            source={editingSource} step={step} setStep={setStep}
            patchSource={patchSource}
            onDone={() => setEditingSourceId(null)}
            reels={reels} loadReels={loadReels}
          />
        ) : (
          <SourceList
            node={node}
            onEdit={(sid) => { setEditingSourceId(sid); setStep(0); }}
            onSwitchKind={switchSourceKind}
          />
        )
      ) : node.type === "message" ? (
        <MessageEditor
          node={node} patch={patch} setNodes={setNodes}
          onAddButton={() => onAddButton(node.id)} onDelete={() => onDelete(node.id)}
        />
      ) : (
        <ConditionEditor
          node={node} nodes={nodes} patch={patch} setNodes={setNodes}
          onDelete={() => onDelete(node.id)} onSelectNode={onSelectNode}
        />
      )}
    </div>
  );
}

/* ── Trigger: the list of things that start this flow ───────────────────── */

function SourceList({
  node, onEdit, onSwitchKind,
}: {
  node: Extract<FlowNode, { type: "trigger" }>;
  onEdit: (sourceId: string) => void;
  onSwitchKind: (kind: "comment" | "dm") => void;
}) {
  const kind = node.sources[0]?.kind ?? "comment";

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      <p className="text-xs text-gray-500 leading-relaxed">
        One trigger, one way in. Everything below leads into the same messages.
      </p>

      <div className="space-y-2.5">
        {node.sources.map((src, i) => (
          <button
            key={src.id}
            onClick={() => onEdit(src.id)}
            className="w-full text-left rounded-xl border border-gray-200 p-3.5 hover:border-brand-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-[11px] font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <p className="text-sm font-semibold text-gray-900">
                {src.kind === "comment" ? "Someone comments on a reel" : "Someone sends you a DM"}
              </p>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 ml-auto shrink-0" />
            </div>
            <div className="pl-[34px] space-y-1.5">
              {src.kind === "comment" && (
                <p className="text-[11px] text-gray-500">
                  {src.reel ? (src.reel.caption || "Reel selected") : "No reel chosen yet"}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {src.include.length > 0
                  ? src.include.map((k) => <Chip key={k}>{k}</Chip>)
                  : <span className="text-[11px] text-gray-400">
                      Any {src.kind === "comment" ? "comment" : "message"}
                    </span>}
                {src.exclude.map((k) => <Chip key={k} tone="red">not {k}</Chip>)}
              </div>
              <p className={`text-[11px] ${src.autoReply ? "text-emerald-600" : "text-gray-400"}`}>
                {src.autoReply
                  ? src.kind === "comment"
                    ? `Replies publicly — ${src.replies.filter(Boolean).length} variant${src.replies.filter(Boolean).length === 1 ? "" : "s"} rotated`
                    : "Auto-replies in the DM"
                  : src.kind === "comment"
                    ? "No public reply — only the DM goes out"
                    : "No auto-reply"}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/*
        Switch, don't accumulate. A trigger owns one reel and one keyword set;
        a second way in would need its own reel and its own public reply, which
        makes it a second trigger, not a second row on this one.
      */}
      <div className="space-y-2">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
          Start it from something else
        </p>
        {([
          { k: "comment" as const, icon: <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />,
            title: "Reel comment", note: "Reply in the feed and open a DM" },
          { k: "dm" as const, icon: <Send className="w-4 h-4 text-sky-500 shrink-0" />,
            title: "Direct message", note: "Someone DMs you a keyword" },
        ]).map(({ k, icon, title, note }) => (
          <button
            key={k}
            onClick={() => { if (k !== kind && confirm(`Switch this trigger to start from a ${title.toLowerCase()}? The keywords and replies are kept.`)) onSwitchKind(k); }}
            disabled={k === kind}
            className="w-full rounded-xl border border-dashed border-gray-300 p-3 text-left flex items-center gap-2.5 hover:border-brand-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {icon}
            <div>
              <p className="text-xs font-medium text-gray-800">{title}</p>
              <p className="text-[11px] text-gray-400">{k === kind ? "Currently in use" : note}</p>
            </div>
          </button>
        ))}
        <p className="text-[11px] text-gray-400 leading-relaxed pt-1">
          Want a reel and a DM keyword both running? Make a second trigger — each one owns its own
          reel, keywords and public reply.
        </p>
      </div>
    </div>
  );
}

/* ── Trigger source: step wizard ────────────────────────────────────────── */

function SourceWizard({
  source, step, setStep, patchSource, onDone, reels, loadReels,
}: {
  source: TriggerSource;
  step: number;
  setStep: (n: number) => void;
  patchSource: (sourceId: string, up: Partial<TriggerSource>) => void;
  onDone: () => void;
  reels: TriggerReel[] | null;
  loadReels: () => void;
}) {
  const isComment = source.kind === "comment";
  const steps = isComment
    ? ["Which reel should this watch?", "What in a comment starts it?", "Reply publicly under the comment?"]
    : ["What in a DM starts it?", "Reply automatically to that DM?"];
  const at = Math.min(step, steps.length - 1);

  return (
    <>
      <div className="px-5 pt-4 shrink-0">
        <p className="text-[11px] text-gray-400">Step {at + 1} of {steps.length}</p>
        <div className="h-1 rounded-full bg-gray-100 mt-1.5 overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${((at + 1) / steps.length) * 100}%` }} />
        </div>
        <h3 className="text-base font-bold text-gray-900 mt-4 leading-snug">{steps[at]}</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {isComment && at === 0 && (
          <StepReel source={source} patchSource={patchSource} reels={reels} loadReels={loadReels} />
        )}
        {((isComment && at === 1) || (!isComment && at === 0)) && (
          <StepKeywords source={source} patchSource={patchSource} />
        )}
        {((isComment && at === 2) || (!isComment && at === 1)) && (
          <StepReplies source={source} patchSource={patchSource} />
        )}
      </div>

      <div className="border-t border-gray-100 p-4 flex items-center gap-2 shrink-0">
        <button
          onClick={() => setStep(Math.max(0, at - 1))}
          disabled={at === 0}
          className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:border-gray-300 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => setStep(Math.min(steps.length - 1, at + 1))}
          disabled={at === steps.length - 1}
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
  source, patchSource, reels, loadReels,
}: {
  source: Extract<TriggerSource, { kind: "comment" }>;
  patchSource: (id: string, up: Partial<TriggerSource>) => void;
  reels: TriggerReel[] | null;
  loadReels: () => void;
}) {
  const [browsing, setBrowsing] = useState(false);

  // Fetched when this step is first reached — not on page load.
  useEffect(() => { if (reels === null) loadReels(); }, [reels, loadReels]);

  return (
    <div className="space-y-3">
      <OptionCard selected title="A specific reel">
        <ReelStrip
          reels={reels}
          selected={source.reel}
          columns={3}
          onSelect={(r) => patchSource(source.id, { reel: r } as Partial<TriggerSource>)}
          onBrowse={() => setBrowsing(true)}
        />
      </OptionCard>

      <OptionCard disabled title="Any reel" note="Every reel on the account runs this flow" />
      <OptionCard disabled title="Your next reel" note="Attaches to whatever you post next" />

      {browsing && (
        <ReelPickerModal
          reels={reels}
          selected={source.reel}
          onPick={(r) => patchSource(source.id, { reel: r } as Partial<TriggerSource>)}
          onClose={() => setBrowsing(false)}
        />
      )}
    </div>
  );
}

function StepKeywords({
  source, patchSource,
}: {
  source: TriggerSource;
  patchSource: (id: string, up: Partial<TriggerSource>) => void;
}) {
  const anything = source.include.length === 0;
  const noun = source.kind === "comment" ? "comment" : "message";
  return (
    <div className="space-y-3">
      <OptionCard
        selected={!anything}
        title="Specific keywords"
        onClick={() => { if (anything) patchSource(source.id, { include: ["prompt"] } as Partial<TriggerSource>); }}
      >
        <div className="space-y-3">
          <KeywordBox
            label={<>The {noun} <strong>includes</strong>:</>}
            words={source.include}
            onChange={(w) => patchSource(source.id, { include: w } as Partial<TriggerSource>)}
          />
          <KeywordBox
            label={<>But <strong>never</strong> when it contains:</>}
            words={source.exclude}
            tone="red"
            onChange={(w) => patchSource(source.id, { exclude: w } as Partial<TriggerSource>)}
          />
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Keywords aren&apos;t case-sensitive — &ldquo;Hello&rdquo; and &ldquo;hello&rdquo; are the same.
          </p>
        </div>
      </OptionCard>

      <OptionCard
        selected={anything}
        title={`Any ${noun}`}
        note={`Every ${noun} starts the flow`}
        onClick={() => patchSource(source.id, { include: [] } as Partial<TriggerSource>)}
      />
    </div>
  );
}

function StepReplies({
  source, patchSource,
}: {
  source: TriggerSource;
  patchSource: (id: string, up: Partial<TriggerSource>) => void;
}) {
  const set = (replies: string[]) => patchSource(source.id, { replies } as Partial<TriggerSource>);
  const where = source.kind === "comment" ? "in the feed" : "in the DM";
  return (
    <div className="space-y-3">
      <OptionCard
        selected={source.autoReply}
        title={`Yes — auto-reply ${where}`}
        onClick={() => patchSource(source.id, { autoReply: true } as Partial<TriggerSource>)}
      >
        <div className="space-y-2">
          {source.replies.map((r, i) => (
            <div key={i} className="flex gap-1.5">
              <Input
                value={r}
                onChange={(e) => set(source.replies.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder={source.kind === "comment" ? "Sent you a DM! 📩" : "Got it — one sec 👀"}
              />
              {source.replies.length > 1 && (
                <button onClick={() => set(source.replies.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500 shrink-0 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => set([...source.replies, ""])}
            className="w-full rounded-lg border border-dashed border-gray-300 py-2 text-xs text-gray-400 hover:border-brand-400 hover:text-brand-600 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3 h-3" /> Add a reply
          </button>
          <p className="text-[11px] text-gray-400">
            {source.kind === "comment"
              ? "Identical replies can get flagged as spam, so one is picked at random each time."
              : "Sent the moment their DM arrives, before the rest of the flow runs."}
          </p>
        </div>
      </OptionCard>

      <OptionCard
        selected={!source.autoReply}
        title="No auto-reply"
        note={source.kind === "comment" ? "Only the DM goes out" : "Go straight into the flow"}
        onClick={() => patchSource(source.id, { autoReply: false } as Partial<TriggerSource>)}
      />
    </div>
  );
}

/* ── Follow check ───────────────────────────────────────────────────────── */

/**
 * The follow gate.
 *
 * The gate itself sends nothing — it only picks a branch. The wording people
 * actually read lives on the two messages it points at, so this panel's job is
 * to get you to them, and to offer the "not following yet" nudge if the no
 * branch is still empty, which is the case that silently drops people.
 *
 * That nudge's button points back at the gate, and the loop is the retry: tap
 * without having followed and the same nudge comes round again.
 */
function ConditionEditor({
  node, nodes, patch, setNodes, onDelete, onSelectNode,
}: {
  node: Extract<FlowNode, { type: "condition" }>;
  nodes: FlowNode[];
  patch: Patch;
  setNodes: (fn: (prev: FlowNode[]) => FlowNode[]) => void;
  onDelete: () => void;
  onSelectNode: (id: string) => void;
}) {
  function addNudge() {
    if (node.no) return;
    const d = loadDefaults();
    const nid = uid("msg");
    setNodes((prev) => [
      ...prev.map((n) => (n.id === node.id && n.type === "condition" ? { ...n, no: nid } : n)),
      {
        id: nid, type: "message", title: "Not following yet",
        text: d.follow.text,
        // Back to the gate: tapping re-checks, so this doubles as the retry.
        buttons: [{ id: uid("btn"), label: d.follow.button, kind: "next", next: node.id }],
      },
    ]);
    onSelectNode(nid);
  }

  /**
   * Splice a second, differently-worded message into the loop.
   *
   * The gate cannot tell a first tap from a fifth, so a distinct retry has to
   * come from the shape of the graph: the nudge's button now opens this message
   * instead of re-checking, and its button is what returns to the gate. People
   * who keep tapping without following see the two alternate.
   */
  function addRetry() {
    const d = loadDefaults();
    const rid = uid("msg");
    setNodes((prev) => {
      const nudge = prev.find((n) => n.id === node.no);
      if (!nudge || nudge.type !== "message") return prev;
      return [
        ...prev.map((n) => (n.id === nudge.id && n.type === "message"
          ? { ...n, buttons: n.buttons.map((b) => (b.next === node.id ? { ...b, next: rid } : b)) }
          : n)),
        {
          id: rid, type: "message", title: "Still not following",
          text: d.followRetry.text,
          buttons: [{ id: uid("btn"), label: d.followRetry.button, kind: "next", next: node.id }],
        },
      ];
    });
    onSelectNode(rid);
  }

  // Offer the retry only while the nudge still loops straight back to the gate —
  // once something else sits on the loop, this would be rewriting their graph.
  const nudge = nodes.find((n) => n.id === node.no);
  const nudgeLoopsBack =
    nudge?.type === "message" && nudge.buttons.some((b) => b.next === node.id);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="p-5 space-y-4">
        <Input
          label="Question shown on the card"
          value={node.label}
          onChange={(e) => patch(node.id, { label: e.target.value } as Partial<FlowNode>)}
          hint="A label for you — it is never sent to anyone."
        />

        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">What each answer leads to</p>

          <BranchRow
            tone="yes" title="They follow you" target={node.yes}
            empty="Nothing yet — followers reach a dead end."
            onOpen={onSelectNode}
          />

          {node.no ? (
            <>
              <BranchRow
                tone="no" title="Not following yet" target={node.no}
                empty="" onOpen={onSelectNode}
              />
              {nudgeLoopsBack && (
                <div className="rounded-lg border border-gray-200 p-3 space-y-2">
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Right now a repeat tap shows that same message again. Add a second one and the
                    two alternate, so the wording changes when the first didn&apos;t land.
                  </p>
                  <Button variant="outline" size="sm" className="w-full" onClick={addRetry}>
                    <Plus className="w-3.5 h-3.5" /> Add a retry message
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Non-followers currently get <strong>nothing</strong> — the flow stops for them
                without a word. Add the nudge and they get asked to follow, with a button that
                re-checks.
              </p>
              <Button variant="outline" size="sm" className="w-full" onClick={addNudge}>
                <Plus className="w-3.5 h-3.5" /> Add the &ldquo;please follow&rdquo; message
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-gray-50 p-3 space-y-2">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            <strong>Where the wording lives:</strong> the gate sends nothing itself. Open the
            message on a branch to change what people read.
          </p>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            <strong>The retry:</strong> the last message on the loop points back here, so tapping
            re-checks. The gate can&apos;t tell a first tap from a fifth — different wording the
            second time comes from putting a second message on the loop.
          </p>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Instagram only reveals whether someone follows you once they&apos;ve messaged you, and
            their tap is that message — so this can only sit after a button, never straight after
            the comment.
          </p>
        </div>
      </div>

      <div className="mt-auto border-t border-gray-100 p-4">
        <Button variant="outline" size="sm" className="w-full" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5 text-red-400" /> Remove the follow check
        </Button>
        <p className="text-[11px] text-gray-400 mt-1.5 text-center">
          Everyone then reaches the payoff without following.
        </p>
      </div>
    </div>
  );
}

function BranchRow({
  tone, title, target, empty, onOpen,
}: {
  tone: "yes" | "no";
  title: string;
  target: string | null;
  empty: string;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 flex items-center gap-2.5">
      <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 ${
        tone === "yes" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
      }`}>
        {tone}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-700 truncate">{title}</p>
        {!target && empty && <p className="text-[11px] text-amber-700 mt-0.5">{empty}</p>}
      </div>
      {target && (
        <button
          onClick={() => onOpen(target)}
          className="text-[11px] font-medium text-brand-600 hover:text-brand-700 cursor-pointer shrink-0"
        >
          Edit message
        </button>
      )}
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
          {node.buttons.map((b, i) => (
            <div key={b.id} className="rounded-lg border border-gray-200 p-3 mb-2 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Button {i + 1}
                </span>
                <button
                  onClick={() => setNodes((prev) => prev.map((n) =>
                    n.id === node.id && n.type === "message" ? { ...n, buttons: n.buttons.filter((x) => x.id !== b.id) } : n))}
                  className="text-gray-300 hover:text-red-500 cursor-pointer"
                  title="Remove this button"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <Input
                label="Button text"
                value={b.label}
                placeholder="Click here"
                onChange={(e) => editButton(b.id, { label: e.target.value })}
              />
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
              {b.kind === "link" ? (
                <Input
                  label="Link URL"
                  type="url"
                  value={b.url ?? ""}
                  placeholder="https://…"
                  onChange={(e) => editButton(b.id, { url: e.target.value })}
                  hint={b.url?.trim() ? undefined : "Without a link this button does nothing"}
                />
              ) : (
                <p className="text-[11px] text-gray-400">
                  Drag this button&apos;s dot on the card to the message it should open.
                </p>
              )}
            </div>
          ))}
          <Button
            variant="outline" size="sm" className="w-full"
            onClick={onAddButton}
            disabled={node.buttons.length >= MAX_BUTTONS}
          >
            <Plus className="w-3.5 h-3.5" /> Add button
          </Button>
          <p className="text-[11px] text-gray-400 mt-1.5">
            {node.buttons.length >= MAX_BUTTONS
              ? "Instagram allows a maximum of 3 buttons."
              : `${MAX_BUTTONS - node.buttons.length} more allowed.`}
          </p>
        </div>
      </div>
      <div className="border-t border-gray-100 p-4 shrink-0">
        <Button variant="outline" size="sm" className="w-full" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5 text-red-400" /> Remove this message
        </Button>
      </div>
    </>
  );
}

/* ── bits ───────────────────────────────────────────────────────────────── */

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
