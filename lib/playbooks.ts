/**
 * Playbooks — ready-made reel automations.
 *
 * Each one pre-fills every message in the flow (public replies, greeting, the
 * follow gate, the final message) around one keyword, so setting a reel up is
 * "pick a playbook, paste your link, done". The only thing a playbook can't
 * know is where the link points.
 *
 * Every playbook runs on the same engine as a hand-built reel: comment →
 * public reply → greeting DM → follow check → final message with link buttons.
 * Nothing here promises a step the engine doesn't have (story replies, DM
 * keywords, email capture) — those would need engine work first.
 *
 * Pure data and pure functions: imported by the Playbooks page and by the
 * apply route, so it must not touch the database.
 */
import { MAX_BUTTONS, type DetailsButton } from "./buttons";

export type PlaybookCategory = "resources" | "sell" | "grow" | "book" | "niche";

export const PLAYBOOK_CATEGORIES: Array<{ id: PlaybookCategory; label: string; blurb: string }> = [
  { id: "resources", label: "Free resources", blurb: "Hand out a guide, checklist or template — the classic lead magnet." },
  { id: "sell", label: "Sell & earn", blurb: "Turn \"where do I get this?\" comments into clicks and sales." },
  { id: "grow", label: "Grow & engage", blurb: "Move viewers onto your YouTube, newsletter or next reel." },
  { id: "book", label: "Book & launch", blurb: "Fill calls, webinars and client slots straight from the comments." },
  { id: "niche", label: "Creator niches", blurb: "Made for travel, food, fitness, photo and AI creators." },
];

/**
 * Instagram's button template states no title limit, but the Messenger
 * template it derives from caps titles at 20 characters (see lib/buttons.ts).
 */
export const BUTTON_TITLE_MAX = 20;

export interface Playbook {
  id: string;
  category: PlaybookCategory;
  /** Shown in the "Most popular" row as well as its own category. */
  featured?: boolean;
  emoji: string;
  title: string;
  /** One line under the title: the trigger and the payoff. */
  pitch: string;
  /** The word people comment, as displayed. Always the first of `keywords`. */
  keyword: string;
  /** Extra words that also trigger it — matching is substring, so keep them distinctive. */
  altKeywords?: string[];
  /** What they're getting, used inside the follow-gate wording ("…and the guide is yours"). */
  noun: string;
  /** A made-up commenter for the preview card. */
  sample: { handle: string; comment: string };
  /** Three public replies, rotated at random so they don't read as a bot. */
  replies: [string, string, string];
  greeting: string;
  greetingButton: string;
  payoff: string;
  /** The final button's default label, and what the link box should ask for. */
  link: { title: string; placeholder: string; hint: string };
  /** Where the link usually points — shown as app chips on the card. */
  worksWith: string[];
}

