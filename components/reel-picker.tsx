"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ImageIcon, Loader2, Search, X, Check } from "lucide-react";
import type { TriggerReel } from "@/lib/trigger-store";

/**
 * Choosing a reel, in two parts.
 *
 * Inline is a small scrollable strip — enough to recognise the last few posts
 * without the grid taking over the panel. Anything beyond that opens the modal,
 * which has room to scroll and search properly. An account with hundreds of
 * reels shouldn't turn a form step into an endless wall of thumbnails.
 */

const INLINE_COUNT = 8;

export function ReelStrip({
  reels, selected, onSelect, onBrowse, columns = 4,
}: {
  reels: TriggerReel[] | null;
  selected: TriggerReel | null;
  onSelect: (r: TriggerReel) => void;
  onBrowse: () => void;
  columns?: 3 | 4;
}) {
  if (reels === null) {
    return (
      <div className="py-10 flex justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
      </div>
    );
  }
  if (reels.length === 0) {
    return <p className="text-xs text-gray-400 py-6 text-center">No reels found on the account.</p>;
  }

  // Keep the chosen reel visible even when it sits outside the first few.
  const head = reels.slice(0, INLINE_COUNT);
  const shown = selected && !head.some((r) => r.id === selected.id) ? [selected, ...head.slice(0, INLINE_COUNT - 1)] : head;

  return (
    <div>
      <div
        className={`grid gap-2 max-h-[232px] overflow-y-auto pr-1 ${columns === 3 ? "grid-cols-3" : "grid-cols-4"}`}
      >
        {shown.map((r) => (
          <Thumb key={r.id} reel={r} active={selected?.id === r.id} onClick={() => onSelect(r)} />
        ))}
      </div>

      {reels.length > shown.length && (
        <button
          onClick={onBrowse}
          className="mt-2.5 text-xs font-medium text-brand-600 hover:text-brand-700 cursor-pointer"
        >
          Browse all {reels.length} reels →
        </button>
      )}
    </div>
  );
}

function Thumb({ reel, active, onClick }: { reel: TriggerReel; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer group">
      {reel.thumbnail ? (
        <Image src={reel.thumbnail} alt="" fill sizes="120px" className="object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className="w-4 h-4 text-gray-300" /></div>
      )}
      <span className={`absolute inset-0 rounded-lg ring-2 transition-all ${
        active ? "ring-brand-500" : "ring-transparent group-hover:ring-brand-300"
      }`} />
      <span className={`absolute top-1.5 right-1.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center transition-colors ${
        active ? "bg-brand-500" : "bg-black/20 group-hover:bg-black/30"
      }`}>
        {active && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
      </span>
    </button>
  );
}

export function ReelPickerModal({
  reels, selected, onPick, onClose,
}: {
  reels: TriggerReel[] | null;
  selected: TriggerReel | null;
  onPick: (r: TriggerReel) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [choice, setChoice] = useState<TriggerReel | null>(selected);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = useMemo(
    () => (reels ?? []).filter((r) => !q || (r.caption ?? "").toLowerCase().includes(q.toLowerCase())),
    [reels, q]
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[78vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-4 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900">Choose a reel</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {reels === null ? "Loading…" : `${filtered.length} of ${reels.length} reels`}
            </p>
          </div>
          <div className="relative ml-auto w-64">
            <Search className="w-3.5 h-3.5 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              autoFocus value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search captions…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400"
            />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* The scrolling area — the whole point of the modal */}
        <div className="flex-1 overflow-y-auto p-6">
          {reels === null ? (
            <div className="h-full flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-16">
              {q ? `Nothing matching “${q}”.` : "No reels found on the account."}
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filtered.map((r) => (
                <div key={r.id}>
                  <Thumb reel={r} active={choice?.id === r.id} onClick={() => setChoice(r)} />
                  <p className="text-[11px] text-gray-500 mt-1.5 line-clamp-2 leading-snug">
                    {r.caption || "No caption"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3 shrink-0">
          <p className="text-xs text-gray-400 truncate">
            {choice ? (choice.caption || "Reel selected") : "Nothing selected"}
          </p>
          <button onClick={onClose} className="ml-auto text-xs text-gray-500 hover:text-gray-700 px-3 py-2 cursor-pointer">
            Cancel
          </button>
          <button
            onClick={() => { if (choice) { onPick(choice); onClose(); } }}
            disabled={!choice}
            className="text-xs font-medium bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Use this reel
          </button>
        </div>
      </div>
    </div>
  );
}
