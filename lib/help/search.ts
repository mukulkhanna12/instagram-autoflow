/**
 * Search over the help articles, and the help assistant's answers.
 *
 * Deliberately no LLM and no third-party widget: the whole index is ~25
 * articles, so a weighted keyword match in the browser is instant, free, needs
 * no API key, and can only ever answer with something we actually wrote. The
 * assistant never invents an answer — it quotes the best-matching passage and
 * links to the article, or admits it doesn't know and points to support.
 */
import { ARTICLES, blockText, type Article, type Block } from "./articles";

const STOPWORDS = new Set(
  ("a an and are as at be but by can could do does did doesnt dont for from get got have how i if in into is it its " +
    "me my of on or so that the their them then there this to was what when where which who why will with would " +
    "you your im ive just please pls hey hi hello help need want know tell about any some still")
    .split(" ")
);

/**
 * Words people type → the words the articles use. Keeps "dm", "message",
 * "inbox" etc. landing on the same articles without listing every variant on
 * every article.
 */
const SYNONYMS: Record<string, string[]> = {
  dm: ["message", "dm"],
  dms: ["message", "dm"],
  message: ["dm", "message"],
  messages: ["dm", "message"],
  inbox: ["dm", "request"],
  work: ["trigger", "reply"],
  working: ["trigger", "reply"],
  broken: ["trigger", "error"],
  fix: ["error", "trigger"],
  bot: ["automation", "flow"],
  automation: ["flow", "automation"],
  automations: ["flow", "automation"],
  flow: ["automation", "flow"],
  post: ["reel"],
  posts: ["reel"],
  video: ["reel"],
  reels: ["reel"],
  ig: ["instagram"],
  insta: ["instagram"],
  followers: ["follow"],
  following: ["follow"],
  followed: ["follow"],
  link: ["button", "link", "url"],
  links: ["button", "link", "url"],
  word: ["keyword"],
  words: ["keyword"],
  cost: ["price", "free"],
  ban: ["safe"],
  banned: ["safe"],
  analytics: ["stats"],
  metrics: ["stats"],
  signup: ["sign", "approval"],
  register: ["sign", "approval"],
  otp: ["code", "login"],
  old: ["backfill", "before"],
  previous: ["backfill", "before"],
  earlier: ["backfill", "before"],
  schedule: ["upcoming", "queue"],
  queued: ["queue"],
};

/** Crude stemmer — enough to fold plurals and -ing/-ed onto one form. */
export function stem(w: string): string {
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith("es") && !w.endsWith("ses")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .split(/[^a-z0-9{}_]+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .map(stem);
}

/** Query tokens, each with its synonyms folded in at a lower weight. */
function expand(query: string): Map<string, number> {
  const out = new Map<string, number>();
  const raw = query
    .toLowerCase()
    .replace(/[’']/g, "")
    .split(/[^a-z0-9{}_]+/)
    .filter((w) => w && !STOPWORDS.has(w));
  for (const w of raw) {
    const s = stem(w);
    out.set(s, Math.max(out.get(s) ?? 0, 1));
    for (const syn of SYNONYMS[w] ?? SYNONYMS[s] ?? []) {
      const t = stem(syn);
      if (!out.has(t)) out.set(t, 0.5);
    }
  }
  return out;
}

interface Indexed {
  article: Article;
  title: Set<string>;
  keywords: Set<string>;
  keywordPhrases: string[];
  summary: Set<string>;
  body: Set<string>;
}

let INDEX: Indexed[] | null = null;
function index(): Indexed[] {
  return (INDEX ??= ARTICLES.map((article) => ({
    article,
    title: new Set(tokenize(article.title)),
    keywords: new Set(article.keywords.flatMap(tokenize)),
    // A phrase of only filler words ("what is") would match any question.
    keywordPhrases: article.keywords
      .filter((k) => k.includes(" ") && tokenize(k).length > 0)
      .map((k) => k.toLowerCase()),
    summary: new Set(tokenize(article.summary)),
    body: new Set(article.body.flatMap((b) => tokenize(blockText(b)))),
  })));
}

export interface SearchHit {
  article: Article;
  score: number;
}

/** Articles ranked by relevance to `query`; empty for an empty query. */
export function searchArticles(query: string, limit = 8): SearchHit[] {
  const terms = expand(query);
  if (terms.size === 0) return [];
  const q = query.toLowerCase();

  const hits: SearchHit[] = [];
  for (const doc of index()) {
    let score = 0;
    for (const [t, w] of terms) {
      if (doc.title.has(t)) score += 6 * w;
      if (doc.keywords.has(t)) score += 5 * w;
      if (doc.summary.has(t)) score += 2 * w;
      if (doc.body.has(t)) score += 1 * w;
      // Prefix match, so typing "follo" or "keyw" already finds something.
      else if (t.length >= 3 && w === 1 && [...doc.title].some((x) => x.startsWith(t))) score += 2;
    }
    // A whole phrase from the keyword list ("message requests", "not working")
    // is much stronger evidence than its words separately.
    for (const phrase of doc.keywordPhrases) if (q.includes(phrase)) score += 8;
    if (score > 0) hits.push({ article: doc.article, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

export interface Answer {
  article: Article;
  /** The passage that best answers the question, as plain text. */
  snippet: string;
  related: Article[];
}

/** Below this, the best match is a guess — better to say so. */
export const CONFIDENT_SCORE = 6;

/**
 * The assistant's reply to a question: the best article, the one passage in it
 * that most overlaps the question, and a couple of runners-up. Null when
 * nothing is a convincing match.
 */
export function answerQuestion(question: string): Answer | null {
  const hits = searchArticles(question, 4);
  if (hits.length === 0 || hits[0].score < CONFIDENT_SCORE) return null;

  const { article } = hits[0];
  return {
    article,
    snippet: bestPassage(article, question),
    related: hits.slice(1, 3).filter((h) => h.score >= CONFIDENT_SCORE / 2).map((h) => h.article),
  };
}

/** The block (with its heading, if any) sharing the most words with the question. */
export function bestPassage(article: Article, question: string): string {
  const terms = expand(question);
  let best = { score: -1, text: article.summary };
  let heading = "";

  article.body.forEach((b: Block, i) => {
    if ("h" in b) {
      heading = b.h;
      return;
    }
    const text = blockText(b);
    const words = new Set(tokenize(heading + " " + text));
    let hit = 0;
    for (const [t, w] of terms) if (words.has(t)) hit += w;
    // Density, not raw overlap, or a long list of edge cases always beats the
    // short paragraph that actually answers. Earlier blocks win ties — they're
    // usually the direct answer, later ones the asides.
    const score = hit > 0 ? hit / Math.sqrt(words.size) - i * 0.001 : 0;
    if (score > best.score) best = { score, text: "steps" in b || "list" in b ? listSnippet(b) : text };
  });

  return best.score > 0 ? truncateAtSentence(best.text, 320) : article.summary;
}

function listSnippet(b: Block): string {
  const items = ("steps" in b ? b.steps : "list" in b ? b.list : []).map((s) => blockText({ p: s }));
  return items.map((s, i) => ("steps" in b ? `${i + 1}. ` : "• ") + s).join("\n");
}

function truncateAtSentence(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("\n"));
  return (stop > max * 0.5 ? cut.slice(0, stop + 1) : cut.trimEnd() + "…").trim();
}
