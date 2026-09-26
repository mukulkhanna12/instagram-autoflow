import Image from "next/image";
import Link from "next/link";
import { Instagram, Plus } from "lucide-react";
import { NewAutomationButton } from "@/components/new-automation";
import { ProfileMenu } from "@/components/profile-menu";
import { CommandSearch } from "@/components/command-search";

interface TopbarProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
  workspace?: { name: string; color: string };
  igAccount: { username: string; profilePicUrl: string | null } | null;
}

/**
 * The signed-in header: search (⌘K) on the left; the connected Instagram
 * account and your profile menu together on the right.
 */
export function Topbar({ user, igAccount, workspace }: TopbarProps) {
  return (
    <header className="rounded-3xl bg-white px-4 sm:px-5 h-[76px] flex items-center gap-3">
      <div data-tour="search" className="flex-1 min-w-0 max-w-sm">
        <CommandSearch />
      </div>
      {/* Creating lives up here, next to search — not as a big sidebar button. */}
      <div data-tour="new-automation" className="shrink-0">
        <NewAutomationButton className="inline-flex items-center gap-1.5 h-11 pl-3.5 pr-4 rounded-full bg-gray-950 text-white text-sm font-bold hover:bg-brand-900 transition-colors">
          <span className="w-6 h-6 rounded-full bg-lime text-gray-950 flex items-center justify-center">
            <Plus className="w-4 h-4" strokeWidth={2.75} />
          </span>
          <span className="hidden sm:inline">Create</span>
        </NewAutomationButton>
      </div>
      <div className="flex-1" />

      {igAccount ? (
        <Link
          href="/settings"
          data-tour="instagram"
          title="Connected Instagram account"
          className="hidden md:flex items-center gap-2.5 rounded-full border border-gray-100 pl-1.5 pr-3.5 h-11 hover:border-gray-200 hover:bg-[#fafbf8] transition-colors min-w-0"
        >
          <span className="relative w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 p-[2px] shrink-0">
            <span className="relative block w-full h-full rounded-full overflow-hidden bg-gray-200 ring-2 ring-white">
              {igAccount.profilePicUrl ? (
                <Image src={igAccount.profilePicUrl} alt="" fill unoptimized className="object-cover" />
              ) : (
                <Instagram className="w-3.5 h-3.5 m-[5px] text-gray-500" />
              )}
            </span>
          </span>
          <span className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">@{igAccount.username}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-label="Connected" />
        </Link>
      ) : (
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 h-11 text-sm font-semibold text-amber-800 hover:bg-amber-100 shrink-0"
        >
          <Instagram className="w-4 h-4" /> <span className="hidden sm:inline">Connect Instagram</span>
        </Link>
      )}

      <span className="hidden md:block w-px h-8 bg-gray-100" aria-hidden />
      <div data-tour="profile" className="shrink-0"><ProfileMenu user={user} workspace={workspace} /></div>
    </header>
  );
}
