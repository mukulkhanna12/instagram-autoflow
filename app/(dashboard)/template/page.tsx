"use client";
import { useEffect, useState } from "react";
import {
  Loader2, MessageSquare, Zap, UserCheck, Link2, Save, ToggleLeft, ToggleRight, Wand2, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

interface Template {
  id: string;
  enabled: boolean;
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

const FIELDS = [
  "commentReplyText", "greetingMessage", "greetingButtonText",
  "followMessage", "followButtonText", "followRetryMessage",
  "detailsMessage", "detailsButtonText", "detailsUrl",
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

  function updateField(field: keyof Template, value: string) {
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
    const data = Object.fromEntries(FIELDS.map((f) => [f, template[f]]));
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
          <Textarea
            label="Comment reply text"
            value={template.commentReplyText}
            onChange={(e) => updateField("commentReplyText", e.target.value)}
            rows={2}
          />
        </Section>

        <Section icon={Zap} color="text-brand-600 bg-brand-50 border-brand-200" title="DM greeting" desc="First DM sent to the commenter, with a button">
          <Textarea
            label="Greeting message"
            value={template.greetingMessage}
            onChange={(e) => updateField("greetingMessage", e.target.value)}
            rows={3}
          />
          <Input
            label="Button text"
            value={template.greetingButtonText}
            onChange={(e) => updateField("greetingButtonText", e.target.value)}
          />
        </Section>

        <Section icon={UserCheck} color="text-amber-600 bg-amber-50 border-amber-200" title="Follow gate" desc="Shown until the user follows you">
          <Textarea
            label="Follow-required message"
            value={template.followMessage}
            onChange={(e) => updateField("followMessage", e.target.value)}
            rows={3}
          />
          <Input
            label="Button text"
            value={template.followButtonText}
            onChange={(e) => updateField("followButtonText", e.target.value)}
          />
          <Textarea
            label="Still-not-following message (loops until they follow)"
            value={template.followRetryMessage}
            onChange={(e) => updateField("followRetryMessage", e.target.value)}
            rows={3}
          />
        </Section>

        <Section icon={Link2} color="text-emerald-600 bg-emerald-50 border-emerald-200" title="Final details" desc="Sent once the follow is confirmed">
          <Textarea
            label="Details message"
            value={template.detailsMessage}
            onChange={(e) => updateField("detailsMessage", e.target.value)}
            rows={3}
          />
          <Input
            label="Button text"
            value={template.detailsButtonText}
            onChange={(e) => updateField("detailsButtonText", e.target.value)}
          />
          <Input
            label="Link URL"
            type="url"
            value={template.detailsUrl}
            onChange={(e) => updateField("detailsUrl", e.target.value)}
            placeholder="https://yourwebsite.com"
            hint="Opened when the user taps the final button. Leave blank to send just the message."
          />
        </Section>
      </div>
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
