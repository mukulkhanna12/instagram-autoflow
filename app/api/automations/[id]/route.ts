import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  isActive: z.boolean().optional(),
  commentReplyText: z.string().optional(),
  greetingMessage: z.string().optional(),
  greetingButtonText: z.string().optional(),
  followMessage: z.string().optional(),
  followButtonText: z.string().optional(),
  followRetryMessage: z.string().optional(),
  detailsMessage: z.string().optional(),
  detailsButtonText: z.string().optional(),
  detailsUrl: z.string().optional(),
});

async function getAutomationForUser(id: string, userId: string) {
  const igAccount = await db.instagramAccount.findFirst({ where: { userId } });
  if (!igAccount) return null;
  return db.postAutomation.findFirst({ where: { id, igAccountId: igAccount.id } });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const automation = await getAutomationForUser(id, session.user.id);
  if (!automation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const conversations = await db.conversation.findMany({
    where: { automationId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ automation, conversations });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const automation = await getAutomationForUser(id, session.user.id);
  if (!automation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = updateSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const updated = await db.postAutomation.update({ where: { id }, data: body.data });
  return NextResponse.json({ automation: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const automation = await getAutomationForUser(id, session.user.id);
  if (!automation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.postAutomation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
