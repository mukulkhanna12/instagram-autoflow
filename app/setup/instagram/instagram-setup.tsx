"use client";
import { useEffect, useState } from "react";
import { Check, Instagram, LogOut, Trash2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { colorTile } from "@/lib/workspace-colors";
import { cn } from "@/lib/utils";

interface Ws { id: string; name: string; color: string; role?: string }
interface IgChoice { username: string; workspaceId: string; workspaceName: string }

export function InstagramSetup({
  workspace, others,
}: {
  workspace: Ws & { personal: boolean };
  others: Ws[];
}) {
  const [accounts, setAccounts] = useState<IgChoice[] | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    fetch("/api/workspaces/instagram-accounts")
      .then((r) => (r.ok ? r.json() : { accounts: [] }))
      .then((d) => setAccounts(d.accounts ?? []))
      .catch(() => setAccounts([]));
  }, []);

  const go = (href: string) => { window.location.href = href; };

  async function move() {
    if (!pick) return;
    setBusy("move"); setError(null);
    const res = await fetch("/api/workspaces/move-instagram", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fromWorkspaceId: pick }),
    });
    if (!res.ok) { setBusy(null); return setError((await res.json().catch(() => ({}))).error ?? "Couldn't move it."); }
    go("/dashboard");
  }

  async function switchTo(id: string) {
    setBusy(id);
    await fetch("/api/workspaces/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: id }) });
    go("/dashboard");
  }

  async function deleteEmpty() {
    setBusy("delete"); setError(null);
    const res = await fetch("/api/workspaces/current", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmName: workspace.name }),
    });
    if (!res.ok) { setBusy(null); return setError((await res.json().catch(() => ({}))).error ?? "Couldn't delete it."); }
    go("/dashboard");
  }

  const chosen = accounts?.find((a) => a.workspaceId === pick);

  return (
    <div className="w-full max-w-md rounded-[2rem] bg-white p-7 sm:p-8 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)]">
      <span className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-extrabold", colorTile(workspace.color))}>
        {(workspace.name.trim()[0] ?? "W").toUpperCase()}
      </span>
      <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">Almost there</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950">Finish setting up {workspace.name}</h1>
      <p className="mt-1.5 text-sm text-gray-500">Every workspace runs one Instagram account. Add one to start using this workspace.</p>

      <div className="mt-6 space-y-3">
        {accounts && accounts.length > 0 && (
          <div className="rounded-2xl border border-gray-100 p-3 space-y-2">
            <p className="px-1 text-xs font-semibold text-gray-500">Move an account you already connected</p>
            {accounts.map((a) => (
              <button
                key={a.workspaceId}
                type="button"
                onClick={() => setPick(a.workspaceId)}
                className={cn("w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left cursor-pointer",
                  pick === a.workspaceId ? "border-brand-600 bg-brand-50" : "border-gray-200 hover:border-gray-300")}
              >
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 flex items-center justify-center shrink-0">
                  <Instagram className="w-4 h-4 text-white" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-gray-900">@{a.username}</span>
                  <span className="block text-xs text-gray-400 truncate">now in {a.workspaceName}</span>
                </span>
                {pick === a.workspaceId && <Check className="w-4 h-4 text-brand-700" />}
              </button>
            ))}
            {chosen && (
              <p className="px-1 text-xs text-amber-700">
                @{chosen.username} leaves <b>{chosen.workspaceName}</b> — its automations and history move here with it.
              </p>
            )}
            <button onClick={move} disabled={!pick || !!busy} className="w-full h-11 rounded-full bg-gray-950 text-white text-sm font-bold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
              {busy === "move" ? "Moving…" : "Move it here"}
            </button>
          </div>
        )}

        <a href="/api/instagram/connect" className="w-full h-12 rounded-full bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 text-white font-bold inline-flex items-center justify-center gap-2">
          <Instagram className="w-4 h-4" /> Connect a new Instagram account
        </a>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {others.length > 0 && (
        <div className="mt-7 pt-5 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-2">Or go to another workspace</p>
          <div className="space-y-1.5">
            {others.map((w) => (
              <button
                key={w.id}
                onClick={() => switchTo(w.id)}
                disabled={!!busy}
                className="w-full flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-[#f7f8f5] text-left cursor-pointer"
              >
                <span className={cn("w-8 h-8 rounded-lg text-sm font-extrabold flex items-center justify-center shrink-0", colorTile(w.color))}>
                  {(w.name.trim()[0] ?? "W").toUpperCase()}
                </span>
                <span className="text-sm font-semibold text-gray-800 truncate">{w.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="inline-flex items-center gap-1.5 font-semibold text-gray-500 hover:text-gray-900 cursor-pointer">
          <LogOut className="w-4 h-4" /> Log out — finish later
        </button>
        {!workspace.personal && (
          confirmDelete ? (
            <span className="inline-flex items-center gap-2">
              <span className="text-gray-500">Delete it?</span>
              <button onClick={deleteEmpty} disabled={!!busy} className="font-bold text-red-600 cursor-pointer">{busy === "delete" ? "Deleting…" : "Yes, delete"}</button>
              <button onClick={() => setConfirmDelete(false)} className="text-gray-500 cursor-pointer">No</button>
            </span>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 font-semibold text-gray-400 hover:text-red-600 cursor-pointer">
              <Trash2 className="w-4 h-4" /> Delete this workspace
            </button>
          )
        )}
      </div>
    </div>
  );
}
