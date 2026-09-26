import Link from "next/link";
import { Logo } from "@/components/brand";
import { HelpAssistant } from "@/components/help/help-assistant";
import { SUPPORT } from "@/lib/help/articles";

export const metadata = {
  title: "Help Center — AutoFlow",
  description: "Guides and answers for setting up Instagram comment-to-DM automations with AutoFlow.",
};

/** Public: the help center is readable before you sign up, and linked from the app. */
export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8f5] text-gray-950">
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/85 backdrop-blur">
        <nav className="mx-auto flex h-[72px] max-w-6xl items-center gap-3 px-5">
          <Logo />
          <span className="hidden h-6 w-px bg-gray-200 sm:block" />
          <Link href="/help" className="hidden text-[15px] font-bold sm:inline text-gray-600 hover:text-gray-950">Help Center</Link>
          <Link
            href="/dashboard"
            className="ml-auto inline-flex h-11 items-center whitespace-nowrap rounded-full bg-lime px-5 font-bold text-gray-950 shadow-[inset_0_-3px_0_rgba(0,0,0,0.08)] transition-colors hover:bg-lime-400"
          >
            Open AutoFlow
          </Link>
        </nav>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-8 text-sm text-gray-500">
          <span>© {new Date().getFullYear()} AutoFlow</span>
          <Link href="/help" className="hover:text-gray-950">Help Center</Link>
          <Link href="/privacy" className="hover:text-gray-950">Privacy</Link>
          <a href={SUPPORT.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gray-950">
            Contact @{SUPPORT.instagram}
          </a>
        </div>
      </footer>

      <HelpAssistant />
    </div>
  );
}
