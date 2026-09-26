"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import * as Menu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, Instagram, LogOut, Pencil, UserRound, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { FacebookIcon, GoogleIcon } from "@/components/brand";
import { SignInMethods } from "@/components/sign-in-methods";

/**
 * The avatar in the top bar, as a menu: who you're signed in as (with a quick
 * edit), profile and Instagram settings, "Add sign-in options" — which opens a
 * dialog to connect Google or Facebook to this account — and Log out.
 */
export function ProfileMenu({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
}) {
  const params = useSearchParams();
  const path = usePathname();
  const linkedNow = params.get("linked");
  // Coming back from Google/Facebook after connecting: reopen the dialog so the
  // "now connected" confirmation is the first thing seen. Settings shows the
  // same list inline, so it doesn't need the dialog on top.
  const [signInOpen, setSignInOpen] = useState(!!linkedNow && path !== "/settings");

  const display = user.name && user.name !== "AutoFlow" ? user.name : "Your account";
  const initial = (user.name || user.email || "U")[0]?.toUpperCase();

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          className="flex items-center gap-3 min-w-0 shrink-0 rounded-full pl-1 pr-2 py-1 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer"
          aria-label="Account menu"
        >
          <Avatar image={user.image} initial={initial} size="w-11 h-11" />
          <span className="hidden sm:block min-w-0 text-left">
            <span className="block text-[15px] font-bold text-gray-950 truncate">{display}</span>
            <span className="block text-sm text-gray-400 truncate">{user.email}</span>
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Content
            align="end"
            sideOffset={8}
            className="z-50 w-80 rounded-3xl bg-white border border-gray-100 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3)] p-2"
          >
            <div className="flex items-center gap-4 px-3 pt-3 pb-4">
              <Avatar image={user.image} initial={initial} size="w-16 h-16" text="text-2xl" />
              <div className="min-w-0">
                <p className="text-lg font-extrabold text-gray-950 truncate">{display}</p>
                <Menu.Item asChild>
                  <Link href="/settings#profile" className="group flex items-center gap-1.5 text-sm text-gray-500 outline-none hover:text-gray-900 data-[highlighted]:text-gray-900">
                    <span className="truncate underline decoration-gray-300 underline-offset-2">{user.email}</span>
                    <Pencil className="w-3.5 h-3.5 shrink-0" />
                  </Link>
                </Menu.Item>
              </div>
            </div>

            <Menu.Separator className="my-1 h-px bg-gray-100" />
            <Item href="/settings#profile" icon={UserRound}>Manage profile</Item>
            <Item href="/settings" icon={Instagram}>Instagram account</Item>

            <Menu.Separator className="my-1 h-px bg-gray-100" />
            <Menu.Item
              onSelect={() => setSignInOpen(true)}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 outline-none data-[highlighted]:bg-[#f7f8f5] data-[highlighted]:text-gray-950 cursor-pointer"
            >
              Add sign-in options
              <span className="flex items-center gap-1.5">
                <FacebookIcon className="w-4 h-4 text-[#1877F2]" />
                <GoogleIcon className="w-4 h-4" />
              </span>
            </Menu.Item>
            <Menu.Item
              onSelect={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 outline-none data-[highlighted]:bg-red-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Log out
            </Menu.Item>
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>

      <Dialog.Root open={signInOpen} onOpenChange={setSignInOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" />
          <Dialog.Content
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[2rem] bg-white shadow-2xl focus:outline-none"
          >
            <div className="flex items-center justify-between px-6 sm:px-8 pt-6 pb-4 border-b border-gray-100">
              <Dialog.Title className="text-xl font-extrabold text-gray-950">Manage sign-in options</Dialog.Title>
              <Dialog.Close aria-label="Close" className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-950 cursor-pointer">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>
            <div className="px-6 sm:px-8 py-6">
              <Dialog.Description className="text-sm text-gray-500 mb-5">
                Connect Google or Facebook as a backup way into this account. Once connected, you can log
                in with any of them.
              </Dialog.Description>
              <SignInMethods linkedNow={linkedNow} returnTo={path} />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function Item({ href, icon: Icon, children }: { href: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <Menu.Item asChild>
      <Link
        href={href}
        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 outline-none data-[highlighted]:bg-[#f7f8f5] data-[highlighted]:text-gray-950"
      >
        <Icon className="w-4 h-4 text-gray-400" /> {children}
      </Link>
    </Menu.Item>
  );
}

function Avatar({ image, initial, size, text = "text-base" }: { image?: string | null; initial?: string; size: string; text?: string }) {
  return (
    <span className={`relative ${size} rounded-full overflow-hidden bg-lime-200 shrink-0 flex items-center justify-center`}>
      {image ? (
        <Image src={image} alt="" fill unoptimized className="object-cover" />
      ) : (
        <span className={`font-bold text-brand-900 ${text}`}>{initial}</span>
      )}
    </span>
  );
}
