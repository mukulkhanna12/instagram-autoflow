"use client";
import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A small ⓘ button that opens a short explanation. Click (or tap) to open —
 * works on phones, unlike a hover-only tooltip. Closes on outside click or Escape.
 */
export function InfoTip({
  title, children, align = "left", className,
}: {
  title: string;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <span ref={ref} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen((v) => !v); }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={`What is this? ${title}`}
        aria-expanded={open}
        className="w-5 h-5 rounded-full text-gray-400 hover:text-brand-700 hover:bg-lime-100 flex items-center justify-center cursor-pointer"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span
          role="note"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute top-7 z-[70] w-72 rounded-2xl bg-gray-950 text-white p-4 text-left shadow-2xl normal-case tracking-normal",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          <span className="block text-sm font-bold">{title}</span>
          <span className="mt-1.5 block text-[13px] leading-relaxed text-white/75 font-normal">{children}</span>
        </span>
      )}
    </span>
  );
}
