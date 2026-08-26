import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { buttonsSchema } from "@/lib/schemas";
import { getReelDefaults, FALLBACK_REEL_DEFAULTS } from "@/lib/reel-defaults";

const updateSchema = z.object({
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

/**
 * The wording new reel automations start from. Returns the built-in fallback
 * when the account has never saved its own, so the page always has something
 * real to show rather than an empty form.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const igAccount = await db.instagramAccount.findFirst({ where: { userId: session.user.id } });
  if (!igAccount) return NextResponse.json({ defaults: null });

  return NextResponse.json({ defaults: await getReelDefaults(igAccount.id) });
}

/** Save the defaults. Creates the row on first save; leaves existing reels alone. */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const igAccount = await db.instagramAccount.findFirst({ where: { userId: session.user.id } });
  if (!igAccount) return NextResponse.json({ error: "No Instagram account" }, { status: 404 });

  const body = updateSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const defaults = await db.reelDefaults.upsert({
    where: { igAccountId: igAccount.id },
    // A first save has to start from the fallback, not from the column
    // defaults: a field the user cleared must persist as cleared.
    create: { igAccountId: igAccount.id, ...FALLBACK_REEL_DEFAULTS, ...body.data },
    update: body.data,
  });

  return NextResponse.json({ defaults });
}
