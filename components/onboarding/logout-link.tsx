"use client";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

/** On every onboarding step: leave now, pick up at the same step next time. */
export function OnboardingLogout() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="fixed top-4 right-4 z-40 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white/90 backdrop-blur border border-gray-200 text-xs font-semibold text-gray-600 hover:text-gray-950 hover:border-gray-300 cursor-pointer"
      title="You'll come back to this step when you log in again"
    >
      <LogOut className="w-3.5 h-3.5" /> Log out
    </button>
  );
}
