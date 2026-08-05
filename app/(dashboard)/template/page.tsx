"use client";
import { useEffect, useState } from "react";
import {
  Loader2, MessageSquare, Zap, UserCheck, Link2, Save, ToggleLeft, ToggleRight, Wand2, AlertCircle,
  Filter, Plus, Trash2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { MessageInput } from "@/components/message-input";

interface Template {
  id: string;
  enabled: boolean;
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

/** Fall back to the legacy single-button pair for templates saved before this. */
function buttonsOf(t: Template): DetailsButton[] {
  if (Array.isArray(t.detailsButtons) && t.detailsButtons.length > 0) {
    return t.detailsButtons.slice(0, MAX_BUTTONS);
  }
  const title = t.detailsButtonText?.trim();
  const url = t.detailsUrl?.trim();
  return title && url ? [{ title, url }] : [];
}

const FIELDS = [
  "keywords",
  "commentReplyText", "commentReplyText2", "commentReplyText3",
  "greetingMessage", "greetingButtonText",
  "followMessage", "followButtonText", "followRetryMessage",
  "detailsMessage", "detailsButtonEnabled", "detailsButtons", "detailsButtonText", "detailsUrl",
] as const;

export default function TemplatePage() {
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [saved, setSaved] = useState(false);
  const [noAccount, setNoAccount] = useState(false);

  useEffect(() => {
    fetch("/api/template")
      .then((r) => r.json())
      .then(({ template }) => {
        if (!template) setNoAccount(true);
        else setTemplate(template);
      })
      .finally(() => setLoading(false));
  }, []);

  function updateField(field: keyof Template, value: string | boolean | DetailsButton[]) {
    setTemplate((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  async function patch(data: Partial<Template>) {
    const res = await fetch("/api/template", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const { template: updated } = await res.json();
    return updated as Template;
  }

  async function save() {
    if (!template) return;
    setSaving(true);
    const data = Object.fromEntries(FIELDS.map((f) => [f, template[f] ?? ""]));
    const updated = await patch(data);
    setTemplate(updated);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function toggleEnabled() {
    if (!template) return;
    setToggling(true);
    const updated = await patch({ enabled: !template.enabled });
    setTemplate(updated);
    setToggling(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (noAccount || !template) {
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
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shrink-0">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Default flow for new reels</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Applied automatically to every reel you upload from now on
            </p>
          </div>
        </div>
        <Button size="sm" onClick={save} loading={saving}>
          {saved ? "✓ Saved" : <><Save className="w-4 h-4" /> Save</>}
        </Button>
      </div>

      {/* Enable toggle */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 my-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Auto-apply to future reels
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            When on, a reel with no automation of its own runs this flow the moment someone comments.
            Reels you configure individually always override it.
          </p>
        </div>
        <button
          onClick={toggleEnabled}
          disabled={toggling}
          className="flex items-center gap-2 text-sm font-medium cursor-pointer shrink-0 ml-4"
        >
          {template.enabled ? (
            <><ToggleRight className="w-9 h-9 text-emerald-500" /> <span className="text-emerald-600">On</span></>
          ) : (
            <><ToggleLeft className="w-9 h-9 text-gray-300" /> <span className="text-gray-400">Off</span></>
          )}
        </button>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <Section icon={MessageSquare} color="text-blue-600 bg-blue-50 border-blue-200" title="Comment reply" desc="Public reply posted on the comment">
          <KeywordFilter
            value={template.keywords ?? ""}
            onChange={(val) => updateField("keywords", val)}
          />
          <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg p-3">
            Add up to 3 variants — a <strong>random one is posted each time</strong> so replies don&apos;t
            look automated.
          </p>
          <Textarea
            label="Comment reply — variant 1"
            value={template.commentReplyText}
            onChange={(e) => updateField("commentReplyText", e.target.value)}
            rows={2}
          />
          <Textarea
            label="Variant 2 (optional)"
            value={template.commentReplyText2 ?? ""}
            onChange={(e) => updateField("commentReplyText2", e.target.value)}
            placeholder="Add a different wording…"
            rows={2}
          />
          <Textarea
            label="Variant 3 (optional)"
            value={template.commentReplyText3 ?? ""}
            onChange={(e) => updateField("commentReplyText3", e.target.value)}
            placeholder="Add a different wording…"
            rows={2}
          />
        </Section>

        <Section icon={Zap} color="text-brand-600 bg-brand-50 border-brand-200" title="DM greeting" desc="First DM sent to the commenter, with a button">
          <MessageInput
            label="Greeting message"
            value={template.greetingMessage}
            onChange={(val) => updateField("greetingMessage", val)}
            rows={3}
          />
          <Input
            label="Button text"
            value={template.greetingButtonText}
            onChange={(e) => updateField("greetingButtonText", e.target.value)}
          />
        </Section>

        <Section icon={UserCheck} color="text-amber-600 bg-amber-50 border-amber-200" title="Follow gate" desc="Shown until the user follows you">
          <MessageInput
            label="Follow-required message"
            value={template.followMessage}
            onChange={(val) => updateField("followMessage", val)}
            rows={3}
          />
          <Input
            label="Button text"
            value={template.followButtonText}
            onChange={(e) => updateField("followButtonText", e.target.value)}
          />
          <MessageInput
            label="Still-not-following message (loops until they follow)"
            value={template.followRetryMessage}
            onChange={(val) => updateField("followRetryMessage", val)}
            rows={3}
          />
        </Section>

        <Section icon={Link2} color="text-emerald-600 bg-emerald-50 border-emerald-200" title="Final details" desc="Sent once the follow is confirmed">
          <MessageInput
            label="Details message"
            value={template.detailsMessage}
            onChange={(val) => updateField("detailsMessage", val)}
            rows={3}
          />
          <ButtonToggle
            enabled={template.detailsButtonEnabled ?? true}
            onChange={(on) => updateField("detailsButtonEnabled", on)}
          />
          {(template.detailsButtonEnabled ?? true) && (
            <ButtonListEditor
              buttons={buttonsOf(template)}
              onChange={(b) => updateField("detailsButtons", b)}
            />
          )}
        </Section>
      </div>
    </div>
  );
}

/** Default comment filter for future reels. Off means "reply to everything". */
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
                ? "New reels ignore comments without one of these words — no reply, no DM."
                : "Off — new reels reply to every comment."}
            </p>
          </div>
        </div>
        <button
          onClick={() => onChange(on ? "" : "prompt")}
          className="shrink-0 cursor-pointer"
        >
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
          No buttons yet — new reels would send this as <strong>plain text</strong>.
        </p>
      )}

      {buttons.map((b, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Button {i + 1}
            </span>
            <button
              onClick={() => onChange(buttons.filter((_, idx) => idx !== i))}
              className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
              title="Remove this button"
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
          {full
            ? "Instagram allows a maximum of 3 buttons"
            : `${MAX_BUTTONS - buttons.length} more allowed`}
        </span>
      </div>
    </div>
  );
}

/** Opt-in button on the final message. Off → plain text. */
function ButtonToggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
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
    <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
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
