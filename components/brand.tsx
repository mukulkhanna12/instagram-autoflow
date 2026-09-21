import Link from "next/link";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/** The AutoFlow mark: a lime tile with a deep-green bolt. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-lime text-brand-900 shrink-0",
        "w-9 h-9",
        className
      )}
    >
      <Zap className="w-[55%] h-[55%] fill-brand-900" />
    </span>
  );
}

export function Logo({ href = "/", className }: { href?: string | null; className?: string }) {
  const inner = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-lg font-extrabold tracking-tight text-gray-950">AutoFlow</span>
    </span>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}

export function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12Z"
      />
    </svg>
  );
}
