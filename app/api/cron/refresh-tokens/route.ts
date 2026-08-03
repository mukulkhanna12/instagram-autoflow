import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { refreshLongLivedToken } from "@/lib/instagram";
import { isAuthorizedCron } from "@/lib/cron";

/**
 * Daily token refresh. Long-lived Instagram tokens expire ~60 days after issue;
 * without this the automation silently stops once the token lapses. Refreshing
 * a valid long-lived token extends it another ~60 days.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return new NextResponse("Unauthorized", { status: 401 });

  const accounts = await db.instagramAccount.findMany();

  let refreshed = 0;
  for (const account of accounts) {
    try {
      const { access_token } = await refreshLongLivedToken(account.accessToken);
      await db.instagramAccount.update({
        where: { id: account.id },
        data: { accessToken: access_token },
      });
      refreshed++;
    } catch (err) {
      console.error(`token refresh failed for ${account.username}:`, err);
    }
  }

  return NextResponse.json({ ok: true, refreshed });
}
