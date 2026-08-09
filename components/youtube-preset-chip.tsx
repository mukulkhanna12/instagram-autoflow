"use client";
import { Youtube, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { YOUTUBE_SUBSCRIBE_BUTTON } from "@/lib/buttons";

/**
 * One-click add/remove for the YouTube subscribe button on the final DM.
 *
 * Deliberately a single control rather than an add-button plus a separate
 * remove: once it is on, clicking it again is the way to take it back off, so
 * there is never a state where the preset is applied and the chip still reads
 * "add". `disabled` is for the case where all three button slots are taken —
 * the toggle would otherwise be a silent no-op.
 */
export function YouTubePresetChip({
  on, disabled, onClick,
}: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={
          disabled
            ? "All three button slots are taken — remove one first"
            : YOUTUBE_SUBSCRIBE_BUTTON.url
        }
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
          on
            ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
          disabled && "opacity-50 cursor-not-allowed hover:bg-white"
        )}
      >
        <Youtube className={cn("w-3.5 h-3.5", on ? "text-red-600" : "text-gray-400")} />
        {YOUTUBE_SUBSCRIBE_BUTTON.title}
        {on ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
      </button>
      <span className="text-[11px] text-gray-400">
        {on ? "Added — click to remove" : "One click adds the label and link"}
      </span>
    </div>
  );
}
