import { describe, it, expect } from "vitest";
import { ARTICLES, CATEGORIES, articleBySlug, stripInline } from "@/lib/help/articles";
import { searchArticles, answerQuestion, stem } from "@/lib/help/search";
import { HERO_DEMOS } from "@/lib/help/hero-demos";

const top = (q: string) => searchArticles(q)[0]?.article.slug;

describe("help articles", () => {
  it("have unique slugs and known categories", () => {
    const slugs = ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const cats = new Set(CATEGORIES.map((c) => c.id));
    for (const a of ARTICLES) expect(cats.has(a.category)).toBe(true);
  });

  it("only link to help articles that exist", () => {
    for (const a of ARTICLES) {
      const text = JSON.stringify(a.body);
      for (const [, slug] of text.matchAll(/\]\(\/help\/([a-z0-9-]+)\)/g)) {
        expect(articleBySlug(slug), `${a.slug} → ${slug}`).toBeDefined();
      }
    }
  });

  it("hero demos each point at a real article", () => {
    for (const d of HERO_DEMOS) expect(articleBySlug(d.slug), d.slug).toBeDefined();
  });

  it("strips inline markup", () => {
    expect(stripInline("Go to **Settings** and [connect](/settings) `now`")).toBe("Go to Settings and connect now");
  });
});

describe("searchArticles", () => {
  it("returns nothing for an empty or stopword-only query", () => {
    expect(searchArticles("")).toEqual([]);
    expect(searchArticles("how do I")).toEqual([]);
  });

  it.each([
    ["my automation is not working", "not-triggering"],
    ["commenter didn't get the dm", "no-dm-received"],
    ["where is the message requests folder", "no-dm-received"],
    ["how do keywords work", "keyword-triggers"],
    ["reply to old comments", "old-comments"],
    ["is it safe, will I get banned", "account-safety"],
    ["how much does it cost", "pricing"],
    ["use their first name in the message", "personalization"],
    ["I never got a login code", "sign-up-and-approval"],
    ["personal account can't connect", "account-requirements"],
    ["prepare a flow before posting", "upcoming-reels"],
    ["what is the hourly limit", "instagram-limits"],
    ["follow gate", "follow-gate"],
  ])("%s → %s", (q, slug) => {
    expect(top(q)).toBe(slug);
  });

  it("matches partial words while typing", () => {
    expect(searchArticles("keyw").length).toBeGreaterThan(0);
  });

  it("stems plurals and verb endings", () => {
    expect(stem("keywords")).toBe("keyword");
    expect(stem("replies")).toBe("repli");
    expect(stem("following")).toBe("follow");
  });
});

describe("answerQuestion", () => {
  it("answers with a passage from the best article", () => {
    const a = answerQuestion("why didn't they get my DM?");
    expect(a?.article.slug).toBe("no-dm-received");
    expect(a?.snippet).toMatch(/Message Requests/);
  });

  it("admits it doesn't know rather than guessing", () => {
    expect(answerQuestion("what's the weather in Paris")).toBeNull();
    expect(answerQuestion("what is the weather in paris")).toBeNull();
  });

  it("never returns the top article as its own related article", () => {
    const a = answerQuestion("automation not replying to comments");
    expect(a).not.toBeNull();
    expect(a!.related.map((r) => r.slug)).not.toContain(a!.article.slug);
  });
});
