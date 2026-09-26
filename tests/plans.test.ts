import { describe, it, expect } from "vitest";
import { FREE_PLAN, canAddAutomation, canAddReel } from "@/lib/plans";
import { isSampleTrigger } from "@/lib/trigger-store";

describe("Free plan", () => {
  it("allows 3 reels with automations and 1 automation", () => {
    expect(FREE_PLAN).toEqual({ reels: 3, automations: 1 });
    expect(canAddReel(2)).toBe(true);
    expect(canAddReel(3)).toBe(false);
    expect(canAddAutomation(0)).toBe(true);
    expect(canAddAutomation(1)).toBe(false);
  });

  it("doesn't count the sample automations", () => {
    expect(isSampleTrigger({ name: "1 · Full flow — reply, opener, follow gate" })).toBe(true);
    expect(isSampleTrigger({ name: "My prompt pack" })).toBe(false);
  });
});
