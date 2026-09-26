import { describe, it, expect } from "vitest";
import { hashInviteToken, inviteStatus, newInviteToken } from "@/lib/invites";

const day = 24 * 60 * 60 * 1000;
const now = new Date("2026-09-26T12:00:00Z");

describe("inviteStatus", () => {
  const base = { acceptedAt: null, revokedAt: null, expiresAt: new Date(now.getTime() + day) };

  it("is pending while live", () => expect(inviteStatus(base, now)).toBe("pending"));
  it("expires", () => expect(inviteStatus({ ...base, expiresAt: new Date(now.getTime() - 1) }, now)).toBe("expired"));
  it("accepted and revoked win over expiry", () => {
    const old = new Date(now.getTime() - day);
    expect(inviteStatus({ ...base, expiresAt: old, acceptedAt: old }, now)).toBe("accepted");
    expect(inviteStatus({ ...base, expiresAt: old, revokedAt: old }, now)).toBe("revoked");
  });
});

describe("invite tokens", () => {
  it("are long, URL-safe and unique", () => {
    const a = newInviteToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(newInviteToken()).not.toBe(a);
  });
  it("are stored only as a stable hash", () => {
    const t = newInviteToken();
    expect(hashInviteToken(t)).toBe(hashInviteToken(t));
    expect(hashInviteToken(t)).not.toContain(t);
    expect(hashInviteToken(t)).toMatch(/^[0-9a-f]{64}$/);
  });
});
