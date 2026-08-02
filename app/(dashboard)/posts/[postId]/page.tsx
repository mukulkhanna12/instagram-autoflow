"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2, MessageSquare, UserCheck, Link2, ArrowLeft,
  Zap, ChevronRight, ToggleLeft, ToggleRight, Trash2, Pencil, X, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
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
  commentReplyText: string;
  greetingMessage: string;
  greetingButtonText: string;
  followMessage: string;
  followButtonText: string;
  followRetryMessage: string;
  detailsMessage: string;
  detailsButtonText: string;
  detailsUrl: string;
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
  "commentReplyText", "greetingMessage", "greetingButtonText",
  "followMessage", "followButtonText", "followRetryMessage",
  "detailsMessage", "detailsButtonText", "detailsUrl",
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

  function updateField(field: keyof Automation, value: string) {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function startEdit() {
    if (!automation) return;
    setDraft({ ...automation });
    setMode("edit");
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
      body: JSON.stringify(Object.fromEntries(CONTENT_FIELDS.map((f) => [f, draft[f]]))),
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
            <Button size="sm" onClick={startEdit}>
              <Pencil className="w-4 h-4" /> Edit
            </Button>
          )}
        </div>
      </div>

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
                <Textarea
                  label="Comment reply text"
                  value={v.commentReplyText}
                  onChange={(e) => updateField("commentReplyText", e.target.value)}
                  disabled={!editing}
                  hint="This is posted publicly as a reply to the comment"
                  rows={2}
                />
                <DmPreview>
                  <CommentBubble text={v.commentReplyText} isReply />
                </DmPreview>
              </div>
            )}

            {activeStep === "greeting" && (
              <div className="space-y-4">
                <StepHeader step={STEPS[1]} />
                {stepStats("greeting") && <StepMetrics step={stepStats("greeting")!} />}
                <Textarea
                  label="Greeting message"
                  value={v.greetingMessage}
                  onChange={(e) => updateField("greetingMessage", e.target.value)}
                  disabled={!editing}
                  hint="Personalize with {{first_name}} or {{username}}"
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
                <Textarea
                  label="Follow-required message"
                  value={v.followMessage}
                  onChange={(e) => updateField("followMessage", e.target.value)}
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
                  <Textarea
                    label="Still-not-following message"
                    value={v.followRetryMessage}
                    onChange={(e) => updateField("followRetryMessage", e.target.value)}
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
                <Textarea
                  label="Details message"
                  value={v.detailsMessage}
                  onChange={(e) => updateField("detailsMessage", e.target.value)}
                  disabled={!editing}
                  rows={3}
                />
                <Input
                  label="Button text"
                  value={v.detailsButtonText}
                  onChange={(e) => updateField("detailsButtonText", e.target.value)}
                  disabled={!editing}
                />
                <Input
                  label="Link URL"
                  type="url"
                  value={v.detailsUrl}
                  onChange={(e) => updateField("detailsUrl", e.target.value)}
                  disabled={!editing}
                  placeholder="https://yourwebsite.com"
                  hint="The URL opened when user clicks the button"
                />
                <DmPreview>
                  <DmBubble text={v.detailsMessage} button={v.detailsButtonText} buttonColor="emerald" url={v.detailsUrl} />
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
                <h3 className="text-sm font-semibold text-gray-700">Post</h3>
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
              <p className="text-xs font-medium text-gray-700">Someone comments on this reel</p>
            </div>
            <div className="bg-gray-100 text-gray-700 text-xs rounded-xl p-2 line-clamp-2">
              ↩ {v.commentReplyText || "—"}
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              {ev("comment", "Replied")?.total ?? 0} comments handled
            </p>
          </div>
        </button>

        <Arrow />

        {/* Message #1 — greeting + follow check */}
        <MessageNode
          title="Send Message #1"
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

        {/* Message #2 — final details */}
        <MessageNode
          title="Send Message #2"
          onClick={() => onSelect("details")}
          reached={step("details")?.reached}
          metrics={[{ label: "Sent", value: ev("details", "Sent")?.total ?? 0, pct: 100 }]}
          text={v.detailsMessage}
          button={v.detailsButtonText}
          link={v.detailsUrl}
        />
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Between #1 and #2, if they aren&apos;t following, the follow-gate DM is sent and loops until they
        follow. Personalize any message with <code>{"{{first_name}}"}</code> or <code>{"{{username}}"}</code>.
      </p>
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
  title, onClick, reached, metrics, text, button, buttonCtr, link,
}: {
  title: string;
  onClick: () => void;
  reached?: number;
  metrics: { label: string; value: number; pct?: number }[];
  text: string;
  button: string;
  buttonCtr?: number;
  link?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left shrink-0 w-72 rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-brand-300 hover:shadow-md transition-all"
    >
      <div className="bg-brand-50 px-4 py-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        {typeof reached === "number" && <span className="text-xs text-gray-500">{reached} reached</span>}
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
        <div className="border border-gray-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-brand-600 truncate">{button || "Button"}</span>
          <span className="flex items-center gap-1 shrink-0">
            {typeof buttonCtr === "number" && <span className="text-xs text-brand-500 font-medium">CTR {buttonCtr}%</span>}
            {link ? <Link2 className="w-3 h-3 text-brand-400" /> : <ChevronRight className="w-3 h-3 text-brand-400" />}
          </span>
        </div>
      </div>
    </button>
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
