# AutoFlow — Setup Guide

## 1. Install dependencies

```bash
cd instagram-autoflow
npm install
```

## 2. Database — Neon.tech (free PostgreSQL)

1. Go to https://neon.tech and create a free account
2. Create a new project → copy the **Connection string** (postgresql://...)
3. Paste it into `.env` as `DATABASE_URL`

## 3. Login (email-OTP)

Sign-in is passwordless: you enter your email and get a one-time code.

Sign-up is open — anyone can enter their email, which registers them — but a new
account is **not** emailed a code and cannot sign in until it is approved by
hand. Approve one by setting `isApproved = true` on its `User` row:

```sql
UPDATE "User" SET "isApproved" = true, "approvedAt" = now() WHERE email = 'them@example.com';
```

Each approved user is a separate tenant with their own Instagram account, flows
and automations.

1. Set `ALLOWED_LOGIN_EMAIL` in `.env` to your own email address — that one
   address is approved automatically so you can always get in.
2. Create a free account at https://resend.com and copy an API key into
   `RESEND_API_KEY`. Resend can send to your own account email from
   `onboarding@resend.dev` without verifying a domain, which is enough here.
   (Optional: set `EMAIL_FROM` once you verify your own domain.)

Without `RESEND_API_KEY` (pure local dev) the code is printed to the server
console instead of emailed, so you can still log in.

## 4. Meta Developer App

1. Go to https://developers.facebook.com/apps
2. Create App → Business type
3. Add products: **Instagram Graph API** and **Webhooks**
4. Under Settings → Basic: copy App ID and App Secret into `.env`
5. Under Instagram → Basic Display or Graph API → Add OAuth Redirect URI:
   `http://localhost:3000/api/instagram/callback`

## 4b. Permissions, webhooks and how the follow check works

**The Instagram account must be a Business or Creator account connected to a Facebook Page.**
Personal accounts cannot use messaging or comment APIs at all.

### Required permissions

| Permission | Needed for |
|---|---|
| `instagram_basic` | reading your profile and media |
| `instagram_manage_comments` | reading comments, posting the public reply |
| `instagram_manage_messages` | sending DMs **and** reading `is_user_follow_business` |
| `pages_manage_metadata` | subscribing the Page to webhooks |
| `pages_show_list`, `pages_read_engagement` | resolving the Page ↔ IG account link |

### Webhook fields to subscribe

In the Meta app → **Webhooks → Instagram**, subscribe the Page to:

- `comments` — fires when someone comments on a reel/post
- `messages` and `messaging_postbacks` — fires when someone taps a button in the DM

Callback URL: `{NEXTAUTH_URL}/api/webhooks/instagram`, verify token: `META_WEBHOOK_VERIFY_TOKEN`.

Deliveries are rejected unless they carry a valid `X-Hub-Signature-256` for your
`INSTAGRAM_APP_SECRET`, so the secret must be set correctly or every event 401s
— silently, with no reply and no DM. See the README for a one-command check.

### How the follow check works

There is **no API that lists your followers** — Meta has never exposed one. The only
supported way to know whether someone follows you is the `is_user_follow_business`
field on the Instagram Messaging user profile:

```
GET /{IGSID}?fields=is_user_follow_business&access_token={PAGE_TOKEN}
```

This works only for people who have an open conversation with the account, which is
why the gate is checked **after** they tap the button (a tap counts as a message from
them), never at comment time.

It fails closed: if the lookup errors, the user is treated as *not* following and the
gate holds. If nobody can ever get through, check the app has `instagram_manage_messages`
and the account really is a Business/Creator account — a permission problem looks
exactly like "hasn't followed" from the outside.

### The 24-hour messaging window

Instagram only lets you DM someone within 24 hours of *their* last message to you.
A comment does not open that window, so the first DM is sent as a **private reply**
addressed to the comment id — the one message Instagram allows off the back of a
comment, usable once per comment. Everything after that goes to the user id normally,
inside the window their button tap opens.

## 5. Environment setup

```bash
cp .env.example .env
# Fill in all values
```

Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

## 6. Database migration

```bash
npm run db:push
```

## 7. Run development server

```bash
npm run dev
```

Visit http://localhost:3000

---

## Webhook setup (for local testing)

Instagram webhooks require a public HTTPS URL. Use **ngrok**:

```bash
# Install ngrok: https://ngrok.com
ngrok http 3000
```

Use the ngrok HTTPS URL as your `NEXTAUTH_URL` and in Meta webhook config.

---

## Deploy to Vercel (free)

```bash
npm i -g vercel
vercel
```

Add all environment variables in Vercel dashboard (including `CRON_SECRET` —
`openssl rand -base64 32`). Update all URLs from `localhost:3000` to your Vercel URL.

The daily jobs in `vercel.json` run automatically once deployed:

- `/api/cron/refresh-tokens` — keeps the long-lived Instagram token alive (it
  otherwise expires ~60 days after you connect, silently stopping everything).
- `/api/cron/sync-posts` — attaches the next flow from your **Upcoming reels**
  queue to any new reel, so it shows in the dashboard before its first comment.
  (The webhook does the same on first comment; on the free plan this cron only
  runs once a day, so the comment path is what makes it feel immediate.)

Vercel's free plan allows daily crons and up to two jobs — exactly these two.
