import Link from "next/link";
import { ArrowRight, ArrowUp, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand";
import { PLAYBOOKS } from "@/lib/playbooks";

/**
 * The public site footer — landing page and privacy page.
 *
 * Every link goes somewhere that exists today. Playbooks sit behind sign-in,
 * so their links lead to /login rather than to a page a visitor can't open.
 * There's no newsletter, blog or social account yet, so there are no
 * placeholders for them either.
 */

const COLUMNS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#how" },
      { label: "Playbooks", href: "/login" },
      { label: "Analytics", href: "/login" },
      { label: "Pricing", href: "/pricing" },
      { label: "FAQ", href: "/#faq" },
      { label: "Help center", href: "/help" },
    ],
  },
  {
    title: "Popular playbooks",
    links: PLAYBOOKS.filter((p) => p.featured).slice(0, 5).map((p) => ({
      label: `${p.emoji} ${p.title}`,
      href: "/login",
    })),
  },
  {
    title: "Account",
    links: [
      { label: "Get started free", href: "/login" },
      { label: "Log in", href: "/login" },
      { label: "Privacy policy", href: "/privacy" },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden bg-brand-950 text-white">
      {/* Soft lime glow in the corner, echoing the hero */}
      <div className="pointer-events-none absolute -top-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-lime/10 blur-3xl" aria-hidden />

      <div className="relative max-w-6xl mx-auto px-5 pt-16 pb-10">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          {/* Brand */}
          <div>
            <Logo light />
            <p className="mt-5 text-2xl font-extrabold tracking-tight">
              Every comment,{" "}
              <span className="text-lime">answered.</span>
            </p>
            <p className="mt-3 text-sm text-white/60 max-w-sm leading-relaxed">
              Turn reel comments into followers, leads and sales — with ready-made playbooks,
              a follow gate and analytics that show what&apos;s working.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-lime text-gray-950 text-sm font-extrabold hover:bg-lime-400 transition-colors"
            >
              Get started free <ArrowRight className="w-4 h-4" />
            </Link>

            <ul className="mt-8 space-y-2.5 text-sm text-white/70">
              <li className="flex items-center gap-2.5"><ShieldCheck className="w-4 h-4 text-lime" /> Runs on Instagram&apos;s official API</li>
              <li className="flex items-center gap-2.5"><Lock className="w-4 h-4 text-lime" /> Your password is never shared</li>
              <li className="flex items-center gap-2.5"><Sparkles className="w-4 h-4 text-lime" /> Free to use</li>
            </ul>
          </div>

          {/* Link columns */}
          <nav className="grid grid-cols-2 sm:grid-cols-3 gap-8" aria-label="Footer">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">{col.title}</p>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm font-medium text-white/75 hover:text-lime transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Oversized wordmark */}
        <p
          className="mt-16 select-none text-center font-extrabold tracking-tighter leading-none text-[18vw] lg:text-[11rem] bg-gradient-to-b from-white/[0.14] to-white/0 bg-clip-text text-transparent"
          aria-hidden
        >
          AutoFlow
        </p>

        {/* Legal row */}
        <div className="mt-4 pt-6 border-t border-white/10 flex flex-col-reverse sm:flex-row sm:items-center gap-4 justify-between text-xs text-white/45">
          <p>
            © {year} AutoFlow. Not affiliated with, endorsed or sponsored by Instagram or Meta.
            Instagram is a trademark of Meta Platforms, Inc.
          </p>
          <div className="flex items-center gap-5 shrink-0">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <a href="#" className="inline-flex items-center gap-1 hover:text-white">
              Back to top <ArrowUp className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
