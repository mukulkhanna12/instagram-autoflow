import { cn } from "@/lib/utils";

const STEPS = ["Connect", "Confirm", "About you"];

/** "Step 2 of 3" as three short bars, the current one lime. */
export function OnboardingSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2 mb-10" aria-label={`Step ${current} of 3`}>
      {STEPS.map((label, i) => (
        <div key={label} className="flex flex-col items-center gap-1.5">
          <span
            className={cn(
              "h-1.5 w-16 rounded-full",
              i + 1 < current ? "bg-brand-600" : i + 1 === current ? "bg-lime-400" : "bg-gray-200"
            )}
          />
          <span className={cn("text-[11px] font-semibold", i + 1 === current ? "text-gray-900" : "text-gray-400")}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function OnboardingHeading({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="text-center max-w-2xl">
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-950 leading-[1.08]">{title}</h1>
      {children && <p className="text-gray-500 text-lg mt-5 leading-relaxed">{children}</p>}
    </div>
  );
}
