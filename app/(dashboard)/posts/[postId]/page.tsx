"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2, MessageSquare, UserCheck, Link2, ArrowLeft,
  Zap, ChevronRight, ToggleLeft, ToggleRight, Trash2, Save
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeStep, setActiveStep] = useState("comment");

  useEffect(() => {
    fetch(`/api/automations/${postId}`)
      .then((r) => r.json())
      .then(({ automation, conversations }) => {
        setAutomation(automation);
        setConversations(conversations ?? []);
      })
      .finally(() => setLoading(false));
  }, [postId]);

  function updateField(field: keyof Automation, value: string | boolean) {
    setAutomation((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  async function save() {
    if (!automation) return;
    setSaving(true);
    await fetch(`/api/automations/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commentReplyText: automation.commentReplyText,
        greetingMessage: automation.greetingMessage,
        greetingButtonText: automation.greetingButtonText,
        followMessage: automation.followMessage,
        followButtonText: automation.followButtonText,
        followRetryMessage: automation.followRetryMessage,
        detailsMessage: automation.detailsMessage,
        detailsButtonText: automation.detailsButtonText,
        detailsUrl: automation.detailsUrl,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
    setAutomation(updated);
    setToggling(false);
  }

  async function deleteAutomation() {
    if (!confirm("Delete this automation? This cannot be undone.")) return;
    await fetch(`/api/automations/${postId}`, { method: "DELETE" });
    router.push("/posts");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!automation) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Automation not found.</p>
        <Link href="/posts" className="text-brand-600 underline mt-2 inline-block">← Back to posts</Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/posts" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Flow Editor</h1>
            <p className="text-xs text-gray-400 mt-0.5">Configure your comment-to-DM automation</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleActive}
            disabled={toggling}
            className="flex items-center gap-2 text-sm font-medium cursor-pointer"
          >
            {automation.isActive ? (
              <><ToggleRight className="w-8 h-8 text-emerald-500" /> <span className="text-emerald-600">Live</span></>
            ) : (
              <><ToggleLeft className="w-8 h-8 text-gray-400" /> <span className="text-gray-500">Inactive</span></>
            )}
          </button>
          <Button variant="outline" size="sm" onClick={deleteAutomation}>
            <Trash2 className="w-4 h-4 text-red-400" />
          </Button>
          <Button size="sm" onClick={save} loading={saving}>
            {saved ? "✓ Saved" : <><Save className="w-4 h-4" /> Save</>}
          </Button>
        </div>
      </div>

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
                <Textarea
                  label="Comment reply text"
                  value={automation.commentReplyText}
                  onChange={(e) => updateField("commentReplyText", e.target.value)}
                  hint="This is posted publicly as a reply to the comment"
                  rows={2}
                />
                <DmPreview>
                  <CommentBubble text={automation.commentReplyText} isReply />
                </DmPreview>
              </div>
            )}

            {activeStep === "greeting" && (
              <div className="space-y-4">
                <StepHeader step={STEPS[1]} />
                <Textarea
                  label="Greeting message"
                  value={automation.greetingMessage}
                  onChange={(e) => updateField("greetingMessage", e.target.value)}
                  rows={3}
                />
                <Input
                  label="Button text"
                  value={automation.greetingButtonText}
                  onChange={(e) => updateField("greetingButtonText", e.target.value)}
                />
                <DmPreview>
                  <DmBubble text={automation.greetingMessage} button={automation.greetingButtonText} buttonColor="brand" />
                </DmPreview>
              </div>
            )}

            {activeStep === "follow" && (
              <div className="space-y-4">
                <StepHeader step={STEPS[2]} />
                <p className="text-xs text-gray-400 bg-amber-50 border border-amber-100 rounded-lg p-3">
                  Shown only if the user is <strong>not following</strong> your account.
                </p>
                <Textarea
                  label="Follow-required message"
                  value={automation.followMessage}
                  onChange={(e) => updateField("followMessage", e.target.value)}
                  rows={3}
                />
                <Input
                  label="Button text"
                  value={automation.followButtonText}
                  onChange={(e) => updateField("followButtonText", e.target.value)}
                />
                <DmPreview>
                  <DmBubble text={automation.followMessage} button={automation.followButtonText} buttonColor="amber" />
                </DmPreview>

                <div className="pt-4 border-t border-gray-100 space-y-4">
                  <p className="text-xs text-gray-400 bg-amber-50 border border-amber-100 rounded-lg p-3">
                    Sent when they tap the button but <strong>still aren&apos;t following</strong>. Repeats
                    on every tap until they do — the final message is never sent before that.
                  </p>
                  <Textarea
                    label="Still-not-following message"
                    value={automation.followRetryMessage}
                    onChange={(e) => updateField("followRetryMessage", e.target.value)}
                    rows={3}
                  />
                  <DmPreview>
                    <DmBubble text={automation.followRetryMessage} button={automation.followButtonText} buttonColor="amber" />
                  </DmPreview>
                </div>
              </div>
            )}

            {activeStep === "details" && (
              <div className="space-y-4">
                <StepHeader step={STEPS[3]} />
                <Textarea
                  label="Details message"
                  value={automation.detailsMessage}
                  onChange={(e) => updateField("detailsMessage", e.target.value)}
                  rows={3}
                />
                <Input
                  label="Button text"
                  value={automation.detailsButtonText}
                  onChange={(e) => updateField("detailsButtonText", e.target.value)}
                />
                <Input
                  label="Link URL"
                  type="url"
                  value={automation.detailsUrl}
                  onChange={(e) => updateField("detailsUrl", e.target.value)}
                  placeholder="https://yourwebsite.com"
                  hint="The URL opened when user clicks the button"
                />
                <DmPreview>
                  <DmBubble text={automation.detailsMessage} button={automation.detailsButtonText} buttonColor="emerald" url={automation.detailsUrl} />
                </DmPreview>
              </div>
            )}
          </div>

          {/* Flow diagram */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Flow Overview</h3>
            <div className="flex flex-col gap-1">
              {[
                { label: "💬 User comments on post", sub: "Triggers automation" },
                { label: "📢 Public comment reply", sub: automation.commentReplyText.slice(0, 40) + "…" },
                { label: "📩 DM: Greeting", sub: automation.greetingMessage.slice(0, 40) + "…" },
                { label: "👥 Follower check", sub: "Is user following your account?" },
                { label: "🚫 Not following → Follow gate", sub: automation.followMessage.slice(0, 40) + "…" },
                { label: "✅ Following → Final details", sub: automation.detailsMessage.slice(0, 40) + "…" },
              ].map((item, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                    {i < 5 && <div className="w-0.5 h-5 bg-gray-100 my-0.5" />}
                  </div>
                  <div className="pb-1">
                    <p className="text-xs font-medium text-gray-700">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
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
          {automation.postThumbnail && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Post</h3>
              </div>
              <div className="relative aspect-square">
                <Image src={automation.postThumbnail} alt="Post" fill className="object-cover" />
              </div>
              {automation.postCaption && (
                <div className="p-4">
                  <p className="text-xs text-gray-500 line-clamp-3">{automation.postCaption}</p>
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
