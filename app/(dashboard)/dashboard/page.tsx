"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Plus, ImageIcon, Wand2, Play, MessageCircle, BarChart3 } from "lucide-react";
import { openQuickStats } from "@/components/analytics/quick-panel";
import { truncate } from "@/lib/utils";
import { Panel, PillLink, StatCard } from "@/components/dashboard/cards";
import { ActivityBars, CompletionGauge } from "@/components/dashboard/charts";
import { QuickStartModal } from "@/components/dashboard/quick-start";
import { NewAutomationButton } from "@/components/new-automation";
import { PauseResumeButton, RowMenu, StatusPill, TableFrame } from "@/components/dashboard/row-menu";
import { DashboardSkeleton } from "@/components/skeletons";

interface Stats {
  contacts: number;
  totalSends: number;
  completed: number;
  newFollows: number;
  greetingCtr: number;
}

interface Automation {
  id: string;
  postId: string;
  postCaption?: string | null;
  postThumbnail?: string | null;
  isActive: boolean;
  fromTemplate: boolean;
  commentsHandled: number;
  greetingClicked: number;
  keywords: string;
  greetingMessage: string;
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
  // Table paging: 10 automations at a time. Clamped so removing the last row
  // of the last page doesn't leave you on an empty one.
  const [page, setPageRaw] = useState(1);
  const pageCount = Math.max(1, Math.ceil(automations.length / PAGE_SIZE));
  const setPage = (p: number) => setPageRaw(Math.min(Math.max(1, p), pageCount));
  useEffect(() => {
    if (page > pageCount) setPageRaw(pageCount);
  }, [page, pageCount]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [noAccount, setNoAccount] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showQuickStart, setShowQuickStart] = useState(false);
  /**
   * Ids of reels still on the account, or null when we couldn't establish the
   * full library. An automation outlives the reel it points at — deleting a
   * reel on Instagram leaves its row here, still switched Live, quietly
   * unreachable. Null keeps every automation unflagged rather than guessing.
   */
  const [liveReelIds, setLiveReelIds] = useState<Set<string> | null>(null);

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

