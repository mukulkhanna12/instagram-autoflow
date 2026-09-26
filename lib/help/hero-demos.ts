/**
 * The conversations the help home's hero card plays on a loop. Each answer is
 * a one-line version of its article — keep them in step when an article
 * changes. Inline markup as in articles.ts.
 */
export interface HeroDemo {
  question: string;
  slug: string;
  answer: string;
}

export const HERO_DEMOS: HeroDemo[] = [
  {
    question: "Why didn't they get my DM?",
    slug: "no-dm-received",
    answer: "If they don't follow you, Instagram puts your DM in their **Message Requests**, not their main inbox.",
  },
  {
    question: "How do keywords work?",
    slug: "keyword-triggers",
    answer: "Add words like `link, guide` and only comments containing one of them get a reply. Capital letters don't matter.",
  },
  {
    question: "Can it reply to old comments?",
    slug: "old-comments",
    answer: "Yes, for comments up to **7 days** old. Press **Check** to preview, then **Reply & DM** to send.",
  },
  {
    question: "Is it safe for my account?",
    slug: "account-safety",
    answer: "AutoFlow uses Instagram's **official API and login**. It never sees your password and stays within Instagram's limits.",
  },
  {
    question: "My automation isn't replying",
    slug: "not-triggering",
    answer: "First check the reel is switched **Live** and the comment has your keyword. Comments from your own account are ignored.",
  },
];
