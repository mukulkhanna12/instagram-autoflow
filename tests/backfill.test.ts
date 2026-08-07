import { describe, it, expect } from "vitest";
import { isWithinPrivateReplyWindow, hasOwnReply } from "@/lib/backfill";

const NOW = new Date("2026-08-05T12:00:00Z").getTime();
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("the 7-day private reply window", () => {
  it.each([
    ["just posted", 0],
    ["an hour old", 60 * MIN],
    ["a day old", DAY],
    ["six days old", 6 * DAY],
    ["six days 23 hours old", 6 * DAY + 23 * 60 * MIN],
  ])("can still DM a comment %s", (_label, age) => {
    expect(isWithinPrivateReplyWindow(ago(age), NOW)).toBe(true);
  });

  it.each([
    ["exactly seven days", 7 * DAY],
    ["seven days and a minute", 7 * DAY + MIN],
    ["eight days", 8 * DAY],
    ["a month", 30 * DAY],
  ])("refuses a comment %s old", (_label, age) => {
    expect(isWithinPrivateReplyWindow(ago(age), NOW)).toBe(false);
  });

  // Sending at 6d23h59m risks Instagram rejecting it as the clock ticks over.
  it("keeps a safety margin short of the exact boundary", () => {
    expect(isWithinPrivateReplyWindow(ago(7 * DAY - 4 * MIN), NOW)).toBe(false);
    expect(isWithinPrivateReplyWindow(ago(7 * DAY - 10 * MIN), NOW)).toBe(true);
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["unparseable", "not-a-date"],
  ])("fails closed on a %s timestamp", (_label, ts) => {
    expect(isWithinPrivateReplyWindow(ts, NOW)).toBe(false);
  });

  it("allows a clock-skewed future timestamp", () => {
    expect(isWithinPrivateReplyWindow(new Date(NOW + DAY).toISOString(), NOW)).toBe(true);
  });
});

describe("spotting comments we already answered", () => {
  const OWN = "17841400000000000";
  const OTHER = "99999999";
  const NAME = "mkexplores_";
  const reply = (fromId?: string) => ({ id: "r", ...(fromId ? { from: { id: fromId } } : {}) });

  it("says no when nobody has replied", () => {
    expect(hasOwnReply({ id: "c" }, OWN)).toBe(false);
    expect(hasOwnReply({ id: "c", replies: { data: [] } }, OWN)).toBe(false);
  });

  it("ignores replies from other people", () => {
    expect(hasOwnReply({ id: "c", replies: { data: [reply(OTHER)] } }, OWN)).toBe(false);
  });

  it("spots our own reply, whatever it said", () => {
    expect(hasOwnReply({ id: "c", replies: { data: [reply(OWN)] } }, OWN)).toBe(true);
    expect(hasOwnReply({ id: "c", replies: { data: [reply(OTHER), reply(OWN)] } }, OWN)).toBe(true);
  });

  it("matches on username when the id is missing", () => {
    const c = { id: "c", replies: { data: [{ id: "r", from: { username: "MKExplores_" } }] } };
    expect(hasOwnReply(c, OWN, NAME)).toBe(true);
    expect(hasOwnReply(c, OWN, "someone_else")).toBe(false);
    expect(hasOwnReply(c, OWN)).toBe(false);
  });

  // Sending twice is the expensive mistake: it DMs someone the account already
  // answered by hand. Skipping a stranger's reply just costs one missed DM.
  it("assumes a reply with no author at all is ours", () => {
    expect(hasOwnReply({ id: "c", replies: { data: [reply()] } }, OWN)).toBe(true);
    expect(hasOwnReply({ id: "c", replies: { data: [{ id: "r", from: {} }] } }, OWN)).toBe(true);
  });

  it("tolerates malformed reply data", () => {
    expect(hasOwnReply({ id: "c", replies: {} }, OWN)).toBe(false);
  });
});

describe("the cases backfill exists for", () => {
  const OWN = "17841400000000000";

  it("handles a recent comment nobody answered", () => {
    const c = { id: "c", timestamp: ago(2 * DAY) };
    expect(isWithinPrivateReplyWindow(c.timestamp, NOW) && !hasOwnReply(c, OWN)).toBe(true);
  });

  it("leaves a recent comment we already replied to", () => {
    const c = { id: "c", timestamp: ago(2 * DAY), replies: { data: [{ id: "r", from: { id: OWN } }] } };
    expect(isWithinPrivateReplyWindow(c.timestamp, NOW) && !hasOwnReply(c, OWN)).toBe(false);
  });

  it("can never reach a three-week-old comment", () => {
    expect(isWithinPrivateReplyWindow(ago(21 * DAY), NOW)).toBe(false);
  });
});
