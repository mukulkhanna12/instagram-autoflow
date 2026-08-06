"use client";

/**
 * Local store for the trigger builder design preview.
 *
 * Everything lives in localStorage on purpose: the point of this section is to
 * settle the shape and the interactions before committing to a schema and a
 * rewritten flow engine. Nothing here touches the live automation API, and the
 * existing per-reel flows are unaffected.
 */

export const STORAGE_KEY = "autoflow.triggers.preview.v1";

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

export type FlowNode =
  | { id: string; type: "trigger"; reel: TriggerReel | null; keywords: string; replyToComment: boolean; commentReply: string; next: string | null }
  | { id: string; type: "message"; title: string; text: string; buttons: FlowButton[] }
  | { id: string; type: "condition"; label: string; yes: string | null; no: string | null };

export interface Trigger {
  id: string;
  name: string;
  status: "live" | "draft";
  updatedAt: number;
  nodes: FlowNode[];
}

let seq = 0;
export const uid = (p: string) => `${p}_${Date.now().toString(36)}_${seq++}`;

/** A sensible starting graph: comment → opener → follow check → payoff. */
export function starterNodes(): FlowNode[] {
  const trigger = uid("trg");
  const m1 = uid("msg");
  const cond = uid("cnd");
  const m2 = uid("msg");
  return [
    {
      id: trigger, type: "trigger", reel: null, keywords: "",
      replyToComment: true, commentReply: "Sent you a DM! 📩", next: m1,
    },
    {
      id: m1, type: "message", title: "Opening DM",
      text: "Hey {{full_name}} 👋\n\nQuick check before I share the link — are you following this page? 😊",
      buttons: [{ id: uid("btn"), label: "Yes, I'm following", kind: "next", next: cond }],
    },
    { id: cond, type: "condition", label: "Do they follow you?", yes: m2, no: null },
    {
      id: m2, type: "message", title: "The payoff",
      text: "Awesome 🙌 Here's the link 👇",
      buttons: [{ id: uid("btn"), label: "Click here", kind: "link", url: "" }],
    },
  ];
}

export function newTrigger(name = "Untitled trigger"): Trigger {
  return { id: uid("tg"), name, status: "draft", updatedAt: Date.now(), nodes: starterNodes() };
}

export function loadTriggers(): Trigger[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Trigger[]) : [];
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
  return { messages, branches, reel: trigger?.reel ?? null, keywords: trigger?.keywords ?? "" };
}
