import { describe, it, expect } from "vitest";
import { parseButtons, resolveDetailsButtons, MAX_BUTTONS } from "@/lib/buttons";

const A = { title: "A", url: "https://a.com" };
const B = { title: "B", url: "https://b.com" };
const C = { title: "C", url: "https://c.com" };
const D = { title: "D", url: "https://d.com" };

/** Defaults for the fields resolveDetailsButtons reads. */
const src = (over: Partial<Parameters<typeof resolveDetailsButtons>[0]> = {}) => ({
  detailsButtonEnabled: true,
  detailsButtons: [],
  detailsButtonText: "",
  detailsUrl: "",
  ...over,
});

describe("parseButtons", () => {
  it("caps at Instagram's three-button ceiling", () => {
    expect(MAX_BUTTONS).toBe(3);
    expect(parseButtons([A, B, C])).toEqual([A, B, C]);
    expect(parseButtons([A, B, C, D])).toEqual([A, B, C]);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a bare object", { title: "x", url: "y" }],
    ["a string", "nope"],
    ["an empty array", []],
  ])("returns nothing for %s", (_label, raw) => {
    expect(parseButtons(raw)).toEqual([]);
  });

  it("drops entries that could never work as a button", () => {
    expect(parseButtons([{ title: "A" }])).toEqual([]);
    expect(parseButtons([{ url: "https://a.com" }])).toEqual([]);
    expect(parseButtons([{ title: "  ", url: "https://a.com" }])).toEqual([]);
    expect(parseButtons([{ title: "A", url: "  " }])).toEqual([]);
    expect(parseButtons([{ title: 5, url: "https://a.com" }])).toEqual([]);
  });

  it("keeps the good ones alongside junk", () => {
    expect(parseButtons([{ title: "A" }, B, null, C])).toEqual([B, C]);
    expect(parseButtons([null, A, {}, B, "x", C, D])).toEqual([A, B, C]);
  });

  it("trims whitespace", () => {
    expect(parseButtons([{ title: "  A  ", url: "  https://a.com  " }])).toEqual([A]);
  });
});

describe("resolveDetailsButtons", () => {
  it("sends nothing when the toggle is off, whatever is configured", () => {
    expect(resolveDetailsButtons(src({ detailsButtonEnabled: false, detailsButtons: [A, B] }))).toEqual([]);
    expect(resolveDetailsButtons(src({
      detailsButtonEnabled: false, detailsButtonText: "X", detailsUrl: "https://x.com",
    }))).toEqual([]);
  });

  it("prefers the configured buttons over the legacy pair", () => {
    expect(resolveDetailsButtons(src({
      detailsButtons: [A, B], detailsButtonText: "OLD", detailsUrl: "https://old.com",
    }))).toEqual([A, B]);
  });

  // Rows written before multi-button support only have the old single pair;
  // they must keep sending exactly the button they sent before.
  describe("legacy fallback", () => {
    it("uses the old single button when no array is set", () => {
      expect(resolveDetailsButtons(src({
        detailsButtonText: "Visit 🔗", detailsUrl: "https://old.com",
      }))).toEqual([{ title: "Visit 🔗", url: "https://old.com" }]);
    });

    it("trims it", () => {
      expect(resolveDetailsButtons(src({
        detailsButtonText: " Visit ", detailsUrl: " https://old.com ",
      }))).toEqual([{ title: "Visit", url: "https://old.com" }]);
    });

    it("falls back when the array holds only junk", () => {
      expect(resolveDetailsButtons(src({
        detailsButtons: [{ title: "x" }], detailsButtonText: "Visit", detailsUrl: "https://old.com",
      }))).toEqual([{ title: "Visit", url: "https://old.com" }]);
    });
  });

  it("never produces a button that goes nowhere", () => {
    expect(resolveDetailsButtons(src({ detailsButtonText: "Visit" }))).toEqual([]);
    expect(resolveDetailsButtons(src({ detailsUrl: "https://old.com" }))).toEqual([]);
    expect(resolveDetailsButtons(src())).toEqual([]);
  });
});