      // Second, slower pass — it hits Instagram, so the list renders first and
      // the "Reel deleted" badges appear a moment later.
      try {
        const res = await fetch("/api/instagram/posts");
        const { posts, complete } = await res.json();
        if (res.ok && complete && Array.isArray(posts)) {
          setLiveReelIds(new Set(posts.map((p: { id: string }) => p.id)));
        }
      } catch {
        // Leaving it null is the safe outcome: nothing gets flagged.
      }
    }
    load();
  }, [params]);

  /** The reel is gone from Instagram, so this automation can never fire again. */
  const isOrphaned = (a: Automation) => !!liveReelIds && !liveReelIds.has(a.postId);

  async function removeAutomation(a: Automation) {
    const msg = isOrphaned(a)
      ? "Remove this automation? Its reel no longer exists on Instagram."
      : "Remove this automation? The reel will stop replying to comments.";
    if (!confirm(msg)) return;
    const res = await fetch(`/api/automations/${a.id}`, { method: "DELETE" });
    if (res.ok) setAutomations((prev) => prev.filter((x) => x.id !== a.id));
  }

  async function toggle(a: Automation) {
    setToggling(a.id);
    try {
      const res = await fetch(`/api/automations/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !a.isActive }),
      });
      const { automation } = await res.json();
      setAutomations((prev) => prev.map((x) => (x.id === a.id ? { ...x, isActive: automation.isActive } : x)));
    } finally {
      setToggling(null);
    }
  }

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
  const liveCount = automations.filter((a) => a.isActive && !isOrphaned(a)).length;
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
        <StatCard featured label="Contacts" value={totals.contacts} note={`${weekCount} reached in the last 7 days`} href="#automations" />
        <StatCard label="Messages sent" value={totals.sends} note="DMs across every step" href="#automations" />
        <StatCard
          label="Got the link"
          value={totals.completed}
          note={totals.contacts ? `${Math.round((totals.completed / totals.contacts) * 100)}% of contacts` : "Final DM delivered"}
          href="#automations"
        />
        <StatCard label="New follows" value={totals.newFollows} note="Earned by your follow gate" href="#automations" />
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

      {/* 5.png — every automation, with its numbers and a pause button */}
      <section id="automations" className="pt-4 scroll-mt-6">
        <h2 className="text-2xl font-extrabold text-gray-950">Your automations</h2>
        <p className="text-gray-500 mt-1 mb-5">
          {`${liveCount} of ${automations.length} live`} · manage them and track how they&apos;re doing.
        </p>

        {automations.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-200">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-bold text-gray-900">No automations yet</p>
            <p className="text-sm text-gray-500 mt-1">
              <Link href="/posts" className="text-brand-700 font-semibold underline">Pick a reel</Link> to create your first one.
            </p>
          </div>
        ) : (
          <TableFrame
            columns={[
              { label: "Name" },
              { label: "Contacts", className: "text-center" },
              { label: "DMs", className: "text-center" },
              { label: "Clicks", className: "text-center" },
              { label: "CTR", className: "text-center" },
              { label: "Status", className: "text-center" },
              { label: "Actions", className: "text-center" },
            ]}
          >
            {automations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((a) => {
              const orphan = isOrphaned(a);
              return (
                <tr
                  key={a.id}
                  onClick={() => router.push(`/posts/${a.id}`)}
                  className="hover:bg-[#fafbf8] cursor-pointer"
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4 min-w-0">
                      <Thumb src={a.postThumbnail} size="w-12 h-12" />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-950 truncate max-w-[260px] 2xl:max-w-[360px]">
                          {a.postCaption ? truncate(a.postCaption, 44) : "Untitled reel"}
                          {a.fromTemplate && (
                            <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 rounded-full px-2 py-0.5">Auto</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-400 truncate max-w-[260px] 2xl:max-w-[420px]">
                          Comment on reel
                          {a.keywords.trim() ? ` · contains '${a.keywords.split(",")[0].trim()}'${a.keywords.split(",").length > 1 ? ` +${a.keywords.split(",").length - 1} more` : ""}` : " · any comment"}
                          {` · DM: '${truncate(a.greetingMessage.replace(/\s+/g, " "), 40)}'`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <Num v={a.stats.contacts} />
                  <Num v={a.stats.totalSends} />
                  <Num v={a.greetingClicked} />
                  <td className="px-3 py-5 text-center font-bold text-gray-950">
                    {a.stats.contacts ? `${a.stats.greetingCtr}%` : "—"}
                  </td>
                  <td className="px-3 py-5 text-center">
                    <StatusPill status={orphan ? "deleted" : a.isActive ? "live" : "paused"} />
                  </td>
                  <td className="px-3 py-5">
                    <div className="flex items-center justify-center gap-2">
                      {!orphan && (
                        <PauseResumeButton live={a.isActive} busy={toggling === a.id} onClick={() => toggle(a)} />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openQuickStats(a.id);
                        }}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-lime-100 hover:text-brand-800 cursor-pointer"
                        aria-label="Quick stats for this reel"
                        title="Quick stats"
                      >
                        <BarChart3 className="w-5 h-5" />
                      </button>
                      <RowMenu
                        items={[
                          { label: "Edit flow", onSelect: () => router.push(`/posts/${a.id}`) },
                          { label: "Quick stats", onSelect: () => openQuickStats(a.id) },
                          { label: "Remove", danger: true, onSelect: () => removeAutomation(a) },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </TableFrame>
        )}
        {automations.length > PAGE_SIZE && (
          <Pager page={page} total={automations.length} onPage={(p) => {
            setPage(p);
            document.getElementById("automations")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }} />
        )}
      </section>
    </div>
  );
}

const PAGE_SIZE = 10;

/** "Showing 11–20 of 34" with previous / next and page numbers. */
function Pager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);
  // Up to 5 numbers around the current page, plus the ends.
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === pages || Math.abs(n - page) <= 1
  );
  const btn = "h-9 min-w-9 px-3 rounded-full text-sm font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3" aria-label="Automations pages">
      <p className="text-sm text-gray-500">
        Showing <b className="text-gray-900 tabular-nums">{from}–{to}</b> of <b className="text-gray-900 tabular-nums">{total}</b>
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page === 1} className={`${btn} border border-gray-200 bg-white text-gray-700 hover:border-gray-300`}>
          ← Prev
        </button>
        {nums.map((n, i) => (
          <span key={n} className="flex items-center gap-1">
            {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-gray-400">…</span>}
            <button
              onClick={() => onPage(n)}
              aria-current={n === page ? "page" : undefined}
              className={`${btn} ${n === page ? "bg-gray-950 text-white" : "text-gray-600 hover:bg-white"}`}
            >
              {n}
            </button>
          </span>
        ))}
        <button onClick={() => onPage(page + 1)} disabled={page === pages} className={`${btn} border border-gray-200 bg-white text-gray-700 hover:border-gray-300`}>
          Next →
        </button>
      </div>
    </nav>
  );
}

function Num({ v }: { v: number }) {
  return <td className="px-3 py-5 text-center font-bold text-gray-950 tabular-nums">{v}</td>;
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
