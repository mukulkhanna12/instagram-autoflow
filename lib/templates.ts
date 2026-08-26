import type { QueuedFlow } from "@prisma/client";
import { db } from "./db";
import type { IgMedia } from "./instagram";

// The message fields a queued flow shares with a per-reel automation.
export type TemplateFields = Pick<
  QueuedFlow,
  | "keywords"
  | "commentReplyText"
  | "commentReplyText2"
  | "commentReplyText3"
  | "greetingMessage"
  | "greetingButtonText"
  | "followMessage"
  | "followButtonText"
  | "followRetryMessage"
  | "detailsMessage"
  | "detailsButtonEnabled"
  | "detailsButtons"
  | "detailsButtonText"
  | "detailsUrl"
>;

/**
 * Build the create-data for a PostAutomation copied from a prepared flow.
 * Used when a new reel claims the flow at the front of the queue — from the
 * webhook (no media metadata) or from the daily sync (with metadata).
 */
export function automationCreateFromTemplate(
  igAccountId: string,
  postId: string,
  template: TemplateFields,
  media?: Pick<IgMedia, "permalink" | "caption" | "thumbnail_url" | "media_url">
) {
  return {
    igAccountId,
    postId,
    isActive: true,
    fromTemplate: true,
    postUrl: media?.permalink,
    postCaption: media?.caption,
    postThumbnail: media?.thumbnail_url ?? media?.media_url,
    keywords: template.keywords,
    commentReplyText: template.commentReplyText,
    commentReplyText2: template.commentReplyText2,
    commentReplyText3: template.commentReplyText3,
    greetingMessage: template.greetingMessage,
    greetingButtonText: template.greetingButtonText,
    followMessage: template.followMessage,
    followButtonText: template.followButtonText,
    followRetryMessage: template.followRetryMessage,
    detailsMessage: template.detailsMessage,
    detailsButtonEnabled: template.detailsButtonEnabled,
    detailsButtons: template.detailsButtons ?? [],
    detailsButtonText: template.detailsButtonText,
    detailsUrl: template.detailsUrl,
  };
}

/**
 * Attach the next prepared flow to a newly seen reel, and use it up.
 *
 * Returns the created automation, or null when the queue is empty — which is
 * the intended outcome, not an error: a reel uploaded with nothing prepared
 * gets no automation at all.
 *
 * The read, the create and the delete run in one transaction so two reels
 * arriving at once can't both claim the same prepared flow. If the reel already
 * has an automation, nothing is consumed — re-running is safe.
 */
export async function attachNextQueuedFlow(
  igAccountId: string,
  postId: string,
  media?: Pick<IgMedia, "permalink" | "caption" | "thumbnail_url" | "media_url">
) {
  return db.$transaction(async (tx) => {
    const existing = await tx.postAutomation.findUnique({
      where: { igAccountId_postId: { igAccountId, postId } },
      include: { igAccount: true },
    });
    if (existing) return null;

    const next = await tx.queuedFlow.findFirst({
      where: { igAccountId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
    if (!next) return null;

    const automation = await tx.postAutomation.create({
      data: automationCreateFromTemplate(igAccountId, postId, next, media),
      // `_count` so callers can hand this straight to the reels grid, which
      // reads `_count.conversations` on every card.
      include: { igAccount: true, _count: { select: { conversations: true } } },
    });

    // Used up — each prepared flow belongs to exactly one reel. Stamping
    // consumedAt takes it out of the queue while keeping the record of which
    // reel claimed it; the extension in lib/db.ts hides consumed flows.
    await tx.queuedFlow.update({
      where: { id: next.id },
      data: { consumedAt: new Date() },
    });

    return automation;
  });
}
