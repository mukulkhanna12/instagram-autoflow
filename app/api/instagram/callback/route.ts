import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getInstagramProfile,
  subscribeToWebhooks,
} from "@/lib/instagram";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login`);

  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?error=instagram_auth_failed`);
  }

  try {
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/instagram/callback`;

    // code → short-lived token (+ the IG user id) → long-lived token
    const { access_token: shortToken } = await exchangeCodeForToken(code, redirectUri);
    const { access_token: longToken } = await getLongLivedToken(shortToken);

    // The connected Instagram professional account itself.
    const profile = await getInstagramProfile(longToken);
    if (!profile) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?error=no_instagram`);
    }

    await db.instagramAccount.upsert({
      where: { instagramId: profile.id },
      create: {
        userId: session.user.id,
        instagramId: profile.id,
        username: profile.username,
        profilePicUrl: profile.profile_picture_url,
        accessToken: longToken,
      },
      update: {
        accessToken: longToken,
        username: profile.username,
        profilePicUrl: profile.profile_picture_url,
      },
    });

    // Nothing is delivered until the account itself is subscribed, so do it now.
    const subscribed = await subscribeToWebhooks(profile.id, longToken);
    if (!subscribed) {
      console.error(`Connected ${profile.username} but webhook subscription failed`);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?success=connected&warning=webhook_subscription_failed`
      );
    }

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?success=connected`);
  } catch (err) {
    console.error("Instagram callback error:", err);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?error=unknown`);
  }
}
