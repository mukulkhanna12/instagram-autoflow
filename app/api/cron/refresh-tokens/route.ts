import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getLongLivedToken, getUserPages } from "@/lib/instagram";
import { isAuthorizedCron } from "@/lib/cron";

/**
 * Daily token refresh. Long-lived Instagram/Facebook tokens expire ~60 days
 * after they're issued; without this the automation silently stops working once
 * the token lapses. Re-exchanging the current long-lived token extends it, and
 * we re-read the Page token off the back of the refreshed user token.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return new NextResponse("Unauthorized", { status: 401 });

  const accounts = await db.instagramAccount.findMany();

  let refreshed = 0;
  for (const account of accounts) {
    try {
      const { access_token: newUserToken } = await getLongLivedToken(account.accessToken);

      let pageAccessToken = account.pageAccessToken;
      if (account.pageId) {
        const pages = await getUserPages(newUserToken);
        const page = pages.find((p) => p.id === account.pageId);
        if (page) pageAccessToken = page.access_token;
      }

      await db.instagramAccount.update({
        where: { id: account.id },
        data: { accessToken: newUserToken, pageAccessToken },
      });
      refreshed++;
    } catch (err) {
      console.error(`token refresh failed for ${account.username}:`, err);
    }
  }

  return NextResponse.json({ ok: true, refreshed });
}
