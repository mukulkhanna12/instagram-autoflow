"use client";
import React from "react";
import { Filter, Link2, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_BUTTONS, YOUTUBE_SUBSCRIBE_BUTTON, hasPresetButton, togglePresetButton } from "@/lib/buttons";
import { YouTubePresetChip } from "@/components/youtube-preset-chip";

/**
 * The field groups a flow's messages are edited in.
 *
 * Shared by the prepared-flow queue, the per-reel editor's siblings and the
 * Reels default-messages page: all three edit the same set of fields, and the
 * one thing worse than duplicating this markup is letting the copies drift.
 */

export interface DetailsButton { title: string; url: string }

/** Fall back to the legacy single-button pair for rows saved before detailsButtons. */
export function buttonsOf(f: {
  detailsButtons?: DetailsButton[] | null;
  detailsButtonText?: string | null;
  detailsUrl?: string | null;
}): DetailsButton[] {
  if (Array.isArray(f.detailsButtons) && f.detailsButtons.length > 0) {
    return f.detailsButtons.slice(0, MAX_BUTTONS);
  }
  const title = f.detailsButtonText?.trim();
  const url = f.detailsUrl?.trim();
  return title && url ? [{ title, url }] : [];
}

/** Comment filter. Off means "reply to everything". */
export function KeywordFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const on = value.trim().length > 0;
  return (
    <div className={`rounded-lg border p-4 space-y-3 ${on ? "bg-violet-50 border-violet-200" : "bg-gray-50 border-gray-200"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <Filter className={`w-4 h-4 mt-0.5 shrink-0 ${on ? "text-violet-600" : "text-gray-400"}`} />
          <div>
            <p className="text-sm font-semibold text-gray-900">Only reply to specific comments</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {on
                ? "Comments without one of these words are ignored — no reply, no DM."
                : "Off — every comment on the reel gets a reply and a DM."}
            </p>
          </div>
        </div>
        <button onClick={() => onChange(on ? "" : "prompt")} className="shrink-0 cursor-pointer">
          {on
            ? <ToggleRight className="w-8 h-8 text-violet-500" />
            : <ToggleLeft className="w-8 h-8 text-gray-300" />}
        </button>
      </div>
      {on && (
        <Input
          label="Keywords"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="prompt, link, guide"
          hint="Comma-separated. Not case-sensitive — PROMPT, Prompt and prompt all match."
        />
      )}
    </div>
  );
}

/** Up to three link buttons on the final message — Instagram's hard ceiling. */
export function ButtonListEditor({
  buttons, onChange,
}: { buttons: DetailsButton[]; onChange: (b: DetailsButton[]) => void }) {
  const full = buttons.length >= MAX_BUTTONS;
  const ytOn = hasPresetButton(buttons, YOUTUBE_SUBSCRIBE_BUTTON);

  function set(i: number, patch: Partial<DetailsButton>) {
    onChange(buttons.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }

  return (
    <div className="space-y-3">
      <YouTubePresetChip
        on={ytOn}
        disabled={!ytOn && full}
        onClick={() => onChange(togglePresetButton(buttons, YOUTUBE_SUBSCRIBE_BUTTON))}
      />

      {buttons.length === 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
          No buttons yet — this would send as <strong>plain text</strong>.
        </p>
      )}

      {buttons.map((b, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Button {i + 1}
            </span>
            <button
              onClick={() => onChange(buttons.filter((_, idx) => idx !== i))}
              className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <Input
            label="Button text"
            value={b.title}
            onChange={(e) => set(i, { title: e.target.value })}
            placeholder="Visit Page 🔗"
          />
          <Input
            label="Link URL"
            type="url"
            value={b.url}
            onChange={(e) => set(i, { url: e.target.value })}
            placeholder="https://yourwebsite.com"
          />
          {(!b.title.trim() || !b.url.trim()) && (
            <p className="text-xs text-amber-700">
              Needs both a label and a link, or it won&apos;t be sent.
            </p>
          )}
        </div>
      ))}

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange([...buttons, { title: "", url: "" }])}
          disabled={full}
        >
          <Plus className="w-4 h-4" /> Add button
        </Button>
        <span className="text-xs text-gray-400">
          {full ? "Instagram allows a maximum of 3 buttons" : `${MAX_BUTTONS - buttons.length} more allowed`}
        </span>
      </div>
    </div>
  );
}

/** Opt-in buttons on the final message. Off → plain text. */
export function ButtonToggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={`rounded-lg border p-4 flex items-start justify-between gap-4 ${
      enabled ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"
    }`}>
      <div className="flex items-start gap-2.5">
        <Link2 className={`w-4 h-4 mt-0.5 shrink-0 ${enabled ? "text-emerald-600" : "text-gray-400"}`} />
        <div>
          <p className="text-sm font-semibold text-gray-900">Add buttons with links</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {enabled
              ? "The final DM ends with tappable buttons opening your links."
              : "Off — the final DM is sent as plain text."}
          </p>
        </div>
      </div>
      <button onClick={() => onChange(!enabled)} className="shrink-0 cursor-pointer">
        {enabled
          ? <ToggleRight className="w-8 h-8 text-emerald-500" />
          : <ToggleLeft className="w-8 h-8 text-gray-300" />}
      </button>
    </div>
  );
}

export function Section({
  icon: Icon, color, title, desc, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-400">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
