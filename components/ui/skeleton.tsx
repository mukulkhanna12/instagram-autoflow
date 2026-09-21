import { cn } from "@/lib/utils";

/**
 * A grey placeholder in the shape of content that hasn't arrived yet. Size it
 * with classes (`h-4 w-32`, `rounded-full`…) to match what it stands in for.
 */
export function Skeleton({
  className, onDark, style,
}: {
  className?: string;
  onDark?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden
      style={style}
      className={cn("block rounded-lg", onDark ? "skeleton-on-dark" : "skeleton", className)}
    />
  );
}

/** Wraps a loading region so screen readers hear "Loading" once, not the shapes. */
export function Loading({ label = "Loading", className, children }: { label?: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
