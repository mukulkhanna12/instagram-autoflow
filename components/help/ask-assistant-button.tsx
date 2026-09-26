"use client";
import { Sparkles } from "lucide-react";
import { openHelpAssistant } from "./help-assistant";
import { cn } from "@/lib/utils";

export function AskAssistantButton({ className, label = "Ask the assistant" }: { className?: string; label?: string }) {
  return (
    <button
      onClick={() => openHelpAssistant()}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full bg-lime px-4 text-sm font-bold text-gray-950 hover:bg-lime-400 cursor-pointer",
        className
      )}
    >
      <Sparkles className="h-4 w-4" /> {label}
    </button>
  );
}
