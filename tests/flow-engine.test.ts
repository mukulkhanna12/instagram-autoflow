import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * The conversation state machine, driven end to end with the database and the
 * Graph API replaced by in-memory stand-ins. Everything else — the branching,
 * the counters, the personalisation, the button resolution — is the real code.
 */

// Hoisted so the vi.mock factories below can close over it.
const S = vi.hoisted(() => ({
  automations: new Map<string, any>(),
  conversations: new Map<string, any>(),
  byId: new Map<string, any>(),
  sent: [] as any[],
  profileLookups: [] as string[],
  profile: null as any,
  nextSendResult: null as any,
  seq: 0,
}));

vi.mock("@/lib/db", () => {
  const clone = (o: any) => (o == null ? o : JSON.parse(JSON.stringify(o)));
  return {
    db: {
      postAutomation: {
        async findUnique({ where }: any) {
          return clone(S.automations.get(where.id)) ?? null;
        },
        async update({ where, data }: any) {
          const a = S.automations.get(where.id);
          if (!a) throw new Error("automation not found: " + where.id);
          for (const [k, v] of Object.entries<any>(data)) {
            if (v && typeof v === "object" && "increment" in v) a[k] = (a[k] ?? 0) + v.increment;
            else a[k] = v;
          }
          return clone(a);
        },
      },
      conversation: {
        async findUnique({ where }: any) {
          const k = where.automationId_igUserId;
          return clone(S.conversations.get(`${k.automationId}|${k.igUserId}`)) ?? null;
        },
        async upsert({ where, create, update }: any) {
          const k = where.automationId_igUserId;
          const key = `${k.automationId}|${k.igUserId}`;
          let c = S.conversations.get(key);
          if (c) Object.assign(c, update);
          else {
            c = { id: `convo_${++S.seq}`, ...create };
            S.conversations.set(key, c);
            S.byId.set(c.id, c);
          }
          return clone(c);
        },
        async update({ where, data }: any) {
          const c = S.byId.get(where.id);
          if (!c) throw new Error("conversation not found: " + where.id);
          Object.assign(c, data);
          return clone(c);
        },
      },
    },
  };
});

vi.mock("@/lib/instagram", () => ({
  async sendDM(igUserId: string, to: any, message: any, accessToken: string) {
    S.sent.push({ igUserId, to, message, accessToken });
    return S.nextSendResult ?? { ok: true };
  },
  async getUserProfile(igsid: string) {
    S.profileLookups.push(igsid);
    return S.profile;
  },
}));

const { handleNewComment, handlePostback } = await import("@/lib/flow-engine");

const AUTO_ID = "auto_1";
const IG_ACCOUNT = "17841400000000000";
const SENDER = "IGSID_9999";

function seed(over: Record<string, unknown> = {}) {
  S.automations.clear();
  S.conversations.clear();
  S.byId.clear();
  S.sent.length = 0;
  S.profileLookups.length = 0;
  S.profile = null;
  S.nextSendResult = null;
  S.seq = 0;

  S.automations.set(AUTO_ID, {
    id: AUTO_ID,
    isActive: true,
    commentReplyText: "Sent it! 📩",
    greetingMessage: "Hey {{first_name}}! 👋 Tap below.",
    greetingButtonText: "Get Details →",
    followMessage: "Please follow first 🙏",
    followButtonText: "I've Followed ✓",
    followRetryMessage: "Still can't see you 👀",
    detailsMessage: "Here you go {{first_name}}! 🎉",
    detailsButtonEnabled: true,
    detailsButtons: [],
    detailsButtonText: "Visit Page 🔗",
    detailsUrl: "https://example.com/offer",
    commentsHandled: 0, greetingSent: 0, greetingClicked: 0,
    followSent: 0, followClicked: 0, detailsSent: 0, followsGained: 0,
    ...over,
  });
}

const comment = (over = {}) =>
  handleNewComment({
    automationId: AUTO_ID, commentId: "cmt_1", senderIgUserId: SENDER,
    senderUsername: "jane_doe", igUserId: IG_ACCOUNT, accessToken: "TOKEN", ...over,
  });

const tap = (payload = `CHECK_FOLLOW:${AUTO_ID}`) =>
  handlePostback({ payload, senderIgUserId: SENDER, igUserId: IG_ACCOUNT, accessToken: "TOKEN" });

