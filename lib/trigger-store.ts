"use client";

/**
 * Local store for the trigger builder design preview.
 *
 * Everything lives in localStorage on purpose: the point of this section is to
 * settle the shape and the interactions before committing to a schema and a
 * rewritten flow engine. Nothing here touches the live automation API, and the
 * existing per-reel flows are unaffected.
 */

// v2 reseeds the scenario set. Preview triggers live only in this browser and
// nothing downstream reads them, so a fresh key is cheaper than a migration.
export const STORAGE_KEY = "autoflow.triggers.preview.v2";
export const DEFAULTS_KEY = "autoflow.triggers.defaults.v1";

export interface TriggerReel {
  id: string;
  caption?: string;
  thumbnail?: string;
}

export interface FlowButton {
  id: string;
  label: string;
  kind: "next" | "link";
  url?: string;
  next?: string | null;
}

/**
 * What starts the flow. A trigger can have several sources at once — a reel
 * comment and an incoming DM both leading into the same messages.
 *
 * Only the comment source can reply in the feed; there is no public surface to
 * reply on when the flow starts from a DM, so `autoReply` lives here rather
 * than on the trigger.
 */
export type TriggerSource =
  | {
      id: string; kind: "comment";
      reel: TriggerReel | null;
      /** Comment must contain one of these. Empty = any comment triggers it. */
      include: string[];
      /** Containing any of these never triggers, even if include matches. */
      exclude: string[];
      /** Public reply under the comment; several are rotated at random. */
      autoReply: boolean;
      replies: string[];
    }
  | {
      id: string; kind: "dm";
      include: string[];
      exclude: string[];
      /** Reply automatically to the incoming DM before the flow continues. */
      autoReply: boolean;
      replies: string[];
    };

/** Where a card sits once it has been dragged. Absent = auto-laid-out. */
export interface NodePos { x: number; y: number }

export type FlowNode =
  | { id: string; type: "trigger"; sources: TriggerSource[]; next: string | null; pos?: NodePos }
  | { id: string; type: "message"; title: string; text: string; buttons: FlowButton[]; pos?: NodePos }
  | { id: string; type: "condition"; label: string; yes: string | null; no: string | null; pos?: NodePos };

/**
 * The wording every new trigger starts from. Editing these doesn't touch
 * triggers that already exist — they've been customised by then, and quietly
 * rewriting them would be the opposite of a default.
 */
export interface TriggerDefaults {
  opener: { text: string; button: string };
  follow: { text: string; button: string };
  payoff: { text: string; button: string };
}

export const FALLBACK_DEFAULTS: TriggerDefaults = {
  opener: {
    text: "Hey {{full_name}} 👋\n\nQuick check before I share the link — are you following this page? 😊",
    button: "Yes, I'm following",
  },
  follow: {
    text: "Almost there! Follow the page first, then tap below and I'll send it over 🙏",
    button: "I've followed ✓",
  },
  payoff: {
    text: "Awesome 🙌 Here's the link 👇",
    button: "Click here",
  },
};

export function loadDefaults(): TriggerDefaults {
  if (typeof window === "undefined") return FALLBACK_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(DEFAULTS_KEY);
    if (!raw) return FALLBACK_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<TriggerDefaults>;
    return {
      opener: { ...FALLBACK_DEFAULTS.opener, ...parsed.opener },
      follow: { ...FALLBACK_DEFAULTS.follow, ...parsed.follow },
      payoff: { ...FALLBACK_DEFAULTS.payoff, ...parsed.payoff },
    };
  } catch {
    return FALLBACK_DEFAULTS;
  }
}

export function saveDefaults(d: TriggerDefaults) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEFAULTS_KEY, JSON.stringify(d));
}

export interface Trigger {
  id: string;
  name: string;
  status: "live" | "draft";
  updatedAt: number;
  nodes: FlowNode[];
}

let seq = 0;
export const uid = (p: string) => `${p}_${Date.now().toString(36)}_${seq++}`;

