import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enabledSocialProviders } from "@/lib/social-auth";

/** The signed-in user's own profile — what Settings → Profile shows and edits. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true, createdAt: true, accounts: { select: { provider: true } } },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { accounts, ...rest } = user;
  return NextResponse.json({
    user: rest,
    // Sign-in methods: which social logins are linked, and which the server
    // has keys for (an unconfigured one can't be linked yet).
    signIn: {
      linked: Array.from(new Set(accounts.map((a) => a.provider))),
      available: enabledSocialProviders(),
    },
  });
}

const patchSchema = z.object({
  // Empty clears it; the top bar then falls back to "Your account".
  name: z.string().trim().max(60),
});

/** Only the display name is editable: the email is the login identity. */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Name must be 60 characters or fewer" }, { status: 400 });

  const user = await db.user.update({
    where: { id: session.user.id },
    data: { name: body.data.name || null },
    select: { name: true, email: true, image: true, createdAt: true },
  });
  return NextResponse.json({ user });
}
