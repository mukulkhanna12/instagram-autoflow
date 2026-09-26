/**
 * Workspace roles. Pure — no database — so the rules are unit-tested and
 * shared by the server and the UI.
 *
 *   owner  – everything: invite and remove people, connect or disconnect
 *            Instagram, rename the workspace
 *   member – all the day-to-day work: automations, playbooks, upcoming reels,
 *            analytics, switching reels Live
 *
 * Kept to two on purpose. The role is stored as a string, so a read-only
 * "viewer" (or an "admin") can be added later without a migration.
 */

export const ROLES = ["owner", "member"] as const;
export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = { member: 0, owner: 1 };

export const ROLE_LABEL: Record<Role, string> = { owner: "Owner", member: "Member" };

export const ROLE_BLURB: Record<Role, string> = {
  owner: "Manages the team and the Instagram connection",
  member: "Builds and runs automations",
};

export function isRole(v: unknown): v is Role {
  return typeof v === "string" && (ROLES as readonly string[]).includes(v);
}

/** Does `role` meet the minimum `min`? */
export function atLeast(role: Role, min: Role): boolean {
  return RANK[role] >= RANK[min];
}

/** Only the owner manages the team; the owner can't be removed. */
export function canRemove(actor: Role, target: Role): boolean {
  return actor === "owner" && target !== "owner";
}
