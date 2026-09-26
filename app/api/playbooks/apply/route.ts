import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, dbUnfiltered } from "@/lib/db";
import { z } from "zod";
import { MAX_BUTTONS } from "@/lib/buttons";
import { findPlaybook, playbookFields } from "@/lib/playbooks";

const bodySchema = z.object({
  playbookId: z.string(),
  keyword: z.string().max(40).optional(),
  buttons: z
    .array(z.object({ title: z.string().min(1), url: z.string().url().refine((u) => /^https?:\/\//i.test(u)) }))
    .max(MAX_BUTTONS)
    .optional(),
  target: z.discriminatedUnion("kind", [
    // Prepare it for the next reel — joins the back of the Upcoming reels queue.
    z.object({ kind: z.literal("queue") }),
    z.object({
      kind: z.literal("reel"),
      postId: z.string(),
      postUrl: z.string().optional(),
      postCaption: z.string().optional(),
      postThumbnail: z.string().optional(),
      // Overwrite the wording of a reel that already has an automation.
      replace: z.boolean().optional(),
    }),
  ]),
});

/**
 * Set a reel (or the next one) up from a playbook in one go.
 *
 * A reel's automation is created switched off, like one made with Configure:
 * the user lands in the editor, sees the flow, and flips it Live there — which
 * is also where the first-Live catch-up sweep of old comments is offered.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const igAccount = await db.instagramAccount.findFirst({ where: { userId: session.user.id } });
  if (!igAccount) return NextResponse.json({ error: "No Instagram account" }, { status: 404 });

  const body = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const playbook = findPlaybook(body.data.playbookId);
  if (!playbook) return NextResponse.json({ error: "Unknown playbook" }, { status: 404 });

  const fields = playbookFields(playbook, { keyword: body.data.keyword, buttons: body.data.buttons });
  const { target } = body.data;

  if (target.kind === "queue") {
    const last = await db.queuedFlow.findFirst({
      where: { igAccountId: igAccount.id },
      orderBy: { position: "desc" },
    });
    const flow = await db.queuedFlow.create({
      data: {
        igAccountId: igAccount.id,
        position: (last?.position ?? -1) + 1,
        name: playbook.title,
        ...fields,
      },
    });
    return NextResponse.json({ flow });
  }

  const { replace, ...meta } = target;
  // Soft-deleted rows still hold the reel's slot, so look past the filter.
  const existing = await dbUnfiltered.postAutomation.findUnique({
    where: { igAccountId_postId: { igAccountId: igAccount.id, postId: meta.postId } },
    select: { isDeleted: true },
  });
  const hasLive = existing && !existing.isDeleted;

  // Never overwrite a reel's wording without being asked to.
  if (hasLive && !replace) {
    return NextResponse.json(
      { error: "This reel already has an automation", exists: true },
      { status: 409 }
    );
  }

  const automation = await dbUnfiltered.postAutomation.upsert({
    where: { igAccountId_postId: { igAccountId: igAccount.id, postId: meta.postId } },
    create: { igAccountId: igAccount.id, ...meta, ...fields },
    // Replacing keeps the live/off switch and the counters — only the wording changes.
    update: hasLive ? { ...meta, ...fields } : { ...meta, ...fields, isDeleted: false, deletedAt: null, isActive: false },
  });

  return NextResponse.json({ automation });
}
