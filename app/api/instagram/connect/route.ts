import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getInstagramAuthUrl } from "@/lib/instagram";
import { OAUTH_STATE_COOKIE, RETURN_COOKIE } from "@/lib/onboarding";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/instagram/callback`;
  // CSRF guard for the OAuth round trip. Without it, anyone could send a
  // signed-in user to the callback with *their own* authorization code and
  // silently connect their Instagram account to the victim's AutoFlow user.
  const state = crypto.randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(getInstagramAuthUrl(redirectUri, state));
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/instagram/callback",
    maxAge: 15 * 60,
  });

  // The OAuth round trip loses where it started. Onboarding needs the callback
  // to land on the "Account found" step rather than Settings, so it leaves a
  // short-lived note for the callback to read.
  if (req.nextUrl.searchParams.get("from") === "onboarding") {
    res.cookies.set(RETURN_COOKIE, "onboarding", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 15 * 60,
    });
  }
  return res;
}
