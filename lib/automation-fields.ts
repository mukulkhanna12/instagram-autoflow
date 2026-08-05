/**
 * The configurable content of one reel's flow — everything a user can edit,
 * and therefore everything that gets copied when they clone one reel's setup
 * onto another.
 *
 * Deliberately excludes identity (`postId`, thumbnails), the live/off switch,
 * and the analytics counters: copying a flow should not copy someone else's
 * numbers or silently switch a reel on.
 */
export const AUTOMATION_CONTENT_FIELDS = [
  "keywords",
  "commentReplyText",
  "commentReplyText2",
  "commentReplyText3",
  "greetingMessage",
  "greetingButtonText",
  "followMessage",
  "followButtonText",
  "followRetryMessage",
  "detailsMessage",
  "detailsButtonEnabled",
  "detailsButtons",
  "detailsButtonText",
  "detailsUrl",
] as const;

export type AutomationContentField = (typeof AUTOMATION_CONTENT_FIELDS)[number];

/** Pick just the content fields off a record, for copying between reels. */
export function pickContent<T extends Record<string, unknown>>(
  source: T
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of AUTOMATION_CONTENT_FIELDS) {
    if (f in source) out[f] = source[f];
  }
  return out;
}
