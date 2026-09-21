import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Gate for the three first-run steps. Each step draws its own split-screen
 * shell (components/onboarding/steps.tsx) because the rail shows different
 * things per step. Finished users are sent on to the dashboard.
 */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { onboardedAt: true },
  });
  if (user?.onboardedAt) redirect("/dashboard");

  return <>{children}</>;
}
