import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Disconnect the Instagram account — a soft delete.
 *
 * The row stays, flagged, and so does every automation, queued flow and
 * conversation hanging off it. They vanish from the dashboard because the
 * soft-delete extension hides children of a disconnected account, and they all
 * come back the moment the same account is reconnected. Nothing is destroyed.
 */
export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.instagramAccount.updateMany({
    where: { userId: session.user.id, isDeleted: false },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
