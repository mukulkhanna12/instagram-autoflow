import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/brand";

const STEPS = [
  { title: "Connect Instagram", hint: "Pick the account that will reply" },
  { title: "Confirm it's you", hint: "Check the account and what's switched on" },
  { title: "A little about you", hint: "Four taps, then you're in" },
];

/**
 * Split-screen onboarding: a dark progress rail on the left (with whatever the
 * step wants to show under it — a live preview, a note), the task on the right.
 * On a phone the rail collapses to a slim progress strip across the top.
 */
export function OnboardingShell({
  step,
  doneHint,
  rail,
  children,
}: {
  step: 1 | 2 | 3;
  /** Replaces a finished step's hint, e.g. "@handle via Instagram login". */
  doneHint?: Partial<Record<1 | 2, string>>;
  rail?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[400px_1fr] xl:grid-cols-[440px_1fr]">
      {/* Phone: logo + progress strip */}
      <div className="lg:hidden bg-brand-900 px-5 py-4 flex items-center gap-3">
        <LogoMark className="w-8 h-8" />
        <span className="text-sm font-semibold text-white">Step {step} of 3</span>
        <div className="ml-auto flex gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn("h-1.5 w-8 rounded-full", i + 1 < step ? "bg-brand-400" : i + 1 === step ? "bg-lime" : "bg-white/20")}
            />
          ))}
        </div>
      </div>

      {/* Desktop rail. The green runs the full height of a long page; its contents stay pinned. */}
      <aside className="hidden lg:block bg-brand-900 text-white relative overflow-hidden">
        <div className="sticky top-0 h-screen flex flex-col gap-10 px-9 py-9">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-32 -bottom-32 w-96 h-96 rounded-full bg-[radial-gradient(circle,rgba(220,251,75,0.16),transparent_65%)]"
          />
          <Logo href={null} light />
          <ol className="space-y-1">
            {STEPS.map((s, i) => {
              const n = (i + 1) as 1 | 2 | 3;
              const state = n < step ? "done" : n === step ? "now" : "later";
              return (
                <li key={s.title} className="relative grid grid-cols-[32px_1fr] gap-3.5 py-2.5">
                  {i < STEPS.length - 1 && (
                    <span aria-hidden className="absolute left-[15px] top-11 -bottom-2 w-0.5 bg-white/15" />
                  )}
                  <span
                    className={cn(
                      "w-8 h-8 rounded-full grid place-items-center text-sm font-extrabold border-2",
                      state === "done" && "bg-brand-500 border-brand-500 text-white",
                      state === "now" && "bg-lime border-lime text-brand-900",
                      state === "later" && "border-white/25 text-white/60"
                    )}
                  >
                    {state === "done" ? <Check className="w-4 h-4" strokeWidth={3} /> : n}
                  </span>
                  <span>
                    <span className={cn("block font-bold", state === "later" ? "text-white/55" : "text-white")}>
                      {s.title}
                    </span>
                    <span className="block text-[13px] leading-snug text-white/60">
                      {(state === "done" && doneHint?.[n as 1 | 2]) || s.hint}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
          {rail && <div className="mt-auto relative">{rail}</div>}
        </div>
      </aside>

      {/* The task */}
      <main className="flex flex-col min-h-screen lg:min-h-0">
        <div className="flex-1 w-full max-w-[680px] px-5 sm:px-10 xl:px-14 py-10 lg:py-14 flex flex-col gap-8">
          {children}
        </div>
        <footer className="px-5 sm:px-10 xl:px-14 pb-8 text-xs text-gray-400">
          We connect through Instagram&apos;s official login — we never see your password.{" "}
          <a href="/privacy" className="underline underline-offset-2 hover:text-gray-700">Privacy Policy</a>
        </footer>
      </main>
    </div>
  );
}

export function StepHeading({ step, title, children }: { step: 1 | 2 | 3; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">Step {step} of 3</p>
      <h1 className="mt-2 text-[2.1rem] sm:text-[2.4rem] leading-[1.08] font-extrabold tracking-tight text-gray-950 [text-wrap:balance]">
        {title}
      </h1>
      {children && <p className="mt-3 text-gray-500 text-base sm:text-lg leading-relaxed max-w-[52ch]">{children}</p>}
    </div>
  );
}

/** The Instagram-style avatar ring used in the preview and the profile pass. */
export function AvatarRing({ src, letter, size = "w-12 h-12", text = "text-base" }: { src?: string | null; letter: string; size?: string; text?: string }) {
  return (
    <span className={cn("shrink-0 rounded-full p-[2px] bg-[conic-gradient(from_200deg,#f9ce34,#ee2a7b,#6228d7,#f9ce34)]", size)}>
      <span className={cn("relative block w-full h-full rounded-full border-2 border-white bg-gray-200 overflow-hidden grid place-items-center font-extrabold text-gray-500", text)}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          letter
        )}
      </span>
    </span>
  );
}