export const PLAYBOOKS: Playbook[] = [
  // ── Free resources ────────────────────────────────────────────────
  {
    id: "freebie-drop",
    category: "resources",
    featured: true,
    emoji: "🎁",
    title: "Freebie drop",
    pitch: "They comment FREE → your guide lands in their DMs.",
    keyword: "FREE",
    noun: "freebie",
    sample: { handle: "fitcoach.mike", comment: "FREE please 🙏" },
    replies: ["Check your DMs 🎁", "Sent! It's in your inbox ✨", "Just dropped it in your DMs 📩"],
    greeting: "Hey {{first_name}} 👋 Thanks for commenting!\n\nYour free guide is ready — tap below and I'll send it over.",
    greetingButton: "Send it 🎁",
    payoff: "Here it is 🎉 Enjoy, and let me know what you think!",
    link: { title: "Get the guide", placeholder: "https://drive.google.com/…", hint: "Your PDF, Google Doc or Notion page." },
    worksWith: ["Google Docs", "Notion", "PDF"],
  },
  {
    id: "checklist",
    category: "resources",
    emoji: "✅",
    title: "The checklist",
    pitch: "Comment CHECKLIST → a step-by-step list they can save.",
    keyword: "CHECKLIST",
    noun: "checklist",
    sample: { handle: "tidy.tara", comment: "CHECKLIST!! need this" },
    replies: ["Checklist is in your DMs ✅", "Sent! Go tick some boxes 📋", "Just DM'd it to you 🙌"],
    greeting: "Hey {{first_name}}! ✅\n\nThe full checklist is ready for you — tap below to grab it.",
    greetingButton: "Get checklist",
    payoff: "Here's your checklist 📋 Save it, screenshot it, tick it off!",
    link: { title: "Open checklist", placeholder: "https://…", hint: "Link to the checklist (Doc, PDF, Notion)." },
    worksWith: ["Google Docs", "Notion", "PDF"],
  },
  {
    id: "template-drop",
    category: "resources",
    emoji: "🧩",
    title: "Template drop",
    pitch: "Comment TEMPLATE → your Notion or Canva template, duplicated in one tap.",
    keyword: "TEMPLATE",
    noun: "template",
    sample: { handle: "notion.nerd", comment: "TEMPLATE pls 😍" },
    replies: ["Template sent 🧩", "Check your DMs — it's there!", "Sent it over ✨"],
    greeting: "Hey {{first_name}} 👋\n\nWant the exact template from the reel? Tap below and it's yours.",
    greetingButton: "Yes please",
    payoff: "Here's the template 🧩 Hit \"Duplicate\" to make it yours.",
    link: { title: "Get template", placeholder: "https://notion.so/… or https://canva.com/…", hint: "The shareable Notion / Canva link." },
    worksWith: ["Notion", "Canva"],
  },
  {
    id: "mini-course",
    category: "resources",
    emoji: "🎓",
    title: "Free mini-course",
    pitch: "Comment LEARN → free lessons that warm them up for your paid offer.",
    keyword: "LEARN",
    noun: "course",
    sample: { handle: "curious.chris", comment: "I want to LEARN this" },
    replies: ["Lesson 1 is in your DMs 🎓", "Sent! Class is in session 📚", "Just DM'd you the course ✨"],
    greeting: "Love that you want to learn, {{first_name}}! 🎓\n\nMy free mini-course walks you through it step by step. Ready?",
    greetingButton: "Start learning",
    payoff: "You're in 🎉 Start with lesson 1 — it takes 5 minutes.",
    link: { title: "Start course", placeholder: "https://…", hint: "Course page, playlist or email-course signup." },
    worksWith: ["YouTube", "Teachable", "Kajabi"],
  },

  // ── Sell & earn ───────────────────────────────────────────────────
  {
    id: "link-in-dms",
    category: "sell",
    featured: true,
    emoji: "🔗",
    title: "Link in DMs",
    pitch: "The classic. Comment LINK → the link, straight to their inbox.",
    keyword: "LINK",
    noun: "link",
    sample: { handle: "mia.styles", comment: "Need the LINK please!" },
    replies: ["Sent you the link 📩", "Check your DMs 🔗", "It's in your inbox ✨"],
    greeting: "Hey {{first_name}} 👋\n\nHere's what you asked for — tap below and I'll send the link.",
    greetingButton: "Send the link",
    payoff: "Here you go 🔗 Enjoy!",
    link: { title: "Open link", placeholder: "https://…", hint: "Wherever you want them to land." },
    worksWith: ["Any link"],
  },
  {
    id: "secret-discount",
    category: "sell",
    featured: true,
    emoji: "🤫",
    title: "Secret discount",
    pitch: "Comment CODE → an exclusive code that only commenters get.",
    keyword: "CODE",
    altKeywords: ["discount"],
    noun: "code",
    sample: { handle: "deal.hunter", comment: "Drop the CODE 👀" },
    replies: ["Your code is in your DMs 🤫", "Sent! Don't share it 😉", "Check your inbox 🎟️"],
    greeting: "Psst {{first_name}} 🤫\n\nI've got a discount code just for people who comment. Want it?",
    greetingButton: "Reveal my code",
    payoff: "Here's your code: SAVE20 🎟️\n\nUse it at checkout — it won't last forever!",
    link: { title: "Shop now", placeholder: "https://yourstore.com/…", hint: "Store link. Edit SAVE20 in the message to your real code." },
    worksWith: ["Shopify", "Etsy", "Any store"],
  },
  {
    id: "shop-the-look",
    category: "sell",
    emoji: "🛍️",
    title: "Shop the look",
    pitch: "Comment SHOP → every piece from the reel, via your affiliate links.",
    keyword: "SHOP",
    noun: "links",
    sample: { handle: "shopper.sam", comment: "SHOP! where's that jacket from" },
    replies: ["All the links are in your DMs 🛍️", "Sent you everything 💫", "Check your inbox 👗"],
    greeting: "Hey {{first_name}}! 🛍️\n\nWant every piece from this look? Tap below.",
    greetingButton: "Show me",
    payoff: "Here's the full look 😍 Happy shopping!",
    link: { title: "Shop the look", placeholder: "https://shopltk.com/… or amazon storefront", hint: "LTK, ShopMy, Amazon storefront or product link." },
    worksWith: ["LTK", "ShopMy", "Amazon"],
  },
  {
    id: "price-list",
    category: "sell",
    emoji: "💸",
    title: "Price check",
    pitch: "Comment PRICE → your prices and packages, no awkward back-and-forth.",
    keyword: "PRICE",
    altKeywords: ["cost", "how much"],
    noun: "pricing",
    sample: { handle: "curious.client", comment: "What's the PRICE?" },
    replies: ["Prices sent to your DMs 💸", "Check your inbox for the details 📩", "Just DM'd you everything ✨"],
    greeting: "Hey {{first_name}} 👋 Thanks for asking!\n\nTap below and I'll send you all the prices and packages.",
    greetingButton: "See prices",
    payoff: "Here's everything 💸 Any questions, just reply here!",
    link: { title: "View pricing", placeholder: "https://…/pricing", hint: "Pricing page or menu." },
    worksWith: ["Website", "Notion", "PDF"],
  },
  {
    id: "early-access",
    category: "sell",
    emoji: "🚀",
    title: "Early access drop",
    pitch: "Comment DROP → first dibs on your launch before it goes public.",
    keyword: "DROP",
    noun: "early access",
    sample: { handle: "hyped.hannah", comment: "DROP 🔥🔥" },
    replies: ["You're on the list 🚀", "Early access sent to your DMs 🔥", "Check your inbox — you're first!"],
    greeting: "You're early, {{first_name}} 🚀\n\nCommenters get in before everyone else. Want your early access link?",
    greetingButton: "Get early access",
    payoff: "You're in 🔥 This link opens before the public launch — don't sleep on it!",
    link: { title: "Shop early", placeholder: "https://…", hint: "Private launch / pre-order link." },
    worksWith: ["Shopify", "Gumroad"],
  },
  {
    id: "amazon-finds",
    category: "sell",
    emoji: "📦",
    title: "Amazon finds",
    pitch: "Comment FINDS → the full list of products from the reel.",
    keyword: "FINDS",
    noun: "list",
    sample: { handle: "home.hacks", comment: "FINDS pls!" },
    replies: ["The list is in your DMs 📦", "Sent! Happy shopping 🛒", "Check your inbox ✨"],
    greeting: "Hey {{first_name}}! 📦\n\nWant the full list of finds from this reel? Tap below.",
    greetingButton: "Send the list",
    payoff: "Here are all my finds 🛒 Everything's linked!",
    link: { title: "See the finds", placeholder: "https://amazon.com/shop/…", hint: "Amazon storefront or idea list." },
    worksWith: ["Amazon"],
  },

  {
    id: "buy-now",
    category: "sell",
    emoji: "🛒",
    title: "Buy it now",
    pitch: "Comment BUY or ORDER → straight to checkout. The highest-intent words there are.",
    keyword: "BUY",
    altKeywords: ["order"],
    noun: "checkout link",
    sample: { handle: "love.it", comment: "How do I BUY this?" },
    replies: ["Checkout link sent 🛒", "Check your DMs — it's all there!", "Sent! Grab it before it's gone ✨"],
    greeting: "Hey {{first_name}} 🛒 Great choice!\n\nTap below and I'll send you the checkout link.",
    greetingButton: "Send the link",
    payoff: "Here's the checkout 🛒 Stock is limited — any questions, just reply here!",
    link: { title: "Buy now", placeholder: "https://yourstore.com/products/…", hint: "Product or checkout page." },
    worksWith: ["Shopify", "Etsy", "Gumroad"],
  },
  {
    id: "size-guide",
    category: "sell",
    emoji: "📏",
    title: "Size guide",
    pitch: "Comment SIZE → size chart and fit notes, so they order the right one.",
    keyword: "SIZE",
    altKeywords: ["fit"],
    noun: "size guide",
    sample: { handle: "petite.pia", comment: "What SIZE are you wearing?" },
    replies: ["Size guide is in your DMs 📏", "Sent! Find your perfect fit ✨", "Check your inbox 👗"],
    greeting: "Hey {{first_name}}! 📏\n\nWant the size chart and how it fits? Tap below.",
    greetingButton: "Find my size",
    payoff: "Here's the size guide 📏 I'm wearing a size S — it fits true to size.",
    link: { title: "Size guide", placeholder: "https://…/size-guide", hint: "Size chart page. Edit the fit note in the message." },
    worksWith: ["Shopify", "Website"],
  },

  // ── Grow & engage ─────────────────────────────────────────────────
  {
    id: "full-video",
    category: "grow",
    featured: true,
    emoji: "▶️",
    title: "Watch the full video",
    pitch: "Comment VIDEO → the long version on YouTube. Reels in, subscribers out.",
    keyword: "VIDEO",
    altKeywords: ["youtube"],
    noun: "video",
    sample: { handle: "viewer.vic", comment: "Need the full VIDEO" },
    replies: ["Full video is in your DMs ▶️", "Sent! Grab some popcorn 🍿", "Check your inbox 🎬"],
    greeting: "Hey {{first_name}} 👋\n\nThe full video goes way deeper. Want the link?",
    greetingButton: "Watch it",
    payoff: "Here's the full video 🎬 Subscribe if you want more like it!",
    link: { title: "Watch on YouTube", placeholder: "https://youtu.be/…", hint: "The YouTube video (or podcast episode)." },
    worksWith: ["YouTube", "Spotify"],
  },
  {
    id: "part-two",
    category: "grow",
    emoji: "2️⃣",
    title: "Part 2 unlock",
    pitch: "Comment PART2 → the next episode. Builds a series people follow for.",
    keyword: "PART2",
    altKeywords: ["part 2"],
    noun: "part 2",
    sample: { handle: "binge.ben", comment: "PART2 NOW 😭" },
    replies: ["Part 2 is in your DMs 👀", "Sent! You're gonna love this one", "Check your inbox 🍿"],
    greeting: "You want part 2, {{first_name}}? 👀\n\nTap below and I'll send it over.",
    greetingButton: "Unlock part 2",
    payoff: "Here's part 2 🍿 Part 3 drops soon — you know where to find me!",
    link: { title: "Watch part 2", placeholder: "https://instagram.com/reel/…", hint: "Link to the next reel, video or post." },
    worksWith: ["Instagram", "YouTube"],
  },
  {
    id: "giveaway",
    category: "grow",
    emoji: "🎉",
    title: "Giveaway entry",
    pitch: "Comment GIVEAWAY → entry link. The follow gate makes every entry a follower.",
    keyword: "GIVEAWAY",
    noun: "entry link",
    sample: { handle: "lucky.lena", comment: "GIVEAWAY 🙋‍♀️" },
    replies: ["Entry link sent 🎉", "Check your DMs to enter 🍀", "You're almost in — see your inbox!"],
    greeting: "Good luck, {{first_name}}! 🍀\n\nTap below to finish your entry.",
    greetingButton: "Enter now",
    payoff: "Last step 🎉 Fill this in and you're entered. Winner announced soon!",
    link: { title: "Enter giveaway", placeholder: "https://forms.gle/…", hint: "Entry form. Check Instagram's promotion rules." },
    worksWith: ["Google Forms", "Typeform"],
  },
  {
    id: "newsletter",
    category: "grow",
    emoji: "💌",
    title: "Newsletter signup",
    pitch: "Comment JOIN → your newsletter. Own your audience, not just rent it.",
    keyword: "JOIN",
    noun: "invite",
    sample: { handle: "reader.rae", comment: "JOIN ✋" },
    replies: ["Invite sent 💌", "Check your DMs to join!", "It's in your inbox ✨"],
    greeting: "Hey {{first_name}}! 💌\n\nEvery week I send the stuff I don't post here. Want in?",
    greetingButton: "I'm in",
    payoff: "Welcome aboard 💌 Pop your email in and the first one's on its way.",
    link: { title: "Join free", placeholder: "https://…substack.com", hint: "Newsletter signup page." },
    worksWith: ["Substack", "Beehiiv", "Kit"],
  },
  {
    id: "waitlist",
    category: "grow",
    emoji: "⏳",
    title: "Waitlist builder",
    pitch: "Comment WAITLIST → your signup link. Launch to a warm list.",
    keyword: "WAITLIST",
    noun: "waitlist link",
    sample: { handle: "early.bird", comment: "Add me to the WAITLIST!" },
    replies: ["Waitlist link sent ⏳", "Check your DMs — you're almost on!", "Sent it over 🙌"],
    greeting: "Yesss {{first_name}} ⏳\n\nSomething's coming and the waitlist gets it first. Want the link?",
    greetingButton: "Save my spot",
    payoff: "Here's the waitlist 🙌 Sign up and you'll hear first.",
    link: { title: "Join waitlist", placeholder: "https://…", hint: "Waitlist or pre-launch signup page." },
    worksWith: ["Tally", "Typeform", "Website"],
  },

  // ── Book & launch ─────────────────────────────────────────────────
  {
    id: "book-a-call",
    category: "book",
    featured: true,
    emoji: "📅",
    title: "Book a call",
    pitch: "Comment CALL → your Calendly. Leads book themselves.",
    keyword: "CALL",
    noun: "booking link",
    sample: { handle: "busy.brand", comment: "Can I book a CALL?" },
    replies: ["Booking link sent 📅", "Check your DMs — pick a time!", "Sent you my calendar ✨"],
    greeting: "Hey {{first_name}} 👋 Let's talk!\n\nTap below and I'll send my calendar so you can pick a time.",
    greetingButton: "Pick a time",
    payoff: "Here's my calendar 📅 Grab any slot that works for you.",
    link: { title: "Book now", placeholder: "https://calendly.com/…", hint: "Calendly, Cal.com or booking page." },
    worksWith: ["Calendly", "Cal.com"],
  },
  {
    id: "webinar",
    category: "book",
    emoji: "🎤",
    title: "Save my seat",
    pitch: "Comment WEBINAR → registration link for your live session.",
    keyword: "WEBINAR",
    altKeywords: ["seat"],
    noun: "registration link",
    sample: { handle: "want.to.learn", comment: "WEBINAR — save me a seat!" },
    replies: ["Your seat link is in your DMs 🎤", "Sent! See you live 👋", "Check your inbox 🎟️"],
    greeting: "See you there, {{first_name}}! 🎤\n\nSeats are limited — tap below to grab yours.",
    greetingButton: "Save my seat",
    payoff: "Here's the registration 🎟️ Add it to your calendar so you don't miss it!",
    link: { title: "Register now", placeholder: "https://…", hint: "Zoom, Luma or event registration link." },
    worksWith: ["Zoom", "Luma"],
  },
  {
    id: "portfolio",
    category: "book",
    emoji: "🗂️",
    title: "Show my work",
    pitch: "Comment PORTFOLIO → your best work, for brands and clients.",
    keyword: "PORTFOLIO",
    noun: "portfolio",
    sample: { handle: "potential.client", comment: "Send the PORTFOLIO" },
    replies: ["Portfolio sent 🗂️", "Check your DMs 👀", "It's in your inbox ✨"],
    greeting: "Hey {{first_name}} 👋 Thanks for your interest!\n\nTap below for my portfolio and rates.",
    greetingButton: "See my work",
    payoff: "Here's my portfolio 🗂️ If something clicks, just reply here!",
    link: { title: "View portfolio", placeholder: "https://…", hint: "Portfolio site, media kit or Behance." },
    worksWith: ["Behance", "Website", "PDF"],
  },
  {
    id: "coaching",
    category: "book",
    emoji: "💪",
    title: "Coaching spots",
    pitch: "Comment COACH → the application for your 1:1 or group program.",
    keyword: "COACH",
    noun: "application",
    sample: { handle: "ready.rita", comment: "COACH me 🙋‍♀️" },
    replies: ["Application sent 💪", "Check your DMs — spots are limited!", "Sent it over ✨"],
    greeting: "Love the energy, {{first_name}} 💪\n\nI only take a few people at a time. Want the application?",
    greetingButton: "Apply now",
    payoff: "Here's the application 📝 I read every single one.",
    link: { title: "Apply", placeholder: "https://forms.gle/… or typeform", hint: "Application form or sales page." },
    worksWith: ["Typeform", "Google Forms"],
  },

  // ── Creator niches ────────────────────────────────────────────────
  {
    id: "prompt-pack",
    category: "niche",
    featured: true,
    emoji: "🤖",
    title: "AI prompt pack",
    pitch: "Comment PROMPT → the exact prompts from the reel.",
    keyword: "PROMPT",
    noun: "prompts",
    sample: { handle: "ai.curious", comment: "PROMPT please 🙏" },
    replies: ["Prompts are in your DMs 🤖", "Sent! Go make something cool ✨", "Check your inbox 📩"],
    greeting: "Hey {{first_name}} 👋\n\nWant every prompt I used in this reel? Tap below.",
    greetingButton: "Get the prompts",
    payoff: "Here's the full prompt pack 🤖 Copy, paste, create!",
    link: { title: "Open prompts", placeholder: "https://docs.google.com/…", hint: "Your prompt doc." },
    worksWith: ["Google Docs", "Notion"],
  },
  {
    id: "ai-tools",
    category: "niche",
    emoji: "🧠",
    title: "Tool stack",
    pitch: "Comment TOOLS → every app and AI tool you used.",
    keyword: "TOOLS",
    noun: "tool list",
    sample: { handle: "build.with.bo", comment: "What TOOLS is this??" },
    replies: ["Full tool list is in your DMs 🧠", "Sent! Go build 🚀", "Check your inbox ✨"],
    greeting: "Hey {{first_name}}! 🧠\n\nHere's my whole stack — tap below for the list.",
    greetingButton: "Show the tools",
    payoff: "Here's every tool I use 🚀 Most have free plans!",
    link: { title: "See the tools", placeholder: "https://…", hint: "Tool list page or doc." },
    worksWith: ["Notion", "Website"],
  },
  {
    id: "travel-itinerary",
    category: "niche",
    emoji: "✈️",
    title: "Trip itinerary",
    pitch: "Comment TRIP → the day-by-day plan, spots and map pins.",
    keyword: "TRIP",
    altKeywords: ["itinerary"],
    noun: "itinerary",
    sample: { handle: "wander.wes", comment: "TRIP plan pls ✈️" },
    replies: ["Itinerary sent ✈️", "Check your DMs — happy travels!", "It's in your inbox 🗺️"],
    greeting: "Planning a trip, {{first_name}}? ✈️\n\nI've got the full day-by-day itinerary. Want it?",
    greetingButton: "Send itinerary",
    payoff: "Here's the full itinerary 🗺️ Save it for your trip!",
    link: { title: "Open itinerary", placeholder: "https://…", hint: "Doc, Notion page or Google Maps list." },
    worksWith: ["Google Maps", "Notion"],
  },
  {
    id: "recipe",
    category: "niche",
    emoji: "🍝",
    title: "Get the recipe",
    pitch: "Comment RECIPE → ingredients and steps, saved in their DMs.",
    keyword: "RECIPE",
    noun: "recipe",
    sample: { handle: "hungry.hugo", comment: "RECIPE 🤤" },
    replies: ["Recipe's in your DMs 🍝", "Sent! Happy cooking 👩‍🍳", "Check your inbox 🤤"],
    greeting: "Hey {{first_name}}! 🍝\n\nWant the full recipe with measurements? Tap below.",
    greetingButton: "Send recipe",
    payoff: "Here's the recipe 👩‍🍳 Tag me when you make it!",
    link: { title: "Get recipe", placeholder: "https://…", hint: "Recipe page or card." },
    worksWith: ["Website", "PDF"],
  },
  {
    id: "workout-plan",
    category: "niche",
    emoji: "🏋️",
    title: "Workout plan",
    pitch: "Comment WORKOUT → the full routine, sets and reps.",
    keyword: "WORKOUT",
    noun: "plan",
    sample: { handle: "gym.gabi", comment: "WORKOUT plan pls 💪" },
    replies: ["Plan sent 🏋️", "Check your DMs — let's go!", "It's in your inbox 💪"],
    greeting: "Let's get it, {{first_name}} 💪\n\nWant the full workout with sets and reps?",
    greetingButton: "Send the plan",
    payoff: "Here's your plan 🏋️ Save it and tag me after your first session!",
    link: { title: "Get the plan", placeholder: "https://…", hint: "Program PDF, doc or app link." },
    worksWith: ["PDF", "Google Docs"],
  },
  {
    id: "presets",
    category: "niche",
    emoji: "📸",
    title: "Preset pack",
    pitch: "Comment PRESET → your Lightroom presets or LUTs.",
    keyword: "PRESET",
    noun: "presets",
    sample: { handle: "snap.sara", comment: "PRESET?? 😍" },
    replies: ["Presets are in your DMs 📸", "Sent! Go edit something pretty ✨", "Check your inbox 🎨"],
    greeting: "Hey {{first_name}}! 📸\n\nThis is the exact edit from the reel. Want the preset?",
    greetingButton: "Get preset",
    payoff: "Here's the preset pack 🎨 Tag me in your edits!",
    link: { title: "Download", placeholder: "https://…", hint: "Download link for the presets / LUTs." },
    worksWith: ["Lightroom", "Gumroad"],
  },
  {
    id: "gear-list",
    category: "niche",
    emoji: "🎒",
    title: "Gear list",
    pitch: "Comment GEAR → camera, mic and kit you actually use.",
    keyword: "GEAR",
    noun: "gear list",
    sample: { handle: "new.creator", comment: "What GEAR do you use?" },
    replies: ["Gear list sent 🎒", "Check your DMs 🎥", "It's in your inbox ✨"],
    greeting: "Hey {{first_name}} 👋\n\nHere's everything I shoot with — tap below for the list.",
    greetingButton: "Show my gear",
    payoff: "Here's my full kit 🎥 Links included!",
    link: { title: "See the gear", placeholder: "https://kit.co/… or amazon list", hint: "Kit.co, Amazon list or doc." },
    worksWith: ["Kit.co", "Amazon"],
  },
];

