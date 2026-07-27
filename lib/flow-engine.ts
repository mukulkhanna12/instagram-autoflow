/**
 * Stateful conversation flow engine.
 *
 * Per reel, the flow is:
 *   someone comments  →  public reply on the comment  +  greeting DM with a button
 *   they tap the button  →  check whether they follow the account
 *       following      →  send the details message  (state: completed)
 *       not following  →  send the follow-required message + button (state: follow_requested)
 *   they tap it again  →  check again; loop on the retry message until they actually follow
 *
 * States:
 *   greeted          – greeting sent, waiting for the first tap
 *   follow_requested – told them to follow, waiting for them to tap again
 *   completed        – follow confirmed, details delivered
 */

import { db } from "./db";
import { sendDM, checkFollowerStatus } from "./instagram";

export type FlowState = "greeted" | "follow_requested" | "completed";

interface SendContext {
  pageId: string;
  senderIgUserId: string;
  pageToken: string;
}

export async function handleNewComment(opts: {
  automationId: string;
  commentId: string;
  senderIgUserId: string;
  senderUsername?: string;
  pageId: string;
  pageToken: string;
}): Promise<void> {
  const automation = await db.postAutomation.findUnique({
    where: { id: opts.automationId },
  });
  if (!automation || !automation.isActive) return;

  const key = {
    automationId_igUserId: {
      automationId: opts.automationId,
      igUserId: opts.senderIgUserId,
    },
  };

  const existing = await db.conversation.findUnique({ where: key });

  // Someone who already made it through shouldn't be dragged back to step one
  // every time they leave another comment on the same reel.
  if (existing?.state === "completed") return;

  await db.conversation.upsert({
    where: key,
    create: {
      automationId: opts.automationId,
      igUserId: opts.senderIgUserId,
      igUsername: opts.senderUsername,
      commentId: opts.commentId,
      state: "greeted",
    },
    // Commenting again restarts the greeting, so put them back on step one.
    update: { state: "greeted", commentId: opts.commentId },
  });

  // First contact: Instagram has no open messaging window with this person yet,
  // so the greeting must be sent as a private reply addressed to their comment.
  await sendDM(
    opts.pageId,
    { commentId: opts.commentId },
    {
      type: "button",
      text: automation.greetingMessage,
      buttons: [
        {
          kind: "postback",
          title: automation.greetingButtonText,
          payload: `CHECK_FOLLOW:${opts.automationId}`,
        },
      ],
    },
    opts.pageToken
  );
}

export async function handlePostback(opts: {
  payload: string;
  senderIgUserId: string;
  pageId: string;
  pageToken: string;
}): Promise<void> {
  const [action, automationId] = opts.payload.split(":");
  if (!automationId) return;

  const automation = await db.postAutomation.findUnique({ where: { id: automationId } });
  if (!automation || !automation.isActive) return;

  const conversation = await db.conversation.findUnique({
    where: { automationId_igUserId: { automationId, igUserId: opts.senderIgUserId } },
  });
  if (!conversation) return;

  // The greeting button and the "I've followed" button do the same thing:
  // re-check follow status and move the conversation on. Treating them as one
  // action means a button from an older message still works instead of
  // silently doing nothing. CONTINUE and FOLLOWED are accepted so buttons
  // already sitting in people's inboxes keep working.
  if (action !== "CHECK_FOLLOW" && action !== "CONTINUE" && action !== "FOLLOWED") return;

  // Already delivered once — resend rather than leaving them with a dead button.
  if (conversation.state === "completed") {
    await sendDetailsMessage(automation, opts);
    return;
  }

  const isFollower = await checkFollowerStatus(opts.senderIgUserId, opts.pageToken);

  if (isFollower) {
    await sendDetailsMessage(automation, opts);
    await db.conversation.update({
      where: { id: conversation.id },
      data: { state: "completed" },
    });
    return;
  }

  // Not following. The first refusal gets the "please follow" message; every
  // tap after that gets the retry message. The state stays follow_requested,
  // so this loops until they actually follow.
  const isFirstRefusal = conversation.state === "greeted";

  await sendDM(
    opts.pageId,
    { id: opts.senderIgUserId },
    {
      type: "button",
      text: isFirstRefusal ? automation.followMessage : automation.followRetryMessage,
      buttons: [
        {
          kind: "postback",
          title: automation.followButtonText,
          payload: `CHECK_FOLLOW:${automationId}`,
        },
      ],
    },
    opts.pageToken
  );

  if (isFirstRefusal) {
    await db.conversation.update({
      where: { id: conversation.id },
      data: { state: "follow_requested" },
    });
  }
}

async function sendDetailsMessage(
  automation: { detailsMessage: string; detailsButtonText: string; detailsUrl: string },
  opts: SendContext
): Promise<void> {
  const link = automation.detailsUrl?.trim();

  await sendDM(
    opts.pageId,
    { id: opts.senderIgUserId },
    link
      ? {
          type: "button",
          text: automation.detailsMessage,
          buttons: [{ kind: "url", title: automation.detailsButtonText, url: link }],
        }
      : // No link configured — a button template whose button does nothing is
        // worse than plain text, so just send the message.
        { type: "text", text: automation.detailsMessage },
    opts.pageToken
  );
}
