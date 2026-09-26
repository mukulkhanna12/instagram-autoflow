"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ArrowRight, MessageCircleQuestion } from "lucide-react";
import { searchArticles } from "@/lib/help/search";
import { categoryById } from "@/lib/help/articles";
import { openHelpAssistant } from "./help-assistant";
import { cn } from "@/lib/utils";

/** Search-as-you-type over the articles; Enter opens the top hit. */
export function HelpSearch({ size = "lg", autoFocus }: { size?: "lg" | "md"; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const hits = useMemo(() => searchArticles(q, 6), [q]);
  const open = q.trim().length > 0;

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && hits[active]) router.push(`/help/${hits[active].article.slug}`);
    else if (e.key === "Escape") setQ("");
  }

  return (
    <div className="relative w-full">
      <div
        className={cn(
          "flex items-center gap-3 rounded-full bg-white ring-1 ring-gray-200 focus-within:ring-2 focus-within:ring-brand-500 shadow-sm",
          size === "lg" ? "h-16 pl-6 pr-2" : "h-12 pl-5 pr-2"
        )}
      >
        <Search className={cn("shrink-0 text-gray-400", size === "lg" ? "h-5 w-5" : "h-4 w-4")} />
        <input
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => { setQ(e.target.value); setActive(0); }}
          onKeyDown={onKey}
          placeholder={size === "lg" ? "Search for answers… e.g. “DM not received”" : "Search help…"}
          aria-label="Search help articles"
          className={cn("min-w-0 flex-1 bg-transparent outline-none placeholder:text-gray-400", size === "lg" ? "text-lg" : "text-[15px]")}
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-3xl bg-white text-left shadow-xl ring-1 ring-gray-100">
          {hits.length === 0 ? (
            <div className="p-5 text-sm text-gray-500">
              No articles match “{q}”.{" "}
              <button onClick={() => openHelpAssistant(q)} className="font-semibold text-brand-700 hover:underline cursor-pointer">
                Ask the assistant
              </button>{" "}
              instead.
            </div>
          ) : (
            <ul className="py-2">
              {hits.map((h, i) => (
                <li key={h.article.slug}>
                  <Link
                    href={`/help/${h.article.slug}`}
                    onMouseEnter={() => setActive(i)}
                    className={cn("flex items-center gap-4 px-5 py-3", i === active && "bg-[#f3f5ef]")}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-gray-950">{h.article.title}</p>
                      <p className="truncate text-sm text-gray-500">
                        <span className="font-semibold text-brand-700">{categoryById(h.article.category)?.title}</span>
                        {" · "}{h.article.summary}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-gray-300" />
                  </Link>
                </li>
              ))}
              <li className="border-t border-gray-100 mt-1">
                <button
                  onClick={() => openHelpAssistant(q)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-[#f3f5ef] cursor-pointer"
                >
                  <MessageCircleQuestion className="h-4 w-4 text-brand-600" /> Ask the assistant: “{q}”
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
