"use client";
import { useEffect, useState } from "react";
import { CheckCircle, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { FacebookIcon, GoogleIcon } from "@/components/brand";
import { AccountRowSkeleton } from "@/components/skeletons";

type Social = "google" | "facebook";

/**
 * The account's sign-in methods. Email codes always work; Google and Facebook
 * can be linked while signed in, and from then on either one opens this same
 * account — even when its email differs from the account's (see the signIn
 * callback in lib/auth.ts).
 *
 * Shown on Settings → Sign-in methods.
 */
export function SignInMethods({ linkedNow, returnTo }: { linkedNow?: string | null; returnTo: string }) {
  const [state, setState] = useState<{ email: string; linked: string[]; available: Record<Social, boolean> } | null>(null);
  const [busy, setBusy] = useState<Social | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data?.user && setState({ email: data.user.email, ...data.signIn }))
      .catch(() => {});
  }, []);

  function connect(provider: Social) {
    setBusy(provider);
    // Signing in with a provider while a session exists links it to this account.
    const sep = returnTo.includes("?") ? "&" : "?";
    signIn(provider, { callbackUrl: `${returnTo}${sep}linked=${provider}` });
  }

  if (!state) return <AccountRowSkeleton />;

  const rows: Array<{ id: Social; label: string; icon: React.ReactNode }> = [
    { id: "facebook", label: "Facebook", icon: <FacebookIcon className="w-5 h-5 text-[#1877F2]" /> },
    { id: "google", label: "Google", icon: <GoogleIcon className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-3">
      {linkedNow && state.linked.includes(linkedNow) && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle className="w-4 h-4" /> {linkedNow === "google" ? "Google" : "Facebook"} is now linked — you can log in with it.
        </div>
      )}

      <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100">
        <Row
          icon={<Mail className="w-5 h-5 text-gray-500" />}
          label="Email code"
          detail={state.email}
          action={<Connected text="Always on" />}
        />
        {rows.map((r) => {
          const linked = state.linked.includes(r.id);
          const available = state.available[r.id];
          return (
            <Row
              key={r.id}
              icon={r.icon}
              label={r.label}
              detail={linked ? "Opens this account" : available ? "Not connected" : "Not switched on for this site yet"}
              action={
                linked ? (
                  <Connected text="Connected" />
                ) : (
                  <Button size="sm" disabled={!available} loading={busy === r.id} onClick={() => connect(r.id)} className="min-w-[112px]">
                    Connect
                  </Button>
                )
              }
            />
          );
        })}
      </div>
      <p className="text-xs text-gray-400">
        A Google or Facebook account can be connected to one AutoFlow account only.
      </p>
    </div>
  );
}

function Row({ icon, label, detail, action }: { icon: React.ReactNode; label: string; detail: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 truncate">{detail}</p>
      </div>
      {action}
    </div>
  );
}

function Connected({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center justify-center gap-1.5 min-w-[112px] h-8 rounded-full border border-gray-200 px-3 text-xs font-semibold text-gray-700">
      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> {text}
    </span>
  );
}
