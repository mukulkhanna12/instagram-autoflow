"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Zap, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Step = "email" | "code";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

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
      // Always advances — the response is deliberately identical whether or not
      // the address is allow-listed, so a code only actually arrives for yours.
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-200">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to AutoFlow</h1>
          <p className="text-gray-500 text-sm mt-2">
            {step === "email"
              ? "Sign in to manage your Instagram automations"
              : "Enter the 6-digit code we emailed you"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {step === "email" ? (
            <form onSubmit={requestCode} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error ?? undefined}
              />
              <Button type="submit" className="w-full" loading={loading}>
                <Mail className="w-4 h-4" /> Email me a login code
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="space-y-4">
              {devCode && (
                <button
                  type="button"
                  onClick={() => setCode(devCode)}
                  className="w-full text-left bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-amber-100 transition-colors"
                >
                  <p className="text-xs text-amber-700">
                    Demo mode — no email is set up. Your code is{" "}
                    <span className="font-bold tracking-wider">{devCode}</span>. Tap to fill.
                  </p>
                </button>
              )}
              <Input
                label="Login code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                placeholder="123456"
                className="tracking-[0.5em] text-center text-lg font-semibold"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                error={error ?? undefined}
                hint={`Sent to ${email}`}
              />
              <Button type="submit" className="w-full" loading={loading}>
                Verify & sign in
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                }}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" /> Use a different email
              </button>
            </form>
          )}

          <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
            Access is restricted to the account owner's email.
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Free forever · No credit card required
        </p>
      </div>
    </div>
  );
}