/**
 * Three starting replies rather than one.
 *
 * Instagram flags repetition, and the automation guides are unanimous that a
 * public reply should vary — Manychat's own advice is several variations so it
 * doesn't read as a bot. Three is the floor that makes the rotation meaningful;
 * they are deliberately different in shape, not three rewordings of one line,
 * because near-identical variants defeat the point.
 */
export const DEFAULT_COMMENT_REPLIES = [
  "Just sent it to your DMs! 📩",
  "Check your inbox — it's on the way 🙌",
  "Sent! Give your messages a look 👀",
];

/** The DM equivalent: an instant acknowledgement while the flow starts. */
export const DEFAULT_DM_REPLIES = [
  "Got it — one sec 👀",
  "On it! Sending that over now 🙌",
  "Thanks for reaching out — coming right up 📩",
];

export function commentSource(): Extract<TriggerSource, { kind: "comment" }> {
  return {
    id: uid("src"), kind: "comment", reel: null,
    include: [], exclude: [],
    autoReply: true,
    replies: [...DEFAULT_COMMENT_REPLIES],
  };
}

export function dmSource(): Extract<TriggerSource, { kind: "dm" }> {
  return {
    id: uid("src"), kind: "dm",
    include: [], exclude: [],
    autoReply: false,
    replies: [...DEFAULT_DM_REPLIES],
  };
}

/**
 * Instagram tells us whether someone follows only when they message us, and one
 * answer is all a flow can act on — a second check further down would re-ask a
 * question already answered. So the canvas allows exactly one.
 */
export function hasCondition(nodes: FlowNode[]): boolean {
  return nodes.some((n) => n.type === "condition");
}

/** A sensible starting graph: comment → opener → follow check → payoff. */
export function starterNodes(): FlowNode[] {
  const d = loadDefaults();
  const trigger = uid("trg");
  const m1 = uid("msg");
  const cond = uid("cnd");
  const m2 = uid("msg");
  return [
    {
      id: trigger, type: "trigger", next: m1,
      sources: [commentSource()],
    },
    {
      id: m1, type: "message", title: "Opening DM",
      text: d.opener.text,
      buttons: [{ id: uid("btn"), label: d.opener.button, kind: "next", next: cond }],
    },
    { id: cond, type: "condition", label: "Do they follow you?", yes: m2, no: null },
    {
      id: m2, type: "message", title: "The payoff",
      text: d.payoff.text,
      buttons: [{ id: uid("btn"), label: d.payoff.button, kind: "link", url: "" }],
    },
  ];
}

export function newTrigger(name = "Untitled trigger"): Trigger {
  return { id: uid("tg"), name, status: "draft", updatedAt: Date.now(), nodes: starterNodes() };
}

/**
 * Triggers saved before trigger nodes had a `sources` array would render as a
 * broken card and throw on read, so older shapes are folded forward here.
 */
function migrate(list: Trigger[]): Trigger[] {
  return list.map((t) => ({
    ...t,
    nodes: t.nodes.map((n) => {
      if (n.type !== "trigger" || Array.isArray((n as { sources?: unknown }).sources)) return n;
      const old = n as unknown as {
        id: string; next: string | null; reel?: TriggerReel | null;
        include?: string[]; exclude?: string[];
        replyEnabled?: boolean; replies?: string[];
        keywords?: string; commentReply?: string; replyToComment?: boolean;
      };
      const src = commentSource();
      return {
        id: old.id, type: "trigger" as const, next: old.next ?? null,
        sources: [{
          ...src,
          reel: old.reel ?? null,
          include: old.include ?? (old.keywords ? old.keywords.split(",").map((k) => k.trim()).filter(Boolean) : []),
          exclude: old.exclude ?? [],
          autoReply: old.replyEnabled ?? old.replyToComment ?? true,
          replies: old.replies ?? (old.commentReply ? [old.commentReply] : src.replies),
        }],
      };
    }),
  }));
}

