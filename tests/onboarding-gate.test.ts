import { describe, it, expect } from "vitest";
import { shouldForceOnboarding } from "@/lib/onboarding";

const fresh = { onboardedAt: null };
const done = { onboardedAt: new Date() };

describe("shouldForceOnboarding", () => {
  it("sends a brand-new owner with no Instagram to onboarding", () => {
    expect(shouldForceOnboarding(fresh, { hasInstagram: false, role: "owner", workspaceCount: 1 })).toBe(true);
  });

  it("leaves anyone who finished onboarding or connected Instagram alone", () => {
    expect(shouldForceOnboarding(done, { hasInstagram: false, role: "owner", workspaceCount: 1 })).toBe(false);
    expect(shouldForceOnboarding(fresh, { hasInstagram: true, role: "owner", workspaceCount: 1 })).toBe(false);
  });

  it("never traps members — the owner connects Instagram", () => {
    expect(shouldForceOnboarding(fresh, { hasInstagram: false, role: "member", workspaceCount: 1 })).toBe(false);
  });

  it("doesn't trap someone who joined a team and then made their own empty workspace", () => {
    expect(shouldForceOnboarding(fresh, { hasInstagram: false, role: "owner", workspaceCount: 4 })).toBe(false);
  });
});
