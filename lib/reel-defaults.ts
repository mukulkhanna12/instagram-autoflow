import { db } from "./db";
import type { TemplateFields } from "./templates";

/**
 * What a reel automation starts with when nothing else says otherwise.
 *
 * Kept in step with the @default values on the Prisma models by hand — Prisma
 * doesn't expose them at runtime, and the app needs the same wording before an
 * account has ever saved its own defaults.
 */
export const FALLBACK_REEL_DEFAULTS: Omit<TemplateFields, "detailsButtons"> & {
  detailsButtons: Array<{ title: string; url: string }>;
} = {
  keywords: "",
  commentReplyText: "Sent you a DM! 📩",
  commentReplyText2: "Just DM'd you the details 🙌",
  commentReplyText3: "It's in your inbox now ✨",
  greetingMessage:
    "Hey! 👋 Hope you're doing great.\n\nClick the button below to get the details I promised!",
  greetingButtonText: "Get Details →",
  followMessage:
    "To receive the details, please follow my page first! 🙏\n\nOnce you follow, click the button below.",
  followButtonText: "I've Followed ✓",
  followRetryMessage:
    "Hmm, I can't see you on my followers list yet 👀\n\nPlease follow the page first, then tap the button again.",
  detailsMessage:
    "Here are the details you asked for! 🎉\n\nClick below to visit the page.",
  detailsButtonEnabled: true,
  detailsButtons: [],
  detailsButtonText: "Visit Page 🔗",
  detailsUrl: "",
};

/** The message fields a new reel automation (or queued flow) should start from. */
export async function getReelDefaults(igAccountId: string): Promise<TemplateFields> {
  const saved = await db.reelDefaults.findUnique({ where: { igAccountId } });
  if (!saved) return FALLBACK_REEL_DEFAULTS;

  const {
    keywords, commentReplyText, commentReplyText2, commentReplyText3,
    greetingMessage, greetingButtonText, followMessage, followButtonText,
    followRetryMessage, detailsMessage, detailsButtonEnabled, detailsButtons,
    detailsButtonText, detailsUrl,
  } = saved;

  return {
    keywords, commentReplyText, commentReplyText2, commentReplyText3,
    greetingMessage, greetingButtonText, followMessage, followButtonText,
    followRetryMessage, detailsMessage, detailsButtonEnabled, detailsButtons,
    detailsButtonText, detailsUrl,
  };
}
