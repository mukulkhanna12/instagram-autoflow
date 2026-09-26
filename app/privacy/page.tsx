import Link from "next/link";
import {
  Ban, Cookie, Database, EyeOff, Instagram, KeyRound, Lock, Mail, ShieldCheck, Trash2, UserCheck,
} from "lucide-react";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { SUPPORT } from "@/lib/help/articles";

export const metadata = {
  title: "Privacy Policy — AutoFlow",
  description: "What AutoFlow collects, why, how long it's kept, and how to get it deleted — in plain English.",
};

/**
 * The privacy policy.
 *
 * Every statement here describes what the code actually does — check it when
 * the app changes. In particular: deletes are soft (lib/db.ts), commenters'
 * display names and follow status are looked up at send time and not stored
 * (lib/flow-engine.ts), comment text is only matched against keywords, and
 * backups keep 7 days (scripts/backup-db.mjs).
 */

const UPDATED = "26 September 2026";

const GLANCE = [
  { icon: Ban, title: "Never sold", body: "No selling, no ads, no data brokers." },
  { icon: ShieldCheck, title: "Official API only", body: "Instagram's own login and API. No bots." },
  { icon: Lock, title: "No password shared", body: "We never see your Instagram password." },
  { icon: UserCheck, title: "You're in control", body: "Pause, disconnect or ask for deletion any time." },
];

