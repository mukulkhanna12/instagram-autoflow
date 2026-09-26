import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWebhookSubscription, subscribeToWebhooks } from "@/lib/instagram";
import { getWorkspaceContext } from "@/lib/workspace";

/**
 * Retry the webhook subscription for the connected account — the fix offered
 * when onboarding's ready check finds comment alerts switched off.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const igAccount = (await getWorkspaceContext())?.igAccount ?? null;
  if (!igAccount) return NextResponse.json({ error: "No Instagram account connected" }, { status: 404 });

  await subscribeToWebhooks(igAccount.instagramId, igAccount.accessToken);
  const subscribedFields = await getWebhookSubscription(igAccount.instagramId, igAccount.accessToken);
  return NextResponse.json({ subscribedFields });
}
