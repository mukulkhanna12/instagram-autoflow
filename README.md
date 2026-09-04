# AutoFlow

Instagram comment-to-DM automation. Pick a reel; when someone comments on it, the
account replies publicly, slides into their DMs, and gates the payoff behind a
follow check — every message configurable per reel.

Think ManyChat's comment automation, self-hosted, on free infrastructure.

## The flow

```mermaid
flowchart TD
    A[Someone comments on your reel] --> K{Matches your keyword?}
    K -->|No| Z[Ignored — no reply, no DM]
    K -->|Yes, or no keyword set| B[Public reply posted on the comment]
    K -->|Yes, or no keyword set| C[Greeting DM + button]
    C --> D{They tap the button}
    D --> E{Following you?}
    E -->|Yes| F[Final message + up to 3 link buttons]
    E -->|No| G[Please follow first + button]
    G --> D
```

The final message is unreachable until a follow is actually confirmed — tapping
the button while not following just loops on the retry message.

**Everyone gets the greeting**, including people who already follow you. That
isn't a design choice: the follow check needs an open conversation, and the
button tap is what opens it (see the constraints below).

## What you configure, per reel

| Step | Field | Goes out as |
|---|---|---|
| 0 | `keywords` | *Filter* — only comments containing one of these trigger anything. Empty = respond to every comment |
| 1 | `commentReplyText` ×3 | Public reply on the comment; a random non-empty variant each time. The comment itself is liked at the same time |
| 2 | `greetingMessage` + `greetingButtonText` | First DM, with a button |
| 3 | `followMessage` | If they're not following on the first tap |
| 4 | `followRetryMessage` | Every tap after that, until they follow |
| 5 | `detailsMessage` + `detailsButtons` | The payoff, with up to 3 link buttons, once following is confirmed |

Each reel gets its own copy, so different reels can offer different things.
**Copy from reel** clones one reel's whole setup onto another.

**Reels → Default messages** sets the wording a *new* reel starts from — used
when you hit Configure on a reel, and for newly added prepared flows. It never
touches a reel that already has an automation.

## Nothing is ever deleted

Every "delete" in this app is a soft delete. `InstagramAccount`, `PostAutomation`
and `QueuedFlow` carry an `isDeleted` flag; the rows stay, and a Prisma client
extension in `lib/db.ts` hides flagged rows from every read. Call sites read
normally and cannot forget the filter — `dbUnfiltered` is the only way to see
hidden rows, and exists for reviving them.

Children are hidden *through* their parent rather than being flagged one by one:
an automation is invisible when its own flag is set **or** when its account is
disconnected. So disconnecting writes exactly one row however many automations
you have, and reconnecting the same account brings them all back — while an
automation you deleted by hand beforehand correctly stays deleted.

| Action | What happens | Reversed by |
|---|---|---|
| Settings → Disconnect | Account flagged; automations pause, nothing fires | Reconnecting the same account |
| Delete an automation | Flagged, conversation history kept | Configure on that reel again |
| Remove a queued flow | Flagged, leaves the queue | — |
| A queued flow is used up | `consumedAt` stamped, not deleted | — |

Comments arriving while disconnected are ignored as they come in, not queued and
replayed later. Use **Backfill** to catch up, within Instagram's 7-day window.

## Backups

`scripts/backup-db.mjs` dumps every table to gzipped JSON, keeps the last 7 days
and prunes older files. It deliberately includes soft-deleted rows — a backup
that honoured the hide filter would be useless for recovery.

```bash
export DATABASE_URL="…"
node scripts/backup-db.mjs              # back up, then prune
node scripts/backup-db.mjs --list       # what is on disk
node scripts/backup-db.mjs --verify <f> # row counts inside a backup
```

Writes to `~/backups/instagram-autoflow` (`BACKUP_DIR`, `BACKUP_KEEP_DAYS` to
change). The dumps hold real usernames and conversation history — keep them out
of the repo.

## Flows for reels you haven't posted yet

The **Upcoming reels** page holds an ordered queue of prepared flows. When a new
reel appears, the flow at the front is copied onto it and **used up**:

```
Prepared:  [1] Flow A   [2] Flow B
upload reel → gets Flow A (consumed)
upload reel → gets Flow B (consumed)
upload reel → queue empty → no automation at all
```

