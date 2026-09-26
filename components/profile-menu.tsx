"use client";
import Image from "next/image";
import Link from "next/link";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Compass, Instagram, LogOut, Pencil, UserRound, Users } from "lucide-react";
import { colorTile } from "@/lib/workspace-colors";
import { startProductTour } from "@/components/product-tour";
import { signOut } from "next-auth/react";
import { FacebookIcon, GoogleIcon } from "@/components/brand";

/**
 * The avatar in the top bar, as a menu: who you're signed in as (with a quick
 * edit), shortcuts into the Settings tabs, and Log out — the one place in the
 * app to sign out.
 */
export function ProfileMenu({
  user, workspace,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  /** The workspace you're in, for the menu's Workspace group. */
  workspace?: { name: string; color: string };
}) {
  const display = user.name && user.name !== "AutoFlow" ? user.name : "Your account";
  const initial = (user.name || user.email || "U")[0]?.toUpperCase();

  return (
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
                <Link href="/settings?tab=profile" className="group flex items-center gap-1.5 text-sm text-gray-500 outline-none hover:text-gray-900 data-[highlighted]:text-gray-900">
                  <span className="truncate underline decoration-gray-300 underline-offset-2">{user.email}</span>
                  <Pencil className="w-3.5 h-3.5 shrink-0" />
                </Link>
              </Menu.Item>
            </div>
          </div>

          {workspace && (
            <>
              <Menu.Separator className="my-1 h-px bg-gray-100" />
              <p className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400 flex items-center gap-2 min-w-0">
                Workspace
                <span className={`w-4 h-4 rounded-[5px] text-[9px] font-extrabold flex items-center justify-center normal-case tracking-normal ${colorTile(workspace.color)}`}>
                  {(workspace.name.trim()[0] ?? "W").toUpperCase()}
                </span>
                <span className="truncate normal-case tracking-normal text-gray-500">{workspace.name}</span>
              </p>
              <Item href="/settings?tab=team" icon={Users}>Team</Item>
              <Item href="/settings" icon={Instagram}>Instagram account</Item>
            </>
          )}

          <Menu.Separator className="my-1 h-px bg-gray-100" />
          <p className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">Your account</p>
          <Item href="/settings?tab=profile" icon={UserRound}>Manage profile</Item>
          <Menu.Item asChild>
            <Link
              href="/settings?tab=sign-in"
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 outline-none data-[highlighted]:bg-[#f7f8f5] data-[highlighted]:text-gray-950"
            >
              Add sign-in options
              <span className="flex items-center gap-1.5">
                <FacebookIcon className="w-4 h-4 text-[#1877F2]" />
                <GoogleIcon className="w-4 h-4" />
              </span>
            </Link>
          </Menu.Item>
          <Menu.Item
            onSelect={() => setTimeout(startProductTour, 150)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 outline-none data-[highlighted]:bg-[#f7f8f5] data-[highlighted]:text-gray-950 cursor-pointer"
          >
            <Compass className="w-4 h-4 text-gray-400" /> Take the tour
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
