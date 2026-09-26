"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Plus, ImageIcon, Wand2, Play, MessageCircle } from "lucide-react";
import { truncate } from "@/lib/utils";
import { Panel, PillLink, StatCard } from "@/components/dashboard/cards";
import { ActivityBars, CompletionGauge } from "@/components/dashboard/charts";
import { QuickStartModal } from "@/components/dashboard/quick-start";
import { NewAutomationButton } from "@/components/new-automation";
import { DashboardSkeleton } from "@/components/skeletons";

interface Stats {
  contacts: number;
  totalSends: number;
  completed: number;
  newFollows: number;
}

interface Automation {
  id: string;
  postCaption?: string | null;
  postThumbnail?: string | null;
  isActive: boolean;
  stats: Stats;
}

interface Overview {
  quickStart: boolean;
  username: string | null;
  activity: { date: string; count: number }[];
  recent: {
    id: string;
    igUsername: string | null;
    state: string;
    updatedAt: string;
    automation: { id: string; postCaption: string | null; postThumbnail: string | null };
  }[];
  nextFlow: { id: string; name: string; keywords: string } | null;
  queued: number;
  states: { greeted: number; follow_requested: number; completed: number };
}

export default function DashboardPage() {
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const router = useRouter();
  const params = useSearchParams();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [noAccount, setNoAccount] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);

  useEffect(() => {
    async function load() {
      const [accRes, autoRes, overviewRes] = await Promise.all([
        fetch("/api/instagram/account"),
        fetch("/api/automations"),
        fetch(`/api/dashboard?tz=${new Date().getTimezoneOffset()}`),
      ]);
      const { account } = await accRes.json();
      if (!account) setNoAccount(true);
      const { automations } = await autoRes.json();
      const ov: Overview = await overviewRes.json();
      setAutomations(automations ?? []);
      setOverview(ov);
      // Offered once: straight after onboarding, or to anyone with nothing set up yet.
      setShowQuickStart(ov.quickStart && (params.get("welcome") === "1" || (automations ?? []).length === 0));
      setLoading(false);
    }
    load();
  }, [params]);

  if (loading || !overview) {
    return <DashboardSkeleton />;
  }

  // Aggregate KPIs across all automations.
  const totals = automations.reduce(
    (acc, a) => ({
      contacts: acc.contacts + a.stats.contacts,
      sends: acc.sends + a.stats.totalSends,
      completed: acc.completed + a.stats.completed,
      newFollows: acc.newFollows + a.stats.newFollows,
    }),
    { contacts: 0, sends: 0, completed: 0, newFollows: 0 }
  );
  const weekCount = overview.activity.reduce((n, d) => n + d.count, 0);
  const topReels = [...automations].sort((a, b) => b.stats.contacts - a.stats.contacts).slice(0, 5);

  return (
    <div className="p-6 lg:p-8 space-y-5">
      <QuickStartModal
        open={showQuickStart}
        username={overview.username}
        onClose={() => {
          setShowQuickStart(false);
          if (params.get("welcome")) router.replace("/dashboard");
        }}
      />

      {/* Heading */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-1">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-950">Dashboard</h1>
          <p className="text-gray-500 mt-2">Turn every comment into a conversation — automatically.</p>
        </div>
        <div className="flex items-center gap-3">
          <NewAutomationButton className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-brand-700 text-white font-bold hover:bg-brand-800 transition-colors">
            <Plus className="w-5 h-5" /> New automation
          </NewAutomationButton>
          <Link
            href="/queue"
            className="inline-flex items-center gap-2 h-12 px-6 rounded-full border-2 border-brand-700 text-brand-800 font-bold hover:bg-brand-50 transition-colors"
          >
            Prepare next reel
          </Link>
        </div>
      </div>

      {noAccount && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">Instagram account not connected</p>
            <p className="text-xs text-amber-700 mt-0.5">Connect your Instagram Business account to start automating.</p>
          </div>
          <Link href="/settings" className="text-xs font-bold text-amber-800 underline underline-offset-2">Connect now →</Link>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard featured label="Contacts" value={totals.contacts} note={`${weekCount} reached in the last 7 days`} href="/posts" />
        <StatCard label="Messages sent" value={totals.sends} note="DMs across every step" href="/posts" />
        <StatCard
          label="Got the link"
          value={totals.completed}
          note={totals.contacts ? `${Math.round((totals.completed / totals.contacts) * 100)}% of contacts` : "Final DM delivered"}
          href="/posts"
        />
        <StatCard label="New follows" value={totals.newFollows} note="Earned by your follow gate" href="/posts" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <Panel title="Comment activity" className="xl:col-span-6" action={<span className="text-sm text-gray-400">Last 7 days</span>}>
          <ActivityBars days={overview.activity} />
        </Panel>

        {/* "Reminders" in 6.png → what's queued for the next upload */}
        <Panel title="Next reel" className="xl:col-span-3 flex flex-col">
          {overview.nextFlow ? (
            <>
              <p className="text-2xl font-extrabold text-brand-800 leading-tight">
                {overview.nextFlow.name || "Untitled flow"}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {overview.nextFlow.keywords
                  ? <>Replies to comments with <strong className="text-gray-700">{overview.nextFlow.keywords}</strong></>
                  : "Replies to every comment"}
                {overview.queued > 1 && ` · ${overview.queued - 1} more queued`}
              </p>
              <p className="text-sm text-gray-400 mt-1">Attaches on your next reel&apos;s first comment.</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-extrabold text-brand-800 leading-tight">Nothing queued</p>
              <p className="text-sm text-gray-500 mt-2">
                Prepare a flow now and it switches on by itself when your next reel is posted.
              </p>
            </>
          )}
          <Link
            href="/queue"
            className="mt-auto pt-6"
          >
            <span className="flex items-center justify-center gap-2 h-12 rounded-full bg-brand-700 text-white font-bold hover:bg-brand-800 transition-colors">
              <Wand2 className="w-5 h-5" /> {overview.nextFlow ? "Open queue" : "Prepare a flow"}
            </span>
          </Link>
        </Panel>

        {/* "Project" list in 6.png → best-performing reels */}
        <Panel
          title="Top reels"
          className="xl:col-span-3 xl:row-span-2"
          action={<PillLink href="/posts"><Plus className="w-4 h-4" /> New</PillLink>}
        >
          {topReels.length === 0 ? (
            <p className="text-sm text-gray-400">No reels set up yet.</p>
          ) : (
            <ul className="space-y-4">
              {topReels.map((a) => (
                <li key={a.id}>
                  <Link href={`/posts/${a.id}`} className="flex items-center gap-3 group">
                    <Thumb src={a.postThumbnail} size="w-11 h-11" />
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-gray-900 truncate group-hover:text-brand-700">
                        {a.postCaption ? truncate(a.postCaption, 30) : "Untitled reel"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {a.stats.contacts} contacts · {a.isActive ? "Live" : "Paused"}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* "Team collaboration" in 6.png → the latest people in a flow */}
        <Panel title="Recent contacts" className="xl:col-span-5">
          {overview.recent.length === 0 ? (
            <p className="text-sm text-gray-400">Nobody yet — the first commenter will show up here.</p>
          ) : (
            <ul className="space-y-4">
              {overview.recent.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-full bg-lime-100 text-brand-800 font-bold flex items-center justify-center shrink-0">
                    {(c.igUsername ?? "?")[0]?.toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-gray-900 truncate">
                      {c.igUsername ? `@${c.igUsername}` : "Instagram user"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      on <span className="font-medium text-gray-600">{c.automation.postCaption ? truncate(c.automation.postCaption, 36) : "a reel"}</span>
                    </p>
                  </div>
                  <StateTag state={c.state} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* "Project progress" in 6.png */}
        <Panel title="Flow completion" className="xl:col-span-4">
          <CompletionGauge
            completed={overview.states.completed}
            gated={overview.states.follow_requested}
            greeted={overview.states.greeted}
          />
        </Panel>
      </div>
    </div>
  );
}

function Thumb({ src, size }: { src?: string | null; size: string }) {
  return (
    <div className={`relative ${size} rounded-xl bg-gray-100 overflow-hidden shrink-0`}>
      {src ? (
        <>
          <Image src={src} alt="" fill unoptimized className="object-cover" />
          <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center">
            <Play className="w-2 h-2 text-white fill-white" />
          </span>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
          <MessageCircle className="w-5 h-5 text-lime" />
        </div>
      )}
    </div>
  );
}

function StateTag({ state }: { state: string }) {
  const map: Record<string, [string, string]> = {
    completed: ["Got the link", "text-emerald-700 bg-emerald-50 border-emerald-200"],
    follow_requested: ["At follow gate", "text-amber-700 bg-amber-50 border-amber-200"],
    greeted: ["DM sent", "text-gray-600 bg-gray-50 border-gray-200"],
  };
  const [label, cls] = map[state] ?? [state, "text-gray-600 bg-gray-50 border-gray-200"];
  return <span className={`text-[11px] font-semibold border rounded-md px-2 py-0.5 whitespace-nowrap ${cls}`}>{label}</span>;
}
