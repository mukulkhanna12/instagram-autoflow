import { describe, it, expect, beforeEach, vi } from "vitest";

// lib/otp reaches the database directly, so the User table is stubbed here.
// Both "@/lib/db" and lib/otp's own "./db" resolve to the same module id, so
// this one mock covers both.
const user = {
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};
vi.mock("@/lib/db", () => ({ db: { user, loginCode: {} } }));

const { registerOrGetAccess, isApprovedEmail, isBootstrapEmail, normalizeEmail } =
  await import("@/lib/otp");

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.ALLOWED_LOGIN_EMAIL;
});

describe("normalizeEmail", () => {
  it("trims and lowercases so one person is one row", () => {
    expect(normalizeEmail("  Them@Example.COM ")).toBe("them@example.com");
  });
});

describe("the bootstrap owner", () => {
  it("is nobody when ALLOWED_LOGIN_EMAIL is unset", () => {
    expect(isBootstrapEmail("them@example.com")).toBe(false);
  });

  it("matches regardless of case or padding", () => {
    process.env.ALLOWED_LOGIN_EMAIL = "Owner@Example.com";
    expect(isBootstrapEmail(" owner@example.COM ")).toBe(true);
    expect(isBootstrapEmail("them@example.com")).toBe(false);
  });
});

describe("registerOrGetAccess", () => {
  it("registers an unknown email as pending, and emails nothing", async () => {
    user.findUnique.mockResolvedValue(null);
    user.create.mockResolvedValue({});

    expect(await registerOrGetAccess("New@Example.com")).toBe("pending");
    expect(user.create).toHaveBeenCalledWith({
      data: { email: "new@example.com", name: "AutoFlow", isApproved: false, approvedAt: null },
    });
  });

  it("keeps an existing unapproved account pending without touching the row", async () => {
    user.findUnique.mockResolvedValue({ isApproved: false });

    expect(await registerOrGetAccess("them@example.com")).toBe("pending");
    expect(user.create).not.toHaveBeenCalled();
    expect(user.update).not.toHaveBeenCalled();
  });

  it("lets an approved account through", async () => {
    user.findUnique.mockResolvedValue({ isApproved: true });

    expect(await registerOrGetAccess("them@example.com")).toBe("approved");
    expect(user.update).not.toHaveBeenCalled();
  });

  it("creates the bootstrap owner already approved", async () => {
    process.env.ALLOWED_LOGIN_EMAIL = "owner@example.com";
    user.findUnique.mockResolvedValue(null);
    user.create.mockResolvedValue({});

    expect(await registerOrGetAccess("owner@example.com")).toBe("approved");
    expect(user.create.mock.calls[0][0].data.isApproved).toBe(true);
  });

  // The owner's row predates the approval gate, so it defaulted to false.
  it("promotes a pre-existing bootstrap row to approved", async () => {
    process.env.ALLOWED_LOGIN_EMAIL = "owner@example.com";
    user.findUnique.mockResolvedValue({ isApproved: false });
    user.update.mockResolvedValue({});

    expect(await registerOrGetAccess("owner@example.com")).toBe("approved");
    expect(user.update).toHaveBeenCalledOnce();
  });

  it("never promotes anyone who isn't the bootstrap owner", async () => {
    process.env.ALLOWED_LOGIN_EMAIL = "owner@example.com";
    user.findUnique.mockResolvedValue({ isApproved: false });

    expect(await registerOrGetAccess("them@example.com")).toBe("pending");
    expect(user.update).not.toHaveBeenCalled();
  });
});

describe("isApprovedEmail", () => {
  it("is false for an email with no row at all", async () => {
    user.findUnique.mockResolvedValue(null);
    expect(await isApprovedEmail("nobody@example.com")).toBe(false);
  });

  it("is false while the account is still pending", async () => {
    user.findUnique.mockResolvedValue({ isApproved: false });
    expect(await isApprovedEmail("them@example.com")).toBe(false);
  });

  it("is true once approved, and looks the row up normalized", async () => {
    user.findUnique.mockResolvedValue({ isApproved: true });
    expect(await isApprovedEmail(" Them@Example.com ")).toBe(true);
    expect(user.findUnique.mock.calls[0][0].where).toEqual({ email: "them@example.com" });
  });
});
