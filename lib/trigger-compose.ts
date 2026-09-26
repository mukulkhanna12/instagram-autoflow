/**
 * The one-page trigger editor's model.
 *
 * The canvas can draw any graph; the one-page editor deliberately handles one
 * shape — the one every real flow uses:
 *
 *   comment → [public reply] → [opening DM] → [follow check] → payoff DM
 *
 * Bracketed steps can be switched off. `fromTrigger` reads a saved trigger into
 * that shape, or returns null when the canvas has turned it into something
 * else (branches, a DM source, extra messages) — those stay canvas-only rather
 * than being flattened and losing work. `toNodes` writes it back, reusing the
 * node ids it was read with so the canvas layout survives a round trip.
 */
import {
  commentSource, loadDefaults, uid,
  type FlowButton, type FlowNode, type Trigger, type TriggerReel,
} from "./trigger-store";

export interface ComposeLink { label: string; url: string }

export interface ComposeState {
  name: string;
  status: Trigger["status"];
  reel: TriggerReel | null;
  /** Empty = any comment starts it. */
  include: string[];
  exclude: string[];
  autoReply: boolean;
  replies: string[];
  opener: { enabled: boolean; text: string; button: string };
  /** The follow check. Needs the opener: Instagram only says who follows once they tap. */
  gate: { enabled: boolean; text: string; button: string };
  payoff: { text: string; links: ComposeLink[] };
  /** Node ids carried through an edit so the canvas keeps its positions. */
  ids: { trigger?: string; source?: string; opener?: string; cond?: string; nudge?: string; payoff?: string };
}

export function emptyCompose(): ComposeState {
  const d = loadDefaults();
  const src = commentSource();
  return {
    name: "Untitled flow",
    status: "draft",
    reel: null,
    include: [],
    exclude: [],
    autoReply: true,
    replies: src.replies,
    opener: { enabled: true, text: d.opener.text, button: d.opener.button },
    gate: { enabled: true, text: d.follow.text, button: d.follow.button },
    payoff: { text: d.payoff.text, links: [{ label: d.payoff.button, url: "" }] },
    ids: {},
  };
}

type Msg = Extract<FlowNode, { type: "message" }>;

/** Read a saved trigger into the one-page shape, or null if it no longer fits. */
export function fromTrigger(t: Trigger): ComposeState | null {
  const byId = new Map(t.nodes.map((n) => [n.id, n]));
  const triggers = t.nodes.filter((n): n is Extract<FlowNode, { type: "trigger" }> => n.type === "trigger");
  if (triggers.length !== 1) return null;
  const trg = triggers[0];
  const src = trg.sources[0];
  if (!src || src.kind !== "comment" || trg.sources.length !== 1) return null;

  const asMsg = (id: string | null | undefined): Msg | null => {
    const n = id ? byId.get(id) : undefined;
    return n?.type === "message" ? n : null;
  };
  const nextBtn = (m: Msg) => m.buttons.filter((b) => b.kind === "next");
  const onlyLinks = (m: Msg) => m.buttons.every((b) => b.kind === "link");

  const first = asMsg(trg.next);
  if (!first) return null;

  const d = loadDefaults();
  let opener: Msg | null = null;
  let payoff: Msg | null = null;
  let cond: Extract<FlowNode, { type: "condition" }> | null = null;
  let nudge: Msg | null = null;

  if (onlyLinks(first)) {
    payoff = first;
  } else {
    if (nextBtn(first).length !== 1 || first.buttons.length !== 1) return null;
    opener = first;
    const target = byId.get(first.buttons[0].next ?? "");
    if (target?.type === "condition") {
      cond = target;
      payoff = asMsg(cond.yes);
      if (cond.no) {
        nudge = asMsg(cond.no);
        // The nudge must loop back to the check and do nothing else.
        if (!nudge || nudge.buttons.length !== 1 || nudge.buttons[0].next !== cond.id) return null;
      }
    } else if (target?.type === "message") {
      payoff = target;
    }
  }
  if (!payoff || !onlyLinks(payoff)) return null;

  // Anything the walk didn't reach means the canvas holds more than this page can show.
  const reached = [trg, opener, cond, nudge, payoff].filter(Boolean).length;
  if (reached !== t.nodes.length) return null;

  return {
    name: t.name,
    status: t.status,
    reel: src.reel,
    include: src.include,
    exclude: src.exclude,
    autoReply: src.autoReply,
    replies: src.replies.length ? src.replies : [""],
    opener: opener
      ? { enabled: true, text: opener.text, button: opener.buttons[0].label }
      : { enabled: false, text: d.opener.text, button: d.opener.button },
    gate: cond
      ? { enabled: true, text: nudge?.text ?? d.follow.text, button: nudge?.buttons[0].label ?? d.follow.button }
      : { enabled: false, text: d.follow.text, button: d.follow.button },
    payoff: {
      text: payoff.text,
      links: payoff.buttons.map((b) => ({ label: b.label, url: b.url ?? "" })),
    },
    ids: {
      trigger: trg.id, source: src.id,
      opener: opener?.id, cond: cond?.id, nudge: nudge?.id, payoff: payoff.id,
    },
  };
}

