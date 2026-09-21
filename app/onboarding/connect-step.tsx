"use client";

import { useEffect, useState } from "react";
import { AtSign, Instagram } from "lucide-react";
import { OnboardingHeading, OnboardingSteps } from "@/components/onboarding/steps";
import { isValidUsername, normalizeUsername, TYPED_USERNAME_KEY } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

const ERRORS: Record<string, string> = {
  instagram_auth_failed: "Instagram login was cancelled or didn't complete. Try again.",
  no_instagram: "We couldn't read that Instagram account. Make sure it's a Creator or Business account.",
  account_taken: "That Instagram account is already connected to another AutoFlow user.",
  unknown: "Something went wrong connecting Instagram. Please try again.",
};

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
    <>
      <OnboardingSteps current={1} />
      <OnboardingHeading title={<>Connect your Creator or<br className="hidden sm:block" /> Business Instagram</>}>
        We connect through Instagram&apos;s official login — make sure you&apos;re logged in to your
        Creator or Business account in this browser.{" "}
        <a
          href="https://help.instagram.com/502981923235522"
          target="_blank"
          rel="noreferrer"
          className="text-gray-900 underline underline-offset-4"
        >
          Need help?
        </a>
      </OnboardingHeading>

      <form onSubmit={connect} className="w-full max-w-xl mt-14 space-y-5">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
            {ERRORS[error] ?? ERRORS.unknown}
          </p>
        )}
        <label className="block">
          <span className="block font-bold text-gray-950 mb-3">Your Instagram username</span>
          <span
            className={cn(
              "flex items-center gap-3 h-16 px-5 rounded-2xl border-2 bg-white transition-shadow focus-within:ring-4 focus-within:ring-lime-200",
              touched && !valid ? "border-red-400" : "border-gray-950"
            )}
          >
            <AtSign className="w-5 h-5 text-gray-400 shrink-0" />
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="your_username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 min-w-0 bg-transparent text-lg outline-none focus-visible:outline-none placeholder:text-gray-400"
            />
          </span>
          {touched && !valid && (
            <span className="block text-sm text-red-600 mt-2">
              Enter your handle — letters, numbers, dots and underscores only.
            </span>
          )}
        </label>

        <button
          type="submit"
          disabled={going}
          className="w-full h-16 rounded-full bg-gray-950 text-white text-lg font-bold flex items-center justify-center gap-3 hover:bg-gray-800 disabled:opacity-60 cursor-pointer transition-colors"
        >
          <Instagram className="w-5 h-5" />
          {going ? "Opening Instagram…" : "Continue with Instagram"}
        </button>
        <p className="text-center text-sm text-gray-400">
          Instagram will ask you to approve access. You&apos;ll come straight back here.
        </p>
      </form>
    </>
  );
}
