import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** White rounded panel every dashboard block sits in. */
export function Panel({
  title, action, className, children,
}: {
  title?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-3xl bg-white p-6", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-5">
          {title && <h2 className="text-lg font-bold text-gray-950">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** 6.png's stat tile; `featured` is the solid green one that leads the row. */
export function StatCard({
  label, value, note, href, featured,
}: {
  label: string;
  value: number | string;
  note: string;
  href: string;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group rounded-3xl p-6 flex flex-col gap-5 transition-shadow hover:shadow-lg",
        featured
          ? "bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white"
          : "bg-white text-gray-950"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[17px] font-semibold">{label}</p>
        <span
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:rotate-45",
            featured ? "bg-white text-brand-800" : "border border-gray-300 text-gray-700"
          )}
        >
          <ArrowUpRight className="w-5 h-5" />
        </span>
      </div>
      <p className="text-5xl font-extrabold tracking-tight tabular-nums">{value}</p>
      <p className={cn("text-sm", featured ? "text-lime-200" : "text-gray-500")}>{note}</p>
    </Link>
  );
}

export function PillLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-gray-300 text-sm font-semibold text-gray-800 hover:border-gray-950 transition-colors"
    >
      {children}
    </Link>
  );
}
