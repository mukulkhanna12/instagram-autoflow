"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, LogOut, UserMinus, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A designed replacement for window.confirm().
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Leave Acme?", body: "…", confirmLabel: "Leave", tone: "danger" }))) return;
 *
 * Wrap the app (or a subtree) in <ConfirmProvider>. Resolves true on confirm,
 * false on cancel, Escape or clicking outside.
 */

export interface ConfirmOptions {
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  icon?: "leave" | "remove" | "warning";
}

const ConfirmContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  // Outside a provider, fall back to the browser's own dialog rather than failing.
  return ctx ?? (async (o: ConfirmOptions) => window.confirm(o.title));
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);

  function close(v: boolean) {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  }

  const Icon = opts?.icon === "leave" ? LogOut : opts?.icon === "remove" ? UserMinus : AlertTriangle;
  const danger = opts?.tone === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog.Root open={!!opts} onOpenChange={(o) => !o && close(false)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed z-[61] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md rounded-[2rem] bg-white p-7 shadow-2xl focus:outline-none">
            <Dialog.Close aria-label="Close" className="absolute right-5 top-5 w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 cursor-pointer">
              <X className="w-5 h-5" />
            </Dialog.Close>
            <span className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center",
              danger ? "bg-red-50 text-red-600" : "bg-lime-100 text-brand-800"
            )}>
              <Icon className="w-6 h-6" />
            </span>
            <Dialog.Title className="mt-5 text-xl font-extrabold text-gray-950 pr-8">{opts?.title}</Dialog.Title>
            {opts?.body && <Dialog.Description asChild><div className="mt-2 text-sm text-gray-600 leading-relaxed">{opts.body}</div></Dialog.Description>}
            <div className="mt-7 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                onClick={() => close(false)}
                className="h-11 px-5 rounded-full border border-gray-200 text-sm font-bold text-gray-700 hover:border-gray-300 cursor-pointer"
              >
                {opts?.cancelLabel ?? "Cancel"}
              </button>
              <button
                autoFocus
                onClick={() => close(true)}
                className={cn(
                  "h-11 px-5 rounded-full text-sm font-extrabold cursor-pointer",
                  danger ? "bg-red-600 text-white hover:bg-red-700" : "bg-lime text-gray-950 hover:bg-lime-400"
                )}
              >
                {opts?.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </ConfirmContext.Provider>
  );
}
