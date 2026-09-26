"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Users, X } from "lucide-react";

type Invite = { id: string; workspaceName: string; invitedBy: string };

/** Which invites were put off with "Later", for this browser session only. */
const LATER_KEY = "autoflow.invites.later";

/**
 * Invitations waiting for you — one banner, however many there are.
 *
 * One invite reads "Sam invited you to Brand X" with Accept / Decline. Several
 * collapse into a single line ("3 workspaces invited you…") with Review, which
 * lists them in a dialog. "Later" hides the banner until the next visit; a new
 * invite brings it back. They also stay listed in the workspace switcher.
 */
export function PendingInvites({ invites }: { invites: Invite[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [later, setLater] = useState<string[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLater(JSON.parse(window.sessionStorage.getItem(LATER_KEY) ?? "[]"));
    } catch {
      // Storage blocked: the banner simply shows.
    }
  }, []);

  const open = invites.filter((i) => !done.includes(i.id));
  // Hidden only while every open invite was put off; a new one shows it again.
  const hidden = open.length > 0 && open.every((i) => later.includes(i.id));

  function putOff() {
    const ids = open.map((i) => i.id);
    setLater(ids);
    try {
      window.sessionStorage.setItem(LATER_KEY, JSON.stringify(ids));
    } catch {}
  }

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
    setDone((d) => [...d, id]);
    if (action === "accept") {
      setReviewing(false);
      router.push("/dashboard");
    }
    router.refresh();
  }

  if (open.length === 0 || hidden) return null;

  const single = open.length === 1 ? open[0] : null;
  const names = open.map((i) => i.workspaceName);
  const summary =
    names.length === 2 ? `${names[0]} and ${names[1]}` : `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;

  return (
    <div className="px-5 sm:px-8 pt-5">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-brand-950 text-white pl-3 pr-2 py-2">
        <span className="relative w-9 h-9 rounded-xl bg-lime text-brand-950 flex items-center justify-center shrink-0">
          <Users className="w-4 h-4" />
          {!single && (
            <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-white text-brand-950 text-[11px] font-extrabold flex items-center justify-center">
              {open.length}
            </span>
          )}
        </span>
        <p className="flex-1 min-w-[200px] text-sm">
          {single ? (
            <><strong>{single.invitedBy}</strong> invited you to join <strong>{single.workspaceName}</strong></>
          ) : (
            <><strong>{open.length} workspaces</strong> invited you: {summary}</>
          )}
        </p>
        <button onClick={putOff} className="h-9 px-3 rounded-full text-sm font-semibold text-white/60 hover:text-white cursor-pointer">
          Later
        </button>
        {single ? (
          <>
            <button
              onClick={() => answer(single.id, "decline")}
              disabled={busy === single.id}
              className="h-9 px-4 rounded-full text-sm font-semibold text-white/80 border border-white/15 hover:border-white/40 cursor-pointer"
            >
              Decline
            </button>
            <button
              onClick={() => answer(single.id, "accept")}
              disabled={busy === single.id}
              className="h-9 px-4 rounded-full bg-lime text-gray-950 text-sm font-extrabold hover:bg-lime-400 cursor-pointer disabled:opacity-60"
            >
              {busy === single.id ? "Joining…" : "Accept"}
            </button>
          </>
        ) : (
          <button
            onClick={() => setReviewing(true)}
            className="h-9 px-4 rounded-full bg-lime text-gray-950 text-sm font-extrabold hover:bg-lime-400 cursor-pointer"
          >
            Review
          </button>
        )}
      </div>
      {error && !reviewing && <p className="mt-2 text-sm text-red-600 px-1">{error}</p>}

      <Dialog.Root open={reviewing} onOpenChange={setReviewing}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed z-[61] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[2rem] bg-white p-7 shadow-2xl focus:outline-none">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-extrabold text-gray-950">Your invitations</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-gray-500">
                  Join the ones you want — you can switch between workspaces any time.
                </Dialog.Description>
              </div>
              <Dialog.Close aria-label="Close" className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 cursor-pointer shrink-0">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>
            <ul className="mt-5 divide-y divide-gray-100 rounded-2xl border border-gray-100">
              {open.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="w-10 h-10 rounded-xl bg-brand-900 text-lime font-extrabold flex items-center justify-center shrink-0">
                    {(i.workspaceName.trim()[0] ?? "W").toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-950 truncate">{i.workspaceName}</p>
                    <p className="text-xs text-gray-400 truncate">from {i.invitedBy}</p>
                  </div>
                  <button
                    onClick={() => answer(i.id, "decline")}
                    disabled={busy === i.id}
                    className="h-9 px-3 rounded-full text-sm font-semibold text-gray-500 hover:text-gray-900 cursor-pointer"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => answer(i.id, "accept")}
                    disabled={busy === i.id}
                    className="h-9 px-4 rounded-full bg-lime text-gray-950 text-sm font-extrabold hover:bg-lime-400 cursor-pointer disabled:opacity-60"
                  >
                    {busy === i.id ? "…" : "Join"}
                  </button>
                </li>
              ))}
            </ul>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
