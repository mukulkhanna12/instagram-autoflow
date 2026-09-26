"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

/** "Sam invited you to Brand X" — shown on every page until you answer. */
export function PendingInvites({
  invites,
}: {
  invites: Array<{ id: string; workspaceName: string; invitedBy: string }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function answer(id: string, action: "accept" | "decline") {
    setBusy(id);
    setError(null);
    const res = await fetch(`/api/invites/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setBusy(null);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Something went wrong.");
      return;
    }
    setHidden((h) => [...h, id]);
    router.refresh();
  }

  const shown = invites.filter((i) => !hidden.includes(i.id));
  if (shown.length === 0) return null;

  return (
    <div className="px-5 sm:px-8 pt-5 space-y-2">
      {shown.map((i) => (
        <div key={i.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-brand-950 text-white px-4 py-3">
          <span className="w-9 h-9 rounded-xl bg-lime text-brand-950 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </span>
          <p className="flex-1 min-w-[200px] text-sm">
            <strong>{i.invitedBy}</strong> invited you to join <strong>{i.workspaceName}</strong>
          </p>
          <button
            onClick={() => answer(i.id, "decline")}
            disabled={busy === i.id}
            className="h-9 px-4 rounded-full text-sm font-semibold text-white/70 hover:text-white cursor-pointer"
          >
            Decline
          </button>
          <button
            onClick={() => answer(i.id, "accept")}
            disabled={busy === i.id}
            className="h-9 px-4 rounded-full bg-lime text-gray-950 text-sm font-extrabold hover:bg-lime-400 cursor-pointer disabled:opacity-60"
          >
            {busy === i.id ? "…" : "Accept"}
          </button>
        </div>
      ))}
      {error && <p className="text-sm text-red-600 px-1">{error}</p>}
    </div>
  );
}
