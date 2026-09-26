"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  BarChart3, BookMarked, CornerDownLeft, ImageIcon, KeyRound, LayoutDashboard, LogOut, Plus,
  LifeBuoy, Search, Settings, ShieldCheck, Wand2, Workflow,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { PLAYBOOKS } from "@/lib/playbooks";
import { cn } from "@/lib/utils";

/**
 * The top bar's search: ⌘K / Ctrl+K from anywhere in the app. Jumps to a
 * page, straight into a playbook's setup, or an action — everything it lists
 * is a real route, so nothing here can lead to a dead end.
 */

interface Cmd {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  emoji?: string;
  keywords?: string;
  run: (go: (href: string) => void) => void;
}

const nav = (id: string, label: string, href: string, icon: Cmd["icon"], keywords = ""): Cmd => ({
  id, group: "Go to", label, icon, keywords, run: (go) => go(href),
});

const COMMANDS: Cmd[] = [
  nav("dashboard", "Dashboard", "/dashboard", LayoutDashboard, "home overview"),
  nav("automations", "Automations", "/triggers", Workflow, "flows triggers builder"),
  nav("analytics", "Analytics", "/analytics", BarChart3, "stats insights numbers"),
  nav("reels", "Reels", "/posts", ImageIcon, "posts automations"),
  nav("playbooks", "Playbooks", "/playbooks", BookMarked, "templates"),
  nav("queue", "Upcoming reels", "/triggers?tab=upcoming", Wand2, "queue next reel prepared automations"),
  nav("settings", "Settings", "/settings", Settings, "instagram connect profile"),
  nav("privacy", "Privacy", "/privacy", ShieldCheck, "policy"),
  nav("help", "Help center", "/help", LifeBuoy, "support docs faq assistant"),
  { id: "new-flow", group: "Create", label: "New automation", icon: Plus, keywords: "flow trigger", run: (go) => go("/triggers/compose") },
  { id: "new-queue", group: "Create", label: "Prepare your next reel", icon: Plus, keywords: "queue upcoming", run: (go) => go("/triggers?tab=upcoming") },
  { id: "reel-auto", group: "Create", label: "Automate a posted reel", icon: Plus, keywords: "configure reel", run: (go) => go("/posts") },
  ...PLAYBOOKS.map((p): Cmd => ({
    id: `pb-${p.id}`, group: "Playbooks", label: p.title, emoji: p.emoji,
    hint: p.keyword, keywords: `${p.keyword} ${p.altKeywords?.join(" ") ?? ""} ${p.pitch}`,
    run: (go) => go(`/playbooks?playbook=${p.id}`),
  })),
  { id: "profile", group: "Account", label: "Manage profile", icon: Settings, run: (go) => go("/settings?tab=profile") },
  { id: "sign-in", group: "Account", label: "Sign-in options", icon: KeyRound, keywords: "google facebook link", run: (go) => go("/settings?tab=sign-in") },
  { id: "logout", group: "Account", label: "Log out", icon: LogOut, keywords: "sign out", run: () => signOut({ callbackUrl: "/login" }) },
];

export function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const [mac, setMac] = useState(true);

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { if (!open) { setQ(""); setActive(0); } }, [open]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s
      ? COMMANDS.filter((c) => `${c.label} ${c.keywords ?? ""} ${c.hint ?? ""}`.toLowerCase().includes(s))
      : COMMANDS.filter((c) => c.group !== "Playbooks" || PLAYBOOKS.find((p) => `pb-${p.id}` === c.id)?.featured);
    return list;
  }, [q]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function run(c: Cmd) {
    setOpen(false);
    c.run((href) => router.push(href));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(results.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter" && results[active]) { e.preventDefault(); run(results[active]); }
  }

  let idx = -1;
  const groups = Array.from(new Set(results.map((r) => r.group)));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2.5 h-11 w-full max-w-sm rounded-full bg-[#f3f4f1] pl-4 pr-2 text-sm text-gray-400 hover:bg-gray-100 transition-colors cursor-pointer"
        aria-label="Search"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left truncate">Search pages, playbooks…</span>
        <kbd className="hidden sm:inline-flex items-center rounded-lg bg-white border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
          {mac ? "⌘" : "Ctrl"} K
        </kbd>
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" />
          <Dialog.Content
            className="fixed z-50 left-1/2 top-[12vh] -translate-x-1/2 w-[calc(100%-2rem)] max-w-xl rounded-3xl bg-white shadow-2xl overflow-hidden focus:outline-none"
            onKeyDown={onKeyDown}
          >
            <Dialog.Title className="sr-only">Search</Dialog.Title>
            <Dialog.Description className="sr-only">Jump to a page, a playbook or an action.</Dialog.Description>
            <div className="flex items-center gap-3 px-5 border-b border-gray-100">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search pages, playbooks, actions…"
                className="flex-1 h-14 bg-transparent text-[15px] text-gray-950 placeholder:text-gray-400 focus:outline-none"
              />
              <kbd className="rounded-lg border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-400">Esc</kbd>
            </div>
            <div ref={listRef} className="max-h-[55vh] overflow-y-auto p-2">
              {results.length === 0 && <p className="px-4 py-10 text-center text-sm text-gray-400">Nothing matches “{q}”.</p>}
              {groups.map((g) => (
                <div key={g} className="pb-1">
                  <p className="px-3 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">{g}</p>
                  {results.filter((r) => r.group === g).map((c) => {
                    idx += 1;
                    const i = idx;
                    return (
                      <button
                        key={c.id}
                        data-idx={i}
                        onMouseMove={() => setActive(i)}
                        onClick={() => run(c)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm cursor-pointer",
                          active === i ? "bg-lime-100 text-gray-950" : "text-gray-700"
                        )}
                      >
                        <span className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0">
                          {c.emoji ? <span>{c.emoji}</span> : c.icon ? <c.icon className="w-4 h-4 text-gray-500" /> : null}
                        </span>
                        <span className="flex-1 font-semibold truncate">{c.label}</span>
                        {c.hint && <span className="text-[11px] font-bold text-gray-400">{c.hint}</span>}
                        {active === i && <CornerDownLeft className="w-4 h-4 text-gray-400" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
