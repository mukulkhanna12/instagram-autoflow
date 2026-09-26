import Link from "next/link";
import { ArrowRight, Check, Clock, Minus, ShieldCheck, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { PLAYBOOKS } from "@/lib/playbooks";
import { FREE_PLAN } from "@/lib/plans";
import { CurrencySwitch, Price } from "@/components/landing/price-tag";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Pricing — AutoFlow",
  description: "Start free with everything AutoFlow does today. Pro is coming soon.",
};

/**
 * Pricing. There is no billing in the app, so only the Free plan can be
 * chosen; Pro is shown with what it will add but no price, and its button
 * signs people up so they're already in when it launches. Everything listed
 * under Free exists today — keep it that way when editing.
 */

const FREE = [
  "1 Instagram account",
  `${FREE_PLAN.reels} reels with automations`,
  `${FREE_PLAN.automations} automation on the Automations page`,
  "Every feature — nothing held back",
  `All ${PLAYBOOKS.length} ready-made Playbooks`,
  "Keyword triggers and public replies",
  "Follow gate — links unlock for followers",
  "Prepare flows for reels you haven't posted",
  "Catch up on comments from the last 7 days",
  "Analytics and quick stats",
];

const PRO = [
  "Everything in Free",
  "More Instagram accounts",
  "Story reply triggers",
  "Inbox keyword triggers",
  "Collect emails before the link",
  "Priority support",
];

type Cell = boolean | string;
const COMPARE: Array<{ group: string; rows: Array<[string, Cell, Cell]> }> = [
  {
    group: "Automations",
    rows: [
      ["Instagram accounts", "1", "More"],
      ["Reels with automations", String(FREE_PLAN.reels), "More"],
      ["Automations (Automations page)", String(FREE_PLAN.automations), "More"],
      ["Ready-made Playbooks", String(PLAYBOOKS.length), String(PLAYBOOKS.length)],
      ["Keyword filter + public reply variants", true, true],
      ["Follow gate", true, true],
      ["Flows for upcoming reels", true, true],
      ["Catch up on old comments (7 days)", true, true],
    ],
  },
  {
    group: "Triggers",
    rows: [
      ["Reel comments", true, true],
      ["Story replies", false, "Coming"],
      ["Inbox keywords", false, "Coming"],
      ["Email capture", false, "Coming"],
    ],
  },
  {
    group: "Insights & support",
    rows: [
      ["Analytics and quick stats", true, true],
      ["Priority support", false, true],
    ],
  },
];

