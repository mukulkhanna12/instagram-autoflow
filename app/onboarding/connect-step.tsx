"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, Check, Clock, LogIn, X } from "lucide-react";
import { AvatarRing, OnboardingShell, StepHeading } from "@/components/onboarding/steps";
import { isValidUsername, normalizeUsername, TYPED_USERNAME_KEY } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

const ERRORS: Record<string, string> = {
  instagram_auth_failed: "Instagram login was cancelled or didn't complete. Try again.",
  no_instagram: "We couldn't read that Instagram account. Make sure it's a Creator or Business account.",
  account_taken: "That Instagram account is already connected to another AutoFlow user.",
  unknown: "Something went wrong connecting Instagram. Please try again.",
};

const CHECKS = [
  { icon: BadgeCheck, title: "Creator or Business", body: "Personal accounts can't send automated DMs" },
  { icon: LogIn, title: "Logged in here", body: "Instagram connects whoever is signed in on this browser" },
  { icon: Clock, title: "Takes 30 seconds", body: "You'll come straight back to this page" },
];

const CAN = ["Read comments on your reels", "Reply to the comments you choose", "Send the DMs you write", "Check if a commenter follows you"];
const CANNOT = ["See your password", "Post reels or stories", "Read your other DMs", "Follow or unfollow anyone"];

/** Step 1 — choose the account, then hand off to Instagram's own login. */
export function ConnectStep({ error }: { error: string | null }) {
  const [username, setUsername] = useState("");
  const [touched, setTouched] = useState(false);
  const [going, setGoing] = useState(false);

  // Coming back after a failed attempt: keep what they typed.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(TYPED_USERNAME_KEY);
      if (saved) setUsername(saved);
    } catch {}
  }, []);

  const handle = normalizeUsername(username);
  const valid = isValidUsername(handle);

  function connect(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    try {
      sessionStorage.setItem(TYPED_USERNAME_KEY, handle);
    } catch {}
    setGoing(true);
    // A full navigation, not fetch: the route answers with a redirect to Instagram.
    window.location.href = "/api/instagram/connect?from=onboarding";
  }

  return (
    <OnboardingShell step={1} rail={<LivePreview handle={handle} />}>
      <StepHeading step={1} title="Which Instagram should reply for you?">
        We&apos;ll open Instagram&apos;s own login. Your password stays with Instagram — we never see it.
      </StepHeading>

      <ul className="grid sm:grid-cols-3 gap-2.5">
        {CHECKS.map((c) => (
          <li key={c.title} className="flex gap-2.5 rounded-2xl border border-gray-200 p-3.5">
            <span className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 grid place-items-center shrink-0">
              <c.icon className="w-4 h-4" />
            </span>
            <span className="text-[13px] leading-snug">
              <span className="block font-bold text-gray-950">{c.title}</span>
              <span className="text-gray-500">{c.body}</span>
            </span>
          </li>
        ))}
      </ul>

      <form onSubmit={connect} className="space-y-5">
        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
            {ERRORS[error] ?? ERRORS.unknown}
          </p>
        )}
        <div>
          <label htmlFor="ig-handle" className="block text-sm font-bold text-gray-950 mb-2">
            Your Instagram profile
          </label>
          <div
            className={cn(
              "flex items-stretch rounded-2xl border-[1.5px] bg-white overflow-hidden transition-shadow",
              touched && !valid
                ? "border-red-400"
                : "border-gray-200 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100"
            )}
          >
            <span className="flex items-center px-3.5 bg-gray-50 border-r border-gray-200 text-gray-500 font-mono text-[15px] select-none">
              instagram.com/
            </span>
            <input
              id="ig-handle"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="your_handle"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 min-w-0 px-3.5 py-4 text-base font-semibold text-gray-950 outline-none focus-visible:outline-none placeholder:text-gray-400 placeholder:font-normal"
            />
          </div>
          <p className={cn("text-[13px] mt-2", touched && !valid ? "text-red-600" : "text-gray-500")}>
            {touched && !valid
              ? "Enter your handle — letters, numbers, dots and underscores."
              : "A handle, an @handle, or a pasted profile link all work."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={going}
            className="inline-flex items-center gap-2.5 h-14 px-6 rounded-2xl bg-brand-700 text-white text-[15.5px] font-extrabold hover:bg-brand-800 disabled:opacity-60 cursor-pointer transition-colors"
          >
            {going ? "Opening Instagram…" : "Connect with Instagram"}
            <span className="rounded-lg bg-lime text-brand-900 px-1.5 py-0.5">
              <ArrowRight className="w-4 h-4" />
            </span>
          </button>
          <span className="text-[13px] text-gray-500">Opens instagram.com in this tab</span>
        </div>
      </form>

      <details open className="group border-t border-gray-200 pt-5">
        <summary className="flex items-center justify-between cursor-pointer list-none text-sm font-bold text-gray-950">
          What AutoFlow can and can&apos;t do
          <span className="text-gray-400 text-lg leading-none group-open:rotate-45 transition-transform">+</span>
        </summary>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mt-4 text-[13.5px] text-gray-700">
          <ul className="space-y-2">
            {CAN.map((t) => (
              <li key={t} className="flex gap-2"><Check className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" strokeWidth={3} />{t}</li>
            ))}
          </ul>
          <ul className="space-y-2">
            {CANNOT.map((t) => (
              <li key={t} className="flex gap-2"><X className="w-4 h-4 text-red-600 shrink-0 mt-0.5" strokeWidth={3} />{t}</li>
            ))}
          </ul>
        </div>
      </details>
    </OnboardingShell>
  );
}

/** The rail's mini Instagram card — fills in with the handle as it's typed. */
function LivePreview({ handle }: { handle: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-lime mb-2.5">Live preview</p>
      <div className="rounded-2xl bg-white text-gray-950 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
        <div className="flex items-center gap-3">
          <AvatarRing letter={(handle[0] ?? "?").toUpperCase()} />
          <div className="min-w-0">
            <p className="text-[14.5px] font-bold truncate">
              {handle || <span className="text-gray-400 font-medium">your_handle</span>}
              <span aria-hidden className="inline-block w-0.5 h-4 bg-gray-950 align-[-2px] ml-px motion-safe:animate-pulse" />
            </p>
            <p className="text-xs text-gray-500">Your reels · answered automatically</p>
          </div>
        </div>
        <div className="mt-3.5 flex flex-col gap-1.5 text-[13px]">
          <span className="self-start max-w-[82%] rounded-2xl rounded-bl-md bg-gray-100 px-3 py-2">LINK please! 🙏</span>
          <span className="self-end max-w-[82%] rounded-2xl rounded-br-md bg-brand-600 text-white px-3 py-2">Sent you a DM! 📩</span>
        </div>
      </div>
    </div>
  );
}
