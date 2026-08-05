"use client";
import { useEffect, useState } from "react";
import {
  Loader2, MessageSquare, Zap, UserCheck, Link2, Save, Wand2, AlertCircle,
  Filter, Plus, Trash2, ToggleLeft, ToggleRight, ChevronUp, ChevronDown,
  ChevronRight, Inbox,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { MessageInput } from "@/components/message-input";
import { Badge } from "@/components/ui/badge";

interface DetailsButton { title: string; url: string }

interface Flow {
  id: string;
  name: string;
  position: number;
  keywords: string;
  commentReplyText: string;
  commentReplyText2?: string | null;
  commentReplyText3?: string | null;
  greetingMessage: string;
  greetingButtonText: string;
  followMessage: string;
  followButtonText: string;
  followRetryMessage: string;
  detailsMessage: string;
  detailsButtonEnabled: boolean;
  detailsButtons: DetailsButton[];
  detailsButtonText: string;
  detailsUrl: string;
}

const MAX_BUTTONS = 3;

const FIELDS = [
  "name", "keywords",
  "commentReplyText", "commentReplyText2", "commentReplyText3",
  "greetingMessage", "greetingButtonText",
  "followMessage", "followButtonText", "followRetryMessage",
  "detailsMessage", "detailsButtonEnabled", "detailsButtons", "detailsButtonText", "detailsUrl",
] as const;

/** Fall back to the legacy single-button pair for flows saved before this. */
function buttonsOf(f: Flow): DetailsButton[] {
  if (Array.isArray(f.detailsButtons) && f.detailsButtons.length > 0) {
    return f.detailsButtons.slice(0, MAX_BUTTONS);
  }
  const title = f.detailsButtonText?.trim();
  const url = f.detailsUrl?.trim();
  return title && url ? [{ title, url }] : [];
}

export default function QueuePage() {
  const [flows, setFlows] = useState<Flow[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [noAccount, setNoAccount] = useState(false);

  useEffect(() => {
    fetch("/api/flows")
      .then((r) => r.json())
      .then(({ flows }) => {
        if (flows === null) setNoAccount(true);
        else setFlows(flows);
      })
      .finally(() => setLoading(false));
  }, []);

  function patchLocal(id: string, patch: Partial<Flow>) {
    setFlows((prev) => prev?.map((f) => (f.id === id ? { ...f, ...patch } : f)) ?? prev);
  }

  async function addFlow() {
    setSaving(true);
    const res = await fetch("/api/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `Flow ${(flows?.length ?? 0) + 1}` }),
    });
    const { flow } = await res.json();
    setFlows((prev) => [...(prev ?? []), flow]);
    setOpenId(flow.id);
    setSaving(false);
  }

  async function saveFlow(flow: Flow) {
    setSaving(true);
    const data = Object.fromEntries(FIELDS.map((f) => [f, flow[f] ?? ""]));
    const res = await fetch(`/api/flows/${flow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { flow: updated } = await res.json();
      patchLocal(flow.id, updated);
      setSavedId(flow.id);
      setTimeout(() => setSavedId(null), 2000);
    }
    setSaving(false);
  }

  async function deleteFlow(id: string) {
    if (!confirm("Delete this prepared flow? It won't be attached to any reel.")) return;
    await fetch(`/api/flows/${id}`, { method: "DELETE" });
    setFlows((prev) => prev?.filter((f) => f.id !== id) ?? prev);
    if (openId === id) setOpenId(null);
  }

  async function move(index: number, dir: -1 | 1) {
    if (!flows) return;
    const target = index + dir;
    if (target < 0 || target >= flows.length) return;

    const next = [...flows];
    [next[index], next[target]] = [next[target], next[index]];
    setFlows(next); // optimistic — reordering should feel instant

    await fetch("/api/flows/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((f) => f.id) }),
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (noAccount || !flows) {
    return (
      <div className="p-8 max-w-3xl">
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-5">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">No Instagram account connected</p>
            <p className="text-sm text-amber-600 mt-1">
              Please <Link href="/settings" className="underline">connect your Instagram account</Link> first.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shrink-0">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Flows waiting for your next reels</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Each one attaches to a single upcoming reel, then it&apos;s used up
            </p>
          </div>
        </div>
        <Button size="sm" onClick={addFlow} loading={saving && !openId}>
          <Plus className="w-4 h-4" /> Add flow
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 my-5">
        <p className="text-sm text-gray-600">
          {flows.length === 0 ? (
            <>Nothing prepared. Reels you upload now get <strong>no automation</strong>.</>
          ) : (
            <>
              Your next reel gets <strong>{flows[0].name || "the first flow"}</strong>.
              {flows.length > 1 && <> The one after that gets <strong>{flows[1].name || "the second"}</strong>.</>}
              {" "}Upload more than {flows.length} reel{flows.length === 1 ? "" : "s"} and the rest get nothing.
            </>
          )}
        </p>
      </div>

      {flows.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
          <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">The queue is empty</p>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Prepare a flow before you post, and it will attach itself to that reel automatically.
          </p>
          <Button size="sm" className="mt-4" onClick={addFlow} loading={saving}>
            <Plus className="w-4 h-4" /> Add your first flow
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {flows.map((flow, i) => (
            <FlowCard
              key={flow.id}
              flow={flow}
              index={i}
              total={flows.length}
              open={openId === flow.id}
              saving={saving}
              saved={savedId === flow.id}
              onToggle={() => setOpenId(openId === flow.id ? null : flow.id)}
              onChange={(patch) => patchLocal(flow.id, patch)}
              onSave={() => saveFlow(flow)}
              onDelete={() => deleteFlow(flow.id)}
              onMove={(dir) => move(i, dir)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FlowCard({
  flow, index, total, open, saving, saved, onToggle, onChange, onSave, onDelete, onMove,
}: {
  flow: Flow;
  index: number;
  total: number;
  open: boolean;
  saving: boolean;
  saved: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<Flow>) => void;
  onSave: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const next = index === 0;

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${next ? "border-brand-200" : "border-gray-100"}`}>
      <div className="flex items-center gap-3 p-4">
        <div className="flex flex-col shrink-0">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Move earlier in the queue"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Move later in the queue"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        <button onClick={onToggle} className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer">
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
            next ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"
          }`}>
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {flow.name || `Flow ${index + 1}`}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {flow.keywords?.trim() ? `Keyword: ${flow.keywords}` : "Replies to every comment"}
            </p>
          </div>
          {next && <Badge variant="info" className="shrink-0">Next reel</Badge>}
          <ChevronRight className={`w-4 h-4 text-gray-300 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        </button>

        <button
          onClick={onDelete}
          className="text-gray-300 hover:text-red-500 transition-colors shrink-0 cursor-pointer"
          title="Delete this prepared flow"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50/50">
          <Input
            label="Name (just for you)"
            value={flow.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. Free guide reel"
          />

          <Section icon={MessageSquare} color="text-blue-600 bg-blue-50 border-blue-200" title="Comment reply" desc="Public reply posted on the comment">
            <KeywordFilter value={flow.keywords ?? ""} onChange={(v) => onChange({ keywords: v })} />
            <Textarea
              label="Comment reply — variant 1"
              value={flow.commentReplyText}
              onChange={(e) => onChange({ commentReplyText: e.target.value })}
              rows={2}
            />
            <Textarea
              label="Variant 2 (optional)"
              value={flow.commentReplyText2 ?? ""}
              onChange={(e) => onChange({ commentReplyText2: e.target.value })}
              rows={2}
            />
            <Textarea
              label="Variant 3 (optional)"
              value={flow.commentReplyText3 ?? ""}
              onChange={(e) => onChange({ commentReplyText3: e.target.value })}
              rows={2}
            />
          </Section>

          <Section icon={Zap} color="text-brand-600 bg-brand-50 border-brand-200" title="DM greeting" desc="First DM sent to the commenter, with a button">
            <MessageInput
              label="Greeting message"
              value={flow.greetingMessage}
              onChange={(v) => onChange({ greetingMessage: v })}
              rows={3}
            />
            <Input
              label="Button text"
              value={flow.greetingButtonText}
              onChange={(e) => onChange({ greetingButtonText: e.target.value })}
            />
          </Section>

          <Section icon={UserCheck} color="text-amber-600 bg-amber-50 border-amber-200" title="Follow gate" desc="Only shown if they aren't following you">
            <MessageInput
              label="Follow-required message"
              value={flow.followMessage}
              onChange={(v) => onChange({ followMessage: v })}
              rows={3}
            />
            <Input
              label="Button text"
              value={flow.followButtonText}
              onChange={(e) => onChange({ followButtonText: e.target.value })}
            />
            <MessageInput
              label="Still-not-following message (loops until they follow)"
              value={flow.followRetryMessage}
              onChange={(v) => onChange({ followRetryMessage: v })}
              rows={3}
            />
          </Section>

          <Section icon={Link2} color="text-emerald-600 bg-emerald-50 border-emerald-200" title="Final details" desc="Sent once the follow is confirmed">
            <MessageInput
              label="Details message"
              value={flow.detailsMessage}
              onChange={(v) => onChange({ detailsMessage: v })}
              rows={3}
            />
            <ButtonToggle
              enabled={flow.detailsButtonEnabled ?? true}
              onChange={(on) => onChange({ detailsButtonEnabled: on })}
            />
            {(flow.detailsButtonEnabled ?? true) && (
              <ButtonListEditor
                buttons={buttonsOf(flow)}
                onChange={(b) => onChange({ detailsButtons: b })}
              />
            )}
          </Section>

          <div className="flex justify-end">
            <Button size="sm" onClick={onSave} loading={saving}>
              {saved ? "✓ Saved" : <><Save className="w-4 h-4" /> Save</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Comment filter for this prepared flow. Off means "reply to everything". */
function KeywordFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const on = value.trim().length > 0;
  return (
    <div className={`rounded-lg border p-4 space-y-3 ${on ? "bg-violet-50 border-violet-200" : "bg-gray-50 border-gray-200"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <Filter className={`w-4 h-4 mt-0.5 shrink-0 ${on ? "text-violet-600" : "text-gray-400"}`} />
          <div>
            <p className="text-sm font-semibold text-gray-900">Only reply to specific comments</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {on
                ? "Comments without one of these words are ignored — no reply, no DM."
                : "Off — every comment on the reel gets a reply and a DM."}
            </p>
          </div>
        </div>
        <button onClick={() => onChange(on ? "" : "prompt")} className="shrink-0 cursor-pointer">
          {on
            ? <ToggleRight className="w-8 h-8 text-violet-500" />
            : <ToggleLeft className="w-8 h-8 text-gray-300" />}
        </button>
      </div>
      {on && (
        <Input
          label="Keywords"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="prompt, link, guide"
          hint="Comma-separated. Not case-sensitive — PROMPT, Prompt and prompt all match."
        />
      )}
    </div>
  );
}

/** Up to three link buttons on the final message — Instagram's hard ceiling. */
function ButtonListEditor({
  buttons, onChange,
}: { buttons: DetailsButton[]; onChange: (b: DetailsButton[]) => void }) {
  const full = buttons.length >= MAX_BUTTONS;

  function set(i: number, patch: Partial<DetailsButton>) {
    onChange(buttons.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }

  return (
    <div className="space-y-3">
      {buttons.length === 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
          No buttons yet — this would send as <strong>plain text</strong>.
        </p>
      )}

      {buttons.map((b, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Button {i + 1}
            </span>
            <button
              onClick={() => onChange(buttons.filter((_, idx) => idx !== i))}
              className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <Input
            label="Button text"
            value={b.title}
            onChange={(e) => set(i, { title: e.target.value })}
            placeholder="Visit Page 🔗"
          />
          <Input
            label="Link URL"
            type="url"
            value={b.url}
            onChange={(e) => set(i, { url: e.target.value })}
            placeholder="https://yourwebsite.com"
          />
          {(!b.title.trim() || !b.url.trim()) && (
            <p className="text-xs text-amber-700">
              Needs both a label and a link, or it won&apos;t be sent.
            </p>
          )}
        </div>
      ))}

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange([...buttons, { title: "", url: "" }])}
          disabled={full}
        >
          <Plus className="w-4 h-4" /> Add button
        </Button>
        <span className="text-xs text-gray-400">
          {full ? "Instagram allows a maximum of 3 buttons" : `${MAX_BUTTONS - buttons.length} more allowed`}
        </span>
      </div>
    </div>
  );
}

/** Opt-in buttons on the final message. Off → plain text. */
function ButtonToggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={`rounded-lg border p-4 flex items-start justify-between gap-4 ${
      enabled ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"
    }`}>
      <div className="flex items-start gap-2.5">
        <Link2 className={`w-4 h-4 mt-0.5 shrink-0 ${enabled ? "text-emerald-600" : "text-gray-400"}`} />
        <div>
          <p className="text-sm font-semibold text-gray-900">Add buttons with links</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {enabled
              ? "The final DM ends with tappable buttons opening your links."
              : "Off — the final DM is sent as plain text."}
          </p>
        </div>
      </div>
      <button onClick={() => onChange(!enabled)} className="shrink-0 cursor-pointer">
        {enabled
          ? <ToggleRight className="w-8 h-8 text-emerald-500" />
          : <ToggleLeft className="w-8 h-8 text-gray-300" />}
      </button>
    </div>
  );
}

function Section({
  icon: Icon, color, title, desc, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-400">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
