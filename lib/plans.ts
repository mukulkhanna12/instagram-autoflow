/**
 * What the Free plan includes. Every feature, with two limits: reels with an
 * automation per workspace, and automations built on the Automations page.
 * Existing automations over the limit keep working — the limit only stops new
 * ones being added. Pro (coming soon) will lift it.
 */
export const FREE_PLAN = {
  reels: 3,
  automations: 1,
} as const;

export const REEL_LIMIT_MESSAGE =
  `The Free plan includes ${FREE_PLAN.reels} reels with automations. Remove one to add another — Pro, with more, is coming soon.`;

export const AUTOMATION_LIMIT_MESSAGE =
  `The Free plan includes ${FREE_PLAN.automations} automation. Edit or delete it to make a new one — Pro, with more, is coming soon.`;

/** Can another reel get an automation, given how many are live already? */
export function canAddReel(liveReelAutomations: number): boolean {
  return liveReelAutomations < FREE_PLAN.reels;
}

/** Can another automation be built, given how many exist already? */
export function canAddAutomation(existing: number): boolean {
  return existing < FREE_PLAN.automations;
}
