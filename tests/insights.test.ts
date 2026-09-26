import { describe, expect, it } from "vitest";
import {
  audience, byReel, classifyError, delta, heatmap, peakSlot, summarize, superfans, trend, windowFor,
  type InsightRow,
} from "@/lib/insights";

const DAY = 24 * 60 * 60 * 1000;

function row(p: Partial<InsightRow> & { at: Date }): InsightRow {
  return {
    automationId: "a1", igUserId: "u1", igUsername: "u1", state: "greeted",
    lastError: null, lastErrorAt: null, ...p,
  };
}

describe("summarize", () => {
  it("counts a tap as anyone who left the greeted state", () => {
    const at = new Date("2026-09-20T10:00:00Z");
    const s = summarize([
      row({ at, igUserId: "a", state: "greeted" }),
      row({ at, igUserId: "b", state: "follow_requested" }),
      row({ at, igUserId: "c", state: "completed" }),
      row({ at, igUserId: "d", state: "completed", lastError: "boom" }),
    ]);
    expect(s).toMatchObject({ contacts: 4, clicked: 3, gated: 1, completed: 2, failed: 1, clickRate: 75, completionRate: 50 });
  });

  it("is all zeros for no rows", () => {
    expect(summarize([])).toMatchObject({ contacts: 0, clickRate: 0, completionRate: 0 });
  });
});

describe("windowFor", () => {
  const now = Date.parse("2026-09-26T15:00:00Z");

  it("ends at the viewer's next local midnight and has an equal previous window", () => {
    // UTC+5:30 → getTimezoneOffset() = -330
    const off = -330 * 60 * 1000;
    const w = windowFor("7d", now, off, null);
    expect(new Date(w.end).toISOString()).toBe("2026-09-26T18:30:00.000Z");
    expect(w.end - w.start).toBe(7 * DAY);
    expect(w.start - w.prevStart!).toBe(7 * DAY);
  });

  it("all time starts at the first conversation and has no comparison", () => {
    const w = windowFor("all", now, 0, Date.parse("2026-06-01T12:00:00Z"));
    expect(new Date(w.start).toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(w.prevStart).toBeNull();
  });
});

describe("trend", () => {
  it("buckets by day and switches to weeks past 120 days", () => {
    const start = Date.parse("2026-09-20T00:00:00Z");
    const t = trend(
      [row({ at: new Date(start + 2 * DAY + 5), state: "completed" }), row({ at: new Date(start + 2 * DAY + 9) })],
      start,
      start + 7 * DAY
    );
    expect(t.bucketDays).toBe(1);
    expect(t.points).toHaveLength(7);
    expect(t.points[2]).toMatchObject({ contacts: 2, completed: 1 });

    expect(trend([], start, start + 200 * DAY).bucketDays).toBe(7);
  });

  it("ignores rows outside the window", () => {
    const start = Date.parse("2026-09-20T00:00:00Z");
    const t = trend([row({ at: new Date(start - 1) })], start, start + DAY);
    expect(t.points[0].contacts).toBe(0);
  });
});

describe("heatmap", () => {
  it("places comments by local weekday (Monday first) and hour", () => {
    // Monday 2026-09-21 23:30 UTC is Tuesday 05:00 in UTC+5:30.
    const g = heatmap([row({ at: new Date("2026-09-21T23:30:00Z") })], -330 * 60 * 1000);
    expect(g[1][5]).toBe(1);
    expect(peakSlot(g)).toEqual({ day: 1, hour: 5, count: 1 });
  });

  it("has no peak when empty", () => {
    expect(peakSlot(heatmap([], 0))).toBeNull();
  });
});

describe("audience and superfans", () => {
  const at = new Date("2026-09-20T10:00:00Z");
  const rows = [
    row({ at, automationId: "r1", igUserId: "fan", igUsername: "fan", state: "completed" }),
    row({ at: new Date(at.getTime() + 1000), automationId: "r2", igUserId: "fan", igUsername: "fan" }),
    row({ at, automationId: "r1", igUserId: "once" }),
  ];

  it("splits returning from first-time people", () => {
    expect(audience(rows)).toEqual({ unique: 2, returning: 1, firstTimers: 1 });
  });

  it("lists only people seen on more than one reel", () => {
    const fans = superfans(rows);
    expect(fans).toHaveLength(1);
    expect(fans[0]).toMatchObject({ igUserId: "fan", reels: 2, completed: 1 });
  });

  it("ranks reels by comments", () => {
    expect(byReel(rows).map((r) => [r.automationId, r.contacts])).toEqual([["r1", 2], ["r2", 1]]);
  });
});

describe("delta", () => {
  it("is null when there's nothing to compare against", () => {
    expect(delta(5, null)).toBeNull();
    expect(delta(5, 0)).toBeNull();
    expect(delta(0, 0)).toBe(0);
    expect(delta(15, 10)).toBe(50);
  });
});

describe("classifyError", () => {
  it("groups Instagram errors into plain reasons", () => {
    expect(classifyError("Failed to send greeting DM: (#4) Application request limit reached")).toBe("Rate limit");
    expect(classifyError("Failed to send details DM: Error validating access token")).toBe("Login expired");
    expect(classifyError("Failed to send greeting DM: something odd")).toBe("Other");
  });
});
