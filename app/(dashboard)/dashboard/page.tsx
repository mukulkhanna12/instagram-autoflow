import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { MessageCircle, Zap, Users, TrendingUp, ArrowRight, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const session = await auth();
  const igAccount = await db.instagramAccount.findFirst({ where: { userId: session!.user.id } });

  const stats = igAccount
    ? await Promise.all([
        db.postAutomation.count({ where: { igAccountId: igAccount.id } }),
        db.postAutomation.count({ where: { igAccountId: igAccount.id, isActive: true } }),
        db.conversation.count({
          where: { automation: { igAccountId: igAccount.id } },
        }),
        db.conversation.count({
          where: { automation: { igAccountId: igAccount.id }, state: "completed" },
        }),
      ])
    : [0, 0, 0, 0];

  const [totalAutomations, activeAutomations, totalConversations, completedConversations] = stats;

  const recentConversations = igAccount
    ? await db.conversation.findMany({
        where: { automation: { igAccountId: igAccount.id } },
        include: { automation: { select: { postCaption: true, postThumbnail: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      })
    : [];

  const statCards = [
    { label: "Total Automations", value: totalAutomations, icon: Zap, color: "text-brand-600 bg-brand-50" },
    { label: "Active Now", value: activeAutomations, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
    { label: "Conversations Started", value: totalConversations, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Flows Completed", value: completedConversations, icon: MessageCircle, color: "text-pink-600 bg-pink-50" },
  ];

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your Instagram automation performance</p>
      </div>

      {/* No Instagram account warning */}
      {!igAccount && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Instagram account not connected</p>
            <p className="text-xs text-amber-600 mt-0.5">Connect your Instagram Business account to start automating.</p>
          </div>
          <Link href="/settings" className="text-xs font-medium text-amber-700 underline underline-offset-2">
            Connect now →
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardBody className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center shrink-0`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent conversations */}
        <Card>
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Conversations</h2>
            <Link href="/posts" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              View posts <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <CardBody className="p-0">
            {recentConversations.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                No conversations yet. Create an automation to get started!
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentConversations.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold shrink-0">
                      {c.igUsername?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        @{c.igUsername ?? c.igUserId}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {c.automation.postCaption?.slice(0, 40) ?? "Post automation"}
                      </p>
                    </div>
                    <Badge
                      variant={c.state === "completed" ? "success" : c.state === "follow_requested" ? "warning" : "info"}
                    >
                      {c.state === "completed" ? "Done" : c.state === "follow_requested" ? "Follow req." : "Active"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Quick start */}
        <Card>
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Quick Start</h2>
          </div>
          <CardBody>
            <div className="space-y-3">
              {[
                { num: "1", title: "Connect Instagram", desc: "Link your Instagram Business account", href: "/settings", done: !!igAccount },
                { num: "2", title: "Select a Post", desc: "Choose which post to automate", href: "/posts", done: totalAutomations > 0 },
                { num: "3", title: "Configure Flow", desc: "Set your messages and buttons", href: "/posts", done: activeAutomations > 0 },
                { num: "4", title: "Activate", desc: "Turn on the automation and go live", href: "/posts", done: activeAutomations > 0 },
              ].map((step) => (
                <Link
                  key={step.num}
                  href={step.href}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${step.done ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500 group-hover:bg-brand-100 group-hover:text-brand-700"}`}>
                    {step.done ? "✓" : step.num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{step.title}</p>
                    <p className="text-xs text-gray-400">{step.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors" />
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
