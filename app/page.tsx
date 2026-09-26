import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Check, Clock, Filter, History, Instagram, Lock, MessageCircle, Repeat2,
  ShieldCheck, UserPlus, Wand2, Zap,
} from "lucide-react";
import { DmMockup } from "@/components/landing/dm-mockup";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

const FEATURES = [
  { icon: MessageCircle, title: "Reel comment replies", body: "Someone comments, AutoFlow replies publicly and slides into their DMs — seconds later, day or night." },
  { icon: Filter, title: "Keyword triggers", body: "Only answer comments that ask for it — “LINK”, “GUIDE”, “PRICE”. Everything else is left alone." },
  { icon: UserPlus, title: "Follow gate", body: "Ask people to follow before the link unlocks. Every reel becomes a follower magnet." },
  { icon: Wand2, title: "Ready for your next reel", body: "Write the flow before you post. It switches on by itself when the reel gets its first comment." },
  { icon: Repeat2, title: "Human-sounding replies", body: "Rotate between reply variations so a busy reel never looks like a bot talking to itself." },
  { icon: History, title: "Catch up on old comments", body: "Set up late? Answer everyone who commented in the last 7 days with one click." },
];

const STEPS = [
  { n: 1, title: "Connect Instagram", body: "Log in through Instagram's official login. We never see your password.", tag: "Connected ✓" },
  { n: 2, title: "Write your reply and DM", body: "Pick a reel, choose a keyword, and write the message with your link.", tag: "Keyword: LINK" },
  { n: 3, title: "Go live", body: "Flip the switch. From now on, every matching comment gets answered.", tag: "Live · auto-replying" },
];

