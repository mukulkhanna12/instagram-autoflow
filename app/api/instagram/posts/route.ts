import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getInstagramPosts, type IgMedia } from "@/lib/instagram";

// DEMO ONLY: sample reels so the picker is browsable without a real IG token.
// Double-gated — never returned in production.
const DEMO_POSTS: IgMedia[] = [
  { id: "reel-photo-website", caption: "Comment 'LINK' and I'll DM you my photography website 📸", media_type: "VIDEO", permalink: "#", timestamp: "2026-07-20T10:00:00Z", like_count: 1240, comments_count: 279 },
  { id: "reel-travel-guide", caption: "New reel: 5 hidden cafes in Lisbon ☕ (comment GUIDE)", media_type: "VIDEO", permalink: "#", timestamp: "2026-07-25T10:00:00Z", like_count: 860, comments_count: 25 },
  { id: "reel-presets", caption: "3 Lightroom presets I use on every shoot ✨ (comment PRESET)", media_type: "VIDEO", permalink: "#", timestamp: "2026-07-28T10:00:00Z", like_count: 430, comments_count: 12 },
  { id: "reel-bali-bts", caption: "Behind the scenes of my Bali trip 🌴", media_type: "VIDEO", permalink: "#", timestamp: "2026-07-30T10:00:00Z", like_count: 2100, comments_count: 47 },
  { id: "reel-portraits", caption: "How I edit moody portraits 🎞️ (comment EDIT)", media_type: "VIDEO", permalink: "#", timestamp: "2026-08-01T10:00:00Z", like_count: 980, comments_count: 33 },
];

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const igAccount = await db.instagramAccount.findFirst({
    where: { userId: session.user.id },
  });
  if (!igAccount) return NextResponse.json({ error: "No Instagram account connected" }, { status: 404 });

  const demoMode =
    process.env.NODE_ENV !== "production" && process.env.DEMO_SHOW_OTP === "1";
  if (demoMode) return NextResponse.json({ posts: DEMO_POSTS });

  try {
    const posts = await getInstagramPosts(igAccount.instagramId, igAccount.accessToken);
    return NextResponse.json({ posts });
  } catch (err) {
    console.error("Fetch posts error:", err);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
