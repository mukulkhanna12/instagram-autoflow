import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  enabled: z.boolean().optional(),
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
  detailsButtonText: z.string().optional(),
  detailsUrl: z.string().optional(),
});

/** The default-flow template for the signed-in user's Instagram account. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const igAccount = await db.instagramAccount.findFirst({ where: { userId: session.user.id } });
  if (!igAccount) return NextResponse.json({ template: null });

  // Lazily create the template row with schema defaults on first view.
  const template =
    (await db.automationTemplate.findUnique({ where: { igAccountId: igAccount.id } })) ??
    (await db.automationTemplate.create({ data: { igAccountId: igAccount.id } }));

  return NextResponse.json({ template });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const igAccount = await db.instagramAccount.findFirst({ where: { userId: session.user.id } });
  if (!igAccount) return NextResponse.json({ error: "No Instagram account" }, { status: 404 });

  const body = updateSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const template = await db.automationTemplate.upsert({
    where: { igAccountId: igAccount.id },
    create: { igAccountId: igAccount.id, ...body.data },
    update: body.data,
  });

  return NextResponse.json({ template });
}
