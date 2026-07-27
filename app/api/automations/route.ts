import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  postId: z.string(),
  postUrl: z.string().optional(),
  postCaption: z.string().optional(),
  postThumbnail: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const igAccount = await db.instagramAccount.findFirst({ where: { userId: session.user.id } });
  if (!igAccount) return NextResponse.json({ automations: [] });

  const automations = await db.postAutomation.findMany({
    where: { igAccountId: igAccount.id },
    include: { _count: { select: { conversations: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ automations });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const igAccount = await db.instagramAccount.findFirst({ where: { userId: session.user.id } });
  if (!igAccount) return NextResponse.json({ error: "No Instagram account" }, { status: 404 });

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const automation = await db.postAutomation.upsert({
    where: { igAccountId_postId: { igAccountId: igAccount.id, postId: body.data.postId } },
    create: { igAccountId: igAccount.id, ...body.data },
    update: body.data,
  });

  return NextResponse.json({ automation });
}
