import { describe, it, expect } from "vitest";
import {
  hasCondition, commentSource, dmSource, starterNodes, FALLBACK_DEFAULTS,
  DEFAULT_COMMENT_REPLIES, DEFAULT_DM_REPLIES,
  type FlowNode,
} from "@/lib/trigger-store";

describe("message defaults", () => {
  it("covers every message a flow can send, including the retry", () => {
    for (const key of ["opener", "follow", "followRetry", "payoff"] as const) {
      expect(FALLBACK_DEFAULTS[key].text.trim()).not.toBe("");
      expect(FALLBACK_DEFAULTS[key].button.trim()).not.toBe("");
    }
  });

  it("words the retry differently from the first nudge — that is its whole point", () => {
    expect(FALLBACK_DEFAULTS.followRetry.text).not.toBe(FALLBACK_DEFAULTS.follow.text);
    expect(FALLBACK_DEFAULTS.followRetry.button).not.toBe(FALLBACK_DEFAULTS.follow.button);
  });
});

describe("reply defaults", () => {
  it("ships three distinct variants for each source kind", () => {
    for (const set of [DEFAULT_COMMENT_REPLIES, DEFAULT_DM_REPLIES]) {
      expect(set).toHaveLength(3);
      expect(new Set(set).size).toBe(3);
      expect(set.every((r) => r.trim().length > 0)).toBe(true);
    }
  });

  it("gives a new comment source all three, so the rotation has something to rotate", () => {
    expect(commentSource().replies).toEqual(DEFAULT_COMMENT_REPLIES);
    expect(dmSource().replies).toEqual(DEFAULT_DM_REPLIES);
  });

  it("hands each source its own copy — editing one must not touch the defaults", () => {
    const a = commentSource();
    a.replies[0] = "edited";
    expect(commentSource().replies[0]).toBe(DEFAULT_COMMENT_REPLIES[0]);
  });
});

describe("source defaults", () => {
  it("replies publicly on a comment but stays quiet on a DM", () => {
    expect(commentSource().autoReply).toBe(true);
    expect(dmSource().autoReply).toBe(false);
  });
});

describe("hasCondition", () => {
  const msg = (id: string): FlowNode => ({ id, type: "message", title: "", text: "", buttons: [] });

  it("is true only when a follow check is present", () => {
    expect(hasCondition([msg("a"), msg("b")])).toBe(false);
    expect(hasCondition([
      msg("a"),
      { id: "c", type: "condition", label: "Do they follow you?", yes: null, no: null },
    ])).toBe(true);
  });

  it("reports the starter flow's single check, which is the one the canvas allows", () => {
    const nodes = starterNodes();
    expect(hasCondition(nodes)).toBe(true);
    expect(nodes.filter((n) => n.type === "condition")).toHaveLength(1);
  });
});
