import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { QuickStats } from "@/components/analytics/quick-panel";
import { HelpAssistant } from "@/components/help/help-assistant";
import { needsOnboarding } from "@/lib/onboarding";
import { IG_ACCOUNT_LIMIT, PRIVATE_REPLY_HOURLY_LIMIT, privateRepliesLastHour } from "@/lib/usage";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id!;

  const [user, igAccount, repliesThisHour] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { onboardedAt: true, name: true, email: true, image: true } }),
    db.instagramAccount.findFirst({
      where: { userId },
      select: { username: true, profilePicUrl: true },
    }),
    privateRepliesLastHour(userId),
  ]);

  // A brand-new account is walked through connecting Instagram first.
  if (user && needsOnboarding(user, !!igAccount)) redirect("/onboarding");

  return (
    <div className="flex min-h-screen gap-3 p-3 bg-[#eceee9]">
      <Sidebar
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
          igAccount={igAccount}
        />
        <main className="flex-1 min-w-0 rounded-3xl bg-[#f7f8f5] overflow-auto">{children}</main>
      </div>
      <QuickStats />
      {/* Raised: Quick stats owns the bottom-right corner here. */}
      <HelpAssistant raised />
    </div>
  );
}
