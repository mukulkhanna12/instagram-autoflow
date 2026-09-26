import Link from "next/link";
import {
  ArrowRight, ChevronDown, Instagram, MessageCircleQuestion, Plug, Zap, Radio,
} from "lucide-react";
import { ARTICLES, CATEGORIES, SUPPORT, articlesIn, categoryById } from "@/lib/help/articles";
import { HelpSearch } from "@/components/help/help-search";
import { AskAssistantButton } from "@/components/help/ask-assistant-button";
import { CategoryIcon } from "@/components/help/category-icon";
import { AssistantPreview } from "@/components/help/assistant-preview";

const HERO_LINKS = [
  ["not-triggering", "Not replying"],
  ["no-dm-received", "DM not received"],
  ["keyword-triggers", "Keywords"],
  ["old-comments", "Old comments"],
];

const START_HERE = [
  { icon: Plug, title: "Connect Instagram", body: "Link your Creator or Business account through Instagram's own login.", slug: "connect-instagram" },
  { icon: Zap, title: "Automate a reel", body: "Pick a reel, write the reply and the DMs, and add a keyword.", slug: "first-automation" },
  { icon: Radio, title: "Go Live and test", body: "Flip the switch and comment from a second account to see it work.", slug: "first-automation" },
];

const FAQ = [
  {
    q: "Why does everyone get the greeting DM, even my followers?",
    a: "Instagram only lets an app check a follow after the person interacts with the DM. Tapping the greeting's button is that interaction, so the follow check happens then.",
    slug: "follow-gate",
  },
  {
    q: "Where did my DM go? They say they never got it.",
    a: "If they don't follow you, Instagram puts the DM in their Message Requests, not their main inbox. Mention “check your requests” in your public reply.",
    slug: "no-dm-received",
  },
  {
    q: "I posted a reel and nothing happened. Is it broken?",
    a: "No. Instagram doesn't tell apps when you post. A prepared flow attaches on the reel's first comment or at the daily sync, or straight away if you press the wand button.",
    slug: "new-reel-nothing-happened",
  },
  {
    q: "Can it reply to comments from before I set it up?",
    a: "Yes, for comments up to 7 days old. Press Check under “Comments from before setup” to preview first. Nothing is sent until you confirm.",
    slug: "old-comments",
  },
  {
    q: "Is there a limit on how many DMs it sends?",
    a: "Instagram allows 750 first DMs per hour per account. AutoFlow doesn't add limits of its own.",
    slug: "instagram-limits",
  },
];

