"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RowMenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

/** The ⋮ at the end of a 5.png table row. */
export function RowMenu({ items }: { items: RowMenuItem[] }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        onClick={(e) => e.stopPropagation()}
        className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-950 cursor-pointer"
        aria-label="More actions"
      >
        <MoreVertical className="w-5 h-5" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={6}
          onClick={(e) => e.stopPropagation()}
          className="z-50 min-w-[168px] rounded-2xl bg-white p-1.5 shadow-xl border border-gray-100"
        >
          {items.map((it) => (
            <Menu.Item
              key={it.label}
              onSelect={it.onSelect}
              className={cn(
                "px-3 py-2 rounded-xl text-sm font-medium outline-none cursor-pointer",
                it.danger ? "text-red-600 data-[highlighted]:bg-red-50" : "text-gray-800 data-[highlighted]:bg-gray-100"
              )}
            >
              {it.label}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** Live / Paused / Draft pill. */
export function StatusPill({ status }: { status: "live" | "paused" | "draft" | "deleted" }) {
  const style = {
    live: "bg-emerald-50 text-emerald-700",
    paused: "bg-gray-100 text-gray-600",
    draft: "bg-gray-100 text-gray-600",
    deleted: "bg-amber-50 text-amber-700",
  }[status];
  const label = { live: "Live", paused: "Paused", draft: "Draft", deleted: "Reel deleted" }[status];
  return <span className={cn("inline-flex items-center justify-center h-8 px-4 rounded-full text-sm font-bold whitespace-nowrap", style)}>{label}</span>;
}

/** Pause (amber outline) / Resume (green outline), as in 5.png. */
export function PauseResumeButton({
  live, busy, onClick,
}: {
  live: boolean;
  busy?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={busy}
      className={cn(
        "inline-flex items-center justify-center gap-2 h-10 w-[104px] rounded-xl border-2 text-sm font-bold transition-colors disabled:opacity-50 cursor-pointer",
        live
          ? "border-amber-400 text-amber-600 hover:bg-amber-50"
          : "border-brand-500 text-brand-700 hover:bg-brand-50"
      )}
    >
      {live ? <PauseGlyph /> : <PlayGlyph />}
      {busy ? "…" : live ? "Pause" : "Go live"}
    </button>
  );
}

const PauseGlyph = () => (
  <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3.5" y="2.5" width="3" height="11" rx="1" />
    <rect x="9.5" y="2.5" width="3" height="11" rx="1" />
  </svg>
);
const PlayGlyph = () => (
  <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
    <path d="M4 2.8v10.4a.8.8 0 0 0 1.2.7l8.3-5.2a.8.8 0 0 0 0-1.4L5.2 2.1A.8.8 0 0 0 4 2.8Z" />
  </svg>
);

/** Column header row + rounded frame shared by the dashboard and Triggers tables. */
export function TableFrame({ columns, children }: { columns: { label: string; className?: string }[]; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white overflow-x-auto">
      <table className="w-full min-w-[820px] text-left">
        <thead>
          <tr className="bg-[#fafbf8] border-b border-gray-200">
            {columns.map((c) => (
              <th key={c.label} className={cn("px-3 first:pl-6 last:pr-6 py-4 text-xs font-bold uppercase tracking-[0.1em] text-gray-500", c.className)}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{children}</tbody>
      </table>
    </div>
  );
}
