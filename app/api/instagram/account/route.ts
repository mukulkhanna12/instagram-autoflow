import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await db.instagramAccount.findFirst({
    where: { workspaceId: (await getWorkspaceContext())?.workspace.id ?? "none" },
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