/**
 * One trigger per shape the builder can currently express, seeded on a first
 * visit so every scenario can be opened and compared side by side rather than
 * rebuilt by hand. Deleting them sticks.
 *
 * The list doubles as the honest inventory of what the canvas supports today —
 * if a shape isn't here, it isn't buildable yet.
 */
function demoTriggers(): Trigger[] {
  const link = "https://docs.google.com/document/d/example";
  const OPENER = "Hey {{full_name}} 👋\n\nQuick check before I share the link — are you following this page? 😊";

  const trigger = (next: string, sources: TriggerSource[]): FlowNode =>
    ({ id: uid("trg"), type: "trigger", next, sources });
  const message = (id: string, title: string, text: string, buttons: FlowButton[]): FlowNode =>
    ({ id, type: "message", title, text, buttons });
  const linkBtn = (label = "Click here"): FlowButton =>
    ({ id: uid("btn"), label, kind: "link", url: link });
  const nextBtn = (label: string, next: string | null): FlowButton =>
    ({ id: uid("btn"), label, kind: "next", next });

  const wrap = (name: string, nodes: FlowNode[]): Trigger =>
    ({ id: uid("tg"), name, status: "draft", updatedAt: Date.now(), nodes });

  /* 1 — the full flow: public reply, opener, follow gate, payoff. */
  const full = () => {
    const m1 = uid("msg"), cond = uid("cnd"), m2 = uid("msg");
    return wrap("1 · Full flow — reply, opener, follow gate", [
      trigger(m1, [{ ...commentSource(), include: ["logo", "prompt"] }]),
      message(m1, "Opening DM", OPENER, [nextBtn("Yes, I'm following", cond)]),
      { id: cond, type: "condition", label: "Do they follow you?", yes: m2, no: null },
      message(m2, "The payoff", "Awesome 🙌 Here's the logo prompt pack 👇", [linkBtn()]),
    ]);
  };

  /* 2 — same, but nothing is posted publicly under the comment. */
  const silent = () => {
    const m1 = uid("msg"), cond = uid("cnd"), m2 = uid("msg");
    return wrap("2 · No public reply — DM only", [
      trigger(m1, [{ ...commentSource(), include: ["banner"], autoReply: false, replies: [] }]),
      message(m1, "Opening DM", OPENER, [nextBtn("Yes, I'm following", cond)]),
      { id: cond, type: "condition", label: "Do they follow you?", yes: m2, no: null },
      message(m2, "The payoff", "Here you go — the banner prompts 👇", [linkBtn()]),
    ]);
  };

  /* 3 — the gate removed: everyone reaches the payoff. */
  const ungated = () => {
    const m1 = uid("msg"), m2 = uid("msg");
    return wrap("3 · No follow check — open to everyone", [
      trigger(m1, [{ ...commentSource(), include: ["free"] }]),
      message(m1, "Opening DM", "Hey {{first_name}} 👋 here's what you asked for 👇", [
        nextBtn("Send it over", m2),
      ]),
      message(m2, "The payoff", "Enjoy! 🙌", [linkBtn()]),
    ]);
  };

  /* 4 — the shortest possible flow: comment straight to the link. */
  const instant = () => {
    const m2 = uid("msg");
    return wrap("4 · Straight to the link — no opener", [
      trigger(m2, [{ ...commentSource(), include: ["link"] }]),
      message(m2, "The payoff", "Here's the link you asked for 👇", [linkBtn()]),
    ]);
  };

  /* 5 — started by a DM instead of a comment; no feed to reply in. */
  const fromDm = () => {
    const m1 = uid("msg"), cond = uid("cnd"), m2 = uid("msg");
    return wrap("5 · Starts from a DM keyword", [
      trigger(m1, [{ ...dmSource(), include: ["prompt"], autoReply: true }]),
      message(m1, "Opening DM", OPENER, [nextBtn("Yes, I'm following", cond)]),
      { id: cond, type: "condition", label: "Do they follow you?", yes: m2, no: null },
      message(m2, "The payoff", "Here you go 👇", [linkBtn()]),
    ]);
  };

  /* 6 — two ways in, one set of messages. */
  const bothSources = () => {
    const m1 = uid("msg"), m2 = uid("msg");
    return wrap("6 · Comment or DM — both start it", [
      trigger(m1, [
        { ...commentSource(), include: ["guide"] },
        { ...dmSource(), include: ["guide"], autoReply: true },
      ]),
      message(m1, "Opening DM", "Hey {{first_name}} 👋 want the guide?", [nextBtn("Yes please", m2)]),
      message(m2, "The payoff", "Here it is 👇", [linkBtn()]),
    ]);
  };

  /* 7 — one message, two buttons, two different endings. */
  const branching = () => {
    const m1 = uid("msg"), a = uid("msg"), b = uid("msg");
    return wrap("7 · Two buttons, two paths", [
      trigger(m1, [{ ...commentSource(), include: ["price", "info"] }]),
      message(m1, "Opening DM", "Hey {{first_name}} 👋 what are you after?", [
        nextBtn("The pricing", a),
        nextBtn("The free guide", b),
      ]),
      message(a, "Pricing", "Here's the pricing page 👇", [linkBtn("See pricing")]),
      message(b, "Free guide", "All yours — enjoy 🙌", [linkBtn("Get the guide")]),
    ]);
  };

  /* 8 — the "no" branch used, so non-followers get nudged instead of dropped. */
  const nudge = () => {
    const m1 = uid("msg"), cond = uid("cnd"), yes = uid("msg"), no = uid("msg");
    return wrap("8 · Follow gate with a nudge for non-followers", [
      trigger(m1, [{ ...commentSource(), include: ["pack"] }]),
      message(m1, "Opening DM", OPENER, [nextBtn("Yes, I'm following", cond)]),
      { id: cond, type: "condition", label: "Do they follow you?", yes, no },
      message(yes, "The payoff", "Awesome 🙌 Here's the pack 👇", [linkBtn()]),
      message(no, "Not following yet", "Almost there! Follow the page, then tap below 🙏", [
        nextBtn("I've followed ✓", cond),
      ]),
    ]);
  };

  return [full(), silent(), ungated(), instant(), fromDm(), bothSources(), branching(), nudge()];
}

