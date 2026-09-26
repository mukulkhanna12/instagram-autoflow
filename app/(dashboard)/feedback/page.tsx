"use client";
import { useEffect, useState } from "react";
import { Gift, Inbox } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import {
  FEEDBACK_STATUSES, FEEDBACK_TYPES, isFeedbackStatus, isFeedbackType, type FeedbackStatus,
} from "@/lib/feedback";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  type: string;
  message: string;
  page: string | null;
  status: string;
  reply: string | null;
  createdAt: string;
  user?: { name: string | null; email: string };
}

const when = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/**
 * Feedback & ideas: send something, follow what happened to it, and — for the
 * app owner — review everyone's and note a reward.
 */
export default function FeedbackPage() {
  const [data, setData] = useState<{ reviewer: boolean; mine: Item[]; all: Item[] | null } | null>(null);

  const load = () =>
    fetch("/api/feedback").then((r) => (r.ok ? r.json() : null)).then((d) => d && setData(d));
  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 lg:p-8 max-w-5xl space-y-8">
      <PageHeader
        title="Feedback & ideas"
        subtitle="Ideas, bugs you spotted, feedback on the design — anything that helps us make AutoFlow better may earn you a discount as a thank-you."
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="rounded-3xl bg-white p-6">
          <h2 className="text-lg font-bold text-gray-950 mb-4">Share something</h2>
          <FeedbackForm showPageLink={false} onSent={load} />
        </section>

        <section className="rounded-3xl bg-white p-6">
          <h2 className="text-lg font-bold text-gray-950">Your feedback</h2>
          <p className="text-sm text-gray-500 mt-0.5 mb-4">What you&apos;ve sent, and where it stands.</p>
          {!data ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : data.mine.length === 0 ? (
            <div className="text-center py-10">
              <Inbox className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="mt-2 text-sm text-gray-500">Nothing yet — your first idea could be the next feature.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {data.mine.map((f) => <FeedbackCard key={f.id} f={f} />)}
            </ul>
          )}
        </section>
      </div>

      {data?.reviewer && data.all && <ReviewList items={data.all} onChange={load} />}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = isFeedbackStatus(status) ? FEEDBACK_STATUSES[status] : FEEDBACK_STATUSES.received;
  return <span className={cn("text-[11px] font-bold rounded-full px-2.5 py-1 whitespace-nowrap", s.tone)}>{s.label}</span>;
}

function TypeTag({ type }: { type: string }) {
  const t = isFeedbackType(type) ? FEEDBACK_TYPES[type] : FEEDBACK_TYPES.other;
  return <span className="text-xs font-semibold text-gray-500">{t.emoji} {t.label}</span>;
}

function FeedbackCard({ f }: { f: Item }) {
  return (
    <li className="rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between gap-3">
        <TypeTag type={f.type} />
        <StatusPill status={f.status} />
      </div>
      <p className="mt-2 text-sm text-gray-800 whitespace-pre-line line-clamp-4">{f.message}</p>
      {f.reply && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-lime-50 border border-lime-200 px-3 py-2 text-sm text-gray-900">
          <Gift className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" /> {f.reply}
        </p>
      )}
      <p className="mt-2 text-[11px] text-gray-400">{when(f.createdAt)}{f.page ? ` · from ${f.page}` : ""}</p>
    </li>
  );
}

/** Owner only: everyone's feedback, with status and a reply/reward note. */
function ReviewList({ items, onChange }: { items: Item[]; onChange: () => void }) {
  const [filter, setFilter] = useState<"open" | "all">("open");
  const shown = items.filter((i) => filter === "all" || !["shipped", "rewarded"].includes(i.status));

  return (
    <section className="rounded-3xl bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-950">Review everyone&apos;s feedback</h2>
          <p className="text-sm text-gray-500 mt-0.5">Only you see this. Set a status and add a note — they see both.</p>
        </div>
        <div className="inline-flex rounded-full bg-[#f3f4f1] p-1 text-sm">
          {(["open", "all"] as const).map((k) => (
            <button key={k} onClick={() => setFilter(k)} className={cn("px-3 h-8 rounded-full font-semibold cursor-pointer", filter === k ? "bg-white shadow-sm text-gray-950" : "text-gray-500")}>
              {k === "open" ? "Open" : `All (${items.length})`}
            </button>
          ))}
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">Nothing waiting — all caught up.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {shown.map((f) => <ReviewRow key={f.id} f={f} onChange={onChange} />)}
        </ul>
      )}
    </section>
  );
}

function ReviewRow({ f, onChange }: { f: Item; onChange: () => void }) {
  const [status, setStatus] = useState<FeedbackStatus>(isFeedbackStatus(f.status) ? f.status : "received");
  const [reply, setReply] = useState(f.reply ?? "");
  const [saving, setSaving] = useState(false);
  const dirty = status !== f.status || reply !== (f.reply ?? "");

  async function save() {
    setSaving(true);
    await fetch(`/api/feedback/${f.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reply }),
    });
    setSaving(false);
    onChange();
  }

  return (
    <li className="py-4 grid gap-3 md:grid-cols-[1fr_300px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <TypeTag type={f.type} />
          <span className="text-xs text-gray-400">· {f.user?.name && f.user.name !== "AutoFlow" ? f.user.name : f.user?.email} · {when(f.createdAt)}{f.page ? ` · ${f.page}` : ""}</span>
        </div>
        <p className="mt-1.5 text-sm text-gray-800 whitespace-pre-line">{f.message}</p>
      </div>
      <div className="space-y-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as FeedbackStatus)}
          className="w-full h-9 rounded-lg border border-gray-200 px-2 text-sm bg-white cursor-pointer"
          aria-label="Status"
        >
          {(Object.keys(FEEDBACK_STATUSES) as FeedbackStatus[]).map((s) => (
            <option key={s} value={s}>{FEEDBACK_STATUSES[s].label}</option>
          ))}
        </select>
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          maxLength={500}
          placeholder={status === "rewarded" ? "e.g. 20% off Pro — thank you!" : "Reply (optional, they'll see it)"}
          className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="w-full h-9 rounded-full bg-gray-950 text-white text-sm font-bold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </li>
  );
}
