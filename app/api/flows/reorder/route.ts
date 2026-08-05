import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({ ids: z.array(z.string()) });

/**
 * Rewrite the queue order. `ids` is the full list, front first — position is
 * assigned from the array index, so the client sends what it shows.
 *
 * Ids that don't belong to this account are ignored rather than rejected: a
 * flow consumed by a reel between the page loading and the drag finishing is
 * expected, not an error.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const igAccount = await db.instagramAccount.findFirst({ where: { userId: session.user.id } });
  if (!igAccount) return NextResponse.json({ error: "No Instagram account" }, { status: 404 });

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const owned = await db.queuedFlow.findMany({
    where: { igAccountId: igAccount.id },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((f) => f.id));

  await db.$transaction(
    body.data.ids
      .filter((id) => ownedIds.has(id))
      .map((id, index) =>
        db.queuedFlow.update({ where: { id }, data: { position: index } })
      )
  );

  const flows = await db.queuedFlow.findMany({
    where: { igAccountId: igAccount.id },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ flows });
}
