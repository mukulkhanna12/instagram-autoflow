import type { AutomationTemplate } from "@prisma/client";
import type { IgMedia } from "./instagram";

// The message fields a template shares with a per-reel automation.
export type TemplateFields = Pick<
  AutomationTemplate,
  | "commentReplyText"
  | "commentReplyText2"
  | "commentReplyText3"
  | "greetingMessage"
  | "greetingButtonText"
  | "followMessage"
  | "followButtonText"
  | "followRetryMessage"
  | "detailsMessage"
  | "detailsButtonText"
  | "detailsUrl"
>;

/**
 * Build the create-data for a PostAutomation copied from a default template.
 * Used when a new reel needs an automation materialized — on the fly from the
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
    commentReplyText: template.commentReplyText,
    commentReplyText2: template.commentReplyText2,
    commentReplyText3: template.commentReplyText3,
    greetingMessage: template.greetingMessage,
    greetingButtonText: template.greetingButtonText,
    followMessage: template.followMessage,
    followButtonText: template.followButtonText,
    followRetryMessage: template.followRetryMessage,
    detailsMessage: template.detailsMessage,
    detailsButtonText: template.detailsButtonText,
    detailsUrl: template.detailsUrl,
  };
}
