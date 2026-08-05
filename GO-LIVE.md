# Go Live — Vercel + Real Instagram

Ordered checklist to take AutoFlow from demo to live on your own Instagram.
You already have the hard prerequisite: an **Instagram Business/Creator account
linked to a Facebook Page**. Do the steps in order.

> Secrets (NEXTAUTH_SECRET, CRON_SECRET, META_WEBHOOK_VERIFY_TOKEN) were generated
> for you separately — paste those exact values where referenced below. Generate
> more any time with `openssl rand -base64 32`.

---

## 1. Deploy to Vercel

1. Sign up at https://vercel.com with your GitHub account.
2. **Add New → Project → Import** `mukulkhanna12/instagram-autoflow`.
3. Framework preset: **Next.js** (auto-detected). Don't deploy yet — add the
   database and env vars first (next steps), or deploy once and redeploy after.

## 2. Database — Vercel Postgres (free)

1. In your Vercel project → **Storage → Create Database → Postgres** (Neon-backed).
2. Vercel auto-adds `DATABASE_URL` (and a few `POSTGRES_*` vars) to the project.
3. Create the tables: copy the **unpooled** connection string Vercel shows
   (labelled "unpooled"/"direct" — pooling breaks schema pushes), then locally:
   ```bash
   DATABASE_URL="<unpooled-connection-string>" npm run db:push
   ```
   (Runtime uses the normal pooled `DATABASE_URL` — leave that as Vercel set it.)

## 3. Email for login codes — Resend (free)

1. Sign up at https://resend.com **with the email you'll log in as**.
2. Create an API key → set env `RESEND_API_KEY`.
3. Set `ALLOWED_LOGIN_EMAIL` to that same email (only this address can sign in).
   - On the free tier, Resend sends from `onboarding@resend.dev` to your own
     account email — no domain needed. (Set `EMAIL_FROM` later if you verify a domain.)

## 4. First deploy → get your URL

Set these env vars in Vercel (Project → Settings → Environment Variables), then Deploy:

| Variable | Value |
|---|---|
| `DATABASE_URL` | (added by Vercel Postgres) |
| `NEXTAUTH_SECRET` | your generated secret |
| `CRON_SECRET` | your generated secret |
| `ALLOWED_LOGIN_EMAIL` | your email |
| `RESEND_API_KEY` | from Resend |
| `NEXTAUTH_URL` | set after first deploy (step below) |
| `NEXT_PUBLIC_APP_URL` | same as NEXTAUTH_URL |
| `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` | from step 5 |

| `META_WEBHOOK_VERIFY_TOKEN` | your generated token |

After the first deploy you get a URL like `https://instagram-autoflow-xxxx.vercel.app`.
Set `NEXTAUTH_URL` **and** `NEXT_PUBLIC_APP_URL` to that exact URL and **redeploy**.
(Add a custom GoDaddy domain later if you want — then update these two vars.)

## 5. Meta developer app (Development mode — no App Review needed)

Because this is **your own account**, you don't need App Review — run the app in
Development mode with your own IG account added as a tester.

1. https://developers.facebook.com/apps → **Create App → Business**.
2. Add products: **Instagram Graph API** and **Webhooks**.
3. **Settings → Basic**: copy **App ID** → `INSTAGRAM_APP_ID`, **App Secret** →
   `INSTAGRAM_APP_SECRET`. (These were called `META_APP_*` before the switch to
   Instagram Login — the code reads only the `INSTAGRAM_*` names now.)
4. **App Roles → Roles**: add your own Instagram/Facebook account as **Tester** (and
   accept the invite). This is what lets messaging/comments work without App Review.
5. **Facebook Login / Instagram → Settings → Valid OAuth Redirect URIs**, add:
   ```
   https://<your-vercel-url>/api/instagram/callback
   ```
6. **Webhooks → Instagram**: add a subscription
   - Callback URL: `https://<your-vercel-url>/api/webhooks/instagram`
   - Verify token: your `META_WEBHOOK_VERIFY_TOKEN`
   - Subscribe fields: **comments**, **messages**, **messaging_postbacks**

The app requests these scopes automatically when you connect (nothing to configure):
`instagram_basic`, `instagram_manage_comments`, `instagram_manage_messages`,
`pages_show_list`, `pages_read_engagement`, `pages_messaging`, `pages_manage_metadata`.

Set the Meta env vars in Vercel and **redeploy**.

## 6. Connect and test

1. Visit your URL → **Sign in** (code emailed to `ALLOWED_LOGIN_EMAIL`).
2. **Settings → Connect Instagram** → authorize. The app also subscribes your Page
   to webhooks automatically on connect.
3. **Reels** → pick a reel → set the messages → toggle **Live**. For reels you
   haven't posted yet, prepare flows on **Upcoming reels** instead — each one
   attaches to the next reel you upload and is then used up.
4. From a **second** Instagram account (not your admin/tester account), comment on
   that reel. Expect: public reply → greeting DM + button → follow gate → final DM.
5. Watch it on the **Dashboard** — contacts, comments, final DMs, new follows, CTR.

## Notes

- The daily crons (`vercel.json`) run automatically once deployed: token refresh
  (keeps the ~60-day token alive) and post sync (pre-lists new reels).
- Demo-only affordances (on-screen OTP, sample reels) are gated to non-production
  and can never activate here.
- Instagram takes a minute or two to start delivering webhooks after you connect.
