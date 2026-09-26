"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { ArrowRight } from "lucide-react";

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

/** Signed in as the wrong address: sign out and come back as the right one. */
export function SwitchAccountButton({ next, email }: { next: string; email: string }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: `/login?next=${encodeURIComponent(next)}&email=${encodeURIComponent(email)}` })}
      className="w-full h-12 rounded-full bg-gray-950 font-bold text-white hover:bg-gray-800 cursor-pointer"
    >
      Log out and use {email}
    </button>
  );
}
