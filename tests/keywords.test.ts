import { describe, it, expect } from "vitest";
import { commentMatchesKeywords, parseKeywords } from "@/lib/keywords";

describe("parseKeywords", () => {
  it("treats nothing configured as no keywords", () => {
    expect(parseKeywords("")).toEqual([]);
    expect(parseKeywords(null)).toEqual([]);
    expect(parseKeywords(undefined)).toEqual([]);
    expect(parseKeywords(",,,")).toEqual([]);
  });

  it("splits, trims and drops empties", () => {
    expect(parseKeywords("prompt")).toEqual(["prompt"]);
    expect(parseKeywords("  prompt , link ")).toEqual(["prompt", "link"]);
    expect(parseKeywords("prompt,,  ,link")).toEqual(["prompt", "link"]);
  });
});

describe("an unfiltered reel replies to everything", () => {
  it.each([
    ["a plain comment", "nice reel 🔥"],
    ["an empty comment", ""],
    ["no comment text at all", null],
  ])("%s", (_label, text) => {
    expect(commentMatchesKeywords(text, "")).toBe(true);
  });

  it("treats whitespace-only keywords as unfiltered", () => {
    expect(commentMatchesKeywords("nice reel", "  ,  ")).toBe(true);
  });
});

describe("a reel filtered on PROMPT", () => {
  const K = "PROMPT";

  it.each([
    ["exact, same case", "PROMPT"],
    ["lowercase", "prompt"],
    ["mixed case", "PrOmPt"],
    ["inside a sentence", "hey can you send me the prompt pls"],
    ["pluralised", "prompts please"],
    ["with emoji and punctuation", "PROMPT!! 🙏🔥"],
    ["across newlines", "hi\nprompt\nthanks"],
  ])("responds to %s", (_label, text) => {
    expect(commentMatchesKeywords(text, K)).toBe(true);
  });

  it.each([
    ["an unrelated comment", "nice reel 🔥"],
    ["a truncated near-miss", "promp"],
    ["an empty comment", ""],
    ["whitespace only", "   "],
  ])("ignores %s", (_label, text) => {
    expect(commentMatchesKeywords(text, K)).toBe(false);
  });

  it("fails closed when Instagram sends no comment text", () => {
    expect(commentMatchesKeywords(undefined, K)).toBe(false);
  });
});

describe("several keywords", () => {
  const M = "prompt, link, guide";

  it("matches any one of them, case-insensitively", () => {
    expect(commentMatchesKeywords("PROMPT", M)).toBe(true);
    expect(commentMatchesKeywords("send the Link", M)).toBe(true);
    expect(commentMatchesKeywords("GUIDE pls", M)).toBe(true);
  });

  it("ignores a comment matching none of them", () => {
    expect(commentMatchesKeywords("love this", M)).toBe(false);
  });

  it("tolerates messy stored spacing", () => {
    expect(commentMatchesKeywords("guide", "  prompt ,, link ,guide  ")).toBe(true);
  });
});

describe("two reels side by side", () => {
  it("the unfiltered reel takes any comment, the filtered one only its keyword", () => {
    expect(commentMatchesKeywords("whatever they type", "")).toBe(true);
    expect(commentMatchesKeywords("prompt", "PROMPT")).toBe(true);
    expect(commentMatchesKeywords("awesome video", "PROMPT")).toBe(false);
  });
});
