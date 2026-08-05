import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getInstagramPosts } from "@/lib/instagram";
import { attachNextQueuedFlow } from "@/lib/templates";
import { isAuthorizedCron } from "@/lib/cron";

/**
 * Daily sync: for every account with prepared flows waiting, pull recent media
 * and attach the next queued flow to any reel that doesn't have an automation
 * yet, so a newly uploaded reel shows up configured before its first comment.
 *
 * The webhook does the same on first comment, so this is about how quickly a
 * new reel appears in the dashboard rather than correctness. On Vercel's free
 * plan this only runs once a day, which is why the comment path matters.
 *
 * Reels are processed oldest-first so the queue is consumed in upload order —
 * the flow you prepared first lands on the reel you posted first.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return new NextResponse("Unauthorized", { status: 401 });

  const accounts = await db.instagramAccount.findMany({
    where: { queuedFlows: { some: {} } },
  });

  let created = 0;
  for (const account of accounts) {
    try {
      const posts = await getInstagramPosts(account.instagramId, account.accessToken);

      // getInstagramPosts returns newest-first; walk it backwards so the oldest
      // unhandled reel claims the front of the queue.
      for (const post of [...posts].reverse()) {
        const automation = await attachNextQueuedFlow(account.id, post.id, post);
        if (automation) created++;
        else {
          // Null means either the reel already had one, or the queue is now
          // empty. Stop early on an empty queue — nothing left to hand out.
          const remaining = await db.queuedFlow.count({ where: { igAccountId: account.id } });
          if (remaining === 0) break;
        }
      }
    } catch (err) {
      console.error(`sync-posts failed for ${account.username}:`, err);
    }
  }

  return NextResponse.json({ ok: true, created });
}
