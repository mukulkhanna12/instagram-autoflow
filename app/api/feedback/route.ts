import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getWorkspaceContext } from "@/lib/workspace";
import {
  FEEDBACK_TYPES, MAX_PER_DAY, MESSAGE_MAX, MESSAGE_MIN, isFeedbackReviewer, isFeedbackType,
} from "@/lib/feedback";

/**
 * Your feedback, newest first — and for the reviewer, everyone's.
 */
export async function GET() {
  const ctx = await getWorkspaceContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reviewer = isFeedbackReviewer(ctx.email);
  const [mine, all] = await Promise.all([
    db.feedback.findMany({ where: { userId: ctx.userId }, orderBy: { createdAt: "desc" }, take: 100 }),
    reviewer
      ? db.feedback.findMany({
          orderBy: { createdAt: "desc" },
          take: 300,
          include: { user: { select: { name: true, email: true } } },
        })
      : Promise.resolve(null),
  ]);
  return NextResponse.json({ reviewer, mine, all });
}

const schema = z.object({
  type: z.string().refine(isFeedbackType),
  message: z.string().trim().min(MESSAGE_MIN).max(MESSAGE_MAX),
  page: z.string().max(200).optional(),
});

/** Send feedback. Up to 10 a day per person; the owner gets an email. */
export async function POST(req: NextRequest) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: `Write at least ${MESSAGE_MIN} characters (up to ${MESSAGE_MAX})` }, { status: 400 });
  }

  const today = await db.feedback.count({
    where: { userId: ctx.userId, createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  if (today >= MAX_PER_DAY) {
    return NextResponse.json({ error: "That's plenty for today — thank you! Try again tomorrow." }, { status: 429 });
  }

  const feedback = await db.feedback.create({
    data: {
      userId: ctx.userId,
      workspaceId: ctx.workspace.id,
      type: body.data.type,
      message: body.data.message,
      page: body.data.page,
    },
  });

  // Tell the owner. Best effort: a failed email never loses the feedback.
  const owner = process.env.ALLOWED_LOGIN_EMAIL;
  if (owner) {
    const t = FEEDBACK_TYPES[body.data.type as keyof typeof FEEDBACK_TYPES];
    sendEmail({
      to: owner,
      subject: `${t.emoji} New ${t.label.toLowerCase()} from ${ctx.email}`,
      text: `${ctx.email} sent ${t.label.toLowerCase()} from ${body.data.page ?? "the app"}:\n\n${body.data.message}\n\nReview it at ${process.env.NEXTAUTH_URL ?? ""}/feedback`,
      html: `<p><b>${escapeHtml(ctx.email)}</b> sent ${t.emoji} ${t.label.toLowerCase()} from <code>${escapeHtml(body.data.page ?? "the app")}</code>:</p><blockquote style="border-left:3px solid #dcfb4b;padding-left:12px;color:#374151">${escapeHtml(body.data.message).replace(/\n/g, "<br>")}</blockquote><p><a href="${process.env.NEXTAUTH_URL ?? ""}/feedback">Review it</a></p>`,
    }).catch((err) => console.error("Feedback email failed:", err));
  }

  return NextResponse.json({ feedback });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
