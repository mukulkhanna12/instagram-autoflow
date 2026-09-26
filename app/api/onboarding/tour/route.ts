import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** The product tour was finished or skipped — don't start it on its own again. */
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.user.updateMany({
    where: { id: session.user.id, tourSeenAt: null },
    data: { tourSeenAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
