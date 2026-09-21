"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronsUpDown } from "lucide-react";
import { OnboardingHeading, OnboardingSteps } from "@/components/onboarding/steps";
import { GOAL_OPTIONS, ROLE_OPTIONS, SOURCE_OPTIONS, TYPED_USERNAME_KEY } from "@/lib/onboarding";
import { countryList, guessCountry } from "@/lib/countries";
import { cn } from "@/lib/utils";

/** Step 3 — four quick questions, then on to the dashboard. */
export default function OnboardingQuestionsPage() {
  const router = useRouter();
  const [source, setSource] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [country, setCountry] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Built after mount: Node and the browser name some regions differently
  // ("Hong Kong SAR China" vs "Hong Kong"), which would break hydration.
  const [countries, setCountries] = useState<{ code: string; name: string }[]>([]);
  useEffect(() => {
    const list = countryList(navigator.language);
    setCountries(list);
    const guess = guessCountry();
    if (guess) setCountry(list.find((c) => c.code === guess)?.name ?? "");
  }, []);

  const complete = !!source && !!role && goals.length > 0 && !!country;

  async function finish() {
    if (!complete) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, role, goals, country }),
    });
    if (!res.ok) {
      setSaving(false);
      setError("Couldn't save your answers. Please try again.");
      return;
    }
    try {
      sessionStorage.removeItem(TYPED_USERNAME_KEY);
    } catch {}
    router.push("/dashboard?welcome=1");
    router.refresh();
  }

  return (
    <>
      <OnboardingSteps current={3} />
      <OnboardingHeading title="Before you start">
        4 quick questions to help us shape AutoFlow
      </OnboardingHeading>

      <div className="w-full max-w-3xl mt-14 space-y-12">
        <Question n={1} title="How did you discover us?">
          <Chips options={SOURCE_OPTIONS} selected={source ? [source] : []} onToggle={setSource} />
        </Question>

        <Question n={2} title="What better describes you?">
          <Chips options={ROLE_OPTIONS} selected={role ? [role] : []} onToggle={setRole} />
        </Question>

        <Question n={3} title="What would you like to achieve?" hint="Pick all that apply">
          <Chips
            options={GOAL_OPTIONS}
            selected={goals}
            onToggle={(g) => setGoals((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]))}
          />
        </Question>

        <Question n={4} title="What country are you from?">
          <div className="relative">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={cn(
                "w-full h-16 appearance-none rounded-2xl border-2 border-gray-200 bg-white px-5 pr-12 text-base font-semibold outline-none focus:border-gray-950 cursor-pointer",
                country ? "text-gray-950" : "text-gray-400"
              )}
            >
              <option value="">Select your country</option>
              {countries.map((c) => (
                <option key={c.code} value={c.name}>{c.name}</option>
              ))}
            </select>
            <ChevronsUpDown className="w-5 h-5 text-gray-400 absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </Question>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={finish}
          disabled={!complete || saving}
          className="w-full h-16 rounded-full bg-gray-950 text-white text-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 cursor-pointer disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving…" : "Go to my dashboard"} {!saving && <ArrowRight className="w-5 h-5" />}
        </button>
      </div>
    </>
  );
}

function Question({
  n, title, hint, children,
}: {
  n: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="flex items-baseline gap-3 text-2xl font-extrabold text-gray-950 mb-4">
        <span className="text-gray-400">{n}</span> {title}
        {hint && <span className="text-sm font-medium text-gray-400">{hint}</span>}
      </h2>
      {children}
    </section>
  );
}

function Chips({
  options, selected, onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            aria-pressed={on}
            className={cn(
              "h-14 px-6 rounded-2xl border-2 text-base font-semibold transition-colors cursor-pointer",
              on
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-gray-200 bg-white text-gray-800 hover:border-gray-400"
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
