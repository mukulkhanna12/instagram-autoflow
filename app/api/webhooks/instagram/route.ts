import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { replyToComment } from "@/lib/instagram";
import { handleNewComment, handlePostback } from "@/lib/flow-engine";
import { automationCreateFromTemplate } from "@/lib/templates";
import { commentMatchesKeywords } from "@/lib/keywords";

// ── Webhook verification ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Instagram signs every delivery with the app secret. Without this check, anyone
 * who knows the URL could POST a fake comment event and make the account DM
 * arbitrary people, so an unsigned or mis-signed body is rejected outright.
 */
function isValidSignature(rawBody: string, header: string | null): boolean {
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!appSecret || !header?.startsWith("sha256=")) return false;

  const expected = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(header.slice("sha256=".length), "hex");

  // timingSafeEqual throws when the lengths differ, so check that first.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── Webhook events ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Read the body as text: the signature covers the exact bytes sent, so it has
  // to be checked before any parse/re-serialise.
  const rawBody = await req.text();

  if (!isValidSignature(rawBody, req.headers.get("x-hub-signature-256"))) {
    console.warn("Rejected webhook delivery with an invalid signature");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let body: { entry?: Array<Record<string, unknown>> };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  for (const entry of body.entry ?? []) {
    // With Instagram Login, entry.id is the connected Instagram account's id.
    const accountId = entry.id as string;

    // ── Comment events ──────────────────────────────────────────────────────
    for (const change of (entry.changes as Array<Record<string, unknown>>) ?? []) {
      if (change.field === "comments") {
        try {
          await handleCommentChange(accountId, change.value as Record<string, unknown>);
        } catch (err) {
          console.error("comment handler failed:", err);
        }
      }
    }

    // ── DM / postback events ────────────────────────────────────────────────
    for (const event of (entry.messaging as Array<Record<string, unknown>>) ?? []) {
      try {
        await handleMessagingEvent(event);
      } catch (err) {
        console.error("messaging handler failed:", err);
      }
    }
  }

  // Always 200 once the delivery is authentic: a non-200 makes Instagram retry
  // the whole batch, which would re-send DMs people have already received.
  return NextResponse.json({ status: "ok" });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function handleCommentChange(accountId: string, value: Record<string, unknown>) {
  const mediaId = (value.media as { id?: string })?.id;
  const commentId = value.id as string;
  const senderIgUserId = (value.from as { id?: string })?.id;
  const senderUsername = (value.from as { username?: string })?.username;
  const commentText = value.text as string | undefined;

  if (!mediaId || !commentId || !senderIgUserId) return;

  // Look for an automation for this reel — active or not. An inactive one means
  // the user deliberately turned this reel off, so we leave it alone.
  let automation = await db.postAutomation.findFirst({
    where: { postId: mediaId },
    include: { igAccount: true },
  });

  // No automation at all → likely a reel uploaded after the account's default
  // template was enabled. Materialize one so future reels work with no clicks.
  if (!automation) {
    automation = await materializeFromTemplate(accountId, mediaId);
    if (!automation) return;
  }

  if (!automation.isActive) return;

  const { igAccount } = automation;

  // Our own public reply comes back as a new comment event. Without this the
  // account would keep replying to its own replies forever.
  if (senderIgUserId === igAccount.instagramId) return;

  // A reel can be narrowed to specific keywords ("comment PROMPT to get it").
  // When it is, comments that don't ask for the thing are left alone entirely —
  // no public reply, no DM. An unfiltered reel responds to everything.
  if (!commentMatchesKeywords(commentText, automation.keywords)) return;

  // Retries would otherwise post another public reply and re-send the greeting.
  const alreadyHandled = await db.conversation.findFirst({
    where: { automationId: automation.id, commentId },
  });
  if (alreadyHandled) return;

  const token = igAccount.accessToken;

  // Post a random one of the configured reply variants so repeated replies on a
  // reel don't look automated (Instagram can flag identical replies as spam).
  const replyPool = [
    automation.commentReplyText,
    automation.commentReplyText2,
    automation.commentReplyText3,
  ]
    .map((t) => t?.trim())
    .filter((t): t is string => !!t);
  const reply = replyPool[Math.floor(Math.random() * replyPool.length)] ?? automation.commentReplyText;

  await replyToComment(commentId, reply, token);

  // Count this as one comment handled (dedup above ensures one per comment id).
  await db.postAutomation.update({
    where: { id: automation.id },
    data: { commentsHandled: { increment: 1 } },
  });

  await handleNewComment({
    automationId: automation.id,
    commentId,
    senderIgUserId,
    senderUsername,
    igUserId: igAccount.instagramId,
    accessToken: token,
  });
}

/**
 * Create an automation for a reel that has none yet, copying the owning
 * account's default template — but only if that template is enabled. Returns the
 * new automation (with its account) or null when there's no enabled template.
 */
async function materializeFromTemplate(accountId: string, mediaId: string) {
  const igAccount = await db.instagramAccount.findFirst({
    where: { instagramId: accountId },
    include: { template: true },
  });
  if (!igAccount?.template?.enabled) return null;

  return db.postAutomation.upsert({
    where: { igAccountId_postId: { igAccountId: igAccount.id, postId: mediaId } },
    create: automationCreateFromTemplate(igAccount.id, mediaId, igAccount.template),
    update: {}, // a race could create it first; don't clobber an existing one
    include: { igAccount: true },
  });
}

async function handleMessagingEvent(event: Record<string, unknown>) {
  const sender = (event.sender as { id?: string })?.id;
  if (!sender) return;

  // Echoes are our own outgoing messages coming back to us.
  if ((event.message as { is_echo?: boolean })?.is_echo) return;

  // A tap arrives either as a postback or as a quick-reply payload on a message.
  const payload =
    (event.postback as { payload?: string })?.payload ??
    (event.message as { quick_reply?: { payload?: string } })?.quick_reply?.payload;
  if (!payload) return;

  const automationId = payload.split(":")[1];
  if (!automationId) return;

  const automation = await db.postAutomation.findUnique({
    where: { id: automationId },
    include: { igAccount: true },
  });
  if (!automation) return;

  const { igAccount } = automation;

  await handlePostback({
    payload,
    senderIgUserId: sender,
    igUserId: igAccount.instagramId,
    accessToken: igAccount.accessToken,
  });
}
