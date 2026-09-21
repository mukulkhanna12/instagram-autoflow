import { db } from "./db";

/**
 * Meta's cap on private replies — the first DM, addressed to a comment — per
 * Instagram account per hour. Past it, sends fail until the hour rolls over.
 */
export const PRIVATE_REPLY_HOURLY_LIMIT = 750;

/** One Instagram account per AutoFlow user. */
export const IG_ACCOUNT_LIMIT = 1;

/**
 * Private replies sent in the last hour: each comment that (re)starts a flow
 * sends exactly one, and stamps `lastCommentAt`. A person commenting twice
 * within the hour counts once, so this can read slightly low, never high.
 */
export async function privateRepliesLastHour(userId: string): Promise<number> {
  return db.conversation.count({
    where: {
      lastCommentAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      automation: { igAccount: { userId, isDeleted: false }, isDeleted: false },
    },
  });
}
