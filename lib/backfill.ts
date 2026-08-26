/**
 * Catch up on comments a reel already had before its flow was configured.
 *
 * The case this exists for: you post a reel, it collects comments for a few
 * days, and only then do you set up an automation (or the default template
 * materializes one). Without this, every one of those people is silently
 * skipped — the webhook only ever fires for comments that arrive *after*
 * configuration.
 *
 * ## The 7-day wall
 *
 * Instagram only permits a private reply "within 7 days of the comment was
 * made on the post or reel":
 * https://developers.facebook.com/docs/instagram-platform/private-replies/
 *
 * A comment older than that can never be DM'd — the API rejects it. Rather than
 * post a public "sent you a DM!" reply that would be a lie, those comments are
 * left completely alone and reported back as `tooOld`.
 *
 * ## Not double-sending
 *
 * Three independent guards, because a backfill can be run repeatedly and must
 * never re-DM someone:
 *   1. a Conversation already exists for the comment id — we handled it
 *   2. the comment already carries a reply from the connected account — we
 *      answered it, whatever the wording, so it's left alone
 *   3. the commenter is the account itself
 */

import { db } from "./db";
import { getMediaComments, likeComment, replyToComment, type IgComment } from "./instagram";
import { handleNewComment } from "./flow-engine";
import { commentMatchesKeywords } from "./keywords";

/** Private replies are refused past 7 days; stop a little short of the edge. */
const PRIVATE_REPLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000 - 5 * 60 * 1000;

export interface BackfillResult {
  scanned: number;
  handled: number;
  tooOld: number;
  alreadyHandled: number;
  alreadyReplied: number;
  keywordMiss: number;
  ownComment: number;
  failed: number;
  /** True when the scan cap was hit and more comments remain unexamined. */
  truncated: boolean;
}

const EMPTY: BackfillResult = {
  scanned: 0, handled: 0, tooOld: 0, alreadyHandled: 0,
  alreadyReplied: 0, keywordMiss: 0, ownComment: 0, failed: 0, truncated: false,
};

export function isWithinPrivateReplyWindow(timestamp: string | undefined, now = Date.now()): boolean {
  if (!timestamp) return false; // no timestamp — can't prove it's in window, so don't DM
  const t = new Date(timestamp).getTime();
  if (Number.isNaN(t)) return false;
  return now - t < PRIVATE_REPLY_WINDOW_MS;
}

/**
 * Did the connected account already reply to this comment?
 *
 * Fails *closed*: a reply whose author Instagram didn't tell us about counts as
 * ours. `replies{id,from}` is a nested edge and `from` comes back missing often
 * enough — deleted authors, permission trimming, restricted accounts — that
 * trusting its absence meant DMing people whose comments had already been
 * answered by hand. Skipping a stranger's reply now and then costs one missed
 * DM; the other way round messages someone the account already talked to.
 *
 * `ownUsername` is matched as a fallback for the same reason: `from.username`
 * is sometimes present when `from.id` is not.
 */
export function hasOwnReply(comment: IgComment, ownIgId: string, ownUsername?: string): boolean {
  const own = ownUsername?.trim().toLowerCase();
  return (comment.replies?.data ?? []).some((r) => {
    const id = r.from?.id;
    const username = r.from?.username?.trim().toLowerCase();
    if (id) return id === ownIgId;
    if (username) return !!own && username === own;
    return true; // author unknown — assume it was us rather than risk a duplicate
  });
}

type Automation = {
  id: string;
  postId: string;
  isActive: boolean;
  keywords: string;
  commentReplyText: string;
  commentReplyText2: string | null;
  commentReplyText3: string | null;
};

type Account = { instagramId: string; accessToken: string; username?: string };

/** Pick a random non-empty reply variant, matching the webhook's behaviour. */
function pickReply(a: Automation): string {
  const pool = [a.commentReplyText, a.commentReplyText2, a.commentReplyText3]
    .map((t) => t?.trim())
    .filter((t): t is string => !!t);
  return pool[Math.floor(Math.random() * pool.length)] ?? a.commentReplyText;
}

/**
 * Work through a reel's existing comments. With `dryRun` nothing is sent — the
 * same decisions are made and only counted, so the UI can say exactly what
 * would happen before anything goes out.
 */
export async function backfillComments(
  automation: Automation,
  account: Account,
  opts: { dryRun?: boolean; max?: number } = {}
): Promise<BackfillResult> {
  const max = opts.max ?? 200;
  const result: BackfillResult = { ...EMPTY };

  const comments = await getMediaComments(automation.postId, account.accessToken, max);
  result.scanned = comments.length;
  result.truncated = comments.length >= max;

  for (const c of comments) {
    const senderId = c.from?.id;
    if (!c.id || !senderId) continue;

    if (senderId === account.instagramId) { result.ownComment++; continue; }

    // Cheapest checks first — no API or DB cost.
    if (!isWithinPrivateReplyWindow(c.timestamp)) { result.tooOld++; continue; }
    if (!commentMatchesKeywords(c.text, automation.keywords)) { result.keywordMiss++; continue; }
    if (hasOwnReply(c, account.instagramId, account.username)) { result.alreadyReplied++; continue; }

    const seen = await db.conversation.findFirst({
      where: { automationId: automation.id, commentId: c.id },
    });
    if (seen) { result.alreadyHandled++; continue; }

    if (opts.dryRun) { result.handled++; continue; }

    try {
      await replyToComment(c.id, pickReply(automation), account.accessToken);
      await likeComment(account.instagramId, c.id, account.accessToken);
      await db.postAutomation.update({
        where: { id: automation.id },
        data: { commentsHandled: { increment: 1 } },
      });
      await handleNewComment({
        automationId: automation.id,
        commentId: c.id,
        senderIgUserId: senderId,
        senderUsername: c.from?.username,
        igUserId: account.instagramId,
        accessToken: account.accessToken,
      });
      result.handled++;
    } catch (err) {
      // One bad comment must not abandon the rest of the backlog.
      console.error(`backfill failed for comment ${c.id}:`, err);
      result.failed++;
    }
  }

  return result;
}
