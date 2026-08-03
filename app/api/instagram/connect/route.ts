import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getInstagramAuthUrl } from "@/lib/instagram";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/instagram/callback`;
  return NextResponse.redirect(getInstagramAuthUrl(redirectUri));
}
