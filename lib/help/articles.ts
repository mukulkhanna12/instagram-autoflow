/**
 * The help centre's content. Plain data, so the article pages, the search box
 * and the help assistant all read the same source — an answer the assistant
 * gives is always an article someone can open and read in full.
 *
 * Inline text supports **bold**, `code` and [links](/path). Every claim here
 * should match what the app actually does; when behaviour changes, change the
 * article in the same commit.
 */

export type Block =
  | { h: string }
  | { p: string }
  | { steps: string[] }
  | { list: string[] }
  | { tip: string }
  | { warn: string };

export interface Article {
  slug: string;
  category: CategoryId;
  title: string;
  summary: string;
  /** Extra words people might search with that aren't in the text. */
  keywords: string[];
  body: Block[];
  popular?: boolean;
}

export type CategoryId = "getting-started" | "building-flows" | "results" | "troubleshooting" | "limits-safety";

export interface Category {
  id: CategoryId;
  title: string;
  blurb: string;
  icon: "rocket" | "workflow" | "chart" | "wrench" | "shield";
}

export const CATEGORIES: Category[] = [
  { id: "getting-started", title: "Getting started", blurb: "Sign up, connect Instagram and send your first automated DM.", icon: "rocket" },
  { id: "building-flows", title: "Building flows", blurb: "Keywords, replies, the follow gate, buttons and prepared flows.", icon: "workflow" },
  { id: "results", title: "Results & conversations", blurb: "What the numbers on a reel mean and where each person is.", icon: "chart" },
  { id: "troubleshooting", title: "Troubleshooting", blurb: "Something didn't send? Start here.", icon: "wrench" },
  { id: "limits-safety", title: "Limits, safety & data", blurb: "Instagram's rules, account safety, and what happens to your data.", icon: "shield" },
];

export const SUPPORT = {
  instagram: "mkexplores_",
  instagramUrl: "https://ig.me/m/mkexplores_",
};