const FAQ = [
  {
    q: "What's included in Free?",
    a: `Every feature — playbooks, keyword triggers, the follow gate, analytics, prepared flows for your next reel — on ${FREE_PLAN.reels} reels, plus ${FREE_PLAN.automations} automation on the Automations page. Pro will lift those limits.`,
  },
  {
    q: "Is the Free plan really free?",
    a: "Yes — no card, no trial clock. It includes everything the app does today. New accounts are approved by hand while we grow, so there may be a short wait after you sign up.",
  },
  {
    q: "How many DMs can I send?",
    a: "As many as Instagram allows. Meta caps automated first messages at 750 per hour per account; AutoFlow stays inside that limit on every plan.",
  },
  {
    q: "When is Pro coming, and what will it cost?",
    a: "We'll announce the price before it launches. Sign up now and you'll hear first — nothing you set up on Free is lost when you move over.",
  },
  {
    q: "Is it safe for my Instagram account?",
    a: "AutoFlow uses Instagram's official API and login only. No password sharing and no browser bots.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-950">
      <SiteHeader />

      <section className="max-w-6xl mx-auto px-5 pt-16 pb-10 text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-lime-100 text-brand-900 text-sm font-bold px-3.5 py-1.5">
          <Sparkles className="w-4 h-4" /> Simple pricing
        </p>
        <h1 className="mt-5 text-4xl sm:text-6xl font-extrabold tracking-tight">
          Start free. <span className="bg-lime px-2 rounded-lg">Grow</span> when you&apos;re ready.
        </h1>
        <p className="mt-5 text-lg text-gray-600 max-w-2xl mx-auto">
          Every feature, free, on up to 3 reels. Pro will add more reels, more accounts and new ways to start a conversation.
        </p>
      </section>

      <div className="flex justify-center mb-8 px-5">
        <CurrencySwitch />
      </div>

      {/* Plans */}
      <section className="max-w-4xl mx-auto px-5 grid md:grid-cols-2 gap-5">
        <div className="relative rounded-[2rem] bg-brand-950 text-white p-8 shadow-[0_30px_60px_-30px_rgba(11,35,22,0.6)]">
          <span className="absolute top-6 right-6 rounded-full bg-lime text-gray-950 text-xs font-extrabold px-3 py-1">Available now</span>
          <p className="text-lg font-bold">Free</p>
          <p className="mt-4 flex items-end gap-1.5">
            <Price inr={0} usd={0} className="text-6xl font-extrabold tracking-tight" />
            <span className="text-white/60 mb-2">/ month</span>
          </p>
          <p className="mt-2 text-sm text-white/60">No card needed.</p>
          <Link
            href="/login"
            className="mt-7 h-12 rounded-full bg-lime text-gray-950 font-extrabold flex items-center justify-center gap-2 hover:bg-lime-400 transition-colors"
          >
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
          <ul className="mt-8 space-y-3">
            {FREE.map((f) => (
              <li key={f} className="flex items-start gap-3 text-[15px] text-white/85">
                <Check className="w-5 h-5 text-lime shrink-0" /> {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative rounded-[2rem] bg-white border-2 border-dashed border-gray-200 p-8">
          <span className="absolute top-6 right-6 inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1">
            <Clock className="w-3.5 h-3.5" /> Coming soon
          </span>
          <p className="text-lg font-bold">Pro</p>
          <p className="mt-4 text-3xl font-extrabold tracking-tight text-gray-950 min-h-[60px] flex items-end">
            Price announced at launch
          </p>
          <p className="mt-2 text-sm text-gray-500">For creators and brands running several accounts.</p>
          <Link
            href="/login"
            className="mt-7 h-12 rounded-full border-2 border-gray-950 text-gray-950 font-extrabold flex items-center justify-center gap-2 hover:bg-gray-950 hover:text-white transition-colors"
          >
            Sign up to hear first
          </Link>
          <ul className="mt-8 space-y-3">
            {PRO.map((f) => (
              <li key={f} className="flex items-start gap-3 text-[15px] text-gray-700">
                <Check className="w-5 h-5 text-brand-600 shrink-0" /> {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="mt-6 text-center text-sm text-gray-500 flex items-center justify-center gap-2 px-5">
        <ShieldCheck className="w-4 h-4 text-brand-600" />
        Official Instagram API · Stays inside Meta&apos;s 750 DMs/hour limit on every plan
      </p>

      {/* Comparison */}
      <section className="max-w-4xl mx-auto px-5 py-20">
        <h2 className="text-3xl font-extrabold tracking-tight text-center">Compare plans</h2>
        <div className="mt-8 rounded-3xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-[1.6fr_1fr_1fr] bg-[#f7f8f5] px-5 py-4 text-sm font-bold">
            <span />
            <span className="text-center">Free</span>
            <span className="text-center">Pro</span>
          </div>
          {COMPARE.map((g) => (
            <div key={g.group}>
              <p className="px-5 pt-5 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">{g.group}</p>
              {g.rows.map(([label, free, pro]) => (
                <div key={label} className="grid grid-cols-[1.6fr_1fr_1fr] items-center px-5 py-3 border-t border-gray-50 text-sm">
                  <span className="text-gray-800">{label}</span>
                  <CellView v={free} />
                  <CellView v={pro} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#f3f4f1]">
        <div className="max-w-3xl mx-auto px-5 py-20">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center">Pricing questions</h2>
          <div className="mt-10 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl bg-white px-6 py-5 open:pb-6">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-lg font-bold">
                  {f.q}
                  <span className="w-8 h-8 rounded-full bg-[#f3f4f1] flex items-center justify-center shrink-0 text-xl leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-gray-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function CellView({ v }: { v: Cell }) {
  if (v === true) return <span className="flex justify-center"><Check className="w-5 h-5 text-brand-600" /></span>;
  if (v === false) return <span className="flex justify-center"><Minus className="w-5 h-5 text-gray-300" /></span>;
  return (
    <span className={cn("text-center font-semibold", v === "Coming" ? "text-gray-400" : "text-gray-900")}>{v}</span>
  );
}
