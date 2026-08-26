import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { buttonsSchema } from "@/lib/schemas";

const updateSchema = z.object({
  name: z.string().optional(),
  keywords: z.string().optional(),
  commentReplyText: z.string().optional(),
  commentReplyText2: z.string().optional(),
  commentReplyText3: z.string().optional(),
  greetingMessage: z.string().optional(),
  greetingButtonText: z.string().optional(),
  followMessage: z.string().optional(),
  followButtonText: z.string().optional(),
  followRetryMessage: z.string().optional(),
  detailsMessage: z.string().optional(),
  detailsButtonEnabled: z.boolean().optional(),
  detailsButtons: buttonsSchema.optional(),
  detailsButtonText: z.string().optional(),
  detailsUrl: z.string().optional(),
});

/** Confirm the flow belongs to the signed-in user's account. */
async function ownedFlow(id: string, userId: string) {
  const igAccount = await db.instagramAccount.findFirst({ where: { userId } });
  if (!igAccount) return null;
  const flow = await db.queuedFlow.findFirst({ where: { id, igAccountId: igAccount.id } });
  return flow ? { flow, igAccount } : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await ownedFlow(id, session.user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = updateSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const flow = await db.queuedFlow.update({ where: { id }, data: body.data });
  return NextResponse.json({ flow });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await ownedFlow(id, session.user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Soft delete — the prepared flow leaves the queue but the row stays.
  await db.queuedFlow.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });
  return NextResponse.json({ success: true });
}
