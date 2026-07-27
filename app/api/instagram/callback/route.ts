import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getUserPages,
  getInstagramAccountForPage,
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

    // Exchange code → short-lived token → long-lived token
    const { access_token: shortToken } = await exchangeCodeForToken(code, redirectUri);
    const { access_token: longToken } = await getLongLivedToken(shortToken);

    // Get all pages the user manages
    const pages = await getUserPages(longToken);
    if (!pages.length) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?error=no_pages`);
    }

    // Find first page with a connected Instagram business account
    for (const page of pages) {
      const igAccount = await getInstagramAccountForPage(page.id, page.access_token);
      if (!igAccount) continue;

      await db.instagramAccount.upsert({
        where: { instagramId: igAccount.id },
        create: {
          userId: session.user.id,
          instagramId: igAccount.id,
          username: igAccount.username,
          profilePicUrl: igAccount.profile_picture_url,
          accessToken: longToken,
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: page.access_token,
        },
        update: {
          accessToken: longToken,
          pageAccessToken: page.access_token,
          username: igAccount.username,
          profilePicUrl: igAccount.profile_picture_url,
        },
      });

      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?success=connected`);
    }

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?error=no_instagram`);
  } catch (err) {
    console.error("Instagram callback error:", err);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?error=unknown`);
  }
}
