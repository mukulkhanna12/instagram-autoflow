import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** The quick-start modal was seen and closed — don't show it again. */
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.user.update({
    where: { id: session.user.id },
    data: { quickStartSeenAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