/** Write the one-page shape back out as canvas nodes. */
export function toNodes(s: ComposeState): FlowNode[] {
  const id = {
    trigger: s.ids.trigger ?? uid("trg"),
    source: s.ids.source ?? uid("src"),
    opener: s.ids.opener ?? uid("msg"),
    cond: s.ids.cond ?? uid("cnd"),
    nudge: s.ids.nudge ?? uid("msg"),
    payoff: s.ids.payoff ?? uid("msg"),
  };
  const opener = s.opener.enabled;
  // No opener means no tap, and no tap means Instagram never tells us who follows.
  const gate = opener && s.gate.enabled;

  const links: FlowButton[] = s.payoff.links.map((l, i) => ({
    id: `${id.payoff}_btn${i}`, label: l.label, kind: "link", url: l.url,
  }));

  const nodes: FlowNode[] = [
    {
      id: id.trigger, type: "trigger", next: opener ? id.opener : id.payoff,
      sources: [{
        id: id.source, kind: "comment", reel: s.reel,
        include: s.include, exclude: s.exclude,
        autoReply: s.autoReply,
        replies: s.autoReply ? s.replies.filter((r) => r.trim()) : [],
      }],
    },
  ];
  if (opener) {
    nodes.push({
      id: id.opener, type: "message", title: "Opening DM", text: s.opener.text,
      buttons: [{ id: `${id.opener}_btn`, label: s.opener.button, kind: "next", next: gate ? id.cond : id.payoff }],
    });
  }
  if (gate) {
    nodes.push({ id: id.cond, type: "condition", label: "Do they follow you?", yes: id.payoff, no: id.nudge });
    nodes.push({
      id: id.nudge, type: "message", title: "Not following yet", text: s.gate.text,
      buttons: [{ id: `${id.nudge}_btn`, label: s.gate.button, kind: "next", next: id.cond }],
    });
  }
  nodes.push({ id: id.payoff, type: "message", title: "The payoff", text: s.payoff.text, buttons: links });
  return nodes;
}

/** What still stops this from going live, in the order the page shows it. */
export function composeProblems(s: ComposeState): string[] {
  const out: string[] = [];
  if (!s.reel) out.push("Pick a reel");
  if (s.autoReply && !s.replies.some((r) => r.trim())) out.push("Write a public reply, or switch it off");
  if (s.opener.enabled && (!s.opener.text.trim() || !s.opener.button.trim())) out.push("Finish the opening DM");
  if (s.opener.enabled && s.gate.enabled && (!s.gate.text.trim() || !s.gate.button.trim())) out.push("Finish the follow message");
  if (!s.payoff.text.trim()) out.push("Write the final message");
  if (s.payoff.links.some((l) => !l.label.trim() || !/^https?:\/\/\S+/i.test(l.url.trim()))) out.push("Every link needs a label and a full https:// address");
  return out;
}
