import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await db.instagramAccount.findFirst({
    where: { userId: session.user.id },
    select: {
      id: true,
      username: true,
      profilePicUrl: true,
      pageName: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ account });
}