Flows can be named, edited, deleted and reordered. Attaching runs in a
transaction, so two reels arriving together can't claim the same flow. A reel
posted with an empty queue is deliberately left alone.

## Catching up on old comments

A reel configured *after* it started collecting comments would otherwise skip
everyone who commented first. **Comments from before setup** sweeps them, with a
dry-run preview showing exactly what would be sent and why each comment was
skipped. It also runs once automatically the first time a reel goes Live.

Comments older than **7 days** are left entirely alone — Instagram refuses the
DM past that, and posting a public "sent you a DM!" reply that can never be
honoured would be worse than silence.

## Instagram constraints worth knowing

These shaped the implementation and aren't obvious from the docs:

**There is no followers endpoint.** Meta has never exposed one. The only
supported way to check whether someone follows you is `is_user_follow_business`
on the Messaging user profile, and that requires consent — which is *"set only
when an Instagram user sends a message to your app user, or clicks an icebreaker
or persistent menu"*. A comment doesn't count. That's why the follow check runs
after they tap a button, never at comment time, and why the greeting can't be
skipped for existing followers. It fails closed: a lookup error counts as "not
following", so the gate holds.

**You can't DM someone just because they commented.** Instagram only allows
messaging inside a 24-hour window opened by *their* last message. So the first DM
is sent as a **private reply** addressed to the comment id — the one message
Instagram permits off the back of a comment, usable **once per comment** and only
**within 7 days** of it. Everything after that is a normal DM inside the window
their tap opens.

**Configuring the webhook URL isn't enough.** The account must also be subscribed
via `/{ig-user-id}/subscribed_apps`, or Instagram delivers nothing and the
automation silently never fires. The app does this when you connect an account.

**Rate limits.** 750 private replies per hour per account — that's the ceiling on
new people entering the funnel, since each needs exactly one. Follow-up DMs run
under the Send API at 100/second, and public replies under the general limit of
4,800 × impressions per 24h. Meta charges nothing for any of it. There is
currently **no queue or retry** if the hourly cap is hit; a failed send is
recorded on the conversation and surfaced in the editor.

**Buttons.** The button template allows at most three, so a fourth is dropped
locally rather than sent and rejected.

## Stack

