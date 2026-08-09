/**
 * Link buttons on the final message.
 *
 * Instagram's button template allows **at most three** buttons, so that ceiling
 * is enforced here rather than left to the API to reject:
 * https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/button-template/
 *
 * Buttons live in `detailsButtons` as [{ title, url }]. Automations written
 * before that column existed only have the single-button `detailsButtonText` /
 * `detailsUrl` pair, so reads fall back to those — meaning an untouched reel
 * keeps sending exactly the button it sent before.
 */

export const MAX_BUTTONS = 3;

export interface DetailsButton {
  title: string;
  url: string;
}

/**
 * One-click preset for the YouTube channel. `sub_confirmation=1` makes YouTube
 * pop the subscribe dialog on arrival instead of just landing on the channel.
 *
 * The title is kept short on purpose. Instagram's button-template docs state no
 * title limit, but the Messenger template it derives from caps titles at 20
 * characters, so staying under that is the safe bet.
 */
export const YOUTUBE_SUBSCRIBE_BUTTON: DetailsButton = {
  title: "Subscribe on YT",
  url: "https://www.youtube.com/@mkexploress?sub_confirmation=1",
};

/** Compare links ignoring case and a trailing slash, so hand-edits still match. */
function sameLink(a: string, b: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\/+$/, "");
  return norm(a) === norm(b);
}

/** Is `preset` already one of these buttons? Matched on URL, not label. */
export function hasPresetButton(buttons: DetailsButton[], preset: DetailsButton): boolean {
  return buttons.some((b) => sameLink(b.url, preset.url));
}

/**
 * Add the preset if it is missing, remove it if it is there — the single
 * click that both sets and clears it. Adding past the ceiling is a no-op, so
 * callers can disable the control instead of silently dropping a button.
 */
export function togglePresetButton(
  buttons: DetailsButton[],
  preset: DetailsButton
): DetailsButton[] {
  if (hasPresetButton(buttons, preset)) {
    return buttons.filter((b) => !sameLink(b.url, preset.url));
  }
  if (buttons.length >= MAX_BUTTONS) return buttons;
  return [...buttons, { ...preset }];
}

/** Shape of the fields this module reads. */
interface ButtonSource {
  detailsButtonEnabled: boolean;
  detailsButtons: unknown;
  detailsButtonText: string;
  detailsUrl: string;
}

/**
 * Coerce whatever is in the Json column into well-formed buttons. Anything
 * malformed, untitled or without a link is dropped rather than sent — a button
 * that goes nowhere is worse than no button.
 */
export function parseButtons(raw: unknown): DetailsButton[] {
  if (!Array.isArray(raw)) return [];

  const out: DetailsButton[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { title, url } = item as Record<string, unknown>;
    if (typeof title !== "string" || typeof url !== "string") continue;

    const t = title.trim();
    const u = url.trim();
    if (!t || !u) continue;

    out.push({ title: t, url: u });
    if (out.length === MAX_BUTTONS) break;
  }
  return out;
}

/**
 * The buttons to actually send with the final message. Empty means send plain
 * text — either the toggle is off, or nothing usable is configured.
 */
export function resolveDetailsButtons(a: ButtonSource): DetailsButton[] {
  if (!a.detailsButtonEnabled) return [];

  const configured = parseButtons(a.detailsButtons);
  if (configured.length > 0) return configured;

  // Legacy single-button row.
  const title = a.detailsButtonText?.trim();
  const url = a.detailsUrl?.trim();
  return title && url ? [{ title, url }] : [];
}
