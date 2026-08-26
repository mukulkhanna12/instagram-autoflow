"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, AlertCircle, Check, Info, Link2, Loader2, MessageSquare, Save,
  UserCheck, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { MessageInput } from "@/components/message-input";
import {
  Section, KeywordFilter, ButtonListEditor, ButtonToggle, buttonsOf,
  type DetailsButton,
} from "@/components/flow-fields";

interface Defaults {
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

const FIELDS = [
  "keywords",
  "commentReplyText", "commentReplyText2", "commentReplyText3",
  "greetingMessage", "greetingButtonText",
  "followMessage", "followButtonText", "followRetryMessage",
  "detailsMessage", "detailsButtonEnabled", "detailsButtons", "detailsButtonText", "detailsUrl",
] as const;

/**
 * The wording a newly configured reel starts from.
 *
 * Deliberately does not touch reels that already have an automation — by then
 * it has been customised, and silently rewriting it would be the opposite of a
 * default. A prepared flow in the queue still wins for the reel it was written
 * for; these are what everything else begins with.
 */
export default function ReelDefaultsPage() {
  const router = useRouter();
  const [d, setD] = useState<Defaults | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [noAccount, setNoAccount] = useState(false);

  useEffect(() => {
    fetch("/api/reel-defaults")
      .then((r) => r.json())
      .then(({ defaults }) => {
        if (!defaults) setNoAccount(true);
        else setD(defaults);
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (patch: Partial<Defaults>) => setD((prev) => (prev ? { ...prev, ...patch } : prev));

  async function save() {
    if (!d) return;
    setSaving(true);
    try {
      const data = Object.fromEntries(FIELDS.map((f) => [f, d[f] ?? ""]));
      const res = await fetch("/api/reel-defaults", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, detailsButtons: buttonsOf(d) }),
      });
      if (res.ok) {
        const { defaults } = await res.json();
        setD(defaults);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (noAccount || !d) {
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
      <button
        onClick={() => router.push("/posts")}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-5 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> All reels
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Default messages</h1>
          <p className="text-xs text-gray-400 mt-0.5">What every new reel starts with</p>
        </div>
        <Button size="sm" onClick={save} loading={saving}>
          {saved ? <><Check className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save</>}
        </Button>
      </div>

      <div className="flex items-start gap-2.5 bg-gray-50 border border-gray-200 rounded-xl p-3.5 my-5">
        <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-600">
          Used when you hit <strong>Configure</strong> on a reel, and for new{" "}
          <Link href="/queue" className="underline">prepared flows</Link>. Reels that already have an
          automation keep the wording you gave them, and a prepared flow still wins for the reel it
          was written for.
        </p>
      </div>

      <div className="space-y-4">
        <Section icon={MessageSquare} color="text-blue-600 bg-blue-50 border-blue-200" title="Comment reply" desc="Public reply posted on the comment">
          <KeywordFilter value={d.keywords ?? ""} onChange={(v) => set({ keywords: v })} />
          <Textarea
            label="Comment reply — variant 1"
            value={d.commentReplyText}
            onChange={(e) => set({ commentReplyText: e.target.value })}
            rows={2}
          />
          <Textarea
            label="Variant 2 (optional)"
            value={d.commentReplyText2 ?? ""}
            onChange={(e) => set({ commentReplyText2: e.target.value })}
            rows={2}
          />
          <Textarea
            label="Variant 3 (optional)"
            value={d.commentReplyText3 ?? ""}
            onChange={(e) => set({ commentReplyText3: e.target.value })}
            rows={2}
          />
        </Section>

        <Section icon={Zap} color="text-brand-600 bg-brand-50 border-brand-200" title="DM greeting" desc="First DM sent to the commenter, with a button">
          <MessageInput
            label="Greeting message"
            value={d.greetingMessage}
            onChange={(v) => set({ greetingMessage: v })}
            rows={3}
          />
          <Input
            label="Button text"
            value={d.greetingButtonText}
            onChange={(e) => set({ greetingButtonText: e.target.value })}
          />
        </Section>

        <Section icon={UserCheck} color="text-amber-600 bg-amber-50 border-amber-200" title="Follow gate" desc="Only shown if they aren't following you">
          <MessageInput
            label="Follow-required message"
            value={d.followMessage}
            onChange={(v) => set({ followMessage: v })}
            rows={3}
          />
          <Input
            label="Button text"
            value={d.followButtonText}
            onChange={(e) => set({ followButtonText: e.target.value })}
          />
          <MessageInput
            label="Still-not-following message (loops until they follow)"
            value={d.followRetryMessage}
            onChange={(v) => set({ followRetryMessage: v })}
            rows={3}
          />
        </Section>

        <Section icon={Link2} color="text-emerald-600 bg-emerald-50 border-emerald-200" title="Final details" desc="Sent once the follow is confirmed">
          <MessageInput
            label="Details message"
            value={d.detailsMessage}
            onChange={(v) => set({ detailsMessage: v })}
            rows={3}
          />
          <ButtonToggle
            enabled={d.detailsButtonEnabled ?? true}
            onChange={(on) => set({ detailsButtonEnabled: on })}
          />
          {(d.detailsButtonEnabled ?? true) && (
            <ButtonListEditor
              buttons={buttonsOf(d)}
              onChange={(b) => set({ detailsButtons: b })}
            />
          )}
          <p className="text-[11px] text-gray-400 leading-relaxed">
            The link is usually different for every reel — set a placeholder here and change it on
            the reel itself.
          </p>
        </Section>
      </div>

      <p className="text-[11px] text-gray-400 mt-6">
        Use <code className="bg-gray-100 rounded px-1 py-0.5">{"{{full_name}}"}</code> or{" "}
        <code className="bg-gray-100 rounded px-1 py-0.5">{"{{username}}"}</code> anywhere in a message.
      </p>
    </div>
  );
}
