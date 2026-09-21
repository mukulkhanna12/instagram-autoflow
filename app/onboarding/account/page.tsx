"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, RefreshCw, X } from "lucide-react";
import { AvatarRing, OnboardingShell, StepHeading } from "@/components/onboarding/steps";
import { Loading, Skeleton } from "@/components/ui/skeleton";
import { TYPED_USERNAME_KEY } from "@/lib/onboarding";
import { cn, formatNumber } from "@/lib/utils";

interface Account {
  username: string;
  name: string | null;
  profilePicUrl: string | null;
  followersCount: number | null;
  mediaCount: number | null;
  accountType: string | null;
  /** Webhook fields Instagram reports as subscribed; null = couldn't be read. */
  subscribedFields: string[] | null;
}

const ACCOUNT_TYPES: Record<string, string> = {
  BUSINESS: "Business account",
  MEDIA_CREATOR: "Creator account",
  PERSONAL: "Personal account",
};

/**
 * Step 2 — the account Instagram actually connected, shown as a profile pass,
 * plus a ready check read back from Instagram: are comment alerts and DM taps
 * really switched on, and is it an account type that can send DMs at all.
 */
export default function OnboardingAccountPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [typed, setTyped] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [retrying, setRetrying] = useState(false);

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

  const retrySubscribe = useCallback(async () => {
    setRetrying(true);
    try {
      const res = await fetch("/api/instagram/resubscribe", { method: "POST" });
      const { subscribedFields } = await res.json();
      setAccount((a) => (a ? { ...a, subscribedFields } : a));
    } finally {
      setRetrying(false);
    }
  }, []);

  async function switchAccount() {
    setSwitching(true);
    // A soft disconnect; nothing is lost if they come back to this one.
    await fetch("/api/instagram/disconnect", { method: "DELETE" });
    router.replace("/onboarding");
  }

  const mismatch = !!account && !!typed && typed !== account.username.toLowerCase();

  return (
    <OnboardingShell
      step={2}
      doneHint={{ 1: account ? `@${account.username} via Instagram login` : undefined }}
      rail={
        <p className="text-[13.5px] leading-relaxed text-white/70">
          <b className="text-white">Why confirm?</b> Instagram connects whichever account is logged in on
          this browser. It isn&apos;t always the one you meant, so check before anything replies on its behalf.
        </p>
      }
    >
      <StepHeading step={2} title="Is this the account you want to automate?" />

      {!account ? (
        <PassSkeleton />
      ) : (
        <>
          <ProfilePass account={account} />
          <ReadyCheck account={account} onRetry={retrySubscribe} retrying={retrying} />

          {mismatch && (
            <div className="flex gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-[13.5px] text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <p>
                You typed <b>@{typed}</b>, but Instagram connected <b>@{account.username}</b> — the account
                logged in on this browser. To use @{typed}: log out of @{account.username} on instagram.com,
                log in as @{typed}, then choose <b>Switch account</b>.
              </p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={() => router.push("/onboarding/questions")}
              className="text-left rounded-2xl border-[1.5px] border-brand-700 bg-brand-700 text-white px-5 py-4 hover:bg-brand-800 hover:border-brand-800 cursor-pointer transition-colors"
            >
              <span className="block font-extrabold">Yes, use @{account.username}</span>
              <span className="block text-[13px] text-white/75">Continue to the last step</span>
            </button>
            <button
              onClick={switchAccount}
              disabled={switching}
              className="text-left rounded-2xl border-[1.5px] border-gray-200 px-5 py-4 hover:border-gray-950 disabled:opacity-60 cursor-pointer transition-colors"
            >
              <span className="block font-extrabold text-gray-950">
                {switching ? "Disconnecting…" : "No, switch account"}
              </span>
              <span className="block text-[13px] text-gray-500">
                Log in to the right one on instagram.com, then connect again
              </span>
            </button>
          </div>
        </>
      )}
    </OnboardingShell>
  );
}

function ProfilePass({ account }: { account: Account }) {
  const stats = [
    account.followersCount != null && { v: formatNumber(account.followersCount), l: "followers" },
    account.mediaCount != null && { v: String(account.mediaCount), l: "posts" },
  ].filter(Boolean) as { v: string; l: string }[];
  const type = account.accountType ? ACCOUNT_TYPES[account.accountType] : null;

  return (
    <div className="relative grid grid-cols-[auto_1fr] gap-5 items-center rounded-3xl border border-gray-200 bg-gradient-to-br from-gray-50 to-brand-50/60 p-5 sm:p-6">
      <span className="absolute top-4 right-4 rotate-3 rounded-full bg-lime px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-900">
        Connected
      </span>
      <AvatarRing
        src={account.profilePicUrl}
        letter={account.username[0]?.toUpperCase() ?? "?"}
        size="w-20 h-20 sm:w-24 sm:h-24"
        text="text-3xl"
      />
      <div className="min-w-0 pr-20">
        <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-950 truncate">
          {account.name || `@${account.username}`}
        </p>
        <p className="text-gray-500 text-[15px]">
          {account.name && <>@{account.username}</>}
          {account.name && type && " · "}
          {type}
        </p>
        {stats.length > 0 && (
          <div className="flex gap-6 mt-3">
            {stats.map((s) => (
              <div key={s.l}>
                <p className="text-xl font-extrabold tabular-nums text-gray-950">{s.v}</p>
                <p className="text-xs text-gray-500">{s.l}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type Status = "ok" | "bad" | "unknown";

function ReadyCheck({ account, onRetry, retrying }: { account: Account; onRetry: () => void; retrying: boolean }) {
  const f = account.subscribedFields;
  const field = (name: string): Status => (f == null ? "unknown" : f.includes(name) ? "ok" : "bad");
  const typeStatus: Status =
    account.accountType == null ? "unknown" : account.accountType === "PERSONAL" ? "bad" : "ok";

  const rows: { label: string; status: Status; ok: string; bad: string; fix?: React.ReactNode }[] = [
    {
      label: "Comment alerts",
      status: field("comments"),
      ok: "Subscribed",
      bad: "Off",
      fix: <RetryButton onClick={onRetry} busy={retrying} />,
    },
    {
      label: "DM button taps",
      status: field("messages"),
      ok: "Subscribed",
      bad: "Off",
      fix: <RetryButton onClick={onRetry} busy={retrying} />,
    },
    {
      label: "Account can send automated DMs",
      status: typeStatus,
      ok: "Yes",
      bad: "Switch to Creator or Business",
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 divide-y divide-gray-100" aria-label="Ready check">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[22px_1fr_auto] gap-3 items-center px-4 py-3 text-sm">
          {r.status === "ok" ? (
            <Check className="w-4 h-4 text-brand-600" strokeWidth={3} />
          ) : r.status === "bad" ? (
            <X className="w-4 h-4 text-red-600" strokeWidth={3} />
          ) : (
            <span className="w-4 h-4 rounded-full border-2 border-gray-300" />
          )}
          <span className="text-gray-900">{r.label}</span>
          <span className="flex items-center gap-2">
            {r.status === "bad" && r.fix}
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap",
                r.status === "ok" && "bg-brand-50 text-brand-700",
                r.status === "bad" && "bg-red-50 text-red-700",
                r.status === "unknown" && "bg-gray-100 text-gray-500"
              )}
            >
              {r.status === "ok" ? r.ok : r.status === "bad" ? r.bad : "Couldn't check"}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function RetryButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:underline disabled:opacity-50 cursor-pointer"
    >
      <RefreshCw className={cn("w-3 h-3", busy && "animate-spin")} /> Turn on
    </button>
  );
}

function PassSkeleton() {
  return (
    <Loading label="Loading your Instagram account" className="space-y-4">
      <div className="grid grid-cols-[auto_1fr] gap-5 items-center rounded-3xl border border-gray-200 bg-gray-50 p-6">
        <Skeleton className="w-24 h-24 rounded-full" />
        <div className="space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-6 pt-1">
            <Skeleton className="h-9 w-14" />
            <Skeleton className="h-9 w-12" />
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 divide-y divide-gray-100">
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid grid-cols-[22px_1fr_auto] gap-3 items-center px-4 py-3.5">
            <Skeleton className="w-4 h-4 rounded-full" />
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Skeleton className="h-[72px] rounded-2xl" />
        <Skeleton className="h-[72px] rounded-2xl" />
      </div>
    </Loading>
  );
}
