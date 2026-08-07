"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, Loader2, Search, X, Check, ChevronLeft, ChevronRight } from "lucide-react";
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

/** Thumbnails per page in the modal — one screenful of the 5-column grid. */
const PAGE_SIZE = 25;

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
        // unoptimized: see the note in app/(dashboard)/posts/page.tsx — these
        // URLs are signed and change on every fetch, so optimizing them is
        // both futile and expensive.
        <Image src={reel.thumbnail} alt="" fill sizes="120px" unoptimized className="object-cover" />
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
  const [page, setPage] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = useMemo(
    () => (reels ?? []).filter((r) => !q || (r.caption ?? "").toLowerCase().includes(q.toLowerCase())),
    [reels, q]
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // A search that shrinks the list can strand you past the end; clamping on
  // render keeps the grid and the footer from disagreeing about the page.
  const current = Math.min(page, pageCount - 1);
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  // Typing restarts at the first page — results you can't see aren't results.
  useEffect(() => { setPage(0); }, [q]);

  // Turning a page should start at the top of it, not wherever the last one
  // was scrolled to.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [current]);

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
              {reels === null
                ? "Loading…"
                : filtered.length === 0
                  ? `0 of ${reels.length} reels`
                  : `${current * PAGE_SIZE + 1}–${current * PAGE_SIZE + visible.length} of ${filtered.length}` +
                    (filtered.length === reels.length ? " reels" : ` matching · ${reels.length} total`)}
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
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
          {reels === null ? (
            <div className="h-full flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-16">
              {q ? `Nothing matching “${q}”.` : "No reels found on the account."}
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {visible.map((r) => (
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
          <p className="text-xs text-gray-400 truncate min-w-0">
            {choice ? (choice.caption || "Reel selected") : "Nothing selected"}
          </p>

          {pageCount > 1 && (
            // Paging doesn't touch `choice`, so a reel picked on page 1 is still
            // selected after browsing to page 4.
            <div className="ml-auto flex items-center gap-1 shrink-0">
              <button
                onClick={() => setPage(current - 1)}
                disabled={current === 0}
                aria-label="Previous page"
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-gray-400 tabular-nums px-1">
                {current + 1} / {pageCount}
              </span>
              <button
                onClick={() => setPage(current + 1)}
                disabled={current >= pageCount - 1}
                aria-label="Next page"
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button onClick={onClose} className={`${pageCount > 1 ? "" : "ml-auto "}text-xs text-gray-500 hover:text-gray-700 px-3 py-2 cursor-pointer shrink-0`}>
            Cancel
          </button>
          <button
            onClick={() => { if (choice) { onPick(choice); onClose(); } }}
            disabled={!choice}
            className="text-xs font-medium bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            Use this reel
          </button>
        </div>
      </div>
    </div>
  );
}
