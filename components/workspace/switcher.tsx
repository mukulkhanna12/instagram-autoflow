"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Menu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, ChevronsUpDown, Plus, Users, X } from "lucide-react";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

interface Ws { id: string; name: string; role: Role }

/**
 * Top of the sidebar: which workspace you're in, and a menu to switch, create
 * one, or open its team settings. Each workspace has its own Instagram account.
 */
export function WorkspaceSwitcher({
  current, all, collapsed,
}: {
  current: Ws;
  all: Ws[];
  collapsed: boolean;
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
            "w-full flex items-center gap-3 rounded-2xl border border-gray-100 hover:bg-[#fafbf8] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
            collapsed ? "justify-center p-1.5" : "px-2.5 py-2"
          )}
          title={collapsed ? current.name : undefined}
          aria-label="Switch workspace"
        >
          <WsMark initial={initial} />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-sm font-bold text-gray-950 truncate">{current.name}</span>
                <span className="block text-xs text-gray-400">{ROLE_LABEL[current.role]}</span>
              </span>
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
            <p className="px-3 pt-2 pb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">Workspaces</p>
            {all.map((w) => (
              <Menu.Item
                key={w.id}
                onSelect={() => switchTo(w.id)}
                className="flex items-center gap-3 rounded-xl px-2.5 py-2 outline-none data-[highlighted]:bg-[#f7f8f5] cursor-pointer"
              >
                <WsMark initial={w.name.trim()[0]?.toUpperCase() ?? "W"} small />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-gray-900 truncate">{w.name}</span>
                  <span className="block text-xs text-gray-400">{ROLE_LABEL[w.role]}</span>
                </span>
                {w.id === current.id && <Check className="w-4 h-4 text-brand-700" />}
              </Menu.Item>
            ))}
            <Menu.Separator className="my-1 h-px bg-gray-100" />
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

function WsMark({ initial, small }: { initial: string; small?: boolean }) {
  return (
    <span className={cn(
      "rounded-xl bg-brand-900 text-lime font-extrabold flex items-center justify-center shrink-0",
      small ? "w-8 h-8 text-sm" : "w-9 h-9"
    )}>
      {initial}
    </span>
  );
}
