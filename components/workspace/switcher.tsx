"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Menu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, ChevronsUpDown, Instagram, Mail, Plus, Settings2, Users, X } from "lucide-react";
import { InfoTip } from "@/components/ui/info-tip";
import { WorkspaceExplainer } from "@/components/workspace/explainer";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { WORKSPACE_COLORS, colorTile, type WorkspaceColor } from "@/lib/workspace-colors";

interface Ws { id: string; name: string; color: string; role: Role }

/**
 * Top of the sidebar: which workspace you're in, and a menu to switch, create
 * one, or open its team settings. Each workspace has its own Instagram account.
 */
const CREATE_EVENT = "autoflow:create-workspace";

/** Open the "New workspace" dialog from anywhere. */
export function openCreateWorkspace() {
  window.dispatchEvent(new Event(CREATE_EVENT));
}

export function WorkspaceSwitcher({
  current, all, collapsed, invites = [],
}: {
  current: Ws;
  all: Ws[];
  collapsed: boolean;
  /** Invitations waiting for you — also shown as a banner on every page. */
  invites?: Array<{ id: string; workspaceName: string; invitedBy: string }>;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  // "Create a workspace" can be asked for from elsewhere (e.g. leaving your
  // only workspace), so the dialog opens on an event too.
  useEffect(() => {
    const onOpen = () => setCreating(true);
    window.addEventListener(CREATE_EVENT, onOpen);
    return () => window.removeEventListener(CREATE_EVENT, onOpen);
  }, []);

  async function switchTo(id: string) {
    if (id === current.id) return;
    const res = await fetch("/api/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: id }),
    });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    }
  }

  async function acceptInvite(id: string) {
    const res = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    }
  }

  const initial = current.name.trim()[0]?.toUpperCase() ?? "W";

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          className={cn(
            "relative w-full flex items-center gap-3 rounded-2xl border border-gray-100 hover:bg-[#fafbf8] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
            collapsed ? "justify-center p-1.5" : "px-2.5 py-2"
          )}
          title={collapsed ? current.name : undefined}
          aria-label="Switch workspace"
        >
          <WsMark initial={initial} color={current.color} />
          {collapsed && invites.length > 0 && <Dot />}
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-sm font-bold text-gray-950 truncate">{current.name}</span>
                <span className="block text-xs text-gray-400">{ROLE_LABEL[current.role]}</span>
              </span>
              {invites.length > 0 && <Dot inline />}
              <ChevronsUpDown className="w-4 h-4 text-gray-400 shrink-0" />
            </>
          )}
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Content
            align="start"
            sideOffset={8}
            className="z-50 w-72 rounded-3xl bg-white border border-gray-100 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3)] p-2"
          >
            {invites.length > 0 && (
              <>
                <p className="px-3 pt-2 pb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">Invitations</p>
                {invites.map((i) => (
                  <Menu.Item
                    key={i.id}
                    onSelect={() => acceptInvite(i.id)}
                    className="flex items-center gap-3 rounded-xl px-2.5 py-2 outline-none data-[highlighted]:bg-lime-50 cursor-pointer"
                  >
                    <span className="w-8 h-8 rounded-xl bg-lime text-gray-950 flex items-center justify-center shrink-0"><Mail className="w-4 h-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-gray-900 truncate">{i.workspaceName}</span>
                      <span className="block text-xs text-gray-400 truncate">from {i.invitedBy}</span>
                    </span>
                    <span className="text-xs font-extrabold text-brand-700">Join</span>
                  </Menu.Item>
                ))}
                <Menu.Separator className="my-1 h-px bg-gray-100" />
              </>
            )}
            <p className="px-3 pt-2 pb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400 flex items-center gap-1">
              Workspaces
              <InfoTip title="What's a workspace?"><WorkspaceExplainer /></InfoTip>
            </p>
            {all.map((w) => (
              <Menu.Item
                key={w.id}
                onSelect={() => switchTo(w.id)}
                className="flex items-center gap-3 rounded-xl px-2.5 py-2 outline-none data-[highlighted]:bg-[#f7f8f5] cursor-pointer"
              >
                <WsMark initial={w.name.trim()[0]?.toUpperCase() ?? "W"} color={w.color} small />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-gray-900 truncate">{w.name}</span>
                  <span className="block text-xs text-gray-400">{ROLE_LABEL[w.role]}</span>
                </span>
                {w.id === current.id && <Check className="w-4 h-4 text-brand-700" />}
              </Menu.Item>
            ))}
            <Menu.Separator className="my-1 h-px bg-gray-100" />
            <Menu.Item
              onSelect={() => router.push("/settings?tab=general")}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 outline-none data-[highlighted]:bg-[#f7f8f5] cursor-pointer"
            >
              <Settings2 className="w-4 h-4 text-gray-400" /> Workspace settings
            </Menu.Item>
            <Menu.Item
              onSelect={() => router.push("/settings?tab=team")}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 outline-none data-[highlighted]:bg-[#f7f8f5] cursor-pointer"
            >
              <Users className="w-4 h-4 text-gray-400" /> {current.role === "owner" ? "Invite & manage team" : "Team"}
            </Menu.Item>
            <Menu.Item
              onSelect={() => setCreating(true)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 outline-none data-[highlighted]:bg-[#f7f8f5] cursor-pointer"
            >
              <Plus className="w-4 h-4 text-gray-400" /> New workspace
            </Menu.Item>
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>

      <CreateWorkspaceDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}

function WsMark({ initial, color, small }: { initial: string; color: string; small?: boolean }) {
  return (
    <span className={cn(
      "rounded-xl font-extrabold flex items-center justify-center shrink-0",
      colorTile(color),
      small ? "w-8 h-8 text-sm" : "w-9 h-9"
    )}>
      {initial}
    </span>
  );
}

/** A small lime dot: you have invitations waiting. */
function Dot({ inline }: { inline?: boolean }) {
  return (
    <span
      aria-label="Invitations waiting"
      className={cn(
        "w-2.5 h-2.5 rounded-full bg-lime ring-2 ring-white shrink-0",
        inline ? "" : "absolute top-1 right-1"
      )}
    />
  );
}

interface IgChoice { username: string; profilePicUrl: string | null; workspaceId: string; workspaceName: string }

/**
 * New workspace, in two steps: name it (and pick a colour), then give it an
 * Instagram account — move one you already own from another workspace, connect
 * a new one, or skip for now. No onboarding: that's only for brand-new users.
 */
function CreateWorkspaceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [step, setStep] = useState<"name" | "instagram">("name");
  const [name, setName] = useState("");
  const [color, setColor] = useState<WorkspaceColor>("green");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<IgChoice[] | null>(null);
  const [pick, setPick] = useState<string | null>(null);

  function reset() {
    setStep("name"); setName(""); setColor("green"); setError(null); setAccounts(null); setPick(null); setBusy(false);
  }

  async function create() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(false); return setError(data.error ?? "Couldn't create it."); }
    // Now inside the new workspace: which Instagram accounts could move here?
    const list = await fetch("/api/workspaces/instagram-accounts").then((r) => (r.ok ? r.json() : { accounts: [] })).catch(() => ({ accounts: [] }));
    setAccounts(list.accounts ?? []);
    setBusy(false);
    setStep("instagram");
  }

  async function moveHere() {
    if (!pick) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/workspaces/move-instagram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromWorkspaceId: pick }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(false); return setError(data.error ?? "Couldn't move it."); }
    finish("/dashboard");
  }

  function finish(href: string) {
    onOpenChange(false);
    reset();
    router.push(href);
    router.refresh();
  }

  const chosen = accounts?.find((a) => a.workspaceId === pick);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => {
      // Closing after the workspace exists still lands you in it.
      if (!o && step === "instagram") return finish("/dashboard");
      if (!o) reset();
      onOpenChange(o);
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[2rem] bg-white p-7 shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">Step {step === "name" ? 1 : 2} of 2</p>
              <Dialog.Title className="mt-1 text-xl font-extrabold text-gray-950">
                {step === "name" ? "New workspace" : "Add its Instagram account"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-gray-500">
                {step === "name"
                  ? "A separate space with its own Instagram account, automations and team — for a client or a second page."
                  : "Each workspace runs one Instagram account. You can also do this later from Settings."}
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 cursor-pointer shrink-0">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          {step === "name" ? (
            <form onSubmit={(e) => { e.preventDefault(); create(); }} className="mt-6 space-y-4">
              <input
                autoFocus
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Studio"
                className="w-full h-12 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">Colour</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(WORKSPACE_COLORS) as WorkspaceColor[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      aria-label={WORKSPACE_COLORS[c].label}
                      aria-pressed={color === c}
                      className={cn("w-8 h-8 rounded-lg flex items-center justify-center ring-offset-2 cursor-pointer", WORKSPACE_COLORS[c].tile, color === c ? "ring-2 ring-gray-950" : "")}
                    >
                      {color === c && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={busy || !name.trim()}
                className="w-full h-12 rounded-full bg-lime text-gray-950 font-extrabold hover:bg-lime-400 disabled:opacity-50 cursor-pointer"
              >
                {busy ? "Creating…" : "Continue"}
              </button>
            </form>
          ) : (
            <div className="mt-6 space-y-3">
              {accounts && accounts.length > 0 && (
                <div className="rounded-2xl border border-gray-100 p-3 space-y-2">
                  <p className="px-1 text-xs font-semibold text-gray-500">Move an account you already connected</p>
                  {accounts.map((a) => (
                    <button
                      key={a.workspaceId}
                      type="button"
                      onClick={() => setPick(a.workspaceId)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left cursor-pointer",
                        pick === a.workspaceId ? "border-brand-600 bg-brand-50" : "border-gray-200 hover:border-gray-300"
                      )}
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
                  <button
                    type="button"
                    onClick={moveHere}
                    disabled={!pick || busy}
                    className="w-full h-11 rounded-full bg-gray-950 text-white text-sm font-bold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {busy ? "Moving…" : "Move it here"}
                  </button>
                </div>
              )}

              <a
                href="/api/instagram/connect"
                className="w-full h-12 rounded-full bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 text-white font-bold inline-flex items-center justify-center gap-2"
              >
                <Instagram className="w-4 h-4" /> Connect a new Instagram account
              </a>
              <button
                type="button"
                onClick={() => finish("/dashboard")}
                className="w-full h-11 rounded-full text-sm font-semibold text-gray-500 hover:text-gray-900 cursor-pointer"
              >
                Skip for now
              </button>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
