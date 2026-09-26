"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight, BarChart3, BookMarked, ChevronDown, Filter, Menu, MessageCircle, UserPlus, X,
} from "lucide-react";
import { Logo } from "@/components/brand";
import { PLAYBOOKS } from "@/lib/playbooks";
import { cn } from "@/lib/utils";

/**
 * The public site header — landing, pricing and privacy pages.
 *
 * A thin announcement bar, then the nav: a Product menu describing what the
 * app does, section links, Pricing, and the two account actions. It gains a
 * shadow once the page scrolls, and collapses into a full-width sheet on
 * phones (the old header simply hid its links there).
 */

const PRODUCT = [
  { icon: MessageCircle, title: "Comment → DM", body: "Reply publicly and DM your link, automatically", href: "/#features" },
  { icon: Filter, title: "Keyword triggers", body: "Only answer comments that ask for it", href: "/#features" },
  { icon: UserPlus, title: "Follow gate", body: "The link unlocks once they follow", href: "/#features" },
  { icon: BookMarked, title: "Playbooks", body: `${PLAYBOOKS.length} ready-made automations`, href: "/login" },
  { icon: BarChart3, title: "Analytics", body: "See which reels bring followers", href: "/login" },
];

const LINKS = [
  { label: "How it works", href: "/#how" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/#faq" },
  { label: "Help", href: "/help" },
];

export function SiteHeader() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the phone menu when navigating, and don't let the page scroll under it.
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header className="sticky top-0 z-40">
      {/* Announcement */}
      <Link
        href="/login"
        className="block bg-brand-950 text-white text-center text-[13px] font-medium px-4 py-2 hover:bg-brand-900 transition-colors"
      >
        <span className="rounded-full bg-lime text-gray-950 text-[11px] font-extrabold px-2 py-0.5 mr-2">New</span>
        {PLAYBOOKS.length} ready-made Playbooks<span className="hidden sm:inline"> — set up a reel in under a minute</span>
        <ArrowRight className="inline w-3.5 h-3.5 ml-1 -mt-0.5" />
      </Link>

      <div className={cn(
        "bg-white/90 backdrop-blur border-b transition-shadow",
        scrolled ? "border-gray-100 shadow-[0_6px_24px_-12px_rgba(0,0,0,0.15)]" : "border-transparent"
      )}>
        <nav className="max-w-6xl mx-auto px-5 h-[68px] flex items-center gap-8">
          <Logo />

          <div className="hidden md:flex items-center gap-1 text-[15px] font-semibold text-gray-600">
            {/* Product menu — opens on hover and on click/keyboard */}
            <div
              className="relative"
              onMouseEnter={() => setProductOpen(true)}
              onMouseLeave={() => setProductOpen(false)}
            >
              <button
                onClick={() => setProductOpen((v) => !v)}
                aria-expanded={productOpen}
                className="inline-flex items-center gap-1 h-10 px-3 rounded-full hover:text-gray-950 hover:bg-gray-50 cursor-pointer"
              >
                Product <ChevronDown className={cn("w-4 h-4 transition-transform", productOpen && "rotate-180")} />
              </button>
              {productOpen && (
                <div className="absolute left-0 top-full pt-2">
                  <div className="w-[420px] rounded-3xl bg-white border border-gray-100 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3)] p-3 grid gap-1">
                    {PRODUCT.map((p) => (
                      <Link
                        key={p.title}
                        href={p.href}
                        onClick={() => setProductOpen(false)}
                        className="flex items-start gap-3 rounded-2xl p-3 hover:bg-[#f7f8f5]"
                      >
                        <span className="w-9 h-9 rounded-xl bg-lime-100 text-brand-800 flex items-center justify-center shrink-0">
                          <p.icon className="w-4 h-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-bold text-gray-950">{p.title}</span>
                          <span className="block text-xs text-gray-500 mt-0.5">{p.body}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className={cn(
                  "h-10 px-3 rounded-full inline-flex items-center hover:text-gray-950 hover:bg-gray-50",
                  path === l.href && "text-gray-950"
                )}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="hidden sm:inline-flex h-11 items-center text-[15px] font-semibold text-gray-700 hover:text-gray-950 px-3">
              Log in
            </Link>
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-lime text-gray-950 font-bold hover:bg-lime-400 shadow-[inset_0_-3px_0_rgba(0,0,0,0.08)] transition-colors"
            >
              Get started free <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="md:hidden w-11 h-11 rounded-full flex items-center justify-center text-gray-800 hover:bg-gray-100 cursor-pointer"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>
      </div>

      {/* Phone menu */}
      {open && (
        <div className="md:hidden absolute inset-x-0 top-full h-[calc(100dvh-100%)] bg-white overflow-y-auto px-5 pb-8 border-t border-gray-100">
          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">Product</p>
          <div className="mt-2 grid gap-1">
            {PRODUCT.map((p) => (
              <Link key={p.title} href={p.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl p-3 hover:bg-[#f7f8f5]">
                <span className="w-9 h-9 rounded-xl bg-lime-100 text-brand-800 flex items-center justify-center shrink-0">
                  <p.icon className="w-4 h-4" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-gray-950">{p.title}</span>
                  <span className="block text-xs text-gray-500">{p.body}</span>
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-4 border-t border-gray-100 pt-4 grid">
            {LINKS.map((l) => (
              <Link key={l.label} href={l.href} onClick={() => setOpen(false)} className="py-3 text-lg font-bold text-gray-950">
                {l.label}
              </Link>
            ))}
          </div>
          <div className="mt-6 grid gap-3">
            <Link href="/login" className="h-12 rounded-full bg-lime text-gray-950 font-extrabold flex items-center justify-center gap-2">
              Get started free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="h-12 rounded-full border border-gray-200 font-bold text-gray-800 flex items-center justify-center">
              Log in
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
