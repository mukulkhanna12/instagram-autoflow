import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMetaAuthUrl } from "@/lib/instagram";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/instagram/callback`;
  const url = getMetaAuthUrl(redirectUri);
  return NextResponse.redirect(url);
}