const FAQ = [
  {
    q: "What kind of Instagram account do I need?",
    a: "A Creator or Business account. Personal accounts can't use Instagram's messaging API — switching is free in the Instagram app under Settings → Account type.",
  },
  {
    q: "Is it safe for my account?",
    a: "AutoFlow only uses Instagram's official API and login — no password sharing, no browser bots. It also stays inside Instagram's own limits, like 750 automated first messages per hour.",
  },
  {
    q: "Can it reply to comments from before I set it up?",
    a: "Yes, for comments up to 7 days old — Instagram doesn't allow a DM reply to anything older. You choose when to run it; nothing is sent automatically.",
  },
  {
    q: "Will it reply twice to the same person?",
    a: "No. Each comment gets one reply, and replies inside a comment thread are ignored. A fresh comment on the reel is treated as a fresh request.",
  },
  {
    q: "How much does it cost?",
    a: "The Free plan costs nothing and has everything in the app today. A Pro plan with more accounts and new triggers is on the way — see Pricing. New accounts are approved by hand while we grow, so there may be a short wait after you sign up.",
  },
];

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <SiteHeader />

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 pt-16 pb-24 grid lg:grid-cols-[1.15fr_1fr] gap-14 items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-100 text-brand-800 text-sm font-bold px-4 py-1.5">
            <Instagram className="w-4 h-4" /> Instagram DM automation
          </p>
          <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.02]">
            Every comment,{" "}
            <span className="relative whitespace-nowrap">
              <span className="absolute inset-x-0 bottom-1 sm:bottom-2 h-4 sm:h-6 bg-lime -rotate-1 rounded" aria-hidden />
              <span className="relative">answered.</span>
            </span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 leading-relaxed max-w-xl">
            Turn reel comments into instant DMs with your link — and new followers — automatically.
            You post. AutoFlow handles the replies.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 h-14 px-8 rounded-full bg-gray-950 text-white text-lg font-bold hover:bg-gray-800 transition-colors"
            >
              Get started free <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#how" className="inline-flex items-center h-14 px-6 rounded-full border-2 border-gray-200 text-lg font-bold hover:border-gray-950 transition-colors">
              See how it works
            </a>
          </div>
          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-gray-500">
            <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-brand-600" /> Official Instagram API</li>
            <li className="flex items-center gap-2"><Lock className="w-4 h-4 text-brand-600" /> No password shared</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-600" /> Free to use</li>
          </ul>
        </div>
        <DmMockup />
      </section>

      {/* The opportunity */}
      <section className="bg-[#f3f4f1]">
        <div className="max-w-6xl mx-auto px-5 py-24">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-700">The opportunity</p>
          <h2 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight max-w-3xl leading-[1.08]">
            Your comments are full of people asking. Most never hear back.
          </h2>
          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {[
              { icon: Clock, big: "Minutes", body: "is how long a curious commenter waits before they scroll away. Answering by hand, you lose most of them." },
              { icon: MessageCircle, big: "Every", body: "comment that asks for your link gets it — in their DMs, where they actually tap it." },
              { icon: UserPlus, big: "Follow", body: "before the link unlocks, so a viral reel turns into followers who'll see the next one." },
            ].map((c, i) => (
              <div key={c.big} className={i === 0 ? "rounded-3xl p-7 bg-gradient-to-br from-brand-600 to-brand-900 text-white" : "rounded-3xl p-7 bg-white"}>
                <c.icon className={i === 0 ? "w-7 h-7 text-lime" : "w-7 h-7 text-brand-600"} />
                <p className="mt-6 text-4xl font-extrabold tracking-tight">{c.big}</p>
                <p className={i === 0 ? "mt-2 text-brand-100" : "mt-2 text-gray-600"}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-5 py-24 scroll-mt-20">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-700">Features</p>
        <h2 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight max-w-3xl leading-[1.08]">
          Everything a reel needs to sell itself
        </h2>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-3xl border-2 border-gray-100 p-7 hover:border-brand-200 transition-colors">
              <span className="w-12 h-12 rounded-2xl bg-lime flex items-center justify-center">
                <f.icon className="w-6 h-6 text-brand-900" />
              </span>
              <h3 className="mt-6 text-xl font-extrabold">{f.title}</h3>
              <p className="mt-2 text-gray-600 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-gray-950 text-white scroll-mt-20">
        <div className="max-w-6xl mx-auto px-5 py-24">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-lime">How it works</p>
          <h2 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">Three steps. No flowcharts.</h2>
          <p className="mt-4 text-lg text-gray-400">If you can write a caption, you can set this up.</p>
          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-3xl bg-white/[0.06] border border-white/10 p-7">
                <span className="w-11 h-11 rounded-full bg-lime text-gray-950 font-extrabold text-lg flex items-center justify-center">
                  {s.n}
                </span>
                <h3 className="mt-6 text-2xl font-extrabold">{s.title}</h3>
                <p className="mt-2 text-gray-400 leading-relaxed">{s.body}</p>
                <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-600/30 text-lime text-sm font-bold px-3.5 py-1.5">
                  <span className="w-2 h-2 rounded-full bg-lime" /> {s.tag}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Know what works */}
      <section className="max-w-6xl mx-auto px-5 py-24 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-700">Analytics</p>
          <h2 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08]">Know what works</h2>
          <p className="mt-5 text-lg text-gray-600 leading-relaxed">
            See, reel by reel, how many people commented, opened the DM, tapped your link and followed —
            so you know which content actually converts.
          </p>
          <ul className="mt-8 space-y-3 text-gray-700 font-medium">
            {["Contacts and messages per reel", "Click-through on every DM button", "Followers earned by the follow gate"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-lime flex items-center justify-center"><Check className="w-4 h-4 text-brand-900" /></span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        {/* Illustrative figures, labelled as such. */}
        <div className="rounded-[2rem] bg-[#eceee9] p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-3xl p-5 bg-gradient-to-br from-brand-600 to-brand-900 text-white">
              <p className="font-semibold">Contacts</p>
              <p className="text-4xl font-extrabold mt-4">1,284</p>
              <p className="text-sm text-lime-200 mt-3">312 this week</p>
            </div>
            <div className="rounded-3xl p-5 bg-white">
              <p className="font-semibold">Click-through</p>
              <p className="text-4xl font-extrabold mt-4">64%</p>
              <p className="text-sm text-gray-500 mt-3">on the first DM</p>
            </div>
          </div>
          <div className="rounded-3xl p-5 bg-white mt-4">
            <p className="font-semibold">Comment activity</p>
            <div className="flex items-end gap-3 h-32 mt-4">
              {[40, 70, 55, 95, 30, 0, 60].map((h, i) => (
                <div key={i} className={`flex-1 rounded-full ${h === 0 ? "hatch h-1/2" : i === 3 ? "bg-brand-900" : "bg-brand-600"}`} style={h ? { height: `${h}%` } : undefined} />
              ))}
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-3">Example figures</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-[#f3f4f1] scroll-mt-20">
        <div className="max-w-3xl mx-auto px-5 py-24">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-center">Questions, answered</h2>
          <div className="mt-12 space-y-3">
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

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-5 py-24">
        <div className="rounded-[2.5rem] bg-gradient-to-br from-brand-700 to-brand-950 text-white px-8 py-16 text-center relative overflow-hidden">
          <Zap className="absolute -right-10 -top-10 w-64 h-64 text-white/[0.04]" aria-hidden />
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Get started with AutoFlow today</h2>
          <p className="mt-4 text-lg text-brand-100">Connect Instagram, write one message, and let your next reel do the work.</p>
          <Link
            href="/login"
            className="mt-9 inline-flex items-center gap-2 h-14 px-8 rounded-full bg-lime text-gray-950 text-lg font-extrabold hover:bg-lime-400 transition-colors"
          >
            Get started free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
