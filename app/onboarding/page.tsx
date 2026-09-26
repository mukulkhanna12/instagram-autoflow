import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace";
import { ConnectStep } from "./connect-step";

/** Step 1 — type the handle, then hand off to Instagram's own login. */
export default async function OnboardingConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const connected = (await getWorkspaceContext())?.igAccount ?? null;
  const { error } = await searchParams;
  // Already connected (a reload, or back button after the round trip).
  if (connected && !error) redirect("/onboarding/account");

  return <ConnectStep error={error ?? null} />;
}
