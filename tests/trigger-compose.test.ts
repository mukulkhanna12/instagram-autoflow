import { describe, it, expect } from "vitest";
import { emptyCompose, fromTrigger, toNodes, composeProblems, type ComposeState } from "@/lib/trigger-compose";
import type { Trigger, FlowNode } from "@/lib/trigger-store";
import { OPENER_SUGGESTIONS, FOLLOW_SUGGESTIONS, PAYOFF_SUGGESTIONS } from "@/lib/dm-suggestions";
import { BUTTON_TITLE_MAX } from "@/lib/playbooks";

const wrap = (nodes: FlowNode[]): Trigger => ({ id: "t1", name: "T", status: "draft", updatedAt: 0, nodes });
const reel = { id: "r1", caption: "cap" };

function ready(over: Partial<ComposeState> = {}): ComposeState {
  const s = emptyCompose();
  return { ...s, reel, include: ["link"], payoff: { text: "Here 👇", links: [{ label: "Open", url: "https://a.com" }] }, ...over };
}

describe("one-page editor round trip", () => {
  it("reads back exactly what it wrote, with the follow gate", () => {
    const s = ready();
    const back = fromTrigger(wrap(toNodes(s)))!;
    expect(back).not.toBeNull();
    expect(back.reel).toEqual(reel);
    expect(back.include).toEqual(["link"]);
    expect(back.opener).toEqual(s.opener);
    expect(back.gate).toEqual(s.gate);
    expect(back.payoff).toEqual(s.payoff);
  });

  it("keeps node ids stable across a second save", () => {
    const first = toNodes(ready());
    const again = toNodes(fromTrigger(wrap(first))!);
    expect(again.map((n) => n.id)).toEqual(first.map((n) => n.id));
  });

  it("drops the gate when the opener is off — nothing to tap, nothing to check", () => {
    const nodes = toNodes(ready({ opener: { ...emptyCompose().opener, enabled: false } }));
    expect(nodes.some((n) => n.type === "condition")).toBe(false);
    expect(nodes).toHaveLength(2);
    const back = fromTrigger(wrap(nodes))!;
    expect(back.opener.enabled).toBe(false);
    expect(back.gate.enabled).toBe(false);
  });

  it("goes opener → payoff when the gate is off", () => {
    const s = ready({ gate: { ...emptyCompose().gate, enabled: false } });
    const back = fromTrigger(wrap(toNodes(s)))!;
    expect(back.opener.enabled).toBe(true);
    expect(back.gate.enabled).toBe(false);
  });

  it("stores no replies when the public reply is off", () => {
    const nodes = toNodes(ready({ autoReply: false }));
    const trg = nodes[0] as Extract<FlowNode, { type: "trigger" }>;
    expect(trg.sources[0].replies).toEqual([]);
  });
});

describe("fromTrigger refuses shapes it can't show", () => {
  it("a branching opener", () => {
    const nodes: FlowNode[] = [
      { id: "t", type: "trigger", next: "m", sources: [{ id: "s", kind: "comment", reel: null, include: [], exclude: [], autoReply: true, replies: ["x"] }] },
      { id: "m", type: "message", title: "", text: "?", buttons: [
        { id: "b1", label: "A", kind: "next", next: "a" },
        { id: "b2", label: "B", kind: "next", next: "b" },
      ] },
      { id: "a", type: "message", title: "", text: "a", buttons: [] },
      { id: "b", type: "message", title: "", text: "b", buttons: [] },
    ];
    expect(fromTrigger(wrap(nodes))).toBeNull();
  });

  it("a DM-started flow", () => {
    const nodes: FlowNode[] = [
      { id: "t", type: "trigger", next: "m", sources: [{ id: "s", kind: "dm", include: [], exclude: [], autoReply: false, replies: [] }] },
      { id: "m", type: "message", title: "", text: "hi", buttons: [] },
    ];
    expect(fromTrigger(wrap(nodes))).toBeNull();
  });

  it("an unreachable extra message", () => {
    const nodes = [...toNodes(ready()), { id: "stray", type: "message", title: "", text: "", buttons: [] } as FlowNode];
    expect(fromTrigger(wrap(nodes))).toBeNull();
  });
});

describe("composeProblems", () => {
  it("is clear when everything is filled in", () => {
    expect(composeProblems(ready())).toEqual([]);
  });
  it("flags a missing reel and a link without https", () => {
    const p = composeProblems(ready({ reel: null, payoff: { text: "x", links: [{ label: "Go", url: "a.com" }] } }));
    expect(p).toContain("Pick a reel");
    expect(p.some((x) => x.includes("https://"))).toBe(true);
  });
});

describe("DM suggestions", () => {
  it.each([...OPENER_SUGGESTIONS, ...FOLLOW_SUGGESTIONS, ...PAYOFF_SUGGESTIONS].map((s) => [s.name, s] as const))(
    "%s fits Instagram's button limit", (_, s) => {
      expect(s.button.length).toBeLessThanOrEqual(BUTTON_TITLE_MAX);
      expect(s.text.trim()).not.toBe("");
    }
  );
});
