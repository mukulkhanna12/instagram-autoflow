"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Menu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, ChevronsUpDown, Mail, Plus, Settings2, Users, X } from "lucide-react";
import { InfoTip } from "@/components/ui/info-tip";
import { WorkspaceExplainer } from "@/components/workspace/explainer";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { colorTile } from "@/lib/workspace-colors";

interface Ws { id: string; name: string; color: string; role: Role }

/**
 * Top of the sidebar: which workspace you're in, and a menu to switch, create
 * one, or open its team settings. Each workspace has its own Instagram account.
 */
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
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function create() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Couldn't create it.");
    setCreating(false);
    setName("");
    // A new workspace starts empty — connecting Instagram is the first step.
    router.push("/settings");
    router.refresh();
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

      <Dialog.Root open={creating} onOpenChange={setCreating}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md rounded-[2rem] bg-white p-7 shadow-2xl focus:outline-none">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-extrabold text-gray-950">New workspace</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-gray-500">
                  A separate space with its own Instagram account, automations and team — for a client or
                  a second page.
                </Dialog.Description>
              </div>
              <Dialog.Close aria-label="Close" className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 cursor-pointer shrink-0">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); create(); }} className="mt-6 space-y-3">
              <input
                autoFocus
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Studio"
                className="w-full h-12 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={busy || !name.trim()}
                className="w-full h-12 rounded-full bg-lime text-gray-950 font-extrabold hover:bg-lime-400 disabled:opacity-50 cursor-pointer"
              >
                {busy ? "Creating…" : "Create workspace"}
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
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
