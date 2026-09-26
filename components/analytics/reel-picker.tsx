"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Check, ChevronDown, Layers, MessageCircle, Search, X } from "lucide-react";
import { cn, truncate } from "@/lib/utils";

export interface PickerReel {
  id: string;
  postCaption: string | null;
  postThumbnail: string | null;
  isActive: boolean;
  /** Shown beside each reel so the list can be scanned by size. */
  contacts?: number;
}

const caption = (r: PickerReel, n = 40) => (r.postCaption ? truncate(r.postCaption.replace(/\s+/g, " "), n) : "Untitled reel");

/**
 * Reel filter. In "multi" mode it picks any set of reels (none = all reels) and
 * applies on Apply, so ticking three boxes costs one refetch, not three. In
 * "single" mode it picks exactly one and closes — the Compare slots use that,
 * with `disabledIds` keeping the other slot's reel out.
 */
export function ReelPicker({
  reels, value, onChange, mode = "multi", disabledIds = [], accent, label, align = "left", className,
}: {
  reels: PickerReel[];
  value: string[];
  onChange: (ids: string[]) => void;
  mode?: "multi" | "single";
  disabledIds?: string[];
  /** Colour chip shown on the trigger (Compare's A/B). */
  accent?: string;
  label?: string;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(value);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(value);
    setQuery("");
    setTimeout(() => search.current?.focus(), 0);
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
    // Re-seed the draft only when the menu opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const byId = useMemo(() => new Map(reels.map((r) => [r.id, r])), [reels]);
  const chosen = value.map((id) => byId.get(id)).filter(Boolean) as PickerReel[];
  const shown = reels.filter((r) => !query || (r.postCaption ?? "").toLowerCase().includes(query.toLowerCase()));

  function toggle(id: string) {
    if (mode === "single") {
      onChange([id]);
      setOpen(false);
      return;
    }
    setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  }

  function apply(ids: string[]) {
    // Every reel ticked is the same as "all reels" — keep the URL short.
    onChange(ids.length === reels.length ? [] : ids);
    setOpen(false);
  }

  // Trigger text
  let title: string;
  let sub: string | null = null;
  if (chosen.length === 0) {
    title = mode === "single" ? "Choose a reel" : "All reels";
    sub = mode === "single" ? null : `${reels.length} merged`;
  } else if (chosen.length === 1) {
    title = caption(chosen[0], 30);
    sub = chosen[0].isActive ? "Live" : "Paused";
  } else {
    title = `${chosen.length} reels`;
    sub = "merged";
  }
  const stack = (chosen.length ? chosen : mode === "multi" ? reels : []).slice(0, 3);

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "w-full h-11 pl-1.5 pr-3.5 rounded-full bg-white border flex items-center gap-2.5 text-left cursor-pointer transition-colors",
          open ? "border-gray-950" : "border-gray-200 hover:border-gray-400"
        )}
      >
        {accent && <span className="w-2.5 h-2.5 rounded-full shrink-0 ml-2" style={{ background: accent }} />}
        {stack.length > 0 ? (
          <span className="flex -space-x-2.5 shrink-0">
            {stack.map((r) => (
              <Thumb key={r.id} reel={r} className="w-8 h-8 rounded-full ring-2 ring-white" />
            ))}
          </span>
        ) : (
          <span className="w-8 h-8 rounded-full bg-[#f1f2ee] flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-gray-400" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          {label && <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 leading-none mb-0.5">{label}</span>}
          <span className="block text-sm font-bold text-gray-950 truncate leading-tight">
            {title}
            {sub && <span className="font-medium text-gray-400"> · {sub}</span>}
          </span>
        </span>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable={mode === "multi"}
          className={cn(
            "absolute z-50 mt-2 w-[min(380px,calc(100vw-2rem))] rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          <div className="p-3 border-b border-gray-100">
            <label className="flex items-center gap-2 h-10 px-3.5 rounded-full bg-[#f3f4f1]">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                ref={search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search reels by caption"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
              />
              {query && (
                <button onClick={() => setQuery("")} aria-label="Clear search" className="text-gray-400 hover:text-gray-700 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </label>
          </div>

          <ul className="max-h-[340px] overflow-y-auto p-1.5">
            {mode === "multi" && !query && (
              <li>
                <button
                  onClick={() => setDraft([])}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[#f7f8f5] cursor-pointer text-left"
                >
                  <Box on={draft.length === 0} />
                  <span className="w-10 h-10 rounded-xl bg-lime-100 text-brand-800 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-gray-950">All reels</span>
                    <span className="block text-xs text-gray-400">Every automation, merged</span>
                  </span>
                </button>
              </li>
            )}
            {shown.map((r) => {
              const on = mode === "single" ? value.includes(r.id) : draft.includes(r.id);
              const disabled = disabledIds.includes(r.id);
              return (
                <li key={r.id}>
                  <button
                    role="option"
                    aria-selected={on}
                    disabled={disabled}
                    onClick={() => toggle(r.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-colors",
                      disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-[#f7f8f5] cursor-pointer",
                      on && "bg-brand-50/60"
                    )}
                  >
                    {mode === "multi" ? <Box on={on} /> : <Radio on={on} />}
                    <Thumb reel={r} className="w-10 h-10 rounded-xl" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-gray-950 truncate">{caption(r, 44)}</span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-400">
                        <span className={cn("w-1.5 h-1.5 rounded-full", r.isActive ? "bg-emerald-500" : "bg-gray-300")} />
                        {r.isActive ? "Live" : "Paused"}
                        {r.contacts !== undefined && <> · {r.contacts} contacts</>}
                        {disabled && <> · in the other slot</>}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {shown.length === 0 && <li className="px-4 py-8 text-center text-sm text-gray-400">No reel matches “{query}”.</li>}
          </ul>

          {mode === "multi" && (
            <div className="flex items-center gap-2 p-3 border-t border-gray-100 bg-[#fafbf8]">
              <span className="text-xs text-gray-500 flex-1">
                {draft.length === 0 ? "Showing all reels" : `${draft.length} selected — numbers are merged`}
              </span>
              {draft.length > 0 && (
                <button onClick={() => setDraft([])} className="h-9 px-3 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer">
                  Clear
                </button>
              )}
              <button
                onClick={() => apply(draft)}
                className="h-9 px-4 rounded-full bg-brand-800 text-white text-sm font-bold hover:bg-brand-900 cursor-pointer"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Box({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
        on ? "bg-brand-700 border-brand-700 text-white" : "border-gray-300"
      )}
    >
      {on && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
    </span>
  );
}

function Radio({ on }: { on: boolean }) {
  return (
    <span className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0", on ? "border-brand-700" : "border-gray-300")}>
      {on && <span className="w-2.5 h-2.5 rounded-full bg-brand-700" />}
    </span>
  );
}

function Thumb({ reel, className }: { reel: PickerReel; className?: string }) {
  return (
    <span className={cn("relative overflow-hidden bg-gray-950 shrink-0 flex items-center justify-center", className)}>
      {reel.postThumbnail ? (
        <Image src={reel.postThumbnail} alt="" fill unoptimized className="object-cover" />
      ) : (
        <MessageCircle className="w-4 h-4 text-lime" />
      )}
    </span>
  );
}