export default function HelpHome() {
  const popular = ARTICLES.filter((a) => a.popular);

  return (
    <main>
      {/* Hero. Deliberately no z-index: that would trap the search results'
          z-20 inside it, under the overlapping "Start here" card. */}
      <section className="relative bg-brand-950">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-lime/15 blur-3xl" />
          <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-brand-500/25 blur-3xl" />
          {/* Faint dot grid for texture. */}
          <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px]" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-24 pt-14 lg:grid-cols-[1.2fr_1fr] lg:pb-28 lg:pt-20">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-lime ring-1 ring-white/10">
              <MessageCircleQuestion className="h-4 w-4" /> AutoFlow Help Center
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-[3.4rem]">
              Answers for every<br className="hidden sm:block" /> <span className="text-lime">comment-to-DM</span> question.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-brand-100/75">
              Set-up guides, how each step of a flow works, and fixes for when something doesn&apos;t send.
            </p>
            <div className="mt-8 max-w-xl">
              <HelpSearch />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm text-brand-100/60">Popular:</span>
              {HERO_LINKS.map(([slug, label]) => (
                <Link
                  key={slug}
                  href={`/help/${slug}`}
                  className="rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-white ring-1 ring-white/10 transition-colors hover:bg-lime hover:text-gray-950"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <AssistantPreview />
        </div>
      </section>

      {/* Start here */}
      <section className="relative z-10 mx-auto -mt-12 max-w-6xl px-5">
        <div className="rounded-[2rem] bg-white p-6 shadow-xl shadow-brand-950/5 ring-1 ring-gray-100 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-600">New here?</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Your first automation in 3 steps</h2>
            </div>
            <Link href="/help/category/getting-started" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:underline">
              All getting-started guides <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ol className="mt-6 grid gap-3 md:grid-cols-3">
            {START_HERE.map((s, i) => (
              <li key={s.title}>
                <Link
                  href={`/help/${s.slug}`}
                  className="group flex h-full gap-4 rounded-2xl bg-[#f5f7f1] p-5 transition-colors hover:bg-lime-50 hover:ring-1 hover:ring-lime-300"
                >
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm ring-1 ring-gray-100">
                    <s.icon className="h-5 w-5" />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-lime text-[11px] font-extrabold text-gray-950">
                      {i + 1}
                    </span>
                  </span>
                  <div>
                    <p className="font-extrabold text-gray-950 group-hover:text-brand-800">{s.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-gray-500">{s.body}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Topics */}
      <section className="mx-auto max-w-6xl px-5 pt-20">
        <SectionHeading eyebrow="Browse" title="Help by topic" />
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => {
            const list = articlesIn(c.id);
            return (
              <div key={c.id} className="group flex min-w-0 flex-col rounded-3xl bg-white p-6 ring-1 ring-gray-100 transition-shadow hover:shadow-lg hover:shadow-brand-950/5">
                <Link href={`/help/category/${c.id}`} className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lime text-brand-900 transition-transform group-hover:-rotate-6">
                    <CategoryIcon icon={c.icon} className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-extrabold tracking-tight hover:text-brand-700">{c.title}</h3>
                    <p className="mt-0.5 text-sm text-gray-500">{c.blurb}</p>
                  </div>
                </Link>
                <ul className="mt-5 space-y-1 border-t border-gray-100 pt-4">
                  {list.slice(0, 3).map((a) => (
                    <li key={a.slug}>
                      <Link href={`/help/${a.slug}`} className="block truncate rounded-lg px-2 py-1.5 -mx-2 text-[15px] font-medium text-gray-600 hover:bg-[#f5f7f1] hover:text-gray-950">
                        {a.title}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href={`/help/category/${c.id}`} className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-bold text-brand-700">
                  {list.length > 3 ? `See all ${list.length} articles` : "Open topic"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            );
          })}

          <div className="relative flex flex-col overflow-hidden rounded-3xl bg-gray-950 p-6 text-white">
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-lime/20 blur-2xl" />
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lime">
              <MessageCircleQuestion className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-lg font-extrabold tracking-tight">Can&apos;t find it?</h3>
            <p className="mt-1 text-sm text-gray-400">Ask the assistant for an instant answer, or message us and a real person will reply.</p>
            <div className="relative mt-auto flex flex-wrap gap-2 pt-6">
              <AskAssistantButton />
              <a
                href={SUPPORT.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-bold hover:bg-white/10"
              >
                <Instagram className="h-4 w-4" /> DM us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Popular */}
      <section className="mx-auto max-w-6xl px-5 pt-20">
        <SectionHeading eyebrow="Most read" title="Popular articles" />
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {popular.map((a, i) => (
            <Link
              key={a.slug}
              href={`/help/${a.slug}`}
              className="group flex min-w-0 items-center gap-4 rounded-2xl bg-white p-4 pr-5 ring-1 ring-gray-100 transition-all hover:ring-brand-200 hover:shadow-md hover:shadow-brand-950/5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5f7f1] text-sm font-extrabold tabular-nums text-brand-700 group-hover:bg-lime group-hover:text-gray-950">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-950 sm:truncate">{a.title}</p>
                <p className="truncate text-sm text-gray-500">
                  <span className="font-semibold text-brand-600">{categoryById(a.category)?.title}</span> · {a.summary}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition-all group-hover:translate-x-1 group-hover:text-brand-700" />
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-24 lg:grid-cols-[1fr_1.6fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading eyebrow="FAQ" title="Quick answers" />
          <p className="mt-4 text-gray-500">The questions creators ask us most. Each one links to the full explanation.</p>
          <div className="mt-6 rounded-3xl bg-brand-900 p-6 text-white">
            <p className="font-extrabold">Still have a question?</p>
            <p className="mt-1 text-sm text-brand-100/75">The assistant answers from every article here, instantly.</p>
            <AskAssistantButton className="mt-4" />
          </div>
        </div>
        <div className="space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-2xl bg-white ring-1 ring-gray-100 open:shadow-md open:shadow-brand-950/5 open:ring-brand-200">
              <summary className="flex cursor-pointer list-none items-center gap-4 p-5 font-bold text-gray-950 [&::-webkit-details-marker]:hidden">
                <span className="flex-1">{f.q}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5f7f1] transition-colors group-open:bg-lime">
                  <ChevronDown className="h-4 w-4 text-gray-600 transition-transform group-open:rotate-180" />
                </span>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-gray-600">{f.a}</p>
                <Link href={`/help/${f.slug}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:underline">
                  Read the full article <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-600">{eyebrow}</p>
      <h2 className="mt-1.5 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
    </div>
  );
}
