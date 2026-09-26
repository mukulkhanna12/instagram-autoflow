import { Plus } from "lucide-react";
import { NewAutomationButton } from "@/components/new-automation";
import { ProfileMenu } from "@/components/profile-menu";
import { CommandSearch } from "@/components/command-search";

interface TopbarProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
}

/**
 * The signed-in header: search (⌘K) and Create on the left, your profile menu
 * on the right. The Instagram connection lives in Settings (and the sidebar
 * usage box flags it when it's missing).
 */
export function Topbar({ user }: TopbarProps) {
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

      <div data-tour="profile" className="shrink-0"><ProfileMenu user={user} /></div>
    </header>
  );
}
