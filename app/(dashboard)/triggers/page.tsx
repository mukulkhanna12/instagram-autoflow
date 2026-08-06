"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Workflow, Trash2, MessageSquare, GitBranch, Filter, ImageIcon, Info, Sliders } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { loadTriggers, deleteTrigger, summarise, type Trigger } from "@/lib/trigger-store";

/**
 * Triggers list. A trigger owns its reel, so this is the entry point rather
 * than a grid of every reel — reels are only fetched inside the builder, when
 * the picker is opened.
 */
export default function TriggersListPage() {
  const router = useRouter();
  const [triggers, setTriggers] = useState<Trigger[] | null>(null);

  useEffect(() => setTriggers(loadTriggers()), []);

  // Creating goes to the form, not the canvas — the canvas is for editing.
  const create = () => router.push("/triggers/new");

  function remove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this trigger?")) return;
    deleteTrigger(id);
    setTriggers(loadTriggers());
  }

  if (triggers === null) return null;

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shrink-0">
            <Workflow className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">Triggers</h1>
              <Badge variant="warning">Design preview</Badge>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Build a flow once, then point it at a reel
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/triggers/defaults")}>
            <Sliders className="w-4 h-4" /> Default messages
          </Button>
          <Button size="sm" onClick={create}>
            <Plus className="w-4 h-4" /> New trigger
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-2.5 bg-amber-50/70 border border-amber-100 rounded-xl p-3.5 my-5">
        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          Nothing here is connected yet — it saves to this browser only, so you can judge the
          shape before it&apos;s built for real. Your live reel automations are untouched.
        </p>
      </div>

      {triggers.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <Workflow className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">No triggers yet</p>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            A trigger is one complete flow — the reel, the keyword, and every message that follows.
          </p>
          <Button size="sm" className="mt-4" onClick={create}>
            <Plus className="w-4 h-4" /> Create your first trigger
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {triggers.map((t) => {
            const s = summarise(t);
            return (
              <div
                key={t.id}
                onClick={() => router.push(`/triggers/${t.id}`)}
                className="group bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:border-brand-200 hover:shadow-md transition-all"
              >
                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0 ring-1 ring-gray-200">
                  {s.reel?.thumbnail ? (
                    <Image src={s.reel.thumbnail} alt="" fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-gray-300" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{t.name}</p>
                    <Badge variant={t.status === "live" ? "success" : "default"}>
                      {t.status === "live" ? "Live" : "Draft"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {s.reel ? (s.reel.caption || "No caption") : "No reel chosen yet"}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />{s.messages} message{s.messages === 1 ? "" : "s"}
                    </span>
                    {s.branches > 1 && (
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-3 h-3" />{s.branches} branches
                      </span>
                    )}
                    {s.keywords.trim() && (
                      <span className="flex items-center gap-1 text-violet-500">
                        <Filter className="w-3 h-3" />{s.keywords}
                      </span>
                    )}
                    <span className="ml-auto">
                      {new Date(t.updatedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => remove(t.id, e)}
                  className="text-gray-300 hover:text-red-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="Delete trigger"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
