import { describe, it, expect } from "vitest";
import {
  PLAYBOOKS, PLAYBOOK_CATEGORIES, BUTTON_TITLE_MAX, findPlaybook, playbookFields, playbookKeywords,
} from "@/lib/playbooks";
import { commentMatchesKeywords } from "@/lib/keywords";

describe("playbook catalog", () => {
  it("has unique ids", () => {
    const ids = PLAYBOOKS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("fills every category", () => {
    for (const c of PLAYBOOK_CATEGORIES) {
      expect(PLAYBOOKS.some((p) => p.category === c.id)).toBe(true);
    }
  });

  it.each(PLAYBOOKS.map((p) => [p.id, p] as const))("%s keeps its buttons within Instagram's limit", (_, p) => {
    expect(p.greetingButton.length).toBeLessThanOrEqual(BUTTON_TITLE_MAX);
    expect(p.link.title.length).toBeLessThanOrEqual(BUTTON_TITLE_MAX);
  });

  it.each(PLAYBOOKS.map((p) => [p.id, p] as const))("%s triggers on its own sample comment", (_, p) => {
    expect(commentMatchesKeywords(p.sample.comment, playbookKeywords(p))).toBe(true);
  });

  it.each(PLAYBOOKS.map((p) => [p.id, p] as const))("%s has every message written", (_, p) => {
    for (const t of [...p.replies, p.greeting, p.payoff, p.noun, p.pitch]) expect(t.trim()).not.toBe("");
    expect(p.worksWith.length).toBeGreaterThan(0);
  });
});

describe("playbookFields", () => {
  const p = findPlaybook("freebie-drop")!;

  it("uses the chosen keyword alongside the playbook's alternates", () => {
    expect(playbookFields(findPlaybook("price-list")!, { keyword: "RATES" }).keywords).toBe("rates, cost, how much");
    expect(playbookFields(p).keywords).toBe("free");
  });

  it("sends the final message as plain text when no link is given", () => {
    const f = playbookFields(p);
    expect(f.detailsButtonEnabled).toBe(false);
    expect(f.detailsButtons).toEqual([]);
  });

  it("trims, caps and mirrors the first button into the legacy pair", () => {
    const f = playbookFields(p, {
      buttons: [
        { title: "  A very long button label indeed ", url: " https://a.com " },
        { title: "B", url: "https://b.com" },
        { title: "", url: "https://skip.com" },
        { title: "C", url: "https://c.com" },
        { title: "D", url: "https://d.com" },
      ],
    });
    expect(f.detailsButtons).toHaveLength(3);
    expect(f.detailsButtons[0]).toEqual({ title: "A very long button l", url: "https://a.com" });
    expect(f.detailsButtonText).toBe(f.detailsButtons[0].title);
    expect(f.detailsUrl).toBe("https://a.com");
    expect(f.detailsButtonEnabled).toBe(true);
  });

  it("names the payoff in the follow gate", () => {
    const f = playbookFields(p);
    expect(f.followMessage).toContain("freebie");
    expect(f.followRetryMessage).not.toBe(f.followMessage);
  });
});
