import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { buttonsSchema } from "@/lib/schemas";
import { getReelDefaults } from "@/lib/reel-defaults";

/** Flows prepared for reels not yet uploaded, front of the queue first. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const igAccount = await db.instagramAccount.findFirst({ where: { userId: session.user.id } });
  if (!igAccount) return NextResponse.json({ flows: null });

  const flows = await db.queuedFlow.findMany({
    where: { igAccountId: igAccount.id },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ flows });
}

const createSchema = z.object({
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

/** Add a flow to the back of the queue. Unset fields take the account's defaults. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const igAccount = await db.instagramAccount.findFirst({ where: { userId: session.user.id } });
  if (!igAccount) return NextResponse.json({ error: "No Instagram account" }, { status: 404 });

  const body = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const last = await db.queuedFlow.findFirst({
    where: { igAccountId: igAccount.id },
    orderBy: { position: "desc" },
  });

  const defaults = await getReelDefaults(igAccount.id);

  const flow = await db.queuedFlow.create({
    data: {
      igAccountId: igAccount.id,
      position: (last?.position ?? -1) + 1,
      ...defaults,
      detailsButtons: defaults.detailsButtons ?? [],
      ...body.data,
    },
  });

  return NextResponse.json({ flow });
}