- **Next.js** (App Router) + TypeScript
- **Prisma** + PostgreSQL — free tier on [Prisma Postgres](https://www.prisma.io/postgres)
- **NextAuth** — passwordless email-OTP sign-in, locked to one address
- **Resend** — delivers the login code email
- **Tailwind** + Radix UI
- **Instagram API with Instagram Login** — comments, messaging, profile

Runs at zero cost on free tiers. The binding limit is the database: at roughly
15–23 queries per completed journey, 100,000 operations/month works out to
**about 5,000 comments a month**.

## Quick start

Requires **Node ≥ 20.9**.

```bash
npm install
cp .env.example .env    # fill in the values below
npm run db:push         # create the schema
npm run dev
```

Tests need no database and no credentials — the Prisma client and the Graph API
are mocked, so the flow engine is driven entirely in memory:

```bash
npm test          # once
npm run test:watch
```

Instagram webhooks need a public HTTPS URL, so for local testing put a tunnel in
front of it (`cloudflared tunnel --url http://localhost:3000`) and use that URL
for `NEXTAUTH_URL` and in the Meta dashboard.

**[SETUP.md](./SETUP.md)** has the full walkthrough; **[GO-LIVE.md](./GO-LIVE.md)**
covers deploying to Vercel.

### Environment

| Variable | What it's for |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `NEXTAUTH_URL` / `NEXTAUTH_SECRET` | Session handling (`openssl rand -base64 32`) |
| `ALLOWED_LOGIN_EMAIL` | Bootstrap owner — this address is auto-approved; everyone else signs up and waits (see [Accounts & approval](#accounts--approval)) |
| `RESEND_API_KEY` | Sends the login-code email ([resend.com](https://resend.com)) |
| `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` | Instagram OAuth + webhook signature verification |
| `META_WEBHOOK_VERIFY_TOKEN` | Any random string; must match the Meta dashboard |
| `CRON_SECRET` | Protects the scheduled `/api/cron/*` routes |

A missing `INSTAGRAM_APP_SECRET` makes every webhook fail signature validation
with a silent 401 — no reply, no DM, no visible error. To check a deployment,
POST a correctly signed empty payload and expect a 200:

```bash
BODY='{"object":"instagram","entry":[]}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$INSTAGRAM_APP_SECRET" -hex | sed 's/^.*= //')
curl -X POST "$APP_URL/api/webhooks/instagram" \
  -H 'content-type: application/json' \
  -H "x-hub-signature-256: sha256=$SIG" -d "$BODY"
```

## Project structure

```
app/
  (dashboard)/
    dashboard/        overview
    posts/            your media, and the per-reel flow editor
      defaults/       the wording new reels start from
    queue/            flows prepared for reels not yet uploaded
    settings/         connect / disconnect Instagram
  api/
    auth/otp/         request a login code
    automations/      CRUD for per-reel flows
      [id]/copy-from  clone another reel's setup onto this one
      [id]/backfill   sweep comments predating the automation
    flows/            the prepared-flow queue (CRUD + reorder)
    reel-defaults/    read/save the account's default messages
    instagram/        OAuth connect, callback, posts
    cron/             daily token refresh + post sync
    webhooks/         Instagram event receiver
lib/
  flow-engine.ts      conversation state machine
  instagram.ts        Graph API client
  keywords.ts         the per-reel comment filter
  buttons.ts          final-message buttons (max 3, legacy fallback)
  backfill.ts         catching up on pre-existing comments
  templates.ts        claim the next queued flow for a new reel
  reel-defaults.ts    the messages a new reel automation starts with
  otp.ts / email.ts   email-OTP login codes
  db.ts               Prisma client + the soft-delete filter
  auth.ts             NextAuth config
prisma/
  schema.prisma       User, InstagramAccount, PostAutomation, Conversation,
                      QueuedFlow, ReelDefaults, LoginCode
scripts/
  backup-db.mjs       rolling 7-day database backup
tests/
  flow-engine.test.ts the state machine, db + Graph API mocked
  keywords.test.ts    the per-reel comment filter
  buttons.test.ts     button resolution and the legacy fallback
  backfill.test.ts    the 7-day window and duplicate guards
```

`PostAutomation` is one reel's flow; `Conversation` tracks one person's progress
through it (`greeted` → `follow_requested` → `completed`). `QueuedFlow` is a flow
waiting for a reel you haven't posted yet.

## Accounts & approval

Sign-in is passwordless: enter an email, get a 6-digit code, done. Sign-up is
open — any address can register — but registering is not access.

1. A new email hitting the login page creates a `User` row with
   `isApproved = false`. **No code is emailed.** The page tells them their
   account is awaiting approval and to log in again once it's approved.
2. You approve it by hand in the database:

   ```sql
   UPDATE "User" SET "isApproved" = true, "approvedAt" = now()
   WHERE email = 'them@example.com';
   ```

3. Next time they ask for a code, they get one and are in.

Approval is re-checked at sign-in, not only when the code is issued, so
un-approving someone mid-flow stops a code they already hold from working.

`ALLOWED_LOGIN_EMAIL` is now only a bootstrap: that one address is approved
automatically, so a fresh database always has an account that can get in.

**Every approved user is a separate tenant.** Instagram accounts hang off the
`User` row, and every automation, queued flow, reel default and conversation is
reached through it — each user connects their own Instagram account and sees
only their own flows.

## Security

- Webhook deliveries are rejected unless they carry a valid `X-Hub-Signature-256`
  for the app secret — otherwise anyone knowing the URL could make the account DM
  arbitrary people.
- The account's own comments are ignored, so its public reply can't trigger itself.
- Duplicate deliveries are dropped, so Meta's retries don't double-post or re-DM.
- Backfill checks three ways before sending: an existing conversation for the
  comment, a reply already posted by the account, and the account's own comments.

## Status

Running live against a real Instagram account, with the full journey confirmed
end to end — comment → public reply → greeting DM → follow gate → final message,
including a follow earned through the gate.

Known gaps:

- [ ] No queueing or retry when the 750/hour private-reply limit is hit — those
      people are dropped, with the failure recorded on the conversation
- [ ] Comments older than 7 days can't be reached at all
- [ ] Meta App Review is only needed to serve accounts you don't own — a single
      account in Development mode with itself as a tester does not need it

The Instagram account must be a **Business or Creator** account. Personal
accounts can't use these APIs at all.
