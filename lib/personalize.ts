/**
 * Merge tags for message text, ManyChat-style. Authors write tokens like
 * `Hey {{first_name}} 👋` and they're filled in at send time.
 *
 * Supported: {{first_name}}, {{full_name}}, {{name}} (= first name), {{username}}.
 * Anything unknown or unavailable falls back gracefully to the username, then to
 * a friendly "there", so a message never goes out with a raw {{token}} in it.
 *
 * Note: at greeting time (a private reply to a comment) only the username is
 * known — Instagram doesn't give a display name until a conversation is open —
 * so {{first_name}} resolves to the username there and to the real name later.
 */

export interface Person {
  username?: string | null;
  name?: string | null; // full display name, when known
}

export function personalize(text: string, p: Person): string {
  const username = (p.username ?? "").trim();
  const full = (p.name ?? "").trim();
  const first = full.split(/\s+/)[0] || username || "there";
  const fullOrFallback = full || username || "there";

  return text
    .replace(/\{\{\s*first[_\s]?name\s*\}\}/gi, first)
    .replace(/\{\{\s*full[_\s]?name\s*\}\}/gi, fullOrFallback)
    .replace(/\{\{\s*name\s*\}\}/gi, first)
    .replace(/\{\{\s*username\s*\}\}/gi, username || first);
}
