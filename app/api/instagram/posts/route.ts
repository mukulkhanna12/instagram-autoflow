import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getInstagramPosts } from "@/lib/instagram";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const igAccount = await db.instagramAccount.findFirst({
    where: { userId: session.user.id },
  });
  if (!igAccount) return NextResponse.json({ error: "No Instagram account connected" }, { status: 404 });

  try {
    const posts = await getInstagramPosts(igAccount.instagramId, igAccount.accessToken);
    return NextResponse.json({ posts });
  } catch (err) {
    console.error("Fetch posts error:", err);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
