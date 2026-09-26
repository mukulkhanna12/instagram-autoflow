/**
 * Ready-made wording for each DM in a flow, offered under "Use template" in
 * the one-page trigger editor. Picking one fills the message and its button;
 * the link itself always stays the user's to paste.
 *
 * Button labels stay within 20 characters — see BUTTON_TITLE_MAX in
 * lib/playbooks.ts for why.
 */

export interface DmSuggestion {
  name: string;
  text: string;
  button: string;
}

export const OPENER_SUGGESTIONS: DmSuggestion[] = [
  {
    name: "Friendly check-in",
    text: "Hey {{first_name}} 👋 Thanks for the comment!\n\nTap below and I'll send it straight over.",
    button: "Send it 📩",
  },
  {
    name: "Follow check first",
    text: "Hey {{first_name}} 👋\n\nQuick check before I share the link — are you following this page? 😊",
    button: "Yes, I'm following",
  },
  {
    name: "Excited",
    text: "Omg hiii {{first_name}} 🤩 You're going to love this.\n\nReady?",
    button: "I'm ready!",
  },
  {
    name: "Short & sweet",
    text: "Hey {{first_name}}! Here's what you asked for 👇",
    button: "Show me",
  },
  {
    name: "Personal touch",
    text: "Hi {{first_name}} — I read every comment, so thank you 🙏\n\nI put this together for people like you. Want it?",
    button: "Yes please",
  },
];

export const FOLLOW_SUGGESTIONS: DmSuggestion[] = [
  {
    name: "Polite ask",
    text: "Almost there! 🙏 Follow the page first, then tap below and I'll send it over.",
    button: "I've followed ✓",
  },
  {
    name: "Playful",
    text: "Psst… this one's for followers only 🤫\n\nHit Follow on my profile, then tap below!",
    button: "Done, I followed!",
  },
  {
    name: "Value first",
    text: "I share stuff like this every week — follow so you don't miss the next one 🙌\n\nThen tap below to unlock this.",
    button: "Unlock it 🔓",
  },
];

export const PAYOFF_SUGGESTIONS: DmSuggestion[] = [
  {
    name: "Welcome + link",
    text: "Hey! Thanks for asking 😊 Here's the link you requested 👇",
    button: "Open link",
  },
  {
    name: "Product link",
    text: "Here's the product link! 💞 Use code INSTA20 for 20% off your first order.",
    button: "Shop now",
  },
  {
    name: "Simple link",
    text: "Here you go! ✨",
    button: "Click here",
  },
  {
    name: "Affiliate link",
    text: "Thanks for your interest! 🎉 I earn a small commission if you purchase through this link, at no extra cost to you.",
    button: "Get it here",
  },
  {
    name: "Download link",
    text: "Your free guide is ready! 📚 Enjoy, and let me know what you think!",
    button: "Download",
  },
  {
    name: "Booking link",
    text: "Let's do it! 📅 Pick any time that works for you.",
    button: "Book a time",
  },
  {
    name: "Watch the video",
    text: "Here's the full video 🎬 Subscribe if you want more like it!",
    button: "Watch now",
  },
];

export const REPLY_SUGGESTIONS = [
  "Sent you a DM! 📩",
  "Check your inbox 👀",
  "Just DM'd it to you 🙌",
  "It's in your DMs ✨",
  "Sent! Enjoy 🎉",
  "Check your messages 💌",
];

export const KEYWORD_SUGGESTIONS = ["link", "prompt", "free", "guide", "price", "code", "info"];
