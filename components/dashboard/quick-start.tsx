"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock, CornerDownRight, Eye, Film, X, Zap } from "lucide-react";

/**
 * 4.png — offered once, the first time the dashboard opens after onboarding.
 * Both cards lead to features that exist today: set up a reel you've already
 * posted, or prepare a flow for the next one. Closing it any way records that
 * it was seen, so it never comes back on its own.
 */
export function QuickStartModal({
  open, username, onClose,
}: {
  open: boolean;
  username: string | null;
  onClose: () => void;
}) {
  const router = useRouter();

  function dismiss() {
    fetch("/api/onboarding/quick-start", { method: "POST" }).catch(() => {});
    onClose();
  }

  function go(href: string) {
    dismiss();
    router.push(href);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && dismiss()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]" />
        <Dialog.Content
          // Don't land focus (and a focus ring) on the close button on open.
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-5xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[2rem] bg-white p-6 sm:p-10 shadow-2xl focus:outline-none">
          <Dialog.Close
            className="absolute right-6 top-6 w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-950 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </Dialog.Close>

          <div className="text-center">
            <p className="text-xl font-bold text-gray-950">
              Welcome{" "}
              {username && (
                <span className="inline-block -rotate-2 rounded-lg bg-lime px-2 py-0.5">@{username}</span>
              )}
            </p>
            <Dialog.Title className="mt-2 text-3xl sm:text-5xl font-extrabold tracking-tight text-gray-950">
              Let&apos;s set up your first automation
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Choose how to start: an existing reel, or your next one.
            </Dialog.Description>
          </div>

          <div className="grid md:grid-cols-2 gap-5 mt-10">
            <OptionCard
              badge="Recommended"
              badgeDark
              title="Send link on keyword"
              body={<>Someone comments &quot;LINK&quot; → they get your link in DMs.</>}
              cta="Start with this"
              onClick={() => go("/posts")}
            >
              <MockComment initials="SC" tint="bg-rose-100 text-rose-700" name="sam.creates" text="Need the LINK please!" />
              <MockReply text="Here's your link!" button="Get the guide" />
            </OptionCard>

            <OptionCard
              badge="Next reel"
              title="Prepare for your next reel"
              body="Write the flow now → it switches on when your next reel gets its first comment."
              cta="Or try this"
              onClick={() => go("/queue")}
            >
              <div className="flex items-center gap-3 rounded-2xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] px-4 py-3">
                <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-900 flex items-center justify-center shrink-0">
                  <Film className="w-5 h-5 text-lime" />
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-gray-950 text-sm">Your next reel</p>
                  <p className="text-sm text-gray-500">First comment arrives…</p>
                </div>
              </div>
              <MockReply text="Flow attached automatically" button="Live" />
            </OptionCard>
          </div>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-10 text-gray-600">
            <span className="flex items-center gap-2"><Clock className="w-5 h-5" /> Live in 2 minutes</span>
            <span className="flex items-center gap-2"><Zap className="w-5 h-5" /> Automatic replies</span>
            <span className="flex items-center gap-2"><Eye className="w-5 h-5" /> Preview before going live</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function OptionCard({
  badge, badgeDark, title, body, cta, onClick, children,
}: {
  badge: string;
  badgeDark?: boolean;
  title: string;
  body: React.ReactNode;
  cta: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border-2 border-gray-200 p-6 sm:p-7 flex flex-col">
      <span
        className={
          badgeDark
            ? "self-start rounded-full bg-gray-950 text-white text-xs font-bold uppercase tracking-wider px-3.5 py-2"
            : "self-start rounded-full bg-gray-100 text-gray-800 text-xs font-bold uppercase tracking-wider px-3.5 py-2"
        }
      >
        {badge}
      </span>
      <h3 className="mt-6 text-2xl font-extrabold text-gray-950">{title}</h3>
      <p className="mt-2 text-gray-600 text-[17px]">{body}</p>
      <div className="mt-6 flex-1 px-2 sm:px-4 space-y-2">{children}</div>
      <button
        onClick={onClick}
        className="mt-8 h-14 rounded-full bg-gray-950 text-white text-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-800 cursor-pointer transition-colors"
      >
        {cta}
      </button>
    </div>
  );
}

function MockComment({ initials, tint, name, text }: { initials: string; tint: string; name: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] px-4 py-3">
      <span className={`w-11 h-11 rounded-full flex items-center justify-center font-bold shrink-0 ${tint}`}>
        {initials}
      </span>
      <div className="min-w-0">
        <p className="font-bold text-gray-950 text-sm">{name}</p>
        <p className="text-sm text-gray-500">{text}</p>
      </div>
    </div>
  );
}

function MockReply({ text, button }: { text: string; button: string }) {
  return (
    <div className="flex items-start gap-2 pl-3">
      <CornerDownRight className="w-5 h-5 text-gray-400 mt-2 shrink-0" />
      <div className="-rotate-2 rounded-2xl bg-gray-500 text-white px-4 py-3 shadow-lg">
        <p className="text-sm">{text}</p>
        <span className="mt-2 inline-flex items-center gap-1 rounded-xl bg-white/20 px-3 py-1.5 text-sm font-semibold">
          {button} <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
}
