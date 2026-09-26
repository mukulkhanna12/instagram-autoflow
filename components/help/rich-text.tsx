import Link from "next/link";
import { AlertTriangle, Lightbulb } from "lucide-react";
import { headingId, type Block } from "@/lib/help/articles";

const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

/** **bold**, *italic*, `code` and [links](/path) — the only markup articles use. */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        if (part.startsWith("**")) return <strong key={i} className="font-bold text-gray-950">{part.slice(2, -2)}</strong>;
        if (part.startsWith("`")) {
          return <code key={i} className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[0.9em] font-semibold text-brand-800">{part.slice(1, -1)}</code>;
        }
        if (part.startsWith("[")) {
          const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)!;
          const [, label, href] = m;
          const cls = "font-semibold text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-700";
          return href.startsWith("/") ? (
            <Link key={i} href={href} className={cls}>{label}</Link>
          ) : (
            <a key={i} href={href} target="_blank" rel="noopener noreferrer" className={cls}>{label}</a>
          );
        }
        if (part.startsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
        return part;
      })}
    </>
  );
}

export function ArticleBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-5 text-[16px] leading-relaxed text-gray-700">
      {blocks.map((b, i) => {
        if ("h" in b) {
          return (
            <h2 key={i} id={headingId(b.h)} className="group scroll-mt-28 pt-6 text-[1.35rem] font-extrabold tracking-tight text-gray-950">
              <a href={`#${headingId(b.h)}`} className="hover:text-brand-800">
                {b.h}
                <span className="ml-2 text-lime-500 opacity-0 transition-opacity group-hover:opacity-100">#</span>
              </a>
            </h2>
          );
        }
        if ("p" in b) return <p key={i}><Inline text={b.p} /></p>;
        if ("steps" in b) {
          return (
            <ol key={i} className="rounded-2xl bg-[#f7f8f5] p-5 ring-1 ring-gray-100 sm:p-6">
              {b.steps.map((s, j) => (
                <li key={j} className="relative flex gap-4 pb-5 last:pb-0">
                  {/* The rail joining one step to the next. */}
                  {j < b.steps.length - 1 && <span className="absolute left-[13px] top-8 bottom-1 w-0.5 rounded-full bg-lime-300" />}
                  <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lime text-[13px] font-extrabold text-gray-950 ring-4 ring-[#f7f8f5]">
                    {j + 1}
                  </span>
                  <span className="pt-0.5"><Inline text={s} /></span>
                </li>
              ))}
            </ol>
          );
        }
        if ("list" in b) {
          return (
            <ul key={i} className="space-y-2.5">
              {b.list.map((s, j) => (
                <li key={j} className="flex gap-3">
                  <span className="mt-[0.55em] h-2 w-2 shrink-0 rounded-[3px] bg-lime-400 ring-2 ring-lime-100" />
                  <span><Inline text={s} /></span>
                </li>
              ))}
            </ul>
          );
        }
        const tip = "tip" in b;
        return (
          <div
            key={i}
            className={`flex gap-3 rounded-2xl border p-4 text-[15px] ${
              tip ? "border-brand-100 bg-brand-50 text-brand-900" : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {tip ? <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />}
            <p><Inline text={tip ? b.tip : (b as { warn: string }).warn} /></p>
          </div>
        );
      })}
    </div>
  );
}
