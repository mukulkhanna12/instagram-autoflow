"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
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
 * Signed out: agree to join, and it's done — the link came to their inbox, so
 * there's nothing else to check. Then a link to log in (which goes straight to
 * the dashboard if they're already logged in).
 */
export function JoinWithInviteForm({ token, email, workspaceName }: { token: string; email: string; workspaceName: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  async function join() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/invites/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Couldn't join — try again.");
    setJoined(true);
  }

  if (joined) {
    return (
      <div className="space-y-4">
        <p className="rounded-2xl bg-lime-50 border border-lime-200 px-4 py-3 text-sm text-gray-900">
          🎉 You&apos;ve joined <b>{workspaceName}</b>.
        </p>
        <a
          href={`/login?email=${encodeURIComponent(email)}`}
          className="w-full h-12 rounded-full bg-gray-950 font-bold text-white hover:bg-brand-900 inline-flex items-center justify-center gap-2"
        >
          Log in to get started <ArrowRight className="w-4 h-4" />
        </a>
        <p className="text-xs text-gray-400">Log in with {email} — we&apos;ll email you a code.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-2.5 rounded-2xl border border-gray-200 px-4 py-3 text-left text-sm text-gray-600">
        <span className="mt-0.5">✅</span>
        <span>
          By joining, you&apos;ll be a member of <b className="text-gray-900">{workspaceName}</b> as <b className="text-gray-900">{email}</b>.
          The owner can see you in their team and remove you any time.
        </span>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={join}
        disabled={busy}
        className="w-full h-12 rounded-full bg-lime font-extrabold text-gray-950 hover:bg-lime-400 disabled:opacity-60 inline-flex items-center justify-center gap-2 cursor-pointer"
      >
        {busy ? "Joining…" : <>I agree, join the workspace <ArrowRight className="w-4 h-4" /></>}
      </button>
    </div>
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