const auto = () => S.automations.get(AUTO_ID)!;
const convo = () => S.conversations.get(`${AUTO_ID}|${SENDER}`)!;
const last = () => S.sent[S.sent.length - 1];
const counters = () => {
  const a = auto();
  return {
    greetingSent: a.greetingSent, greetingClicked: a.greetingClicked,
    followSent: a.followSent, followClicked: a.followClicked,
    detailsSent: a.detailsSent, followsGained: a.followsGained,
  };
};

const following = (over = {}) =>
  ({ id: SENDER, username: "jane_doe", name: "Jane Doe", is_user_follow_business: true, ...over });
const notFollowing = () => following({ is_user_follow_business: false });

beforeEach(() => seed());

describe("the full journey", () => {
  it("greets a new commenter as a private reply to their comment", async () => {
    await comment();

    expect(S.sent).toHaveLength(1);
    expect(last().to).toEqual({ commentId: "cmt_1" });
    expect(last().message.type).toBe("button");
    // Only the username is known at comment time.
    expect(last().message.text).toBe("Hey jane_doe! 👋 Tap below.");
    expect(last().message.buttons[0]).toEqual({
      kind: "postback", title: "Get Details →", payload: `CHECK_FOLLOW:${AUTO_ID}`,
    });
    expect(convo().state).toBe("greeted");
    expect(counters().greetingSent).toBe(1);
  });

  it("gates, loops, then delivers once they follow", async () => {
    await comment();

    S.profile = notFollowing();
    await tap();
    expect(last().message.text).toBe("Please follow first 🙏");
    expect(last().to).toEqual({ id: SENDER }); // a normal DM now, window is open
    expect(convo().state).toBe("follow_requested");

    await tap();
    expect(last().message.text).toBe("Still can't see you 👀");
    expect(convo().state).toBe("follow_requested");

    S.profile = following();
    await tap();
    expect(last().message.text).toBe("Here you go Jane! 🎉"); // real name known now
    expect(last().message.buttons[0]).toEqual({
      kind: "url", title: "Visit Page 🔗", url: "https://example.com/offer",
    });
    expect(convo().state).toBe("completed");
    expect(counters()).toEqual({
      greetingSent: 1, greetingClicked: 1, followSent: 2,
      followClicked: 2, detailsSent: 1, followsGained: 1,
    });
  });
});

describe("the follow gate holds", () => {
  it.each([
    ["the profile lookup fails outright", null],
    ["is_user_follow_business is missing", { id: SENDER, username: "jane_doe" }],
    ["it comes back as a truthy string rather than a boolean", { id: SENDER, is_user_follow_business: "true" }],
  ])("treats them as not following when %s", async (_label, profile) => {
    await comment();
    S.profile = profile;
    await tap();
    expect(last().message.text).toBe("Please follow first 🙏");
    expect(convo().state).toBe("follow_requested");
  });

  it("never leaks the payoff across 25 taps without following", async () => {
    await comment();
    S.profile = notFollowing();

    for (let i = 0; i < 25; i++) {
      await tap();
      expect(last().message.text).not.toContain("Here you go");
    }
    expect(convo().state).toBe("follow_requested");
  });
});

describe("someone who already follows", () => {
  it("still gets the greeting, then goes straight to the payoff on the first tap", async () => {
    await comment();
    S.profile = following();
    await tap();

    expect(last().message.text).toBe("Here you go Jane! 🎉");
    expect(convo().state).toBe("completed");
    // They didn't follow *because* of this reel, so it isn't credited.
    expect(counters().followsGained).toBe(0);
    expect(counters().followSent).toBe(0);
  });
});

describe("re-entry", () => {
  beforeEach(async () => {
    await comment();
    S.profile = following();
    await tap();
  });

  it("doesn't drag a finished person back to step one", async () => {
    const before = S.sent.length;
    await comment({ commentId: "cmt_2" });
    expect(S.sent).toHaveLength(before);
    expect(convo().state).toBe("completed");
  });

  it("resends the details rather than leaving a stale button dead", async () => {
    const before = S.sent.length;
    const countersBefore = counters();
    await tap();

    expect(S.sent).toHaveLength(before + 1);
    expect(last().message.text).toBe("Here you go Jane! 🎉");
    expect(counters()).toEqual(countersBefore); // no double-counting
  });
});

