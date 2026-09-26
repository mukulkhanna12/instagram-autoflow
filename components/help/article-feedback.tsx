"use client";
import { useState } from "react";
import { Instagram, ThumbsDown, ThumbsUp } from "lucide-react";
import { SUPPORT } from "@/lib/help/articles";
import { AskAssistantButton } from "./ask-assistant-button";

export function ArticleFeedback() {
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  return (
    <div className="mt-12 rounded-2xl bg-[#f3f5ef] p-5">
      {vote === null && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-bold">Was this article helpful?</p>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setVote("up")} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold ring-1 ring-gray-200 hover:ring-brand-500 cursor-pointer">
              <ThumbsUp className="h-4 w-4" /> Yes
            </button>
            <button onClick={() => setVote("down")} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold ring-1 ring-gray-200 hover:ring-red-400 cursor-pointer">
              <ThumbsDown className="h-4 w-4" /> No
            </button>
          </div>
        </div>
      )}
      {vote === "up" && <p className="font-bold text-brand-800">Thanks! Glad it helped. 🎉</p>}
      {vote === "down" && (
        <div className="space-y-3">
          <p className="font-bold">Sorry this didn&apos;t solve it.</p>
          <div className="flex flex-wrap gap-2">
            <AskAssistantButton label="Ask the assistant" />
            <a
              href={SUPPORT.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold ring-1 ring-gray-200 hover:ring-gray-400"
            >
              <Instagram className="h-4 w-4 text-pink-600" /> Message @{SUPPORT.instagram}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
