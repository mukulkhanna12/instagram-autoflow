import { describe, it, expect, afterEach } from "vitest";
import { isFeedbackReviewer, isFeedbackStatus, isFeedbackType } from "@/lib/feedback";

describe("feedback", () => {
  afterEach(() => { delete process.env.ALLOWED_LOGIN_EMAIL; });

  it("knows its types and statuses", () => {
    expect(isFeedbackType("idea")).toBe(true);
    expect(isFeedbackType("spam")).toBe(false);
    expect(isFeedbackStatus("rewarded")).toBe(true);
    expect(isFeedbackStatus("done")).toBe(false);
  });

  it("only the app owner reviews, case-insensitively", () => {
    expect(isFeedbackReviewer("me@x.com")).toBe(false); // no owner configured
    process.env.ALLOWED_LOGIN_EMAIL = "Me@X.com";
    expect(isFeedbackReviewer("me@x.com")).toBe(true);
    expect(isFeedbackReviewer("someone@x.com")).toBe(false);
    expect(isFeedbackReviewer(null)).toBe(false);
  });
});
