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

import { expiryLabel, formatExpiry, isInviteExpiryHours, renderInviteEmail } from "@/lib/invites";

describe("invite expiry", () => {
  it("offers 24 hours, 3 days and 7 days only", () => {
    expect([24, 72, 168].every(isInviteExpiryHours)).toBe(true);
    expect(isInviteExpiryHours(1)).toBe(false);
    expect(expiryLabel(24)).toBe("in 24 hours");
    expect(expiryLabel(72)).toBe("in 3 days");
  });

  it("words the expiry in the inviter's timezone, falling back to UTC", () => {
    const at = new Date("2026-10-04T00:36:00Z");
    expect(formatExpiry(at, "Asia/Kolkata")).toContain("6:06");
    expect(formatExpiry(at, "Asia/Kolkata")).toContain("(Asia/Kolkata)");
    expect(formatExpiry(at, "Not/AZone")).toContain("(UTC)");
    expect(formatExpiry(at)).toContain("12:36");
  });
});

describe("invite email", () => {
  const mail = renderInviteEmail({
    to: "sam@example.com",
    url: "https://app.example/invite/abc",
    workspaceName: "Brand <Co>",
    inviter: { name: "Mukul", email: "m@example.com" },
    expires: "Sat, 4 Oct, 6:06 am (Asia/Kolkata) · in 7 days",
  });
  it("names who invited them, the workspace, the link and the expiry", () => {
    expect(mail.subject).toBe("Mukul invited you to join Brand <Co> on AutoFlow");
    expect(mail.html).toContain("https://app.example/invite/abc");
    expect(mail.html).toContain("Expires Sat, 4 Oct");
    expect(mail.text).toContain("expires Sat, 4 Oct");
  });
  it("escapes names in the HTML", () => {
    expect(mail.html).toContain("Brand &lt;Co&gt;");
    expect(mail.html).not.toContain("Brand <Co>");
  });
});
