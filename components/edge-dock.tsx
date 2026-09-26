"use client";
import { usePathname } from "next/navigation";
import { BarChart3, MessageCircleQuestion } from "lucide-react";
import { openQuickStats } from "@/components/analytics/quick-panel";
import { openHelpAssistant } from "@/components/help/help-assistant";
import { cn } from "@/lib/utils";

/**
 * Stats and Help as tabs attached to the right edge of the screen, halfway
 * down — instead of two floating buttons stacked in the corner, where they sat
 * on top of table rows and their buttons. Each tab slides out a little on
 * hover and opens the same panel as before.
 */
export function EdgeDock() {
  const pathname = usePathname();
  // The Analytics page already shows everything Quick stats would.
  const showStats = pathname !== "/analytics";

  return (
    <div data-tour="dock" className="fixed right-0 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5" aria-label="Quick tools">
      {showStats && (
        <Tab onClick={() => openQuickStats()} label="Stats" dark>
          <BarChart3 className="w-4 h-4" strokeWidth={2.5} />
        </Tab>
      )}
      <Tab onClick={() => openHelpAssistant()} label="Help">
        <MessageCircleQuestion className="w-4 h-4" strokeWidth={2.5} />
      </Tab>
    </div>
  );
}

function Tab({
  onClick, label, dark, children,
}: {
  onClick: () => void;
  label: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`Open ${label.toLowerCase()}`}
      className={cn(
        "group flex flex-col items-center gap-2 w-10 py-3.5 rounded-l-2xl shadow-[-6px_8px_24px_-12px_rgba(0,0,0,0.45)]",
        "translate-x-1 hover:translate-x-0 hover:w-11 transition-all cursor-pointer",
        dark ? "bg-gray-950 text-white hover:bg-brand-900" : "bg-brand-700 text-white hover:bg-brand-800"
      )}
    >
      <span className="w-6 h-6 rounded-full bg-lime text-gray-950 flex items-center justify-center">{children}</span>
      <span className="text-xs font-bold tracking-wide [writing-mode:vertical-rl] rotate-180">{label}</span>
    </button>
  );
}