export const ARTICLES: Article[] = [
  // ─── Getting started ──────────────────────────────────────────────────────
  {
    slug: "how-autoflow-works",
    category: "getting-started",
    title: "How AutoFlow works",
    summary: "The journey from a comment on your reel to a link in someone's DMs.",
    keywords: ["overview", "explain", "funnel", "journey", "comment to dm", "intro"],
    popular: true,
    body: [
      { p: "AutoFlow turns comments on your reels into DM conversations. You set up a flow once per reel, and from then on it runs by itself, day and night." },
      { h: "What happens when someone comments" },
      {
        steps: [
          "Someone comments on your reel. If you set a keyword, the comment has to contain it; otherwise every comment counts.",
          "AutoFlow **likes the comment** and posts your **public reply** under it, such as “Sent you a DM! 📩”.",
          "They get your **greeting DM** with a button.",
          "When they tap the button, AutoFlow checks whether they follow you.",
          "If they follow you, they get your **final message** with up to 3 link buttons. If not, they're asked to follow and tap again. That repeats until they follow.",
        ],
      },
      { tip: "Everyone gets the greeting first, even people who already follow you. Instagram only lets AutoFlow check a follow after the person taps a button in the DM." },
      { h: "Where to set it up" },
      { p: "Open [Reels](/posts), pick a reel and press **Automate**. See [Create your first automation](/help/first-automation) for a full walkthrough." },
    ],
  },
  {
    slug: "account-requirements",
    category: "getting-started",
    title: "What kind of Instagram account do I need?",
    summary: "You need a Creator or Business account. Personal accounts can't be automated.",
    keywords: ["personal account", "professional", "creator", "business", "switch account type", "requirements", "eligible"],
    body: [
      { p: "AutoFlow works with **Creator** and **Business** accounts (Instagram calls both “professional” accounts). Instagram's messaging API isn't available to personal accounts, so AutoFlow can't connect to one." },
      { h: "Switching is free and takes a minute" },
      {
        steps: [
          "In the Instagram app, open your profile and tap the menu (☰).",
          "Go to **Settings and privacy → Account type and tools**.",
          "Tap **Switch to professional account** and choose Creator or Business.",
        ],
      },
      { p: "You don't need a Facebook Page. AutoFlow connects through Instagram's own login." },
    ],
  },
  {
    slug: "sign-up-and-approval",
    category: "getting-started",
    title: "Signing up and getting approved",
    summary: "Why you might not get a login code yet, and how approval works.",
    keywords: ["login", "log in", "sign in", "code", "otp", "email", "waiting", "pending", "approval", "approved", "access", "no code", "password"],
    popular: true,
    body: [
      { p: "AutoFlow doesn't use passwords. You enter your email and we send you a **6-digit code**." },
      { h: "New accounts are approved by hand" },
      { p: "While AutoFlow is growing, each new account is approved by hand. The first time you enter your email, your account is created and marked as **awaiting approval**. We don't send a code yet." },
      {
        steps: [
          "Enter your email on the [login page](/login). You'll see a message that your account is awaiting approval.",
          "Wait for approval. This is usually quick.",
          "Go back to the login page and enter the same email. This time you'll get a code.",
        ],
      },
      { tip: "Can't find the code? Check your spam or promotions folder. Codes expire after a short time, so request a new one if yours is old." },
    ],
  },
  {
    slug: "connect-instagram",
    category: "getting-started",
    title: "Connecting your Instagram account",
    summary: "Connect through Instagram's official login. We never see your password.",
    keywords: ["connect", "link", "oauth", "authorize", "reconnect", "login with instagram", "add account", "settings"],
    body: [
      { p: "When you first sign in, onboarding walks you through connecting. You can also do it at any time from [Settings](/settings)." },
      {
        steps: [
          "Go to **Settings** and press **Connect Instagram**.",
          "Instagram opens its own login page. Sign in there and approve the permissions.",
          "You're sent back to AutoFlow, and the top bar shows your @username with a green **Connected** dot.",
        ],
      },
      { p: "Connecting also subscribes your account to comment and message events. Without that step Instagram sends nothing, so AutoFlow handles it for you." },
      { h: "Good to know" },
      {
        list: [
          "Each AutoFlow account connects **one** Instagram account.",
          "An Instagram account can only belong to one AutoFlow account. If it's already connected somewhere else, disconnect it there first.",
          "AutoFlow keeps your connection fresh by itself, so you don't need to reconnect every few weeks.",
        ],
      },
      { p: "Seeing an error? See [Fixing connection errors](/help/connection-errors)." },
    ],
  },
  {
    slug: "first-automation",
    category: "getting-started",
    title: "Create your first automation",
    summary: "Pick a reel, write your messages, and switch it Live.",
    keywords: ["setup", "set up", "create", "new automation", "start", "configure", "automate", "tutorial", "go live", "turn on", "enable"],
    popular: true,
    body: [
      {
        steps: [
          "Open [Reels](/posts). You'll see your recent reels with their like and comment counts.",
          "Press **Automate** on the reel you want. It starts with your [default messages](/help/default-messages).",
          "Press **Edit**, then work through the four steps: **Comment reply**, **Greeting**, **Follow gate** and **Final details**. The phone preview shows exactly what people will see.",
          "Optionally add a [keyword](/help/keyword-triggers) so only comments like “LINK” trigger the flow.",
          "Press **Update** to save.",
          "Flip the switch at the top from **Off** to **Live**.",
        ],
      },
      { tip: "Test it from a second Instagram account: comment on the reel, tap the button in the DM, and check you receive the final message." },
      { p: "Your reel already has comments? Switching Live doesn't reply to them. Use [Comments from before setup](/help/old-comments) to catch up." },
    ],
  },

  // ─── Building flows ───────────────────────────────────────────────────────
  {
    slug: "keyword-triggers",
    category: "building-flows",
    title: "Keyword triggers",
    summary: "Only reply to comments that ask for it, like “LINK” or “GUIDE”.",
    keywords: ["keyword", "keywords", "trigger", "filter", "specific word", "only some comments", "every comment", "case", "match"],
    popular: true,
    body: [
      { p: "By default a reel replies to **every** comment. Add keywords and only comments that contain one of them start the flow. Every other comment gets no reply and no DM." },
      { h: "How matching works" },
      {
        list: [
          "Separate several keywords with commas, such as `link, guide, send`.",
          "Capital letters don't matter: `link` matches “LINK”, “Link” and “link”.",
          "The keyword can sit anywhere in the comment. `prompt` matches “send me the prompt pls”, and also “prompts”.",
          "Leave the box empty to reply to every comment.",
        ],
      },
      { warn: "Short keywords match more than you'd expect. `hi` also matches “this” and “which”. Pick words people wouldn't type by accident." },
      { tip: "Say the keyword in your reel and caption, like “Comment GUIDE and I'll DM it to you”. It gets you more comments and cleaner matches." },
    ],
  },
  {
    slug: "comment-replies",
    category: "building-flows",
    title: "Public comment replies and variations",
    summary: "Rotate up to 3 reply wordings so a busy reel doesn't look like a bot.",
    keywords: ["public reply", "reply", "variant", "variation", "rotate", "spam", "same reply", "like comment", "comment reply"],
    body: [
      { p: "When a comment matches, AutoFlow likes it and posts a public reply under it. You can write up to **three variations**, and each comment gets one of them at random." },
      { tip: "Fill in all three. When every comment on a busy reel gets the exact same reply, it looks automated to viewers and to Instagram. For example: “Check your DMs 📩”, “Just sent it over!”, “Sent! Look in your requests 👀”." },
      { p: "Blank variations are skipped. If only the first is filled in, every reply uses that text." },
    ],
  },
  {
    slug: "follow-gate",
    category: "building-flows",
    title: "How the follow gate works",
    summary: "Ask people to follow before your link unlocks.",
    keywords: ["follow", "follower", "follow check", "gate", "must follow", "not following", "grow followers", "retry"],
    popular: true,
    body: [
      { p: "The follow gate keeps your final message locked until the person follows you." },
      {
        steps: [
          "They tap the button in your greeting DM.",
          "AutoFlow asks Instagram whether they follow you.",
          "**Following:** they get the final message straight away.",
          "**Not following:** they get your *follow-required message* with a button. Every tap after that sends your *still-not-following message* until they follow.",
        ],
      },
      { h: "Why everyone gets the greeting" },
      { p: "Instagram doesn't provide a list of your followers. The only way to check a follow is after the person has interacted with the DM, and tapping the button counts. That's why the check happens on the tap and not when they comment." },
      { h: "When in doubt, the gate stays shut" },
      { p: "If Instagram doesn't answer the check, AutoFlow treats the person as not following. So a brief Instagram hiccup can ask a real follower to tap again. It never gives the link to someone who hasn't followed." },
    ],
  },
  {
    slug: "final-message-buttons",
    category: "building-flows",
    title: "The final message and link buttons",
    summary: "Deliver your link with up to 3 buttons, or as plain text.",
    keywords: ["final message", "details", "link", "url", "button", "buttons", "three buttons", "deliver", "payoff", "lead magnet"],
    body: [
      { p: "The final message is what people came for. Once they've followed, AutoFlow sends it with up to **3 link buttons**, each with its own label and URL." },
      {
        list: [
          "Instagram allows at most 3 buttons on a message, so the editor stops at 3.",
          "Turn buttons off to send the message as plain text. You can paste links straight into the text instead.",
          "Use full links that start with `https://`.",
        ],
      },
      { tip: "Keep the label short and specific. “Get the guide” gets more taps than “Click here”." },
    ],
  },
  {
    slug: "personalization",
    category: "building-flows",
    title: "Personalize messages with their name",
    summary: "Use {{first_name}} and {{username}} to greet people by name.",
    keywords: ["name", "first name", "username", "merge tag", "variable", "personalize", "personalise", "custom", "placeholder", "{{"],
    body: [
      { p: "Type a tag into any message and AutoFlow fills it in when it sends:" },
      {
        list: [
          "`{{first_name}}` or `{{name}}`: their first name",
          "`{{last_name}}`: their surname",
          "`{{full_name}}`: their full display name",
          "`{{username}}`: their Instagram handle",
        ],
      },
      { p: "Example: `Hey {{first_name}} 👋 here's the guide you asked for!`" },
      { h: "Why the greeting sometimes shows a username" },
      { p: "When AutoFlow sends the first DM, Instagram hasn't shared the person's display name yet, only their username. So `{{first_name}}` uses their username in the greeting and their real name in later messages. If neither is known, it says “there”. A raw `{{tag}}` is never sent." },
    ],
  },
  {
    slug: "copy-from-reel",
    category: "building-flows",
    title: "Copying a setup from another reel",
    summary: "Reuse a flow you've already written on a new reel.",
    keywords: ["copy", "duplicate", "clone", "reuse", "same flow", "template"],
    body: [
      { p: "Each reel has its own copy of the flow, so different reels can give away different things. To reuse one:" },
      {
        steps: [
          "Open the reel you want to set up and press **Copy from reel**.",
          "Pick the reel to copy from.",
          "Press **Edit** to adjust anything you need, then **Update**.",
        ],
      },
      { p: "Copying overwrites this reel's messages, keywords and buttons. The reel you copied from doesn't change." },
    ],
  },
  {
    slug: "default-messages",
    category: "building-flows",
    title: "Default messages for new reels",
    summary: "Set the wording every new automation starts from.",
    keywords: ["default", "defaults", "starting point", "template", "new reel wording", "preset"],
    body: [
      { p: "**Reels → Default messages** is the wording each new automation starts with, so you're not retyping the same greeting every time." },
      {
        list: [
          "Used when you press **Automate** on a reel and when you add a new prepared flow.",
          "Changing the defaults **never** touches reels that are already set up.",
        ],
      },
    ],
  },
  {
    slug: "upcoming-reels",
    category: "building-flows",
    title: "Prepare a flow before you post",
    summary: "Queue flows under Automations → Upcoming reels and they attach to your next posts.",
    keywords: ["upcoming", "queue", "prepared", "next reel", "schedule", "before posting", "attach", "auto", "not posted yet", "wand"],
    popular: true,
    body: [
      { p: "Write a flow before the reel exists, so it's ready the moment people start commenting. [Automations → Upcoming reels](/triggers?tab=upcoming) holds an ordered list of prepared flows." },
      { h: "How the queue is used" },
      {
        list: [
          "Your next new reel gets the flow at the **top** of the list, and that flow is then used up.",
          "The reel after that gets the next flow, and so on.",
          "Once the list is empty, new reels get **no automation**.",
          "Use the arrows to reorder the list. Name each flow so you know which reel it's meant for.",
        ],
      },
      { h: "When it attaches" },
      { p: "Instagram doesn't tell apps when you post a reel. So a prepared flow attaches when the reel gets its **first comment**, which happens instantly, or during the **daily sync**, whichever comes first. A brand-new reel with no comments showing nothing yet is expected." },
      { tip: "Don't want to wait? On [Reels](/posts), press the ✨ wand button on the new reel. It attaches the waiting flow and goes Live straight away." },
      { warn: "**Automate** starts from your default messages and leaves the queue alone. Once a reel has an automation, the queue skips it. To use a prepared flow, press the wand button and not Automate." },
    ],
  },
  {
    slug: "old-comments",
    category: "building-flows",
    title: "Replying to comments from before setup",
    summary: "Catch up on people who commented before your automation existed.",
    keywords: ["backfill", "old comments", "existing comments", "earlier comments", "missed", "catch up", "past", "before setup", "preview", "sweep"],
    popular: true,
    body: [
      { p: "Switching a reel Live only affects **new** comments. If people commented before you set it up, you can reply to them yourself:" },
      {
        steps: [
          "Make sure the reel is **Live**. Nothing is sent while it's off.",
          "In the reel's editor, find **Comments from before setup** and press **Check**.",
          "Check the list: who would get a DM, and why any comments are skipped.",
          "Press **Reply & DM** to send them for real.",
        ],
      },
      { h: "What gets skipped" },
      {
        list: [
          "Comments older than **7 days**. Instagram won't allow a DM reply after that, so AutoFlow doesn't post a public reply it can't follow through on.",
          "Comments that don't match your keywords.",
          "Comments you've already replied to, and your own comments.",
        ],
      },
    ],
  },

  // ─── Results ──────────────────────────────────────────────────────────────
  {
    slug: "reel-stats",
    category: "results",
    title: "Understanding your reel's numbers",
    summary: "Contacts, messages, final DMs, new follows and greeting CTR.",
    keywords: ["stats", "analytics", "numbers", "metrics", "ctr", "click", "contacts", "follows", "performance", "dashboard", "report"],
    body: [
      { p: "Each reel's editor shows these numbers at the top:" },
      {
        list: [
          "**Unique contacts**: how many people entered the flow.",
          "**Messages sent**: all the DMs sent on this reel.",
          "**Final DMs**: people who reached your final message.",
          "**New follows**: people who weren't following you when they first tapped, and followed to unlock the link.",
          "**Greeting CTR**: the share of people who tapped the button in your greeting.",
        ],
      },
      { tip: "A low greeting CTR usually means the greeting doesn't say what they'll get. Name the thing: “Tap below and I'll send the 30 prompts 👇”." },
      { p: "The [Dashboard](/dashboard) adds these up across all your reels." },
    ],
  },
  {
    slug: "conversations",
    category: "results",
    title: "Following each conversation",
    summary: "See where every person is in the flow, and any sending errors.",
    keywords: ["conversation", "conversations", "status", "greeted", "follow requested", "completed", "who", "people", "list", "error", "warning"],
    body: [
      { p: "The **Conversations** list in a reel's editor shows everyone who entered the flow and how far they got:" },
      {
        list: [
          "**Greeted**: they got the first DM but haven't tapped yet.",
          "**Follow requested**: they tapped but weren't following, so they've been asked to follow.",
          "**Completed**: they received your final message.",
        ],
      },
      { p: "If a message to someone failed, their row shows a red **⚠** with Instagram's reason. See [A commenter didn't get the DM](/help/no-dm-received) for the usual causes." },
    ],
  },

  // ─── Troubleshooting ──────────────────────────────────────────────────────
  {
    slug: "not-triggering",
    category: "troubleshooting",
    title: "My automation isn't replying to comments",
    summary: "A checklist for when a comment gets no reply and no DM.",
    keywords: ["not working", "not replying", "no reply", "nothing happens", "doesn't work", "broken", "not triggering", "stopped", "not firing", "no response", "issue", "problem"],
    popular: true,
    body: [
      { p: "Go through these in order. Most cases are solved by the first three." },
      {
        steps: [
          "**Is the reel Live?** Open it from [Reels](/posts). The switch at the top must say **Live**, not Off. **Draft** reels ignore comments.",
          "**Does the comment contain your keyword?** With keywords set, other comments are ignored on purpose. See [Keyword triggers](/help/keyword-triggers).",
          "**Is Instagram connected?** The top bar should show your @username with a green dot. If it says *Connect Instagram*, reconnect from [Settings](/settings).",
          "**Did you comment from your own account?** Your own comments are ignored, so AutoFlow never replies to itself. Test from a second account.",
          "**Was it a reply inside a thread?** Replies to other comments (including to AutoFlow's reply) are ignored. Only top-level comments trigger the flow.",
          "**Was the comment made before you went Live, or while disconnected?** Those aren't replayed later. Use [Comments from before setup](/help/old-comments).",
          "**Busy reel?** Instagram allows 750 first DMs per hour per account. Check the *DMs this hour* bar in the sidebar.",
        ],
      },
      { p: "Still stuck? Use the assistant at the bottom-right, or [message us](https://ig.me/m/mkexplores_)." },
    ],
  },
  {
    slug: "no-dm-received",
    category: "troubleshooting",
    title: "A commenter got the reply but not the DM",
    summary: "Usually it's sitting in their Message Requests.",
    keywords: ["no dm", "didn't get dm", "dm not received", "message requests", "requests folder", "hidden", "can't see message", "dm missing", "inbox", "failed"],
    popular: true,
    body: [
      { h: "Check Message Requests first" },
      { p: "If the person doesn't follow you, Instagram puts your DM in their **Message Requests**, not their main inbox. This is the most common reason. Mention it in your public reply, e.g. “Sent! Check your requests 👀”." },
      { h: "Other causes" },
      {
        list: [
          "**The comment is older than 7 days.** Instagram won't allow a DM reply after that.",
          "**Their privacy settings** block messages from accounts they don't follow.",
          "**The hourly limit was reached.** Past 750 first DMs in an hour, new commenters are skipped. There's no automatic retry yet.",
          "**They already got one for this comment.** Each comment gets one DM. A new comment starts a new one.",
        ],
      },
      { p: "Open the reel and look at their row in **Conversations**. A red ⚠ shows the exact reason Instagram gave." },
    ],
  },
  {
    slug: "follow-not-detected",
    category: "troubleshooting",
    title: "“I followed but it still asks me to follow”",
    summary: "What to tell someone stuck at the follow gate.",
    keywords: ["follow not detected", "already following", "still asks to follow", "stuck", "loop", "keeps asking", "follow gate broken", "followed"],
    body: [
      {
        list: [
          "**Ask them to tap the button again.** AutoFlow checks the follow each time they tap, so a follow made after the last tap is picked up on the next one.",
          "**Give it a few seconds.** Instagram can take a moment to report a new follow.",
          "**Check they followed the right account.** Look out for similar or backup handles.",
          "If Instagram doesn't answer the check, AutoFlow treats them as not following, so a retry usually fixes it.",
        ],
      },
    ],
  },
  {
    slug: "new-reel-nothing-happened",
    category: "troubleshooting",
    title: "I posted a reel and my prepared flow didn't attach",
    summary: "Prepared flows attach on the first comment or the daily sync, not at upload.",
    keywords: ["new reel", "just posted", "didn't attach", "queue not working", "upcoming not working", "prepared flow", "uploaded", "no automation"],
    body: [
      { p: "This is expected. Instagram doesn't notify apps when you post, so AutoFlow can't react at upload time. Your prepared flow attaches:" },
      {
        list: [
          "**Instantly, on the reel's first comment.** That first commenter is answered as normal.",
          "**Or at the daily sync**, whichever happens first.",
        ],
      },
      { p: "To attach it now, press the ✨ wand button on the reel in [Reels](/posts)." },
      { warn: "If you pressed **Automate** on that reel, it now has its own automation and the queue will skip it. Your prepared flow is still waiting for the next reel. See [Prepare a flow before you post](/help/upcoming-reels)." },
    ],
  },
  {
    slug: "connection-errors",
    category: "troubleshooting",
    title: "Fixing connection errors",
    summary: "What each Instagram connection error means and how to fix it.",
    keywords: ["error", "connection error", "authorization failed", "already connected", "account taken", "couldn't read", "can't connect", "disconnected", "reconnect"],
    body: [
      { h: "“Couldn't read your Instagram account”" },
      { p: "The account is a personal account. Switch it to Creator or Business ([how](/help/account-requirements)), then connect again." },
      { h: "“Instagram authorization failed”" },
      { p: "The login was cancelled or a permission was turned off. Connect again and approve all the permissions Instagram asks for. AutoFlow needs every one of them to read comments and send DMs." },
      { h: "“Already connected to another AutoFlow account”" },
      { p: "An Instagram account can belong to only one AutoFlow account. Disconnect it from the other AutoFlow account first, or connect a different Instagram account." },
    ],
  },

  // ─── Limits, safety & data ────────────────────────────────────────────────
  {
    slug: "instagram-limits",
    category: "limits-safety",
    title: "Instagram's limits",
    summary: "750 first DMs an hour, a 7-day window, and 3 buttons per message.",
    keywords: ["limit", "limits", "rate limit", "750", "hourly", "quota", "cap", "7 days", "24 hours", "how many", "maximum"],
    popular: true,
    body: [
      { p: "These limits come from Instagram, not AutoFlow. Every tool that uses Instagram's official API has them." },
      {
        list: [
          "**750 first DMs per hour, per account.** Each new person needs one, so this is the limit on how many new people can enter your flows each hour. The sidebar's *DMs this hour* bar shows how close you are.",
          "**7 days.** A comment can only get a DM reply for 7 days after it's posted.",
          "**One first DM per comment.** Follow-up messages are sent after the person taps a button, which opens a 24-hour messaging window.",
          "**3 buttons per message.**",
        ],
      },
      { p: "AutoFlow is free and doesn't add limits of its own beyond these." },
    ],
  },
  {
    slug: "account-safety",
    category: "limits-safety",
    title: "Is AutoFlow safe for my Instagram account?",
    summary: "Official API, official login, no password, and Instagram's own limits.",
    keywords: ["safe", "safety", "ban", "banned", "shadowban", "block", "risk", "official", "password", "secure", "security", "trust"],
    body: [
      {
        list: [
          "**Official API only.** AutoFlow uses Instagram's own messaging API, not browser bots or scraping.",
          "**Official login.** You connect through Instagram's login page. AutoFlow never sees your password.",
          "**Stays within Instagram's limits**, like 750 first DMs per hour.",
          "**Replies only to people who commented**, and only once per comment. Replies to itself and duplicate deliveries are ignored.",
        ],
      },
      { tip: "Use different reply variations and write messages that sound like you. That keeps your replies natural for your audience, and for Instagram." },
    ],
  },
  {
    slug: "disconnect-and-data",
    category: "limits-safety",
    title: "Disconnecting, deleting and your data",
    summary: "What happens when you disconnect or delete, and how to get it back.",
    keywords: ["disconnect", "delete", "remove", "data", "privacy", "gdpr", "restore", "undo", "pause", "stop", "turn off"],
    body: [
      {
        list: [
          "**Disconnect** in [Settings](/settings): every automation pauses and nothing is sent. Reconnect the **same** account and they all come back as they were.",
          "**Delete an automation**: it's removed from your reels. Press Automate on that reel again to start a new one.",
          "**Pause a single reel**: switch it to **Off**. It ignores comments until you switch it back to Live.",
        ],
      },
      { p: "Comments that arrive while you're disconnected or switched Off aren't saved and replayed. Use [Comments from before setup](/help/old-comments) to catch up within 7 days." },
      { p: "Read the full [privacy policy](/privacy)." },
    ],
  },
  {
    slug: "pricing",
    category: "limits-safety",
    title: "How much does AutoFlow cost?",
    summary: "AutoFlow is free.",
    keywords: ["price", "pricing", "cost", "free", "pay", "paid", "plan", "subscription", "upgrade", "billing", "money"],
    body: [
      { p: "AutoFlow is **free**. There are no plans or upgrades, and no limits of our own beyond [Instagram's](/help/instagram-limits). Instagram doesn't charge for these messages either." },
    ],
  },
];

export function articleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function categoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function articlesIn(id: CategoryId): Article[] {
  return ARTICLES.filter((a) => a.category === id);
}

/** Anchor id for an article heading. */
export function headingId(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Rough reading time in whole minutes, never under 1. */
export function readingMinutes(a: Article): number {
  const words = a.body.map(blockText).join(" ").split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/** Plain text of a block, with inline markup stripped — for search and snippets. */
export function blockText(b: Block): string {
  const raw =
    "h" in b ? b.h :
    "p" in b ? b.p :
    "tip" in b ? b.tip :
    "warn" in b ? b.warn :
    ("steps" in b ? b.steps : b.list).join(" ");
  return stripInline(raw);
}

export function stripInline(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}