export function loadTriggers(): Trigger[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== null) return migrate(JSON.parse(raw) as Trigger[]);
    const seeded = demoTriggers();
    saveTriggers(seeded);
    return seeded;
  } catch {
    return [];
  }
}

export function saveTriggers(list: Trigger[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function upsertTrigger(t: Trigger) {
  const list = loadTriggers();
  const i = list.findIndex((x) => x.id === t.id);
  const next = { ...t, updatedAt: Date.now() };
  if (i === -1) list.push(next);
  else list[i] = next;
  saveTriggers(list);
  return next;
}

export function getTrigger(id: string): Trigger | null {
  return loadTriggers().find((t) => t.id === id) ?? null;
}

export function deleteTrigger(id: string) {
  saveTriggers(loadTriggers().filter((t) => t.id !== id));
}

/** Counts shown on the list card, so a trigger is legible without opening it. */
export function summarise(t: Trigger) {
  const messages = t.nodes.filter((n) => n.type === "message").length;
  const branches = t.nodes
    .filter((n): n is Extract<FlowNode, { type: "message" }> => n.type === "message")
    .reduce((sum, n) => sum + n.buttons.filter((b) => b.kind === "next").length, 0);
  const trigger = t.nodes.find((n): n is Extract<FlowNode, { type: "trigger" }> => n.type === "trigger");
  const sources = trigger?.sources ?? [];
  const comment = sources.find((x) => x.kind === "comment");
  return {
    messages, branches, sources,
    reel: comment?.kind === "comment" ? comment.reel : null,
    keywords: [...new Set(sources.flatMap((x) => x.include))].join(", "),
  };
}
