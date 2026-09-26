/**
 * First-run onboarding: connect Instagram → confirm the account → a short
 * "Before you start" survey → the dashboard, where a quick-start modal offers
 * the first automation.
 *
 * Who is sent through it: a user who has neither finished the survey nor
 * connected an Instagram account. Anyone who already has an account connected
 * — every user from before onboarding existed — goes straight to the dashboard
 * and is never pushed back through it.
 */

import { z } from "zod";

/** Cookie that tells the Instagram OAuth callback to return to onboarding. */
export const RETURN_COOKIE = "af_ig_return";

/** One-time value tying an Instagram OAuth callback to the browser that started it. */
export const OAUTH_STATE_COOKIE = "af_ig_state";

/** The typed @username, carried across the OAuth round trip in the browser. */
export const TYPED_USERNAME_KEY = "autoflow.onboarding.username";

export const SOURCE_OPTIONS = [
  "Instagram", "TikTok", "Search (Google, AI)", "YouTube", "X / Twitter", "Friend / Referral", "Other",
] as const;

export const ROLE_OPTIONS = [
  "Content creator", "Influencer", "Coach / Consultant", "E-commerce seller", "Agency", "Brand / Business", "Other",
] as const;

export const GOAL_OPTIONS = [
  "Save time on repetitive DMs", "Send links automatically", "Grow my following",
  "Run giveaways", "Collect leads / emails",
] as const;

export const answersSchema = z.object({
  source: z.enum(SOURCE_OPTIONS),
  role: z.enum(ROLE_OPTIONS),
  // Several goals can apply at once, so this one is multi-select.
  goals: z.array(z.enum(GOAL_OPTIONS)).min(1).max(GOAL_OPTIONS.length),
  country: z.string().trim().min(2).max(80),
});

export type OnboardingAnswers = z.infer<typeof answersSchema>;

export function needsOnboarding(user: { onboardedAt: Date | null }, hasInstagram: boolean): boolean {
  return !user.onboardedAt && !hasInstagram;
}

/**
 * Should the app send this person to onboarding before anything else?
 *
 * Only a brand-new user: the owner of their one and only workspace, who hasn't
 * done the survey or connected Instagram. Anyone in more than one workspace —
 * someone who joined a team, or made a second workspace — is already using the
 * app, and forcing them back to "connect Instagram" for an empty workspace
 * would leave them stuck there.
 */
export function shouldForceOnboarding(
  user: { onboardedAt: Date | null },
  ws: { hasInstagram: boolean; role: "owner" | "member"; workspaceCount: number }
): boolean {
  return ws.role === "owner" && ws.workspaceCount === 1 && needsOnboarding(user, ws.hasInstagram);
}

/** Strip a pasted "@name", a profile URL, or stray whitespace down to the handle. */
export function normalizeUsername(input: string): string {
  let v = input.trim();
  const m = v.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (m) v = m[1];
  return v.replace(/^@+/, "").replace(/\/+$/, "").toLowerCase();
}

export function isValidUsername(v: string): boolean {
  return /^[a-z0-9._]{1,30}$/.test(v);
}

/**
 * Should an owner be sent to finish setting up this workspace's Instagram?
 * Every workspace runs one account, so an owner who isn't brand-new (that's
 * onboarding) and is in a workspace without one — they closed the Instagram
 * login, or logged out halfway — comes back to /setup/instagram until it's
 * connected. Members can't connect one, so they're never sent there.
 */
export function needsInstagramSetup(
  user: { onboardedAt: Date | null },
  ws: { hasInstagram: boolean; role: "owner" | "member"; workspaceCount: number }
): boolean {
  return ws.role === "owner" && !ws.hasInstagram && !shouldForceOnboarding(user, ws);
}
