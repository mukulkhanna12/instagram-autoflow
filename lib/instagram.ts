// Instagram API with Instagram Login (graph.instagram.com).
//
// Unlike the older Facebook-Page-based flow, this connects an Instagram
// professional account directly — no Facebook Page, no Page tokens. A single
// Instagram user access token drives comments, messaging, and the follow check.

const IG_GRAPH = "https://graph.instagram.com/v21.0";

// ── OAuth ────────────────────────────────────────────────────────────────────

/**
 * The "Log in with Instagram" authorize URL. One button — the user logs into
 * their Instagram professional account and approves; no Facebook involved.
 */
export function getInstagramAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "instagram_business_basic", // read the account and its media
      "instagram_business_manage_comments", // read comments, post the public reply
      "instagram_business_manage_messages", // send DMs and read is_user_follow_business
    ].join(","),
  });
  return `https://www.instagram.com/oauth/authorize?${params}`;
}

/**
 * Exchange the OAuth code for a short-lived token + the Instagram user id.
 * This endpoint wants form-encoded POST body, not query params.
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; user_id: string }> {
  const body = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return { access_token: data.access_token, user_id: String(data.user_id) };
}

/** Trade the short-lived token for a ~60-day long-lived one. */
export async function getLongLivedToken(
  shortToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    access_token: shortToken,
  });
  const res = await fetch(`${IG_GRAPH}/access_token?${params}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Refresh a long-lived token to extend it another ~60 days. */
export async function refreshLongLivedToken(
  token: string
): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: token,
  });
  const res = await fetch(`${IG_GRAPH}/refresh_access_token?${params}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Account ──────────────────────────────────────────────────────────────────

/** The connected Instagram professional account's own profile. */
export async function getInstagramProfile(
  accessToken: string
): Promise<{ id: string; username: string; profile_picture_url?: string } | null> {
  const res = await fetch(
    `${IG_GRAPH}/me?fields=user_id,username,profile_picture_url&access_token=${accessToken}`
  );
  if (!res.ok) {
    console.error("getInstagramProfile error:", await res.text());
    return null;
  }
  const data = await res.json();
  return {
    id: String(data.user_id ?? data.id),
    username: data.username,
    profile_picture_url: data.profile_picture_url,
  };
}

// ── Webhook subscription ─────────────────────────────────────────────────────

/**
 * Subscribe this Instagram account to webhook deliveries. Configuring the
 * callback URL in the dashboard only subscribes the app; the account itself
 * must be subscribed too, or nothing is delivered. Runs on connect.
 */
export async function subscribeToWebhooks(
  igUserId: string,
  accessToken: string
): Promise<boolean> {
  try {
    const params = new URLSearchParams({
      subscribed_fields: "comments,messages",
      access_token: accessToken,
    });
    const res = await fetch(`${IG_GRAPH}/${igUserId}/subscribed_apps?${params}`, {
      method: "POST",
    });
    if (!res.ok) {
      console.error("subscribeToWebhooks error:", await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("subscribeToWebhooks threw:", err);
    return false;
  }
}

// ── Posts / Media ────────────────────────────────────────────────────────────

export interface IgMedia {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

/**
 * Media on the account, newest first.
 *
 * A `max` above one page follows `paging.next` until it's reached or Instagram
 * runs out. The default stays at a single page of 20 deliberately: the daily
 * sync attaches queued flows to whatever it finds, so widening its window would
 * hand prepared flows to old posts. Callers that only *display* media — the
 * reels grid and the picker — ask for more.
 */
export async function getInstagramPosts(
  igUserId: string,
  accessToken: string,
  max = 20
): Promise<IgMedia[]> {
  const fields =
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count";
  const perPage = Math.min(max, 50);
  let url = `${IG_GRAPH}/${igUserId}/media?fields=${fields}&limit=${perPage}&access_token=${accessToken}`;
  const out: IgMedia[] = [];

  while (url && out.length < max) {
    const res = await fetch(url);
    if (!res.ok) {
      // A failed first page is a real error — bad token, revoked permission.
      // A failed later page just means we show what we already have.
      if (out.length === 0) throw new Error(await res.text());
      console.error("getInstagramPosts paging error:", await res.text());
      break;
    }
    const data = await res.json();
    out.push(...((data.data ?? []) as IgMedia[]));
    url = data.paging?.next ?? "";
  }

  return out.slice(0, max);
}

// ── Comments ─────────────────────────────────────────────────────────────────

export interface IgComment {
  id: string;
  text?: string;
  timestamp?: string;
  from?: { id?: string; username?: string };
  /** Replies already posted on this comment, used to spot ones we've answered. */
  replies?: { data?: Array<{ id: string; from?: { id?: string; username?: string } }> };
}

/**
 * Existing comments on a reel, newest first, for backfilling a flow onto a reel
 * that was already getting comments before it was configured.
 *
 * Pages until `max` is reached — a reel with thousands of comments would
 * otherwise page forever inside a serverless function that gets killed at 60s.
 */
export async function getMediaComments(
  mediaId: string,
  accessToken: string,
  max = 200
): Promise<IgComment[]> {
  // `username` on replies as well as `id`: the backfill matches on either,
  // because `from.id` is not always returned on the nested replies edge.
  const fields = "id,text,timestamp,from,replies{id,from{id,username}}";
  let url = `${IG_GRAPH}/${mediaId}/comments?fields=${fields}&limit=50&access_token=${accessToken}`;
  const out: IgComment[] = [];

  while (url && out.length < max) {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("getMediaComments error:", await res.text());
      break;
    }
    const body = await res.json();
    out.push(...((body.data ?? []) as IgComment[]));
    url = body.paging?.next ?? "";
  }

  return out.slice(0, max);
}

export async function replyToComment(
  commentId: string,
  message: string,
  accessToken: string
): Promise<void> {
  const res = await fetch(`${IG_GRAPH}/${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: accessToken }),
  });
  if (!res.ok) {
    console.error("replyToComment error:", await res.text());
  }
}

// ── DMs ──────────────────────────────────────────────────────────────────────

interface TextMessage {
  type: "text";
  text: string;
}

interface ButtonMessage {
  type: "button";
  text: string;
  buttons: Array<
    | { kind: "postback"; title: string; payload: string }
    | { kind: "url"; title: string; url: string }
  >;
}

/**
 * Who the DM goes to.
 *
 *  { id }         – a normal DM. Only allowed inside the 24-hour window that
 *                   opens when the person last messaged us (a button tap counts).
 *  { commentId }  – a "private reply": the one message Instagram lets you send
 *                   to someone off the back of their comment, before any window
 *                   exists. This is how the very first DM has to be sent, and
 *                   it may only be used once per comment.
 */
export type DmRecipient = { id: string } | { commentId: string };

function toRecipientPayload(to: DmRecipient): Record<string, string> {
  return "commentId" in to ? { comment_id: to.commentId } : { id: to.id };
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

/**
 * Send a DM from the connected Instagram account. Posts to /{ig-user-id}/messages
 * with the account's own access token.
 */
export async function sendDM(
  igUserId: string,
  to: DmRecipient,
  message: TextMessage | ButtonMessage,
  accessToken: string
): Promise<SendResult> {
  const recipient = toRecipientPayload(to);
  let body: Record<string, unknown>;

  if (message.type === "text") {
    body = { recipient, message: { text: message.text } };
  } else {
    body = {
      recipient,
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: message.text,
            buttons: message.buttons.map((b) =>
              b.kind === "postback"
                ? { type: "postback", title: b.title, payload: b.payload }
                : { type: "web_url", title: b.title, url: b.url }
            ),
          },
        },
      },
    };
  }

  const res = await fetch(`${IG_GRAPH}/${igUserId}/messages?access_token=${accessToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("sendDM error:", err);
    return { ok: false, error: err.slice(0, 500) };
  }
  return { ok: true };
}

// ── Follower check ────────────────────────────────────────────────────────────

export interface IgUserProfile {
  id: string;
  name?: string;
  username?: string;
  profile_pic?: string;
  is_user_follow_business?: boolean;
  is_business_follow_user?: boolean;
}

/**
 * Look up the person we're talking to in DMs, keyed on their IGSID (the sender
 * id from the webhook). Only works for people with an open conversation, which
 * is always true here — we only call it after they've tapped a button.
 */
export async function getUserProfile(
  igsid: string,
  accessToken: string
): Promise<IgUserProfile | null> {
  const fields = "name,username,profile_pic,is_user_follow_business,is_business_follow_user";
  try {
    const res = await fetch(`${IG_GRAPH}/${igsid}?fields=${fields}&access_token=${accessToken}`);
    if (!res.ok) {
      console.error("getUserProfile error:", await res.text());
      return null;
    }
    return (await res.json()) as IgUserProfile;
  } catch (err) {
    console.error("getUserProfile threw:", err);
    return null;
  }
}

/**
 * Is this person following the connected account? The only supported signal is
 * `is_user_follow_business` on their messaging profile. Fails closed: any error
 * or a missing field counts as "not following", so the gate holds.
 */
export async function checkFollowerStatus(
  igsid: string,
  accessToken: string
): Promise<boolean> {
  const profile = await getUserProfile(igsid, accessToken);
  if (!profile) return false;

  if (typeof profile.is_user_follow_business !== "boolean") {
    console.error(
      `is_user_follow_business missing for ${igsid} — check the app has ` +
        `instagram_business_manage_messages and the account is professional.`
    );
    return false;
  }

  return profile.is_user_follow_business;
}
