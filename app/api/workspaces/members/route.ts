import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { inviteStatus } from "@/lib/invites";

/** The team: members, and — for the owner — invites still waiting. */
export async function GET() {
  const { ctx, error } = await requireWorkspace();
  if (error) return error;

  const members = await db.membership.findMany({
    where: { workspaceId: ctx.workspace.id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  const invites =
    ctx.role === "owner"
      ? (
          await db.invite.findMany({
            where: { workspaceId: ctx.workspace.id, acceptedAt: null, revokedAt: null },
            include: { invitedBy: { select: { name: true, email: true } } },
            orderBy: { createdAt: "desc" },
          })
        ).map((i) => ({
          id: i.id,
          email: i.email,
          createdAt: i.createdAt,
          expiresAt: i.expiresAt,
          status: inviteStatus(i),
        }))
      : [];

  return NextResponse.json({
    you: { userId: ctx.userId, role: ctx.role },
    workspace: { id: ctx.workspace.id, name: ctx.workspace.name },
    members: members.map((m) => ({
      userId: m.user.id,
      name: m.user.name && m.user.name !== "AutoFlow" ? m.user.name : null,
      email: m.user.email,
      image: m.user.image,
      role: m.role,
      joinedAt: m.createdAt,
    })),
    invites,
  });
}
