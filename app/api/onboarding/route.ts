import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { answersSchema } from "@/lib/onboarding";
import { getInstagramAccountDetails, getWebhookSubscription } from "@/lib/instagram";

/**
 * Onboarding state: where the user is, plus the connected account's live
 * details for the "Account found" card.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user, igAccount] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { onboardedAt: true, onboardingAnswers: true },
    }),
    db.instagramAccount.findFirst({ where: { userId: session.user.id } }),
  ]);

  const [details, subscribed] = igAccount
    ? await Promise.all([
        getInstagramAccountDetails(igAccount.accessToken),
        getWebhookSubscription(igAccount.instagramId, igAccount.accessToken),
      ])
    : [null, null];

  return NextResponse.json({
    onboarded: !!user?.onboardedAt,
    answers: user?.onboardingAnswers ?? null,
    account: igAccount
      ? {
          username: details?.username ?? igAccount.username,
          name: details?.name ?? null,
          profilePicUrl: details?.profilePictureUrl ?? igAccount.profilePicUrl ?? null,
          followersCount: details?.followersCount ?? null,
          mediaCount: details?.mediaCount ?? null,
          accountType: details?.accountType ?? null,
          // Null = couldn't be read from Instagram; the UI says so rather than guessing.
          subscribedFields: subscribed,
        }
      : null,
  });
}

/** Save the "Before you start" answers and finish onboarding. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = answersSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await db.user.update({
    where: { id: session.user.id },
    data: { onboardingAnswers: parsed.data, onboardedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
