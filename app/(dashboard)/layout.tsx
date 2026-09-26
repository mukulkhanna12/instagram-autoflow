import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { QuickStats } from "@/components/analytics/quick-panel";
import { HelpAssistant } from "@/components/help/help-assistant";
import { EdgeDock } from "@/components/edge-dock";
import { ProductTour } from "@/components/product-tour";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { needsOnboarding } from "@/lib/onboarding";
import { IG_ACCOUNT_LIMIT, PRIVATE_REPLY_HOURLY_LIMIT, privateRepliesLastHour } from "@/lib/usage";
import { getWorkspaceContext } from "@/lib/workspace";
import { pendingInvitesFor } from "@/lib/invites";
import { PendingInvites } from "@/components/workspace/pending-invites";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id!;

  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");

  const [user, repliesThisHour, pendingInvites] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { onboardedAt: true, name: true, email: true, image: true, quickStartSeenAt: true, tourSeenAt: true } }),
    privateRepliesLastHour(ctx.workspace.id),
    pendingInvitesFor(ctx.email),
  ]);
  const igAccount = ctx.igAccount;

  // A brand-new account is walked through connecting Instagram first. Only an
  // owner can connect one, so members skip it — the owner will.
  if (user && ctx.role === "owner" && needsOnboarding(user, !!igAccount)) redirect("/onboarding");

  return (
    <ConfirmProvider>
    <div className="flex min-h-screen gap-3 p-3 bg-[#eceee9]">
      <Sidebar
        workspace={{
          current: { id: ctx.workspace.id, name: ctx.workspace.name, color: ctx.workspace.color, role: ctx.role },
          all: ctx.workspaces,
          invites: pendingInvites,
        }}
        usage={{
          replies: repliesThisHour,
          repliesLimit: PRIVATE_REPLY_HOURLY_LIMIT,
          accounts: igAccount ? 1 : 0,
          accountsLimit: IG_ACCOUNT_LIMIT,
        }}
      />
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        {/* Read from the database, not the session, so a name changed in
            Settings → Profile shows straight away rather than at next sign-in. */}
        <Topbar
          user={user ? { name: user.name, email: user.email, image: user.image ?? session.user.image } : session.user}
          igAccount={igAccount ? { username: igAccount.username, profilePicUrl: igAccount.profilePicUrl } : null}
          workspace={{ name: ctx.workspace.name, color: ctx.workspace.color }}
        />
        <main className="flex-1 min-w-0 rounded-3xl bg-[#f7f8f5] overflow-auto">
          {pendingInvites.length > 0 && <PendingInvites invites={pendingInvites} />}
          {children}
        </main>
      </div>
      <QuickStats launcher={false} />
      {/* Both open from the tabs on the right edge rather than corner buttons. */}
      <HelpAssistant launcher={false} />
      <EdgeDock />
      {/* First run: starts on its own once the welcome quick-start has been
          closed (that modal starts it directly the first time). */}
      <ProductTour autoStart={!!user && !user.tourSeenAt && !!user.quickStartSeenAt} />
    </div>
    </ConfirmProvider>
  );
}