export function findPlaybook(id: string): Playbook | undefined {
  return PLAYBOOKS.find((p) => p.id === id);
}

/** The comma-separated keyword string the automation stores. */
export function playbookKeywords(p: Playbook, keyword = p.keyword): string {
  const words = [keyword, ...(p.altKeywords ?? [])].map((w) => w.trim().toLowerCase()).filter(Boolean);
  return Array.from(new Set(words)).join(", ");
}

/**
 * The full set of automation fields a playbook fills in.
 *
 * `keyword` lets the user swap the trigger word (e.g. FREE → GUIDE); the
 * playbook's alternates stay alongside it. `buttons` are the final message's
 * link buttons — capped at Instagram's three; with none, the final message
 * goes out as plain text rather than with a dead button.
 */
export function playbookFields(
  p: Playbook,
  opts: { keyword?: string; buttons?: DetailsButton[] } = {}
) {
  const keyword = opts.keyword?.trim() || p.keyword;
  const buttons = (opts.buttons ?? [])
    .map((b) => ({ title: b.title.trim().slice(0, BUTTON_TITLE_MAX), url: b.url.trim() }))
    .filter((b) => b.title && b.url)
    .slice(0, MAX_BUTTONS);

  return {
    keywords: playbookKeywords(p, keyword),
    commentReplyText: p.replies[0],
    commentReplyText2: p.replies[1],
    commentReplyText3: p.replies[2],
    greetingMessage: p.greeting,
    greetingButtonText: p.greetingButton,
    followMessage: `Almost there! 🙏\n\nFollow the page first, then tap below and the ${p.noun} is yours.`,
    followButtonText: "I've followed ✓",
    followRetryMessage:
      `Hmm, I can't see your follow yet 👀\n\nTap Follow at the top of the page, give it a second, then try again — the ${p.noun} is waiting!`,
    detailsMessage: p.payoff,
    detailsButtonEnabled: buttons.length > 0,
    detailsButtons: buttons,
    // Keep the legacy single-button pair in step so old readers agree.
    detailsButtonText: buttons[0]?.title ?? p.link.title,
    detailsUrl: buttons[0]?.url ?? "",
  };
}
