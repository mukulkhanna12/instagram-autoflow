"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { ArrowRight, Clock } from "lucide-react";

/** Signed in as the invited address: one click to join. */
export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setError(data.error ?? "Couldn't accept the invite.");
      return;
    }
    router.push("/dashboard?joined=1");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <button
        onClick={accept}
        disabled={busy}
        className="w-full h-12 rounded-full bg-lime font-extrabold text-gray-950 hover:bg-lime-400 disabled:opacity-60 inline-flex items-center justify-center gap-2 cursor-pointer"
      >
        {busy ? "Joining…" : <>Accept and join <ArrowRight className="w-4 h-4" /></>}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Signed out: type your name and join. The link itself proves the email (it
 * was sent there), so there's no code to wait for — this signs you in, joins
 * the workspace and drops you on its dashboard. No onboarding.
 */
export function JoinWithInviteForm({ token, email, workspaceId }: { token: string; email: string; workspaceId: string }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("invite", { token, name, redirect: false });
    if (!res || res.error) {
      setBusy(false);
      setError("This invite can't be used any more — it may have expired or already been used. Ask for a new one.");
      return;
    }
    // Land in the workspace they just joined.
    await fetch("/api/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    }).catch(() => {});
    window.location.href = "/dashboard?joined=1";
  }

  return (
    <form onSubmit={join} className="space-y-3 text-left">
      <label className="block">
        <span className="text-sm font-semibold text-gray-700">Your name</span>
        <input
          autoFocus
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sam Lee"
          className="mt-1.5 w-full h-12 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-gray-700">Email</span>
        <input value={email} disabled className="mt-1.5 w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-500" />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="w-full h-12 rounded-full bg-lime font-extrabold text-gray-950 hover:bg-lime-400 disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
      >
        {busy ? "Joining…" : <>Join the workspace <ArrowRight className="w-4 h-4" /></>}
      </button>
      <p className="text-xs text-gray-400 text-center">
        No password needed — this link was sent to your inbox. Next time, log in with {email}.
      </p>
    </form>
  );
}

/** "Expires Sat, 4 Oct, 3:06 AM · in 7 days" — in the viewer's own timezone. */
export function ExpiresAt({ iso }: { iso: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const at = new Date(iso);
    const ms = at.getTime() - Date.now();
    const hours = Math.max(0, Math.round(ms / 3_600_000));
    const rel = hours < 1 ? "in under an hour" : hours < 48 ? `in ${hours} hours` : `in ${Math.round(hours / 24)} days`;
    const abs = at.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
    setText(`${abs} · ${rel}`);
  }, [iso]);
  if (!text) return null;
  return (
    <p className="inline-flex items-center gap-1.5 rounded-full bg-[#f3f4f1] px-3 py-1 text-xs text-gray-600">
      <Clock className="w-3.5 h-3.5" /> Expires {text}
    </p>
  );
}

/** Signed in as the wrong address: sign out and come back as the right one. */
export function SwitchAccountButton({ next, email }: { next: string; email: string }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: next })}
      className="w-full h-12 rounded-full bg-gray-950 font-bold text-white hover:bg-gray-800 cursor-pointer"
    >
      Log out and join as {email}
    </button>
  );
}
