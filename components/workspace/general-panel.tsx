"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Instagram, Trash2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { AccountRowSkeleton } from "@/components/skeletons";
import { InfoTip } from "@/components/ui/info-tip";
import { WorkspaceExplainer } from "@/components/workspace/explainer";
import { WORKSPACE_COLORS, colorTile, type WorkspaceColor } from "@/lib/workspace-colors";
import { cn } from "@/lib/utils";

/** Fired after the workspace's name or colour is saved. */
export const WORKSPACE_UPDATED = "autoflow:workspace-updated";

interface Data {
  workspace: { id: string; name: string; color: string; personal: boolean };
  role: "owner" | "member";
  instagram: { username: string } | null;
}

/**
 * Settings → Workspace → General: the workspace's name and colour, and the
 * danger zone. Only the owner edits; members see it read-only.
 */
export function GeneralPanel() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("green");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/workspaces/current")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Data | null) => {
        if (!d) return;
        setData(d);
        setName(d.workspace.name);
        setColor(d.workspace.color);
      });
  }, []);

  if (!data) return <Card><CardBody><AccountRowSkeleton /></CardBody></Card>;

  const owner = data.role === "owner";
  const dirty = name.trim() !== data.workspace.name || color !== data.workspace.color;

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/workspaces/current", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(d.error ?? "Couldn't save.");
    setData((prev) => prev && { ...prev, workspace: { ...prev.workspace, ...d.workspace } });
    // Let the Settings side menu (loaded once) show the new name and colour now.
    window.dispatchEvent(new CustomEvent(WORKSPACE_UPDATED, { detail: { name: d.workspace.name, color: d.workspace.color } }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-extrabold", colorTile(color))}>
              {(name.trim()[0] ?? "W").toUpperCase()}
            </span>
            <div>
              <h2 className="font-semibold text-gray-900 flex items-center gap-1.5">
                Workspace <InfoTip title="What's a workspace?"><WorkspaceExplainer /></InfoTip>
              </h2>
              <p className="text-xs text-gray-400">
                {data.instagram ? <>Runs <b className="text-gray-600">@{data.instagram.username}</b></> : "No Instagram account connected yet"}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-5">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700">Name</span>
              <input
                value={name}
                maxLength={60}
                disabled={!owner}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full max-w-md h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </label>

            <div>
              <span className="block text-sm font-medium text-gray-700">Colour</span>
              <p className="text-xs text-gray-400">Tints the workspace icon, so it&apos;s easy to spot in the switcher.</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {(Object.keys(WORKSPACE_COLORS) as WorkspaceColor[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={!owner}
                    onClick={() => setColor(c)}
                    aria-label={WORKSPACE_COLORS[c].label}
                    aria-pressed={color === c}
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center ring-offset-2 transition-shadow cursor-pointer disabled:cursor-not-allowed",
                      WORKSPACE_COLORS[c].tile,
                      color === c ? "ring-2 ring-gray-950" : "hover:ring-2 hover:ring-gray-200"
                    )}
                  >
                    {color === c && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            {owner ? (
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={save} loading={saving} disabled={!dirty || !name.trim()}>
                  {saved ? <><Check className="w-4 h-4" /> Saved</> : "Save changes"}
                </Button>
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Only the workspace owner can change these.</p>
            )}
          </div>
        </CardBody>
      </Card>

      {owner && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-red-700">Danger zone</h2>
          </CardHeader>
          <CardBody>
            {data.workspace.personal ? (
              <p className="text-sm text-gray-500">
                This is your own workspace, so it can&apos;t be deleted. You can delete other workspaces you own.
              </p>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Delete this workspace</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Everyone loses access and its Instagram account is disconnected, so nothing more is sent.
                  </p>
                </div>
                <Button variant="destructive" size="sm" className="shrink-0 whitespace-nowrap" onClick={() => setDeleting(true)}>
                  <Trash2 className="w-4 h-4" /> Delete workspace
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <DeleteDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        name={data.workspace.name}
        instagram={data.instagram?.username ?? null}
      />
    </div>
  );
}

function DeleteDialog({ open, onClose, name, instagram }: { open: boolean; onClose: () => void; name: string; instagram: string | null }) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/workspaces/current", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmName: typed }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Couldn't delete it.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) { setTyped(""); setError(null); onClose(); } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed z-[61] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md rounded-[2rem] bg-white p-7 shadow-2xl focus:outline-none">
          <span className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center"><Trash2 className="w-6 h-6" /></span>
          <Dialog.Title className="mt-5 text-xl font-extrabold text-gray-950">Delete {name}?</Dialog.Title>
          <Dialog.Description asChild>
            <div className="mt-2 text-sm text-gray-600 space-y-2">
              <p>Everyone in it loses access straight away and pending invites stop working.</p>
              {instagram && (
                <p className="flex items-start gap-1.5"><Instagram className="w-4 h-4 mt-0.5 shrink-0" /> <span><b>@{instagram}</b> is disconnected — its automations stop replying.</span></p>
              )}
            </div>
          </Dialog.Description>
          <label className="mt-5 block">
            <span className="text-sm text-gray-700">Type <b>{name}</b> to confirm</span>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="mt-1.5 w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </label>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Dialog.Close className="h-11 px-5 rounded-full border border-gray-200 text-sm font-bold text-gray-700 hover:border-gray-300 cursor-pointer">Cancel</Dialog.Close>
            <button
              onClick={confirmDelete}
              disabled={busy || typed.trim() !== name}
              className="h-11 px-5 rounded-full bg-red-600 text-white text-sm font-extrabold hover:bg-red-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {busy ? "Deleting…" : "Delete workspace"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