describe("commenting again before finishing", () => {
  it("re-greets against the new comment id", async () => {
    await comment();
    await comment({ commentId: "cmt_2" });

    expect(S.sent).toHaveLength(2);
    expect(last().to).toEqual({ commentId: "cmt_2" });
    expect(convo().state).toBe("greeted");
  });
});

describe("guards", () => {
  it("sends nothing for a reel that is switched off", async () => {
    seed({ isActive: false });
    await comment();
    expect(S.sent).toHaveLength(0);
  });

  it("stops mid-conversation when the reel is switched off", async () => {
    await comment();
    auto().isActive = false;
    S.profile = following();
    const before = S.sent.length;
    await tap();
    expect(S.sent).toHaveLength(before);
  });

  it("ignores a tap with no conversation behind it", async () => {
    S.profile = following();
    await tap();
    expect(S.sent).toHaveLength(0);
  });

  it.each([
    ["an unknown action", "SOMETHING_ELSE:" + AUTO_ID],
    ["no automation id", "CHECK_FOLLOW"],
    ["an automation that doesn't exist", "CHECK_FOLLOW:nope"],
  ])("ignores a payload with %s", async (_label, payload) => {
    await comment();
    const before = S.sent.length;
    await tap(payload);
    expect(S.sent).toHaveLength(before);
  });

  // Buttons already sitting in people's inboxes must keep working.
  it.each(["CONTINUE", "FOLLOWED"])("still honours the legacy %s payload", async (action) => {
    await comment();
    S.profile = following();
    await tap(`${action}:${AUTO_ID}`);
    expect(convo().state).toBe("completed");
  });
});

describe("buttons on the final message", () => {
  const complete = async (over: Record<string, unknown>) => {
    seed(over);
    await comment();
    S.profile = following();
    await tap();
    return last().message;
  };

  it("sends up to three link buttons", async () => {
    const b = [
      { title: "Website", url: "https://a.com" },
      { title: "Book a call", url: "https://b.com" },
      { title: "Instagram", url: "https://c.com" },
    ];
    const m = await complete({ detailsButtons: b });
    expect(m.buttons).toHaveLength(3);
    expect(m.buttons[0]).toEqual({ kind: "url", title: "Website", url: "https://a.com" });
  });

  it("drops a fourth rather than letting Instagram reject the send", async () => {
    const m = await complete({
      detailsButtons: [
        { title: "1", url: "https://a.com" }, { title: "2", url: "https://b.com" },
        { title: "3", url: "https://c.com" }, { title: "4", url: "https://d.com" },
      ],
    });
    expect(m.buttons).toHaveLength(3);
    expect(m.buttons.map((x: any) => x.title)).toEqual(["1", "2", "3"]);
  });

  it("falls back to the legacy single button for older rows", async () => {
    const m = await complete({ detailsButtons: [], detailsUrl: "https://legacy.com", detailsButtonText: "Old" });
    expect(m.buttons).toEqual([{ kind: "url", title: "Old", url: "https://legacy.com" }]);
  });

  it.each([
    ["the toggle is off", { detailsButtonEnabled: false, detailsButtons: [{ title: "A", url: "https://a.com" }] }],
    ["no link is configured", { detailsUrl: "", detailsButtonText: "Visit" }],
    ["the link is only whitespace", { detailsUrl: "   " }],
    ["every button is malformed", { detailsButtons: [{ title: "Broken" }], detailsUrl: "", detailsButtonText: "" }],
  ])("sends plain text when %s", async (_label, over) => {
    const m = await complete(over);
    expect(m.type).toBe("text");
    expect(m.buttons).toBeUndefined();
  });

  it("trims the url before sending", async () => {
    const m = await complete({ detailsUrl: "  https://example.com/x  " });
    expect(m.buttons[0].url).toBe("https://example.com/x");
  });
});

describe("send failures", () => {
  it("records the reason and doesn't count a failed send", async () => {
    S.nextSendResult = { ok: false, error: "(#10) Message not allowed" };
    await comment();

    expect(auto().greetingSent).toBe(0);
    expect(convo().lastError).toMatch(/Failed to send greeting DM/);
    expect(convo().lastErrorAt).toBeInstanceOf(Date);
  });

  it("clears the error once something succeeds", async () => {
    S.nextSendResult = { ok: false, error: "boom" };
    await comment();

    S.nextSendResult = { ok: true };
    S.profile = following();
    await tap();
    expect(convo().lastError).toBeNull();
  });
});
