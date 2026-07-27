const GRAPH_API = "https://graph.facebook.com/v19.0";

// ── OAuth ────────────────────────────────────────────────────────────────────

export function getMetaAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: redirectUri,
    scope: [
      "instagram_basic",
      "instagram_manage_comments",
      "instagram_manage_messages",
      "pages_messaging",
      "pages_read_engagement",
      "pages_show_list",
      "business_management",
    ].join(","),
    response_type: "code",
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; token_type: string }> {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(`${GRAPH_API}/oauth/access_token?${params}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getLongLivedToken(
  shortToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: shortToken,
  });
  const res = await fetch(`${GRAPH_API}/oauth/access_token?${params}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Pages & Instagram accounts ───────────────────────────────────────────────

export async function getUserPages(
  accessToken: string
): Promise<Array<{ id: string; name: string; access_token: string }>> {
  const res = await fetch(
    `${GRAPH_API}/me/accounts?fields=id,name,access_token&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.data ?? [];
}

export async function getInstagramAccountForPage(
  pageId: string,
  pageToken: string
): Promise<{ id: string; username: string; profile_picture_url?: string } | null> {
  const res = await fetch(
    `${GRAPH_API}/${pageId}?fields=instagram_business_account{id,username,profile_picture_url}&access_token=${pageToken}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.instagram_business_account ?? null;
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

export async function getInstagramPosts(
  igUserId: string,
  accessToken: string,
  limit = 20
): Promise<IgMedia[]> {
  const fields =
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count";
  const res = await fetch(
    `${GRAPH_API}/${igUserId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.data ?? [];
}

// ── Comments ─────────────────────────────────────────────────────────────────

export async function replyToComment(
  commentId: string,
  message: string,
  accessToken: string
): Promise<void> {
  const res = await fetch(`${GRAPH_API}/${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: accessToken }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("replyToComment error:", err);
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

export async function sendDM(
  pageId: string,
  to: DmRecipient,
  message: TextMessage | ButtonMessage,
  pageToken: string
): Promise<void> {
  const recipient = toRecipientPayload(to);
  let body: Record<string, unknown>;

  if (message.type === "text") {
    body = {
      recipient,
      message: { text: message.text },
    };
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

  const res = await fetch(`${GRAPH_API}/${pageId}/messages?access_token=${pageToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("sendDM error:", err);
  }
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
 * Look up the person we're talking to in DMs.
 *
 * This is the Instagram Messaging user-profile endpoint, keyed on the IGSID
 * (the sender id that arrives in the webhook — NOT the public @username id).
 * It only works for people who have an open conversation with the account,
 * which is always true here: we only ever call it after they've tapped a button
 * in a DM, and a postback counts as a message from them.
 */
export async function getUserProfile(
  igsid: string,
  pageToken: string
): Promise<IgUserProfile | null> {
  const fields = "name,username,profile_pic,is_user_follow_business,is_business_follow_user";
  try {
    const res = await fetch(`${GRAPH_API}/${igsid}?fields=${fields}&access_token=${pageToken}`);
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
 * Is this person following the connected account?
 *
 * There is no endpoint that lists an account's followers — Meta has never
 * exposed one — so the only supported way to answer this is the
 * `is_user_follow_business` flag on the Messaging user profile above.
 *
 * Fails closed: if the lookup errors or the field is missing we return false,
 * so the follow gate holds rather than letting everyone through. The error is
 * logged loudly because a permission problem here looks identical to "user
 * hasn't followed" from the outside.
 */
export async function checkFollowerStatus(
  igsid: string,
  pageToken: string
): Promise<boolean> {
  const profile = await getUserProfile(igsid, pageToken);
  if (!profile) return false;

  if (typeof profile.is_user_follow_business !== "boolean") {
    console.error(
      `is_user_follow_business missing for ${igsid} — check the app has instagram_manage_messages ` +
        `and the account is a Business/Creator account.`
    );
    return false;
  }

  return profile.is_user_follow_business;
}
