"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Loader2, AlertCircle, Plus, ImageIcon, ToggleLeft, ToggleRight,
  Users, MessageCircle, Send, UserPlus, MousePointerClick, Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { truncate } from "@/lib/utils";

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
  stats: Stats;
}

export default function DashboardPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [noAccount, setNoAccount] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  /**
   * Ids of reels still on the account, or null when we couldn't establish the
   * full library. An automation outlives the reel it points at — deleting a
   * reel on Instagram leaves its row here, still switched Live, quietly
   * unreachable. Null keeps every automation unflagged rather than guessing.
   */
  const [liveReelIds, setLiveReelIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    async function load() {
      const [accRes, autoRes] = await Promise.all([
        fetch("/api/instagram/account"),
        fetch("/api/automations"),
      ]);
      const { account } = await accRes.json();
      if (!account) setNoAccount(true);
      const { automations } = await autoRes.json();
      setAutomations(automations ?? []);
      setLoading(false);

      // Second, slower pass — it hits Instagram, so the list renders first and
      // the "Deleted" badges appear a moment later.
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
  }, []);

  /** The reel is gone from Instagram, so this automation can never fire again. */
  const isOrphaned = (a: Automation) => !!liveReelIds && !liveReelIds.has(a.postId);

  async function removeAutomation(a: Automation) {
    if (!confirm("Remove this automation? Its reel no longer exists on Instagram.")) return;
    setRemoving(a.id);
    try {
      const res = await fetch(`/api/automations/${a.id}`, { method: "DELETE" });
      if (res.ok) setAutomations((prev) => prev.filter((x) => x.id !== a.id));
    } finally {
      setRemoving(null);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
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

  const kpis = [
    { label: "Unique contacts", value: totals.contacts, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Messages sent", value: totals.sends, icon: Send, color: "text-brand-600 bg-brand-50" },
    { label: "Final DMs delivered", value: totals.completed, icon: MessageCircle, color: "text-pink-600 bg-pink-50" },
    { label: "New follows earned", value: totals.newFollows, icon: UserPlus, color: "text-emerald-600 bg-emerald-50" },
  ];

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automations</h1>
          <p className="text-gray-500 text-sm mt-1">Your reel automations and how they're performing</p>
        </div>
        <Link
          href="/posts"
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New automation
        </Link>
      </div>

      {noAccount && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Instagram account not connected</p>
            <p className="text-xs text-amber-600 mt-0.5">Connect your Instagram Business account to start automating.</p>
          </div>
          <Link href="/settings" className="text-xs font-medium text-amber-700 underline underline-offset-2">Connect now →</Link>
        </div>
      )}

      {/* Aggregate KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg ${k.color} flex items-center justify-center shrink-0`}>
              <k.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{k.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Automation list */}
      {automations.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-white rounded-xl border border-gray-100">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No automations yet</p>
          <p className="text-sm mt-1">
            <Link href="/posts" className="text-brand-600 underline">Pick a reel</Link> to create your first one.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map((a) => (
            <div
              key={a.id}
              className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 ${
                isOrphaned(a) ? "border-amber-200 bg-amber-50/40" : "border-gray-100"
              }`}
            >
              {/* Thumbnail */}
              <div className="relative w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                {a.postThumbnail ? (
                  <Image src={a.postThumbnail} alt="" fill unoptimized className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Title + link */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/posts/${a.id}`} className="text-sm font-semibold text-gray-900 hover:text-brand-600 truncate">
                    {a.postCaption ? truncate(a.postCaption, 48) : "Untitled reel"}
                  </Link>
                  {a.fromTemplate && <Badge variant="info" className="bg-brand-100 text-brand-700 shrink-0">Auto</Badge>}
                  {isOrphaned(a) && (
                    <span title="This reel is no longer on the account" className="shrink-0">
                      <Badge variant="warning">Reel deleted</Badge>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
                  <Metric icon={Users} label="contacts" value={a.stats.contacts} />
                  <Metric icon={MessageCircle} label="comments" value={a.commentsHandled} />
                  <Metric icon={Send} label="final DMs" value={a.stats.completed} />
                  <Metric icon={UserPlus} label="new follows" value={a.stats.newFollows} highlight />
                  <Metric icon={MousePointerClick} label="CTR" value={`${a.stats.greetingCtr}%`} />
                </div>
              </div>

              {/* A dead automation gets a way out instead of a toggle that
                  would only ever switch on something with nothing to listen to. */}
              {isOrphaned(a) ? (
                <button
                  onClick={() => removeAutomation(a)}
                  disabled={removing === a.id}
                  className="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-red-600 disabled:opacity-50 cursor-pointer shrink-0"
                  title="Remove this leftover automation"
                >
                  {removing === a.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                  Remove
                </button>
              ) : (
              <button
                onClick={() => toggle(a)}
                disabled={toggling === a.id}
                className="flex items-center gap-2 text-sm font-medium cursor-pointer shrink-0"
                title={a.isActive ? "Live — replying to comments" : "Off — ignoring comments"}
              >
                {a.isActive ? (
                  <><ToggleRight className="w-8 h-8 text-emerald-500" /> <span className="text-emerald-600 hidden sm:inline">Live</span></>
                ) : (
                  <><ToggleLeft className="w-8 h-8 text-gray-300" /> <span className="text-gray-400 hidden sm:inline">Off</span></>
                )}
              </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({
  icon: Icon, label, value, highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <span className={`flex items-center gap-1 ${highlight ? "text-emerald-600 font-medium" : ""}`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="font-semibold text-gray-700">{value}</span>
      <span className="text-gray-400">{label}</span>
    </span>
  );
}
