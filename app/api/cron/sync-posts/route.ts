import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getInstagramPosts } from "@/lib/instagram";
import { automationCreateFromTemplate } from "@/lib/templates";
import { isAuthorizedCron } from "@/lib/cron";

/**
 * Daily sync: for every account with an enabled default template, pull recent
 * media and pre-create an automation for any reel that doesn't have one yet, so
 * newly uploaded reels appear as Live in the dashboard before the first comment.
 * (The webhook also materializes on first comment, so this is just for
 * visibility — not correctness.)
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return new NextResponse("Unauthorized", { status: 401 });

  const accounts = await db.instagramAccount.findMany({
    where: { template: { enabled: true } },
    include: { template: true },
  });

  let created = 0;
  for (const account of accounts) {
    if (!account.template) continue;
    try {
      const posts = await getInstagramPosts(account.instagramId, account.accessToken);
      for (const post of posts) {
        const existing = await db.postAutomation.findUnique({
          where: { igAccountId_postId: { igAccountId: account.id, postId: post.id } },
        });
        if (existing) continue;

        await db.postAutomation.create({
          data: automationCreateFromTemplate(account.id, post.id, account.template, post),
        });
        created++;
      }
    } catch (err) {
      console.error(`sync-posts failed for ${account.username}:`, err);
    }
  }

  return NextResponse.json({ ok: true, created });
}
