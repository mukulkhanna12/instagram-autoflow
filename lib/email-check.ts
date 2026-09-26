/**
 * Friendly email checking for the login box: a plain-words problem (or none),
 * and a "did you mean" for common domain typos. Pure, and tested.
 */

const COMMON = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "live.com", "proton.me", "rediffmail.com"];

// Frequent slips people make typing the common domains.
const TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gamil.com": "gmail.com", "gmail.co": "gmail.com",
  "gmail.con": "gmail.com", "gmal.com": "gmail.com", "gnail.com": "gmail.com", "gmaill.com": "gmail.com",
  "yahooo.com": "yahoo.com", "yaho.com": "yahoo.com", "yahoo.co": "yahoo.com",
  "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmail.co": "hotmail.com",
  "outlok.com": "outlook.com", "outlook.co": "outlook.com", "iclod.com": "icloud.com", "icloud.co": "icloud.com",
};

const VALID = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export function isValidEmail(v: string): boolean {
  return VALID.test(v.trim());
}

/** What's wrong, in plain words — or null when it looks right. */
export function emailProblem(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "Enter your email address.";
  if (/\s/.test(v)) return "Email addresses can't have spaces.";
  const at = v.split("@").length - 1;
  if (at === 0) return "Add an @ — like name@gmail.com.";
  if (at > 1) return "There's more than one @ in there.";
  const [user, domain] = v.split("@");
  if (!user) return "Add your name before the @.";
  if (!domain) return "Add the part after @ — like gmail.com.";
  if (!domain.includes(".")) return `Add the ending — like ${domain}.com.`;
  if (!VALID.test(v)) return "That doesn't look like a complete email address.";
  return null;
}

/** "Did you mean …?" for a domain typo, or null. */
export function emailSuggestion(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  const at = v.lastIndexOf("@");
  if (at < 1) return null;
  const domain = v.slice(at + 1);
  if (!domain || COMMON.includes(domain)) return null;
  const fix = TYPOS[domain];
  return fix ? `${v.slice(0, at)}@${fix}` : null;
}