const SECTIONS = [
  { id: "who", title: "Who we are" },
  { id: "collect", title: "What we collect" },
  { id: "commenters", title: "People who comment" },
  { id: "use", title: "How we use it" },
  { id: "share", title: "Who we share it with" },
  { id: "keep", title: "How long we keep it" },
  { id: "browser", title: "Cookies & your browser" },
  { id: "security", title: "Security" },
  { id: "rights", title: "Your choices & deletion" },
  { id: "children", title: "Children" },
  { id: "changes", title: "Changes & contact" },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-gray-950">
      <SiteHeader />

      {/* Hero */}
      <section className="bg-[#f3f4f1]">
        <div className="max-w-6xl mx-auto px-5 pt-16 pb-12">
          <p className="inline-flex items-center gap-2 rounded-full bg-lime text-gray-950 text-xs font-extrabold px-3 py-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Privacy
          </p>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight max-w-3xl">
            Your data, in plain English.
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl">
            What AutoFlow collects, why it needs it, how long it&apos;s kept and how to get it deleted —
            for you, and for the people who comment on your reels.
          </p>
          <p className="mt-3 text-sm text-gray-400">Last updated {UPDATED}</p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {GLANCE.map((g) => (
              <div key={g.title} className="rounded-3xl bg-white p-5">
                <span className="w-10 h-10 rounded-2xl bg-brand-900 text-lime flex items-center justify-center">
                  <g.icon className="w-5 h-5" />
                </span>
                <p className="mt-4 font-extrabold">{g.title}</p>
                <p className="mt-1 text-sm text-gray-500">{g.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-5 py-14 lg:grid lg:grid-cols-[220px_1fr] lg:gap-14">
        {/* Contents */}
        <nav aria-label="On this page" className="mb-10 lg:mb-0">
          <div className="lg:sticky lg:top-32">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">On this page</p>
            <ol className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 lg:grid-cols-1 text-sm">
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="flex gap-2 text-gray-600 hover:text-brand-700">
                    <span className="tabular-nums text-gray-300">{String(i + 1).padStart(2, "0")}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <article className="max-w-3xl space-y-14 text-[15px] leading-relaxed text-gray-700">
          <Section n={1} id="who" title="Who we are">
            <p>
              AutoFlow is a tool that answers comments on your Instagram reels and sends the people who
              commented a direct message — for example, your link after they follow you. It works only
              through Instagram&apos;s official API and only on the Instagram professional (Business or
              Creator) account you connect.
            </p>
            <p>
              In this policy, &ldquo;you&rdquo; means someone with an AutoFlow account, and
              &ldquo;commenters&rdquo; means the people who comment on your reels.
            </p>
          </Section>

          <Section n={2} id="collect" title="What we collect about you">
            <DataTable
              rows={[
                ["Your email address", "To sign you in with a one-time code and to recognise your account"],
                ["Name and profile photo", "Shown in the app. Taken from Google or Facebook if you sign in with them, or the name you set in Settings"],
                ["Linked Google / Facebook sign-in", "So either one opens your account. We store which account is linked, not your password"],
                ["Answers to the short onboarding survey", "How you heard of us, your role, your goals and your country — to understand who uses AutoFlow"],
                ["Your Instagram account", "Account id, username, profile photo and an access token, so we can reply and send messages on your behalf"],
                ["Your reels", "Each automated reel's id, link, caption and thumbnail, so you can recognise it in the app"],
                ["Your automations", "The keywords, replies, messages and links you write, plus counts of messages sent and buttons tapped"],
                ["Your workspaces and team", "Which workspaces you belong to and your role, and the email addresses you invite — so the right people can get in"],
                ["Feedback you send", "Your message, its type and the page you sent it from — so we can read it, reply and, if it helps, thank you with a discount"],
              ]}
            />
          </Section>

          <Section n={3} id="commenters" title="People who comment on your reels">
            <p>When someone comments on a reel you&apos;ve automated, AutoFlow keeps the minimum it needs to run your flow:</p>
            <DataTable
              rows={[
                ["Their Instagram user id and username", "To reply to them and to avoid messaging the same person twice"],
                ["The comment's id and when it was made", "Instagram's rules let us send one private reply per comment, within 7 days"],
                ["Where they are in your flow", "Messaged, asked to follow, or finished — this is what your analytics count"],
                ["The last delivery error, if a message failed", "So you can see why someone didn't get a DM"],
              ]}
            />
            <Callout icon={EyeOff} title="What we don't keep">
              The text of the comment is only checked for your keyword and isn&apos;t stored. Their display
              name and whether they follow you are looked up from Instagram at the moment a message is sent —
              to personalise it and to run the follow check — and aren&apos;t saved.
            </Callout>
          </Section>

          <Section n={4} id="use" title="How we use it">
            <ul className="list-disc pl-5 space-y-2">
              <li>To run the automations you set up: public replies, direct messages and the follow check.</li>
              <li>To show you your dashboard, analytics and each reel&apos;s results.</li>
              <li>To sign you in and keep your account secure.</li>
              <li>To fix problems — for example, spotting an expired Instagram connection.</li>
            </ul>
            <p>
              We don&apos;t sell your data, use it for advertising, or train AI models on it. The help
              assistant answers from our help articles only and doesn&apos;t send your questions anywhere.
            </p>
          </Section>

          <Section n={5} id="share" title="Who we share it with">
            <p>Only the services AutoFlow needs to work, each handling data for us and nothing else:</p>
            <DataTable
              head={["Service", "What for"]}
              rows={[
                ["Meta (Instagram)", "Reading comments, posting replies and sending messages through the official API"],
                ["Vercel", "Hosting the app"],
                ["Prisma Postgres", "The database that stores the data described here"],
                ["Resend", "Emailing your sign-in codes"],
                ["Google, Facebook", "Only if you choose to sign in with them"],
              ]}
            />
            <p>
              <strong>Your team.</strong> Everyone you invite to a workspace can see and manage its
              Instagram automations, reels and results — that&apos;s what an invite is for. Remove
              someone in Settings → Team and their access ends straight away.
            </p>
            <p>We&apos;ll only share anything else if the law requires it.</p>
          </Section>

          <Section n={6} id="keep" title="How long we keep it">
            <p>
              Nothing in AutoFlow is erased the moment you remove it. Deleting an automation, removing a
              prepared flow or disconnecting Instagram <strong>hides</strong> the data and stops all activity,
              but keeps the records — so reconnecting the same account brings everything back as it was.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Your account and its data are kept while your account exists.</li>
              <li>Database backups are kept for 7 days, then deleted automatically.</li>
              <li>Sign-in codes expire after 10 minutes and are only ever stored in scrambled (hashed) form.</li>
            </ul>
            <p>
              If you want your data erased for good rather than hidden, ask us — see{" "}
              <a href="#rights" className="font-semibold text-brand-700 underline underline-offset-2">Your choices &amp; deletion</a>.
            </p>
          </Section>

          <Section n={7} id="browser" title="Cookies & your browser">
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniCard icon={Cookie} title="One sign-in cookie">
                Keeps you logged in. No advertising or tracking cookies, and no third-party analytics.
              </MiniCard>
              <MiniCard icon={Database} title="Stored in your browser">
                A few preferences, like whether the sidebar is collapsed, and drafts in the Automations
                preview. They stay on your device.
              </MiniCard>
            </div>
          </Section>

          <Section n={8} id="security" title="Security">
            <ul className="list-disc pl-5 space-y-2">
              <li>Everything travels over HTTPS.</li>
              <li>Instagram connects through its own login — we never see or store your Instagram password.</li>
              <li>Messages from Instagram are checked for Meta&apos;s signature, so nobody else can trigger your automations.</li>
              <li>New accounts are approved by hand, and each account only ever sees its own data.</li>
            </ul>
          </Section>

          <Section n={9} id="rights" title="Your choices & deletion">
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniCard icon={UserCheck} title="Pause any automation">Switch a reel off and nothing more is sent from it.</MiniCard>
              <MiniCard icon={KeyRound} title="Disconnect Instagram">Settings → Instagram → Disconnect stops everything at once.</MiniCard>
              <MiniCard icon={Mail} title="Get a copy">Ask and we&apos;ll send you the data we hold about you.</MiniCard>
              <MiniCard icon={Trash2} title="Erase it for good">Ask and we&apos;ll permanently delete your account and its data.</MiniCard>
            </div>
            <Callout icon={Trash2} title="Commenters">
              If you commented on a reel that uses AutoFlow and want your data removed, ask the creator
              who runs that reel, or contact us and we&apos;ll take care of it.
            </Callout>
            <p>
              You can also remove AutoFlow&apos;s access from inside Instagram at any time: Settings →
              Apps and websites.
            </p>
          </Section>

          <Section n={10} id="children" title="Children">
            <p>
              AutoFlow isn&apos;t meant for anyone under 13 — the same minimum age as Instagram — and we
              don&apos;t knowingly collect their data.
            </p>
          </Section>

          <Section n={11} id="changes" title="Changes & contact">
            <p>
              If this policy changes, we&apos;ll update it here and change the date at the top of
              the page.
            </p>
            <div className="rounded-3xl bg-brand-950 text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5 justify-between">
              <div>
                <p className="text-lg font-extrabold">Questions, or want your data deleted?</p>
                <p className="mt-1 text-sm text-white/60">Message us on Instagram — a person reads every message.</p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <a
                  href={SUPPORT.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-lime text-gray-950 text-sm font-extrabold hover:bg-lime-400"
                >
                  <Instagram className="w-4 h-4" /> @{SUPPORT.instagram}
                </a>
                <Link href="/help" className="inline-flex items-center justify-center h-11 px-5 rounded-full border border-white/20 text-sm font-bold hover:bg-white/10">
                  Help Center
                </Link>
              </div>
            </div>
          </Section>
        </article>
      </div>

      <SiteFooter />
    </div>
  );
}

function Section({ n, id, title, children }: { n: number; id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32 space-y-4">
      <h2 className="flex items-baseline gap-3 text-2xl font-extrabold tracking-tight text-gray-950">
        <span className="text-sm font-bold tabular-nums text-brand-600">{String(n).padStart(2, "0")}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function DataTable({ rows, head = ["What", "Why"] }: { rows: Array<[string, string]>; head?: [string, string] }) {
  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden">
      <div className="hidden sm:grid grid-cols-[1fr_1.4fr] bg-[#f7f8f5] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        <span>{head[0]}</span>
        <span>{head[1]}</span>
      </div>
      {rows.map(([what, why]) => (
        <div key={what} className="grid sm:grid-cols-[1fr_1.4fr] gap-1 sm:gap-6 px-5 py-4 border-t border-gray-100 first:border-t-0 sm:first:border-t">
          <span className="font-semibold text-gray-950">{what}</span>
          <span className="text-gray-600">{why}</span>
        </div>
      ))}
    </div>
  );
}

function Callout({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 rounded-2xl bg-lime-50 border border-lime-200 p-5">
      <Icon className="w-5 h-5 text-brand-700 shrink-0 mt-0.5" />
      <div>
        <p className="font-bold text-gray-950">{title}</p>
        <p className="mt-1 text-gray-700">{children}</p>
      </div>
    </div>
  );
}

function MiniCard({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 p-5">
      <span className="w-9 h-9 rounded-xl bg-lime-100 text-brand-800 flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </span>
      <p className="mt-3 font-bold text-gray-950">{title}</p>
      <p className="mt-1 text-sm text-gray-600">{children}</p>
    </div>
  );
}
