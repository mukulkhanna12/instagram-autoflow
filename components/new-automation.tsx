"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import {
  ArrowRight, AtSign, BookMarked, CircleDashed, Film, Mail, Plus, Sparkles, X,
} from "lucide-react";
import { PLAYBOOKS } from "@/lib/playbooks";
import { cn } from "@/lib/utils";

/**
 * "New automation" — the one place every new flow starts from.
 *
 * The first row is what the engine runs today. The second row is what's
 * planned; it's shown, switched off, so nobody hunts the app for a story or
 * inbox trigger that doesn't exist yet. Popular playbooks sit underneath as a
 * one-click shortcut into the setup dialog.
 */
export function NewAutomationButton({
  className, collapsed, children,
}: {
  className?: string;
  collapsed?: boolean;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={collapsed ? "New automation" : undefined}
        className={cn("cursor-pointer", className)}
      >
        {children ?? (
          <>
            <Plus className="w-5 h-5" strokeWidth={2.5} />
            {!collapsed && "New automation"}
          </>
        )}
      </button>
      <NewAutomationModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function NewAutomationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const popular = PLAYBOOKS.filter((p) => p.featured);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-5xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[2rem] bg-white shadow-2xl focus:outline-none"
        >
          <div className="flex items-start justify-between gap-4 px-6 sm:px-8 pt-7 pb-5 border-b border-gray-100">
            <div>
              <Dialog.Title className="text-2xl font-extrabold text-gray-950">Start a new automation</Dialog.Title>
              <Dialog.Description className="text-gray-500 mt-1">
                Choose how it starts — or skip the writing with a playbook.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-950 cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <div className="px-6 sm:px-8 py-6">
            <div className="grid gap-4 md:grid-cols-3">
              <StartCard
                eyebrow="Comments"
                title="DM on a posted reel"
                body="Someone comments a keyword on a reel that's already live."
                tint="bg-lime-100"
                onClick={() => go("/posts")}
                art={
                  <div className="w-[78%] rounded-2xl bg-white p-3 shadow-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-lime-300" />
                      <span className="h-2 flex-1 rounded-full bg-gray-200" />
                    </div>
                    <div className="ml-6 rounded-xl rounded-tl-sm bg-brand-900 px-2.5 py-2">
                      <span className="block h-1.5 w-3/4 rounded-full bg-white/50" />
                      <span className="mt-1.5 block h-3.5 w-1/2 rounded-full bg-lime" />
                    </div>
                  </div>
                }
              />
              <StartCard
                eyebrow="Next reel"
                title="DM on your next reel"
                body="Write it now — it switches on with the next reel's first comment."
                tint="bg-brand-50"
                onClick={() => go("/queue")}
                art={
                  <div className="flex items-center gap-2">
                    <span className="w-14 h-20 rounded-xl bg-gradient-to-br from-brand-600 to-brand-900 flex items-center justify-center shadow-sm">
                      <Film className="w-5 h-5 text-lime" />
                    </span>
                    <ArrowRight className="w-4 h-4 text-brand-300" />
                    <span className="w-14 h-20 rounded-xl border-2 border-dashed border-brand-300 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-brand-400" />
                    </span>
                  </div>
                }
              />
              <StartCard
                eyebrow="Playbooks"
                title="Start from a playbook"
                body={`${PLAYBOOKS.length} ready-made flows. Every message written — just add your link.`}
                tint="bg-amber-50"
                onClick={() => go("/playbooks")}
                art={
                  <div className="grid grid-cols-3 gap-1.5">
                    {PLAYBOOKS.slice(0, 6).map((p) => (
                      <span key={p.id} className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl">{p.emoji}</span>
                    ))}
                  </div>
                }
              />
            </div>

            <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Coming soon</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <SoonCard icon={CircleDashed} title="DM on story reply" body="When someone reacts or replies to a story" />
              <SoonCard icon={AtSign} title="DM on inbox keyword" body="When someone DMs you a keyword" />
              <SoonCard icon={Mail} title="Collect emails first" body="Ask for an email before the link" />
            </div>

            <div className="mt-7 pt-5 border-t border-gray-100">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-bold text-gray-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-brand-600" /> Popular playbooks
                </p>
                <button
                  onClick={() => go("/playbooks")}
                  className="text-sm font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  <BookMarked className="w-4 h-4" /> Browse all <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {popular.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => go(`/playbooks?playbook=${p.id}`)}
                    className="inline-flex items-center gap-2 h-10 rounded-full border border-gray-200 pl-3 pr-4 text-sm font-semibold text-gray-700 hover:border-brand-400 hover:text-brand-800 cursor-pointer transition-colors"
                  >
                    <span>{p.emoji}</span> {p.title}
                    <span className="text-[11px] font-bold text-gray-400">{p.keyword}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function StartCard({
  eyebrow, title, body, tint, art, onClick,
}: {
  eyebrow: string;
  title: string;
  body: string;
  tint: string;
  art: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-3xl border border-gray-100 p-4 flex flex-col hover:border-brand-300 hover:shadow-[0_8px_30px_-12px_rgba(18,53,34,0.25)] transition-all cursor-pointer"
    >
      <div className={cn("h-36 rounded-2xl flex items-center justify-center", tint)}>{art}</div>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">{eyebrow}</p>
      <h3 className="mt-1 text-lg font-extrabold text-gray-950">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 leading-snug flex-1">{body}</p>
      <span className="mt-4 flex items-center justify-between text-sm font-bold text-brand-700">
        Start here <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </span>
    </button>
  );
}

function SoonCard({
  icon: Icon, title, body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-3 flex items-start gap-3 opacity-70" aria-disabled="true">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        <p className="text-xs text-gray-400">{body}</p>
      </div>
    </div>
  );
}
