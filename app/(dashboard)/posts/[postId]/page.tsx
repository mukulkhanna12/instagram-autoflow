"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2, MessageSquare, UserCheck, Link2, ArrowLeft,
  Zap, ChevronRight, ToggleLeft, ToggleRight, Trash2, Pencil, X, Check,
  Filter, GitBranch, RotateCcw, Plus, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { MessageInput } from "@/components/message-input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";

interface Automation {
  id: string;
  postId: string;
  postCaption?: string;
  postThumbnail?: string;
  postUrl?: string;
  isActive: boolean;
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

interface DetailsButton {
  title: string;
  url: string;
}

const MAX_BUTTONS = 3;

/**
 * Buttons to render for a reel. Rows saved before multi-button support only
 * have the old single-button pair, so fall back to it — matching what the
 * server actually sends (lib/buttons.ts).
 */
function buttonsOf(a: Automation): DetailsButton[] {
  if (Array.isArray(a.detailsButtons) && a.detailsButtons.length > 0) {
    return a.detailsButtons.slice(0, MAX_BUTTONS);
  }
  const title = a.detailsButtonText?.trim();
  const url = a.detailsUrl?.trim();
  return title && url ? [{ title, url }] : [];
}

interface Conversation {
  id: string;
  igUsername?: string;
  igUserId: string;
  state: string;
  lastError?: string | null;
  createdAt: string;
}

interface StepEvent { name: string; total: number; unique: number; pct?: number }
interface Step {
  key: "comment" | "greeting" | "follow" | "details";
  label: string;
  reached: number;
  reachedPct: number;
  events: StepEvent[];
  newFollows?: number;
}
interface Stats {
  contacts: number;
  totalSends: number;
  completed: number;
  newFollows: number;
  greetingCtr: number;
  steps: Step[];
}

// The content fields that Edit → Update actually saves.
const CONTENT_FIELDS = [
  "keywords",
  "commentReplyText", "commentReplyText2", "commentReplyText3",
  "greetingMessage", "greetingButtonText",
  "followMessage", "followButtonText", "followRetryMessage",
  "detailsMessage", "detailsButtonEnabled", "detailsButtons", "detailsButtonText", "detailsUrl",
] as const;

const STEPS = [
  { id: "comment", icon: MessageSquare, color: "bg-blue-50 text-blue-600 border-blue-200", label: "Step 1 — Comment Reply", desc: "Public reply on the comment" },
  { id: "greeting", icon: Zap, color: "bg-brand-50 text-brand-600 border-brand-200", label: "Step 2 — DM Greeting", desc: "First DM sent to commenter" },
  { id: "follow", icon: UserCheck, color: "bg-amber-50 text-amber-600 border-amber-200", label: "Step 3 — Follow Gate", desc: "If user is not following you" },
  { id: "details", icon: Link2, color: "bg-emerald-50 text-emerald-600 border-emerald-200", label: "Step 4 — Final Details", desc: "Sent after follow is confirmed" },
];

export default function FlowEditorPage() {
  const { postId } = useParams<{ postId: string }>();
  const router = useRouter();
  const [automation, setAutomation] = useState<Automation | null>(null);
  const [draft, setDraft] = useState<Automation | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [activeStep, setActiveStep] = useState("comment");
  const [copyOpen, setCopyOpen] = useState(false);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    fetch(`/api/automations/${postId}`)
      .then((r) => r.json())
      .then(({ automation, conversations, stats }) => {
        setAutomation(automation);
        setConversations(conversations ?? []);
        setStats(stats ?? null);
      })
      .finally(() => setLoading(false));
  }, [postId]);

  const editing = mode === "edit";
  // What the fields render: the draft while editing, the saved copy otherwise.
  const v = editing ? draft : automation;

  function updateField(field: keyof Automation, value: string | boolean | DetailsButton[]) {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function startEdit() {
    if (!automation) return;
    // Seed the buttons array from the legacy single-button fields so an older
    // reel opens showing the button it actually sends, not an empty list.
    setDraft({ ...automation, detailsButtons: buttonsOf(automation) });
    setMode("edit");
  }

  async function copyFrom(sourceId: string) {
    setCopying(true);
    const res = await fetch(`/api/automations/${postId}/copy-from`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId }),
    });
    if (res.ok) {
      const { automation: updated } = await res.json();
      setAutomation(updated);
      setDraft(null);
      setMode("view");
      setCopyOpen(false);
    }
    setCopying(false);
  }

  function cancelEdit() {
    setDraft(null);
    setMode("view");
  }

  async function update() {
    if (!draft) return;
    setSaving(true);
    const res = await fetch(`/api/automations/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(CONTENT_FIELDS.map((f) => [f, draft[f] ?? ""]))),
    });
    const { automation: updated } = await res.json();
    setAutomation(updated);
    setDraft(null);
    setMode("view");
    setSaving(false);
  }

  async function toggleActive() {
    if (!automation) return;
    setToggling(true);
    const res = await fetch(`/api/automations/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !automation.isActive }),
    });
    const { automation: updated } = await res.json();
    setAutomation((prev) => (prev ? { ...prev, isActive: updated.isActive } : updated));
    setToggling(false);
  }

  async function deleteAutomation() {
    if (!confirm("Delete this automation? This cannot be undone.")) return;
    await fetch(`/api/automations/${postId}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!automation || !v) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Automation not found.</p>
        <Link href="/dashboard" className="text-brand-600 underline mt-2 inline-block">← Back to automations</Link>
      </div>
    );
  }

  const stepStats = (key: string) => stats?.steps.find((s) => s.key === key);

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">Flow Editor</h1>
              {automation.isActive
                ? <Badge variant="success">LIVE</Badge>
                : <Badge variant="default">Off</Badge>}
              {editing && <Badge variant="warning">Editing</Badge>}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {editing ? "Make your changes, then Update to save" : "Viewing your comment-to-DM automation"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!editing && (
            <button
              onClick={toggleActive}
              disabled={toggling}
              className="flex items-center gap-2 text-sm font-medium cursor-pointer"
              title={automation.isActive ? "Live — replying to comments" : "Off — ignoring comments"}
            >
              {automation.isActive ? (
                <><ToggleRight className="w-8 h-8 text-emerald-500" /> <span className="text-emerald-600">Live</span></>
              ) : (
                <><ToggleLeft className="w-8 h-8 text-gray-400" /> <span className="text-gray-500">Off</span></>
              )}
            </button>
          )}

          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={cancelEdit}>
                <X className="w-4 h-4" /> Cancel
              </Button>
              <Button variant="outline" size="sm" onClick={deleteAutomation}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
              <Button size="sm" onClick={update} loading={saving}>
                <Check className="w-4 h-4" /> Update
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setCopyOpen(true)}>
                <Copy className="w-4 h-4" /> Copy from reel
              </Button>
              <Button size="sm" onClick={startEdit}>
                <Pencil className="w-4 h-4" /> Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {copyOpen && (
        <CopyFromDialog
          currentId={automation.id}
          onCopy={copyFrom}
          onClose={() => setCopyOpen(false)}
          busy={copying}
        />
      )}

      {/* Key metrics */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <Kpi label="Unique contacts" value={stats.contacts} />
          <Kpi label="Messages sent" value={stats.totalSends} />
          <Kpi label="Final DMs" value={stats.completed} />
          <Kpi label="New follows" value={stats.newFollows} highlight />
          <Kpi label="Greeting CTR" value={`${stats.greetingCtr}%`} />
        </div>
      )}

      {/* ManyChat-style visual flow */}
      <FlowCanvas v={v} stats={stats} onSelect={setActiveStep} className="mb-6" />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Step navigator + editor */}
        <div className="lg:col-span-2 space-y-4">
          {/* Flow step tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {STEPS.map((step) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                  activeStep === step.id
                    ? step.color + " border-current shadow-sm"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                }`}
              >
                <step.icon className="w-3.5 h-3.5" />
                {step.id === "comment" ? "Comment Reply" : step.id === "greeting" ? "DM Greeting" : step.id === "follow" ? "Follow Gate" : "Final Details"}
              </button>
            ))}
          </div>

          {/* Step editor */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            {activeStep === "comment" && (
              <div className="space-y-4">
                <StepHeader step={STEPS[0]} />
                {stepStats("comment") && <StepMetrics step={stepStats("comment")!} />}

                <KeywordFilter
                  value={v.keywords ?? ""}
                  onChange={(val) => updateField("keywords", val)}
                  disabled={!editing}
                />

                <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg p-3">
                  Add up to 3 reply variants — a <strong>random one is posted each time</strong>, so your
                  replies don&apos;t look automated (Instagram can flag identical replies as spam).
                </p>
                <Textarea
                  label="Comment reply — variant 1"
                  value={v.commentReplyText}
                  onChange={(e) => updateField("commentReplyText", e.target.value)}
                  disabled={!editing}
                  hint="Posted publicly as a reply to the comment"
                  rows={2}
                />
                {(editing || (v.commentReplyText2 ?? "")) && (
                  <Textarea
                    label="Variant 2 (optional)"
                    value={v.commentReplyText2 ?? ""}
                    onChange={(e) => updateField("commentReplyText2", e.target.value)}
                    disabled={!editing}
                    placeholder="Add a different wording…"
                    rows={2}
                  />
                )}
                {(editing || (v.commentReplyText3 ?? "")) && (
                  <Textarea
                    label="Variant 3 (optional)"
                    value={v.commentReplyText3 ?? ""}
                    onChange={(e) => updateField("commentReplyText3", e.target.value)}
                    disabled={!editing}
                    placeholder="Add a different wording…"
                    rows={2}
                  />
                )}
                <DmPreview>
                  <CommentBubble text={v.commentReplyText} isReply />
                </DmPreview>
              </div>
            )}

            {activeStep === "greeting" && (
              <div className="space-y-4">
                <StepHeader step={STEPS[1]} />
                {stepStats("greeting") && <StepMetrics step={stepStats("greeting")!} />}
                <MessageInput
                  label="Greeting message"
                  value={v.greetingMessage}
                  onChange={(val) => updateField("greetingMessage", val)}
                  disabled={!editing}
                  rows={3}
                />
                <Input
                  label="Button text"
                  value={v.greetingButtonText}
                  onChange={(e) => updateField("greetingButtonText", e.target.value)}
                  disabled={!editing}
                />
                <DmPreview>
                  <DmBubble text={v.greetingMessage} button={v.greetingButtonText} buttonColor="brand" />
                </DmPreview>
              </div>
            )}

            {activeStep === "follow" && (
              <div className="space-y-4">
                <StepHeader step={STEPS[2]} />
                {stepStats("follow") && <StepMetrics step={stepStats("follow")!} />}
                <p className="text-xs text-gray-400 bg-amber-50 border border-amber-100 rounded-lg p-3">
                  Shown only if the user is <strong>not following</strong> your account.
                </p>
                <MessageInput
                  label="Follow-required message"
                  value={v.followMessage}
                  onChange={(val) => updateField("followMessage", val)}
                  disabled={!editing}
                  rows={3}
                />
                <Input
                  label="Button text"
                  value={v.followButtonText}
                  onChange={(e) => updateField("followButtonText", e.target.value)}
                  disabled={!editing}
                />
                <DmPreview>
                  <DmBubble text={v.followMessage} button={v.followButtonText} buttonColor="amber" />
                </DmPreview>

                <div className="pt-4 border-t border-gray-100 space-y-4">
                  <p className="text-xs text-gray-400 bg-amber-50 border border-amber-100 rounded-lg p-3">
                    Sent when they tap the button but <strong>still aren&apos;t following</strong>. Repeats
                    on every tap until they do — the final message is never sent before that.
                  </p>
                  <MessageInput
                    label="Still-not-following message"
                    value={v.followRetryMessage}
                    onChange={(val) => updateField("followRetryMessage", val)}
                    disabled={!editing}
                    rows={3}
                  />
                  <DmPreview>
                    <DmBubble text={v.followRetryMessage} button={v.followButtonText} buttonColor="amber" />
                  </DmPreview>
                </div>
              </div>
            )}

            {activeStep === "details" && (
              <div className="space-y-4">
                <StepHeader step={STEPS[3]} />
                {stepStats("details") && <StepMetrics step={stepStats("details")!} />}
                <MessageInput
                  label="Details message"
                  value={v.detailsMessage}
                  onChange={(val) => updateField("detailsMessage", val)}
                  disabled={!editing}
                  rows={3}
                />
                <ButtonToggle
                  enabled={v.detailsButtonEnabled ?? true}
                  onChange={(on) => updateField("detailsButtonEnabled", on)}
                  disabled={!editing}
                />

                {(v.detailsButtonEnabled ?? true) && (
                  <ButtonListEditor
                    buttons={editing ? (v.detailsButtons ?? []) : buttonsOf(v)}
                    onChange={(b) => updateField("detailsButtons", b)}
                    disabled={!editing}
                  />
                )}

                <DmPreview>
                  <MultiButtonBubble
                    text={v.detailsMessage}
                    buttons={
                      (v.detailsButtonEnabled ?? true)
                        ? (editing ? (v.detailsButtons ?? []) : buttonsOf(v))
                            .filter((b) => b.title.trim() && b.url.trim())
                        : []
                    }
                  />
                </DmPreview>
              </div>
            )}
          </div>

        </div>

        {/* Right panel: Conversations */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Conversations</h3>
              <Badge variant="info">{conversations.length}</Badge>
            </div>
            {conversations.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                No conversations yet.<br />Activate the automation to start.
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                {conversations.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                      {c.igUsername?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800">@{c.igUsername ?? c.igUserId}</p>
                      {c.lastError ? (
                        <p className="text-xs text-red-500 truncate" title={c.lastError}>⚠ {c.lastError}</p>
                      ) : (
                        <p className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</p>
                      )}
                    </div>
                    <Badge variant={c.lastError ? "danger" : c.state === "completed" ? "success" : c.state === "follow_requested" ? "warning" : "info"} className="shrink-0">
                      {c.lastError ? "Error" : c.state === "completed" ? "Done" : c.state === "follow_requested" ? "Follow" : "Active"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Post preview */}
          {v.postThumbnail && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Reel</h3>
              </div>
              <div className="relative aspect-square">
                <Image src={v.postThumbnail} alt="Post" fill className="object-cover" />
              </div>
              {v.postCaption && (
                <div className="p-4">
                  <p className="text-xs text-gray-500 line-clamp-3">{v.postCaption}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Kpi({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? "bg-emerald-50 border-emerald-100" : "bg-white border-gray-100"} shadow-sm`}>
      <p className={`text-xl font-bold ${highlight ? "text-emerald-700" : "text-gray-900"}`}>{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function StepMetrics({ step }: { step: Step }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <span className="text-lg font-bold text-gray-900">{step.reached}</span>
          <span className="text-xs text-gray-500 ml-1.5">reached this step</span>
        </div>
        <span className="text-sm font-semibold text-emerald-600">{step.reachedPct}%</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 border-b border-gray-100">
            <th className="text-left font-medium pb-1.5">Event</th>
            <th className="text-right font-medium pb-1.5">Total</th>
            <th className="text-right font-medium pb-1.5">Unique</th>
          </tr>
        </thead>
        <tbody>
          {step.events.map((e) => (
            <tr key={e.name} className="border-b border-gray-50 last:border-0">
              <td className="py-1.5 text-gray-700">{e.name}</td>
              <td className="py-1.5 text-right text-gray-900 font-medium">
                {e.total}
                {typeof e.pct === "number" && <span className="text-emerald-600 font-normal ml-1">{e.pct}%</span>}
              </td>
              <td className="py-1.5 text-right text-gray-900 font-medium">{e.unique}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {typeof step.newFollows === "number" && (
        <div className="mt-3 flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          <span className="text-xs font-medium text-emerald-700">New follows from this reel</span>
          <span className="text-sm font-bold text-emerald-700">{step.newFollows}</span>
        </div>
      )}
      <p className="text-[10px] text-gray-400 mt-2">Opens aren&apos;t reported by Instagram, so they&apos;re not shown.</p>
    </div>
  );
}

// ── ManyChat-style visual flow ────────────────────────────────────────────────

function FlowCanvas({
  v, stats, onSelect, className = "",
}: {
  v: Automation;
  stats: Stats | null;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const step = (k: string) => stats?.steps.find((s) => s.key === k);
  const ev = (k: string, name: string) => step(k)?.events.find((e) => e.name === name);
  const detailsBtns = (v.detailsButtonEnabled ?? true) ? buttonsOf(v) : [];

  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Flow builder</h3>
        <span className="text-xs text-gray-400">Tap a card to edit it</span>
      </div>

      <div className="flex items-stretch overflow-x-auto pb-2">
        {/* Trigger */}
        <button
          onClick={() => onSelect("comment")}
          className="text-left shrink-0 w-64 rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-brand-300 hover:shadow-md transition-all"
        >
          <div className="bg-emerald-50 px-4 py-2 flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-gray-800">When…</span>
          </div>
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              {v.postThumbnail ? (
                <div className="relative w-9 h-9 rounded overflow-hidden shrink-0">
                  <Image src={v.postThumbnail} alt="" fill className="object-cover" />
                </div>
              ) : (
                <MessageSquare className="w-5 h-5 text-gray-300 shrink-0" />
              )}
              <p className="text-xs font-medium text-gray-700">
                {v.keywords?.trim()
                  ? "Someone comments a keyword on this reel"
                  : "Someone comments on this reel"}
              </p>
            </div>
            {v.keywords?.trim() && (
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                <Filter className="w-3 h-3 text-violet-500 shrink-0" />
                {v.keywords.split(",").map((k) => k.trim()).filter(Boolean).map((k) => (
                  <span key={k} className="text-[10px] font-medium bg-violet-100 text-violet-700 rounded px-1.5 py-0.5">
                    {k}
                  </span>
                ))}
              </div>
            )}
            <div className="bg-gray-100 text-gray-700 text-xs rounded-xl p-2 line-clamp-2">
              ↩ {v.commentReplyText || "—"}
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              {ev("comment", "Replied")?.total ?? 0} comments handled
            </p>
          </div>
        </button>

        <Arrow />

        {/* Message #1 — greeting. Its button tap is what opens the messaging
            window, which is the only reason a follow check is possible at all. */}
        <MessageNode
          title="Send Message #1"
          subtitle="Greeting"
          onClick={() => onSelect("greeting")}
          reached={step("greeting")?.reached}
          metrics={[
            { label: "Sent", value: ev("greeting", "Sent")?.total ?? 0 },
            { label: "Delivered", value: ev("greeting", "Delivered")?.total ?? 0, pct: 100 },
            { label: "Clicked", value: ev("greeting", "Clicks")?.total ?? 0, pct: ev("greeting", "Clicks")?.pct },
          ]}
          text={v.greetingMessage}
          button={v.greetingButtonText}
          buttonCtr={stats?.greetingCtr}
        />

        <Arrow />

        {/* The branch: everything after the tap depends on this one check. */}
        <ConditionNode checked={step("greeting")?.events.find((e) => e.name === "Clicks")?.total ?? 0} />

        {/* Branch connector: one line in, two out. */}
        <div className="flex flex-col justify-center shrink-0 py-2">
          <div className="flex-1 flex items-end"><div className="w-3 h-0.5 bg-gray-200" /></div>
          <div className="w-0.5 bg-gray-200 h-full ml-3 -my-px" />
          <div className="flex-1 flex items-start"><div className="w-3 h-0.5 bg-gray-200" /></div>
        </div>

        <div className="flex flex-col gap-3 shrink-0">
          {/* YES → the payoff */}
          <div className="flex items-center">
            <BranchLabel kind="yes" />
            <MessageNode
              title="Send Message #2"
              subtitle="Final details"
              onClick={() => onSelect("details")}
              reached={step("details")?.reached}
              metrics={[{ label: "Sent", value: ev("details", "Sent")?.total ?? 0, pct: 100 }]}
              text={v.detailsMessage}
              button={detailsBtns[0]?.title ?? ""}
              link={detailsBtns[0]?.url ?? ""}
              extraButtons={detailsBtns.length - 1}
            />
          </div>

          {/* NO → the gate, which loops back into the same check */}
          <div className="flex items-center">
            <BranchLabel kind="no" />
            <MessageNode
              title="Follow gate"
              subtitle="Loops until they follow"
              tone="amber"
              onClick={() => onSelect("follow")}
              reached={step("follow")?.reached}
              metrics={[
                { label: "Sent", value: ev("follow", "Sent")?.total ?? 0 },
                { label: "Clicked", value: ev("follow", "Clicks")?.total ?? 0, pct: ev("follow", "Clicks")?.pct },
              ]}
              text={v.followMessage}
              button={v.followButtonText}
              footer={
                <span className="flex items-center gap-1.5 text-[10px] text-amber-600">
                  <RotateCcw className="w-3 h-3" />
                  Tapping again re-runs the check — never reaches Message #2 until they follow
                </span>
              }
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Everyone gets Message #1 — Instagram only lets us check whether someone follows you once
        they&apos;ve replied, and their button tap is that reply. Personalize any message with{" "}
        <code>{"{{first_name}}"}</code> or <code>{"{{username}}"}</code>.
      </p>
    </div>
  );
}

/** The follow check — the fork the whole flow hinges on. */
function ConditionNode({ checked }: { checked: number }) {
  return (
    <div className="shrink-0 w-52 self-center rounded-xl border border-amber-200 bg-white overflow-hidden">
      <div className="bg-amber-50 px-4 py-2 flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-semibold text-gray-800">Condition</span>
      </div>
      <div className="p-3">
        <p className="text-xs font-medium text-gray-700">Do they follow you?</p>
        <p className="text-[10px] text-gray-400 mt-1.5">
          Checked on every button tap, never at comment time.
        </p>
        <p className="text-[10px] text-gray-400 mt-2">{checked} checks run</p>
      </div>
    </div>
  );
}

function BranchLabel({ kind }: { kind: "yes" | "no" }) {
  const yes = kind === "yes";
  return (
    <div className="flex items-center shrink-0">
      <span
        className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
          yes ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
        }`}
      >
        {yes ? "Yes" : "No"}
      </span>
      <div className="w-4 h-0.5 bg-gray-200" />
      <div className="w-0 h-0 border-y-4 border-y-transparent border-l-[6px] border-l-gray-300" />
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-center px-1.5 shrink-0 self-center">
      <div className="w-5 h-0.5 bg-gray-200" />
      <div className="w-0 h-0 border-y-4 border-y-transparent border-l-[6px] border-l-gray-300" />
    </div>
  );
}

function MessageNode({
  title, subtitle, onClick, reached, metrics, text, button, buttonCtr, link, tone = "brand", footer,
  extraButtons = 0,
}: {
  title: string;
  subtitle?: string;
  onClick: () => void;
  reached?: number;
  metrics: { label: string; value: number; pct?: number }[];
  text: string;
  button: string;
  buttonCtr?: number;
  link?: string;
  tone?: "brand" | "amber";
  footer?: React.ReactNode;
  extraButtons?: number;
}) {
  const amber = tone === "amber";
  return (
    <button
      onClick={onClick}
      className={`text-left shrink-0 w-72 rounded-xl border bg-white overflow-hidden hover:shadow-md transition-all ${
        amber ? "border-amber-200 hover:border-amber-300" : "border-gray-200 hover:border-brand-300"
      }`}
    >
      <div className={`px-4 py-2 flex items-center justify-between ${amber ? "bg-amber-50" : "bg-brand-50"}`}>
        <span className="text-sm font-semibold text-gray-800">
          {title}
          {subtitle && <span className="font-normal text-gray-500"> · {subtitle}</span>}
        </span>
        {typeof reached === "number" && <span className="text-xs text-gray-500 shrink-0 ml-2">{reached}</span>}
      </div>
      <div className="px-4 py-3 flex gap-5 border-b border-gray-100">
        {metrics.map((m) => (
          <div key={m.label}>
            <p className="text-sm font-bold text-gray-900">
              {m.value}
              {typeof m.pct === "number" && <span className="text-emerald-600 text-xs font-medium ml-1">{m.pct}%</span>}
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">{m.label}</p>
          </div>
        ))}
      </div>
      <div className="p-3">
        <div className="bg-gray-100 text-gray-800 text-xs rounded-2xl rounded-tl-sm p-3 leading-relaxed whitespace-pre-line mb-2 line-clamp-4">
          {text || "—"}
        </div>
        {button ? (
          <div className="border border-gray-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
            <span className={`text-xs font-medium truncate ${amber ? "text-amber-600" : "text-brand-600"}`}>{button}</span>
            <span className="flex items-center gap-1 shrink-0">
              {typeof buttonCtr === "number" && <span className="text-xs text-brand-500 font-medium">CTR {buttonCtr}%</span>}
              {link ? <Link2 className="w-3 h-3 text-brand-400" /> : <ChevronRight className={`w-3 h-3 ${amber ? "text-amber-400" : "text-brand-400"}`} />}
            </span>
          </div>
        ) : (
          <p className="text-[10px] text-gray-400 italic px-1">Plain text — no button</p>
        )}
        {extraButtons > 0 && (
          <p className="text-[10px] text-gray-400 mt-1.5 px-1">
            + {extraButtons} more button{extraButtons > 1 ? "s" : ""}
          </p>
        )}
        {footer && <div className="mt-2 px-1">{footer}</div>}
      </div>
    </button>
  );
}

/**
 * Per-reel comment filter. Off by default, so an untouched reel keeps replying
 * to everything — turning it on is what narrows the reel to a keyword.
 */
function KeywordFilter({
  value, onChange, disabled,
}: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const on = value.trim().length > 0;
  const words = value.split(",").map((k) => k.trim()).filter(Boolean);

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
                : "Off — every comment on this reel gets a reply and a DM."}
            </p>
          </div>
        </div>
        <button
          onClick={() => onChange(on ? "" : "prompt")}
          disabled={disabled}
          className="shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          title={on ? "Reply to every comment instead" : "Restrict to keywords"}
        >
          {on
            ? <ToggleRight className="w-8 h-8 text-violet-500" />
            : <ToggleLeft className="w-8 h-8 text-gray-300" />}
        </button>
      </div>

      {on && (
        <>
          <Input
            label="Keywords"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="prompt, link, guide"
            hint="Comma-separated. Not case-sensitive — PROMPT, Prompt and prompt all match."
          />
          {words.length > 0 && (
            <div className="text-xs text-gray-600 bg-white border border-violet-100 rounded-lg p-3 space-y-1">
              <p className="font-medium text-gray-700 mb-1.5">This reel will respond to:</p>
              <p className="text-emerald-700">✓ &ldquo;{words[0]}&rdquo;</p>
              <p className="text-emerald-700">✓ &ldquo;send me the {words[0]} pls&rdquo;</p>
              <p className="text-gray-400">✗ &ldquo;nice reel 🔥&rdquo;</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Opt-in button on the final message. Off → plain text. */
function ButtonToggle({
  enabled, onChange, disabled,
}: { enabled: boolean; onChange: (v: boolean) => void; disabled: boolean }) {
  return (
    <div className={`rounded-lg border p-4 flex items-start justify-between gap-4 ${
      enabled ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"
    }`}>
      <div className="flex items-start gap-2.5">
        <Link2 className={`w-4 h-4 mt-0.5 shrink-0 ${enabled ? "text-emerald-600" : "text-gray-400"}`} />
        <div>
          <p className="text-sm font-semibold text-gray-900">Add a button with a link</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {enabled
              ? "The final DM ends with a tappable button opening your link."
              : "Off — the final DM is sent as plain text."}
          </p>
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        disabled={disabled}
        className="shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {enabled
          ? <ToggleRight className="w-8 h-8 text-emerald-500" />
          : <ToggleLeft className="w-8 h-8 text-gray-300" />}
      </button>
    </div>
  );
}

function PlainDmBubble({ text }: { text: string }) {
  return (
    <div className="bg-white/10 text-white text-xs rounded-2xl rounded-tl-sm p-3 leading-relaxed whitespace-pre-line">
      {text}
    </div>
  );
}

/** Up to three link buttons on the final message — Instagram's hard ceiling. */
function ButtonListEditor({
  buttons, onChange, disabled,
}: {
  buttons: DetailsButton[];
  onChange: (b: DetailsButton[]) => void;
  disabled: boolean;
}) {
  const full = buttons.length >= MAX_BUTTONS;

  function set(i: number, patch: Partial<DetailsButton>) {
    onChange(buttons.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }

  return (
    <div className="space-y-3">
      {buttons.length === 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
          No buttons yet — this message goes out as <strong>plain text</strong>. Add one below.
        </p>
      )}

      {buttons.map((b, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Button {i + 1}
            </span>
            {!disabled && (
              <button
                onClick={() => onChange(buttons.filter((_, idx) => idx !== i))}
                className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                title="Remove this button"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Input
            label="Button text"
            value={b.title}
            onChange={(e) => set(i, { title: e.target.value })}
            disabled={disabled}
            placeholder="Visit Page 🔗"
          />
          <Input
            label="Link URL"
            type="url"
            value={b.url}
            onChange={(e) => set(i, { url: e.target.value })}
            disabled={disabled}
            placeholder="https://yourwebsite.com"
          />
          {(!b.title.trim() || !b.url.trim()) && (
            <p className="text-xs text-amber-700">
              Needs both a label and a link, or it won&apos;t be sent.
            </p>
          )}
        </div>
      ))}

      {!disabled && (
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
            {full
              ? "Instagram allows a maximum of 3 buttons"
              : `${MAX_BUTTONS - buttons.length} more allowed`}
          </span>
        </div>
      )}
    </div>
  );
}

function MultiButtonBubble({ text, buttons }: { text: string; buttons: DetailsButton[] }) {
  return (
    <div>
      <div className="bg-white/10 text-white text-xs rounded-2xl rounded-tl-sm p-3 leading-relaxed whitespace-pre-line mb-2">
        {text}
      </div>
      {buttons.map((b, i) => (
        <button
          key={i}
          className="w-full bg-emerald-500 text-white text-xs font-medium py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-default mb-1.5 last:mb-0"
        >
          {b.title} <ChevronRight className="w-3 h-3" />
        </button>
      ))}
    </div>
  );
}

/** Pick another reel and clone its message setup onto this one. */
function CopyFromDialog({
  currentId, onCopy, onClose, busy,
}: {
  currentId: string;
  onCopy: (sourceId: string) => void;
  onClose: () => void;
  busy: boolean;
}) {
  const [options, setOptions] = useState<Automation[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/automations")
      .then((r) => r.json())
      .then(({ automations }) =>
        setOptions((automations ?? []).filter((a: Automation) => a.id !== currentId))
      );
  }, [currentId]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Copy setup from another reel</h3>
          <p className="text-xs text-gray-400 mt-1">
            Copies every message, keyword and button. Leaves this reel&apos;s Live/Off switch
            and its stats alone.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {options === null ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
          ) : options.length === 0 ? (
            <p className="py-10 text-center text-xs text-gray-400">
              No other reels configured yet.
            </p>
          ) : (
            options.map((a) => (
              <button
                key={a.id}
                onClick={() => setPicked(a.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border mb-2 text-left transition-all cursor-pointer ${
                  picked === a.id
                    ? "border-brand-400 bg-brand-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {a.postThumbnail ? (
                  <div className="relative w-10 h-10 rounded overflow-hidden shrink-0">
                    <Image src={a.postThumbnail} alt="" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-gray-300" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-800 truncate">
                    {a.postCaption || "Untitled reel"}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {a.keywords?.trim() ? `Keywords: ${a.keywords}` : "Replies to every comment"}
                  </p>
                </div>
                {picked === a.id && <Check className="w-4 h-4 text-brand-600 shrink-0" />}
              </button>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            disabled={!picked}
            loading={busy}
            onClick={() => picked && onCopy(picked)}
          >
            <Copy className="w-4 h-4" /> Copy setup
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepHeader({ step }: { step: typeof STEPS[number] }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <div className={`w-9 h-9 rounded-lg border ${step.color} flex items-center justify-center shrink-0`}>
        <step.icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{step.label}</p>
        <p className="text-xs text-gray-400">{step.desc}</p>
      </div>
    </div>
  );
}

function DmPreview({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Preview</p>
      <div className="bg-gray-900 rounded-2xl p-4 max-w-sm">
        <div className="text-xs text-gray-400 mb-3 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-400 to-brand-400" />
          Instagram DM
        </div>
        {children}
      </div>
    </div>
  );
}

function DmBubble({
  text, button, buttonColor, url
}: { text: string; button: string; buttonColor: "brand" | "amber" | "emerald"; url?: string }) {
  const colors = {
    brand: "bg-brand-600 hover:bg-brand-700",
    amber: "bg-amber-500 hover:bg-amber-600",
    emerald: "bg-emerald-500 hover:bg-emerald-600",
  };
  return (
    <div>
      <div className="bg-white/10 text-white text-xs rounded-2xl rounded-tl-sm p-3 leading-relaxed whitespace-pre-line mb-2">
        {text}
      </div>
      <button className={`w-full ${colors[buttonColor]} text-white text-xs font-medium py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-default`}>
        {button} {url && <ChevronRight className="w-3 h-3" />}
      </button>
    </div>
  );
}

function CommentBubble({ text, isReply }: { text: string; isReply?: boolean }) {
  return (
    <div className={`text-xs rounded-2xl p-3 leading-relaxed ${isReply ? "bg-brand-600 text-white rounded-tl-sm ml-4" : "bg-white/10 text-white rounded-tl-sm"}`}>
      {isReply && <span className="block text-brand-200 text-xs mb-1">↩ Reply to comment</span>}
      {text}
    </div>
  );
}
