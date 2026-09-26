"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { GitBranch } from "lucide-react";
import { TriggerComposer } from "@/components/trigger-composer";
import { fromTrigger, type ComposeState } from "@/lib/trigger-compose";
import { getTrigger } from "@/lib/trigger-store";

/**
 * Edit a trigger in the one-page editor. A trigger the canvas has branched
 * beyond the standard shape can't be shown here without dropping parts of it,
 * so it points back to the canvas instead.
 */
export default function ComposeEditPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<{ initial: ComposeState | null; found: boolean } | null>(null);

  useEffect(() => {
    const t = getTrigger(id);
    setState({ initial: t ? fromTrigger(t) : null, found: !!t });
  }, [id]);

  if (!state) return null;
  if (state.initial) return <TriggerComposer initial={state.initial} triggerId={id} mode="edit" />;

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-extrabold text-gray-950">
        {state.found ? "This automation needs the canvas" : "Automation not found"}
      </h1>
      <p className="text-gray-500 mt-2">
        {state.found
          ? "It has branches, a DM start or extra messages that the one-page editor can't show without losing them."
          : "It may have been deleted, or it was saved in another browser."}
      </p>
      <div className="mt-5 flex gap-3">
        {state.found && (
          <Link href={`/triggers/${id}`} className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-brand-700 text-white font-bold">
            <GitBranch className="w-4 h-4" /> Open on canvas
          </Link>
        )}
        <Link href="/triggers" className="inline-flex items-center h-11 px-5 rounded-full border border-gray-300 font-bold text-gray-700">
          All flows
        </Link>
      </div>
    </div>
  );
}
