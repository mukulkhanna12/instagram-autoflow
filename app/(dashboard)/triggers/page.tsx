"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Workflow, MessageCircle, Play, Info, Sliders, Send } from "lucide-react";
import { loadTriggers, deleteTrigger, upsertTrigger, summarise, type Trigger, type FlowNode } from "@/lib/trigger-store";
import { truncate } from "@/lib/utils";
import { PauseResumeButton, RowMenu, StatusPill, TableFrame } from "@/components/dashboard/row-menu";

/**
 * Triggers list, laid out as 5.png's automations table. A trigger owns its
 * reel, so this is the entry point rather than a grid of every reel — reels are
 * only fetched inside the builder, when the picker is opened.
 *
 * DMs / Clicks / CTR stay "—": triggers are still a design preview saved in
 * this browser, and nothing sends from them yet.
 */
export default function TriggersListPage() {
  const router = useRouter();
  const [triggers, setTriggers] = useState<Trigger[] | null>(null);

  useEffect(() => setTriggers(loadTriggers()), []);

  // Creating goes to the form, not the canvas — the canvas is for editing.
  const create = () => router.push("/triggers/new");

  function remove(id: string) {
    if (!confirm("Delete this trigger?")) return;
    deleteTrigger(id);
    setTriggers(loadTriggers());
  }

  function toggle(t: Trigger) {
    upsertTrigger({ ...t, status: t.status === "live" ? "draft" : "live" });
    setTriggers(loadTriggers());
  }

  if (triggers === null) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-950">Triggers</h1>
          <p className="text-gray-500 mt-2">Build a flow once, then point it at a reel.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/triggers/defaults")}
            className="inline-flex items-center gap-2 h-12 px-5 rounded-full border-2 border-gray-300 text-gray-800 font-bold hover:border-gray-950 transition-colors cursor-pointer"
          >
            <Sliders className="w-4 h-4" /> Default messages
          </button>
          <button
            onClick={create}
            className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-brand-700 text-white font-bold hover:bg-brand-800 transition-colors cursor-pointer"
          >
            <Plus className="w-5 h-5" /> New trigger
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-2xl p-4 mt-6">
        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-900">
          <strong>Design preview.</strong> Triggers save to this browser only and don&apos;t send anything
          yet, so they have no numbers. Your live reel automations are untouched.
        </p>
      </div>

      <h2 className="text-2xl font-extrabold text-gray-950 mt-8">Your triggers</h2>
      <p className="text-gray-500 mt-1 mb-5">Manage your triggers and track their performance below.</p>

      {triggers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-14 text-center">
          <Workflow className="w-9 h-9 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-900">No triggers yet</p>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            A trigger is one complete flow — the reel, the keyword, and every message that follows.
          </p>
          <button
            onClick={create}
            className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-lime text-gray-950 font-bold hover:bg-lime-400 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create your first trigger
          </button>
        </div>
      ) : (
        <TableFrame
          columns={[
            { label: "Name" },
            { label: "DMs", className: "text-center" },
            { label: "Clicks", className: "text-center" },
            { label: "CTR", className: "text-center" },
            { label: "Status", className: "text-center" },
            { label: "Actions", className: "text-center" },
          ]}
        >
          {triggers.map((t) => {
            const s = summarise(t);
            const live = t.status === "live";
            return (
              <tr key={t.id} onClick={() => router.push(`/triggers/${t.id}`)} className="hover:bg-[#fafbf8] cursor-pointer">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4 min-w-0">
                    <TriggerIcon trigger={t} />
                    <div className="min-w-0">
                      <p className="font-bold text-gray-950 truncate max-w-[300px] 2xl:max-w-[380px]">{t.name}</p>
                      <p className="text-sm text-gray-400 truncate max-w-[300px] 2xl:max-w-[480px]">{describe(t, s)}</p>
                    </div>
                  </div>
                </td>
                <Dash />
                <Dash />
                <Dash />
                <td className="px-3 py-5 text-center">
                  <StatusPill status={live ? "live" : "draft"} />
                </td>
                <td className="px-3 py-5">
                  <div className="flex items-center justify-center gap-2">
                    <PauseResumeButton live={live} onClick={() => toggle(t)} />
                    <RowMenu
                      items={[
                        { label: "Edit", onSelect: () => router.push(`/triggers/${t.id}`) },
                        { label: "Delete", danger: true, onSelect: () => remove(t.id) },
                      ]}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </TableFrame>
      )}
    </div>
  );
}

function Dash() {
  return <td className="px-3 py-5 text-center font-bold text-gray-300">—</td>;
}

/** "User comments on reel · contains 'link' +1 more · DM: 'Hey! …'" — 5.png's summary line. */
function describe(t: Trigger, s: ReturnType<typeof summarise>): string {
  const src = s.sources[0];
  const parts: string[] = [src?.kind === "dm" ? "User sends DM" : s.reel ? "User comments on reel" : "No reel chosen yet"];
  const words = src?.include ?? [];
  if (words.length) parts.push(`contains '${words[0]}'${words.length > 1 ? ` +${words.length - 1} more` : ""}`);
  const first = t.nodes.find((n): n is Extract<FlowNode, { type: "message" }> => n.type === "message");
  if (first?.text) parts.push(`DM: '${truncate(first.text.replace(/\s+/g, " "), 40)}'`);
  return parts.join(" · ");
}

function TriggerIcon({ trigger }: { trigger: Trigger }) {
  const s = summarise(trigger);
  if (s.reel?.thumbnail) {
    return (
      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
        <Image src={s.reel.thumbnail} alt="" fill unoptimized className="object-cover" />
        <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center">
          <Play className="w-2 h-2 text-white fill-white" />
        </span>
      </div>
    );
  }
  const Icon = s.sources[0]?.kind === "dm" ? Send : MessageCircle;
  return (
    <div className="w-12 h-12 rounded-xl bg-gray-950 flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-lime" />
    </div>
  );
}
