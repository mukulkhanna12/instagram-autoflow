/**
 * Optional per-reel comment filter.
 *
 * A reel can be left open — every comment triggers the flow — or narrowed to a
 * list of keywords, so only people who actually asked for the thing get a public
 * reply and a DM. Stored as one comma-separated string per automation; empty
 * means "no filter".
 *
 * Matching is substring, case-insensitive: keyword `prompt` matches "prompt",
 * "PROMPT", "send me the prompt pls" and "prompts". That's deliberate — people
 * type sentences around the word, and a missed match costs a lead.
 */

/** Split the stored string into trimmed, non-empty keywords. */
export function parseKeywords(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

/**
 * Should this comment trigger the automation?
 *
 * No keywords configured → everything triggers. Keywords configured → the
 * comment must contain at least one. Fails closed: if keywords are set but
 * Instagram sent us no comment text, nothing is sent, because we can't confirm
 * the person asked for it.
 */
export function commentMatchesKeywords(
  commentText: string | null | undefined,
  raw: string | null | undefined
): boolean {
  const keywords = parseKeywords(raw);
  if (keywords.length === 0) return true;

  const text = (commentText ?? "").toLowerCase();
  if (!text.trim()) return false;

  return keywords.some((k) => text.includes(k.toLowerCase()));
}
