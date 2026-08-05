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
import { sendDM, getUserProfile, type SendResult } from "./instagram";
import { personalize, type Person } from "./personalize";
import { resolveDetailsButtons } from "./buttons";

export type FlowState = "greeted" | "follow_requested" | "completed";

interface SendContext {
  igUserId: string;
  senderIgUserId: string;
  accessToken: string;
}

export async function handleNewComment(opts: {
  automationId: string;
  commentId: string;
  senderIgUserId: string;
  senderUsername?: string;
  igUserId: string;
  accessToken: string;
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

  const convo = await db.conversation.upsert({
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
  const result = await sendDM(
    opts.igUserId,
    { commentId: opts.commentId },
    {
      type: "button",
      // Only the username is known at comment time; {{first_name}} falls back to it.
      text: personalize(automation.greetingMessage, { username: opts.senderUsername }),
      buttons: [
        {
          kind: "postback",
          title: automation.greetingButtonText,
          payload: `CHECK_FOLLOW:${opts.automationId}`,
        },
      ],
    },
    opts.accessToken
  );
  await noteSend(convo.id, result, "greeting");
  if (result.ok) await bump(opts.automationId, "greetingSent");
}

export async function handlePostback(opts: {
  payload: string;
  senderIgUserId: string;
  igUserId: string;
  accessToken: string;
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

  // A valid postback IS a button click — attribute it to the step they were on.
  if (conversation.state === "greeted") await bump(automationId, "greetingClicked");
  else if (conversation.state === "follow_requested") await bump(automationId, "followClicked");

  // One profile lookup serves both the follow check and message personalization.
  // Fail closed: a missing/failed lookup counts as "not following".
  const profile = await getUserProfile(opts.senderIgUserId, opts.accessToken);
  const isFollower = profile?.is_user_follow_business === true;
  const person: Person = {
    username: profile?.username ?? conversation.igUsername,
    name: profile?.name,
  };

  // Already delivered once — resend rather than leaving them with a dead button.
  if (conversation.state === "completed") {
    const result = await sendDetailsMessage(automation, opts, person);
    await noteSend(conversation.id, result, "details");
    return;
  }

  if (isFollower) {
    // If they were previously gated as "not following" and are now following,
    // this reel earned the follow — count it.
    const isNewFollow = conversation.state === "follow_requested";

    const result = await sendDetailsMessage(automation, opts, person);
    await noteSend(conversation.id, result, "details");
    if (result.ok) await bump(automationId, "detailsSent");
    if (isNewFollow) await bump(automationId, "followsGained");

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

  const result = await sendDM(
    opts.igUserId,
    { id: opts.senderIgUserId },
    {
      type: "button",
      text: personalize(
        isFirstRefusal ? automation.followMessage : automation.followRetryMessage,
        person
      ),
      buttons: [
        {
          kind: "postback",
          title: automation.followButtonText,
          payload: `CHECK_FOLLOW:${automationId}`,
        },
      ],
    },
    opts.accessToken
  );
  await noteSend(conversation.id, result, "follow-required");
  if (result.ok) await bump(automationId, "followSent");

  if (isFirstRefusal) {
    await db.conversation.update({
      where: { id: conversation.id },
      data: { state: "follow_requested" },
    });
  }
}

async function sendDetailsMessage(
  automation: {
    detailsMessage: string;
    detailsButtonEnabled: boolean;
    detailsButtons: unknown;
    detailsButtonText: string;
    detailsUrl: string;
  },
  opts: SendContext,
  person: Person = {}
): Promise<SendResult> {
  const text = personalize(automation.detailsMessage, person);

  // Up to three link buttons, capped in resolveDetailsButtons. None configured
  // (or the toggle switched off) means plain text — a button template whose
  // buttons do nothing is worse than no buttons at all.
  const buttons = resolveDetailsButtons(automation);

  return sendDM(
    opts.igUserId,
    { id: opts.senderIgUserId },
    buttons.length > 0
      ? {
          type: "button",
          text,
          buttons: buttons.map((b) => ({ kind: "url" as const, title: b.title, url: b.url })),
        }
      : { type: "text", text },
    opts.accessToken
  );
}

/**
 * Record whether a DM send succeeded on the conversation. On success any prior
 * error is cleared; on failure the reason is stored so it shows in the dashboard.
 * Best-effort — a logging write must never break the flow.
 */
// The per-reel analytics counters on PostAutomation that the flow increments.
type Counter =
  | "commentsHandled"
  | "greetingSent"
  | "greetingClicked"
  | "followSent"
  | "followClicked"
  | "detailsSent"
  | "followsGained";

/** Increment one analytics counter. Best-effort — never breaks the flow. */
async function bump(automationId: string, field: Counter): Promise<void> {
  try {
    await db.postAutomation.update({
      where: { id: automationId },
      data: { [field]: { increment: 1 } },
    });
  } catch (err) {
    console.error(`bump ${field} failed:`, err);
  }
}

async function noteSend(conversationId: string, result: SendResult, context: string): Promise<void> {
  try {
    await db.conversation.update({
      where: { id: conversationId },
      data: result.ok
        ? { lastError: null, lastErrorAt: null }
        : { lastError: `Failed to send ${context} DM: ${result.error ?? "unknown error"}`, lastErrorAt: new Date() },
    });
  } catch (err) {
    console.error("noteSend failed:", err);
  }
}
