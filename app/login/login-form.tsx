"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowLeft, Clock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FacebookIcon, GoogleIcon, Logo } from "@/components/brand";

// "pending" is where a registered-but-unapproved account lands: the code step
// is never reached, because no code was sent. Google and Facebook sign-ins that
// hit the gate come back here with ?pending=<email>.
type Step = "email" | "code" | "pending";

const OAUTH_ERRORS: Record<string, string> = {
  no_email: "That account didn't share an email address, so we can't sign you in with it.",
  OAuthAccountNotLinked: "That email is already linked to a different sign-in method.",
  AccessDenied: "Sign-in was cancelled or refused.",
  busy: "Sign-ups are busy right now. Please try again in an hour.",
};

export function LoginForm({
  providers,
  pendingEmail,
  error: initialError,
}: {
  providers: { google: boolean; facebook: boolean };
  pendingEmail: string | null;
  error: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(pendingEmail ? "pending" : "email");
  const [email, setEmail] = useState(pendingEmail ?? "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [social, setSocial] = useState<"google" | "facebook" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [notReady, setNotReady] = useState<string | null>(null);
  const oauthError = initialError
    ? OAUTH_ERRORS[initialError] ?? "Couldn't sign you in. Please try again."
    : null;

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: null }));
        setError(error ?? "Something went wrong. Please try again.");
        return;
      }
      // In demo mode the API returns the code so it can be shown on-screen.
      const data = await res.json().catch(() => ({}));
      if (data.devCode) setDevCode(data.devCode);
      if (data.status === "pending") {
        setStep("pending");
        return;
      }
      setStep("code");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", { email, code, redirect: false });
      if (res?.error) {
        setError("That code is invalid or expired. Please try again.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Couldn't sign you in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function continueWith(provider: "google" | "facebook") {
    // The buttons always show; until a provider's keys are set there's nothing
    // behind them, so say so here rather than landing on Auth.js's error page.
    if (!providers[provider]) {
      setNotReady(provider === "google" ? "Google" : "Facebook");
      return;
    }
    setNotReady(null);
    setSocial(provider);
    signIn(provider, { callbackUrl: "/dashboard" });
  }

  const backToEmail = () => {
    setStep("email");
    setCode("");
    setError(null);
    router.replace("/login");
  };


  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl w-full mx-auto">
        <Logo />
        <nav className="flex items-center gap-1">
          <Link href="/pricing" className="hidden sm:inline-flex h-10 items-center px-4 rounded-full text-sm font-semibold text-gray-600 hover:text-gray-950 hover:bg-gray-50">
            Pricing
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-gray-200 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-950"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[420px]">
          <div className="text-center mb-8">
            <h1 className="text-[2.5rem] leading-[1.05] font-extrabold tracking-tight text-gray-950">
              Welcome to AutoFlow
            </h1>
            <p className="text-gray-500 mt-4 leading-relaxed">
              {step === "pending"
                ? "Your account is waiting to be approved."
                : step === "code"
                  ? "Enter the 6-digit code we emailed you."
                  : "Reply to comments, send links in DMs and grow your following — on autopilot."}
            </p>
          </div>

          {step === "pending" ? (
            <div className="rounded-3xl border border-gray-200 p-7 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-lime-100 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6 text-brand-700" />
              </div>
              <div>
                <p className="font-bold text-gray-950">Approval pending</p>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  We&apos;ve registered <span className="font-semibold text-gray-800">{email}</span>.
                  Once it&apos;s approved, come back and sign in again to set up your account.
                </p>
              </div>
              <button
                type="button"
                onClick={backToEmail}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Use a different account
              </button>
            </div>
          ) : step === "email" ? (
            <div className="space-y-3">
              {oauthError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                  {oauthError}
                </p>
              )}

              {notReady && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                  {notReady} sign-in isn&apos;t switched on yet. Use your email below for now.
                </p>
              )}

              <button
                type="button"
                onClick={() => continueWith("google")}
                disabled={!!social}
                className="w-full h-14 rounded-full border-2 border-gray-950 bg-white text-gray-950 font-bold flex items-center justify-center gap-3 hover:bg-gray-50 disabled:opacity-60 cursor-pointer transition-colors"
              >
                <GoogleIcon className="w-5 h-5" />
                {social === "google" ? "Opening Google…" : "Continue with Google"}
              </button>
              <button
                type="button"
                onClick={() => continueWith("facebook")}
                disabled={!!social}
                className="w-full h-14 rounded-full bg-[#1877F2] text-white font-bold flex items-center justify-center gap-3 hover:bg-[#166fe0] disabled:opacity-60 cursor-pointer transition-colors"
              >
                <FacebookIcon className="w-5 h-5" />
                {social === "facebook" ? "Opening Facebook…" : "Continue with Facebook"}
              </button>

              <div className="flex items-center gap-3 py-3 text-xs font-medium uppercase tracking-wider text-gray-400">
                <span className="h-px flex-1 bg-gray-200" /> or use email <span className="h-px flex-1 bg-gray-200" />
              </div>

              <form onSubmit={requestCode} className="space-y-3">
                <Input
                  aria-label="Email address"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={error ?? undefined}
                  className="h-14 rounded-2xl px-5 text-base"
                />
                <Button type="submit" variant="dark" className="w-full h-14 text-base" loading={loading}>
                  <Mail className="w-4 h-4" /> Email me a login code
                </Button>
              </form>
            </div>
          ) : (
            <form onSubmit={verifyCode} className="space-y-3">
              {devCode && (
                <button
                  type="button"
                  onClick={() => setCode(devCode)}
                  className="w-full text-left bg-lime-50 border border-lime-300 rounded-2xl px-4 py-3 cursor-pointer hover:bg-lime-100 transition-colors"
                >
                  <p className="text-xs text-gray-700">
                    Demo mode — no email is set up. Your code is{" "}
                    <span className="font-bold tracking-wider">{devCode}</span>. Tap to fill.
                  </p>
                </button>
              )}
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                placeholder="123456"
                className="h-14 rounded-2xl tracking-[0.5em] text-center text-xl font-bold"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                error={error ?? undefined}
                hint={`Sent to ${email}`}
              />
              <Button type="submit" variant="dark" className="w-full h-14 text-base" loading={loading}>
                Verify & sign in
              </Button>
              <button
                type="button"
                onClick={backToEmail}
                className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 pt-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Use a different email
              </button>
            </form>
          )}

          <p className="text-center text-xs text-gray-400 mt-8 leading-relaxed">
            Anyone can sign up — new accounts are switched on after approval.
          </p>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-gray-400">
        By continuing you agree to our{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-gray-700">
          Privacy Policy
        </Link>
        .
      </footer>
    </div>
  );
}
