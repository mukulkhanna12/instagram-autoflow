import type { PostAutomation } from "@prisma/client";

/** Count of conversations in each state, for one automation. */
export interface StateCounts {
  greeted: number;
  follow_requested: number;
  completed: number;
}

export interface StepEvent {
  name: string;
  total: number;
  unique: number;
  pct?: number; // percentage of contacts who reached this step, when meaningful
}

export interface Step {
  key: "comment" | "greeting" | "follow" | "details";
  label: string;
  reached: number; // unique people who reached this step
  reachedPct: number; // % of all contacts
  events: StepEvent[];
  newFollows?: number; // details step only
}

export interface AutomationStats {
  contacts: number; // unique people who entered the flow
  totalSends: number; // all DM sends across steps
  completed: number; // reached the final message
  newFollows: number; // follows earned by this reel's gate
  greetingCtr: number; // click-through on the first DM's button, %
  steps: Step[];
}

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

/**
 * Turn the raw counters + conversation-state tally into the per-step funnel the
 * dashboard and editor render. Only measurable events are included: Instagram
 * doesn't report message "opens" for messages we send, so there is no Opened row.
 *
 * A few unique counts are exact (greeting clicks = people who left the greeted
 * state); where a precise per-person number isn't recoverable from counters
 * (repeat taps on the follow button), we cap the unique at the number who
 * reached the step rather than invent precision.
 */
export function buildStats(a: PostAutomation, s: StateCounts): AutomationStats {
  const contacts = s.greeted + s.follow_requested + s.completed;
  const clickedGreeting = s.follow_requested + s.completed; // only a tap leaves "greeted"
  const reachedFollow = s.follow_requested + a.followsGained; // gated at least once
  const reachedDetails = s.completed;

  return {
    contacts,
    totalSends: a.greetingSent + a.followSent + a.detailsSent,
    completed: reachedDetails,
    newFollows: a.followsGained,
    greetingCtr: pct(clickedGreeting, contacts),
    steps: [
      {
        key: "comment",
        label: "Comment reply",
        reached: contacts,
        reachedPct: 100,
        events: [{ name: "Replied", total: a.commentsHandled, unique: contacts }],
      },
      {
        key: "greeting",
        label: "DM greeting",
        reached: contacts,
        reachedPct: 100,
        events: [
          { name: "Sent", total: a.greetingSent, unique: contacts },
          { name: "Delivered", total: a.greetingSent, unique: contacts, pct: 100 },
          { name: "Clicks", total: a.greetingClicked, unique: clickedGreeting, pct: pct(clickedGreeting, contacts) },
        ],
      },
      {
        key: "follow",
        label: "Follow gate",
        reached: reachedFollow,
        reachedPct: pct(reachedFollow, contacts),
        events: [
          { name: "Sent", total: a.followSent, unique: reachedFollow },
          { name: "Clicks", total: a.followClicked, unique: Math.min(a.followClicked, reachedFollow), pct: pct(a.followClicked, a.followSent) },
        ],
      },
      {
        key: "details",
        label: "Final details",
        reached: reachedDetails,
        reachedPct: pct(reachedDetails, contacts),
        events: [{ name: "Sent", total: a.detailsSent, unique: reachedDetails, pct: 100 }],
        newFollows: a.followsGained,
      },
    ],
  };
}
