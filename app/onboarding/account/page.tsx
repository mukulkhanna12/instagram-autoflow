"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertTriangle, AtSign, CheckCircle2, Instagram, Loader2 } from "lucide-react";
import { OnboardingHeading, OnboardingSteps } from "@/components/onboarding/steps";
import { TYPED_USERNAME_KEY } from "@/lib/onboarding";
import { formatNumber } from "@/lib/utils";

interface Account {
  username: string;
  name: string | null;
  profilePicUrl: string | null;
  followersCount: number | null;
  mediaCount: number | null;
}

/**
 * Step 2 — the account Instagram actually connected. Shown after the OAuth
 * round trip because Instagram Login can't look an account up beforehand. If
 * it isn't the handle typed in step 1 (logged in to a different account in the
 * browser, usually), say so before anything is automated on it.
 */
export default function OnboardingAccountPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [typed, setTyped] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    try {
      setTyped(sessionStorage.getItem(TYPED_USERNAME_KEY));
    } catch {}
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((d) => {
        if (!d.account) router.replace("/onboarding");
        else setAccount(d.account);
      })
      .catch(() => router.replace("/onboarding?error=unknown"));
  }, [router]);

  async function useDifferentAccount() {
    setSwitching(true);
    // A soft disconnect; nothing is lost if they come back to this one.
    await fetch("/api/instagram/disconnect", { method: "DELETE" });
    router.replace("/onboarding");
  }

  const mismatch = !!account && !!typed && typed !== account.username.toLowerCase();
  const stats = account
    ? [
        account.followersCount != null && `${formatNumber(account.followersCount)} followers`,
        account.mediaCount != null && `${account.mediaCount} posts`,
      ].filter(Boolean).join(" · ")
    : "";

  return (
    <>
      <OnboardingSteps current={2} />
      <OnboardingHeading title={<>Connect your Creator or<br className="hidden sm:block" /> Business Instagram</>}>
        Instagram connected. Check this is the account you want to automate.
      </OnboardingHeading>

      <div className="w-full max-w-xl mt-14 space-y-6">
        {!account ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 text-brand-600 animate-spin" />
          </div>
        ) : (
          <>
            <div>
              <span className="block font-bold text-gray-950 mb-3">Your Instagram username</span>
              <div className="flex items-center gap-3 h-16 px-5 rounded-2xl border-2 border-gray-950 bg-white">
                <AtSign className="w-5 h-5 text-gray-400 shrink-0" />
                <span className="text-lg text-gray-950">{typed ?? account.username}</span>
              </div>
            </div>

            <div className="rounded-3xl border-2 border-emerald-500 p-6 sm:p-7">
              <p className="flex items-center gap-2.5 font-bold text-gray-950">
                <CheckCircle2 className="w-6 h-6 text-white fill-emerald-500" /> Account found
              </p>
              <div className="flex items-center gap-4 mt-5">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
                  {account.profilePicUrl ? (
                    <Image src={account.profilePicUrl} alt="" fill unoptimized className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-gray-400">
                      {account.username[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-extrabold text-gray-950 truncate">
                    {account.name || `@${account.username}`}
                  </p>
                  {account.name && <p className="text-gray-600">@{account.username}</p>}
                  {stats && <p className="text-gray-400 text-sm mt-0.5">{stats}</p>}
                </div>
              </div>
            </div>

            {mismatch && (
              <div className="flex gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <p>
                  You typed <strong>@{typed}</strong>, but Instagram connected{" "}
                  <strong>@{account.username}</strong> — the account logged in to this browser. Continue
                  with it, or log in to @{typed} on instagram.com and connect again.
                </p>
              </div>
            )}

            <button
              onClick={() => router.push("/onboarding/questions")}
              className="w-full h-16 rounded-full bg-lime text-gray-950 text-lg font-extrabold flex items-center justify-center gap-3 hover:bg-lime-400 shadow-[inset_0_-3px_0_rgba(0,0,0,0.1)] cursor-pointer transition-colors"
            >
              <Instagram className="w-5 h-5" /> Continue as @{account.username}
            </button>
            <button
              onClick={useDifferentAccount}
              disabled={switching}
              className="w-full text-sm font-medium text-gray-500 hover:text-gray-900 disabled:opacity-50 cursor-pointer"
            >
              {switching ? "Disconnecting…" : "Use a different account"}
            </button>
          </>
        )}
      </div>
    </>
  );
}
