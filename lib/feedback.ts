/**
 * Feedback & ideas: the kinds people can send, the statuses the owner moves
 * them through, and who counts as the reviewer. Pure — shared by the API and
 * the UI, and unit-tested.
 */

export const FEEDBACK_TYPES = {
  idea: { label: "Idea", emoji: "💡" },
  feedback: { label: "Feedback", emoji: "💬" },
  bug: { label: "Something's broken", emoji: "🐞" },
  other: { label: "Other", emoji: "✨" },
} as const;
export type FeedbackType = keyof typeof FEEDBACK_TYPES;

export const FEEDBACK_STATUSES = {
  received: { label: "Received", tone: "bg-gray-100 text-gray-600" },
  reviewing: { label: "Reviewing", tone: "bg-sky-100 text-sky-700" },
  planned: { label: "Planned", tone: "bg-violet-100 text-violet-700" },
  shipped: { label: "Shipped", tone: "bg-emerald-100 text-emerald-700" },
  rewarded: { label: "Rewarded 🎁", tone: "bg-lime text-gray-950" },
} as const;
export type FeedbackStatus = keyof typeof FEEDBACK_STATUSES;

export const MESSAGE_MIN = 5;
export const MESSAGE_MAX = 2000;
export const MAX_PER_DAY = 10;

export const isFeedbackType = (v: unknown): v is FeedbackType =>
  typeof v === "string" && v in FEEDBACK_TYPES;

export const isFeedbackStatus = (v: unknown): v is FeedbackStatus =>
  typeof v === "string" && v in FEEDBACK_STATUSES;

/** The app owner reviews feedback: the bootstrap address, ALLOWED_LOGIN_EMAIL. */
export function isFeedbackReviewer(email: string | null | undefined): boolean {
  const owner = process.env.ALLOWED_LOGIN_EMAIL?.trim().toLowerCase();
  return !!owner && !!email && email.trim().toLowerCase() === owner;
}
