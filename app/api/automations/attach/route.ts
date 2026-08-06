import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { attachNextQueuedFlow } from "@/lib/templates";

const bodySchema = z.object({
  postId: z.string(),
  postUrl: z.string().optional(),
  postCaption: z.string().optional(),
  postThumbnail: z.string().optional(),
});

/**
 * Attach the next prepared flow to a reel now, without waiting for a comment.
 *
 * A queued flow otherwise only lands when someone comments on the reel (or on
 * the daily cron), so a reel uploaded minutes ago looks untouched. This lets the
 * user point the front of the queue at the reel they actually meant, which also
 * settles the ordering question: whichever reel they click gets the next flow.
 *
 * Leaving it alone is still fine — the comment path attaches it automatically.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const igAccount = await db.instagramAccount.findFirst({ where: { userId: session.user.id } });
  if (!igAccount) return NextResponse.json({ error: "No Instagram account" }, { status: 404 });

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const { postId, postUrl, postCaption, postThumbnail } = body.data;

  // Distinguish the two reasons attachNextQueuedFlow returns null, so the UI can
  // say which one happened rather than failing silently.
  const existing = await db.postAutomation.findUnique({
    where: { igAccountId_postId: { igAccountId: igAccount.id, postId } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "This reel already has an automation" },
      { status: 409 }
    );
  }

  const automation = await attachNextQueuedFlow(igAccount.id, postId, {
    permalink: postUrl ?? "",
    caption: postCaption,
    thumbnail_url: postThumbnail,
    media_url: postThumbnail,
  });

  if (!automation) {
    return NextResponse.json(
      { error: "No prepared flows left in the queue" },
      { status: 409 }
    );
  }

  return NextResponse.json({ automation });
}
