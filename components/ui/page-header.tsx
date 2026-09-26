import { cn } from "@/lib/utils";

/**
 * The top of every main page: title, one-line subtitle, and optional actions on
 * the right. One size for every page, so moving between them doesn't jump.
 */
export function PageHeader({
  title, subtitle, eyebrow, actions, className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Small label above the title, e.g. a count badge. */
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="text-2xl sm:text-[28px] leading-tight font-extrabold tracking-tight text-gray-950">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Header buttons, so every page's actions are the same size. */
export const headerButton = {
  primary:
    "inline-flex items-center gap-2 h-10 px-4 rounded-full bg-brand-700 text-white text-sm font-bold hover:bg-brand-800 transition-colors cursor-pointer",
  secondary:
    "inline-flex items-center gap-2 h-10 px-4 rounded-full border border-gray-300 bg-white text-gray-800 text-sm font-bold hover:border-gray-950 transition-colors cursor-pointer",
  ghost:
    "inline-flex items-center gap-2 h-10 px-3 rounded-full text-gray-600 text-sm font-bold hover:text-gray-950 transition-colors cursor-pointer",
};
