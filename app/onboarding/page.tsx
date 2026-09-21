import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ConnectStep } from "./connect-step";

/** Step 1 — type the handle, then hand off to Instagram's own login. */
export default async function OnboardingConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  const connected = await db.instagramAccount.findFirst({
    where: { userId: session!.user!.id },
    select: { id: true },
  });
  const { error } = await searchParams;
  // Already connected (a reload, or back button after the round trip).
  if (connected && !error) redirect("/onboarding/account");

  return <ConnectStep error={error ?? null} />;
}
