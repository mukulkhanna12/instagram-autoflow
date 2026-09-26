import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";
import { isFeedbackReviewer, isFeedbackStatus } from "@/lib/feedback";

const schema = z.object({
  status: z.string().refine(isFeedbackStatus).optional(),
  reply: z.string().trim().max(500).nullable().optional(),
});

/** Reviewer only: move feedback through its statuses and note a reward or reply. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getWorkspaceContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isFeedbackReviewer(ctx.email)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const feedback = await db.feedback.update({
    where: { id },
    data: { ...body.data, reply: body.data.reply === "" ? null : body.data.reply },
  });
  return NextResponse.json({ feedback });
}
