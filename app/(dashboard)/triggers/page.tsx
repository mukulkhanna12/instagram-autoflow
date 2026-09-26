"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { UpcomingReels } from "@/components/automations/upcoming-reels";
import Image from "next/image";
import { Plus, Workflow, MessageCircle, Play, Info, Sliders, Send } from "lucide-react";
import { loadTriggers, deleteTrigger, upsertTrigger, summarise, ownAutomationCount, type Trigger, type FlowNode } from "@/lib/trigger-store";
import { fromTrigger } from "@/lib/trigger-compose";
import { AUTOMATION_LIMIT_MESSAGE, canAddAutomation } from "@/lib/plans";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { truncate } from "@/lib/utils";
import { PageHeader, headerButton } from "@/components/ui/page-header";
import { PauseResumeButton, RowMenu, StatusPill, TableFrame } from "@/components/dashboard/row-menu";

/**
 * Triggers list, laid out as 5.png's automations table. A trigger owns its
 * reel, so this is the entry point rather than a grid of every reel — reels are
 * only fetched inside the builder, when the picker is opened.
 *
 * DMs / Clicks / CTR stay "—": triggers are still a design preview saved in
 * this browser, and nothing sends from them yet.
 */
type Tab = "automations" | "upcoming";

export default function TriggersPage() {
  return (
    <Suspense fallback={null}>
      <TriggersListPage />
    </Suspense>
  );
}

function TriggersListPage() {
  const params = useSearchParams();
  const tab: Tab = params.get("tab") === "upcoming" ? "upcoming" : "automations";
  const router = useRouter();
  const [triggers, setTriggers] = useState<Trigger[] | null>(null);

  useEffect(() => setTriggers(loadTriggers()), []);

  // Creating goes to the one-page editor; the step-by-step form stays one
  // click away while both are being tried out.
  const ask = useConfirm();
  const create = async () => {
    if (!canAddAutomation(ownAutomationCount())) {
      const see = await ask({
        title: "You've used your free automation",
        body: AUTOMATION_LIMIT_MESSAGE,
        confirmLabel: "See plans",
        cancelLabel: "OK",
        icon: "warning",
      });
      if (see) router.push("/pricing");
      return;
    }
    router.push("/triggers/compose");
  };

  // Open in the one-page editor when it can show the whole flow; branched
  // flows only fit on the canvas.
  const edit = (t: Trigger) => router.push(fromTrigger(t) ? `/triggers/${t.id}/compose` : `/triggers/${t.id}`);

  function remove(id: string) {
    if (!confirm("Delete this automation?")) return;
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
      <PageHeader
        title="Automations"
        subtitle="Build an automation once, then point it at a reel."
        actions={
          tab === "upcoming" ? undefined : <>
          <button
            onClick={() => router.push("/triggers/defaults")}
            className={headerButton.secondary}
          >
            <Sliders className="w-4 h-4" /> Default messages
          </button>
          <button
            onClick={() => router.push("/triggers/new")}
            className={headerButton.ghost}
          >
            Step-by-step
          </button>
          <button
            onClick={create}
            className={headerButton.primary}
          >
            <Plus className="w-4 h-4" /> New automation
          </button>
          </>
        }
      />

      <nav className="mt-5 flex gap-1 border-b border-gray-200" aria-label="Automations sections">
        {([
          ["automations", "Automations", "/triggers"],
          ["upcoming", "Upcoming reels", "/triggers?tab=upcoming"],
        ] as const).map(([id, label, href]) => (
          <Link
            key={id}
            href={href}
            scroll={false}
            aria-current={tab === id ? "page" : undefined}
            className={`relative px-4 h-11 inline-flex items-center text-sm font-semibold ${tab === id ? "text-gray-950" : "text-gray-500 hover:text-gray-900"}`}
          >
            {label}
            {tab === id && <span className="absolute left-3 right-3 -bottom-px h-0.5 rounded-full bg-brand-700" />}
          </Link>
        ))}
      </nav>

      {tab === "upcoming" && <div className="mt-6"><UpcomingReels /></div>}

      {tab === "automations" && (<>
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-2xl p-4 mt-6">
        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-900">
          <strong>Design preview.</strong> Automations here save to this browser only and don&apos;t send anything
          yet, so they have no numbers. Your live reel automations are untouched.
        </p>
      </div>

      <h2 className="text-lg font-bold text-gray-950 mt-8">Your automations</h2>
      <p className="text-sm text-gray-500 mt-0.5 mb-4">Manage your automations and track their performance below.</p>

      {triggers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-14 text-center">
          <Workflow className="w-9 h-9 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-900">No automations yet</p>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            A flow is one complete automation — the reel, the keyword, and every message that follows.
          </p>
          <button
            onClick={create}
            className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-lime text-gray-950 font-bold hover:bg-lime-400 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create your first automation
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
              <tr key={t.id} onClick={() => edit(t)} className="hover:bg-[#fafbf8] cursor-pointer">
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
                        ...(fromTrigger(t) ? [{ label: "Edit", onSelect: () => router.push(`/triggers/${t.id}/compose`) }] : []),
                        { label: "Edit on canvas", onSelect: () => router.push(`/triggers/${t.id}`) },
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
      </>)}
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
