import { describe, it, expect } from "vitest";
import { atLeast, canRemove, isRole } from "@/lib/roles";

describe("roles", () => {
  it("ranks owner above member", () => {
    expect(atLeast("owner", "member")).toBe(true);
    expect(atLeast("member", "member")).toBe(true);
    expect(atLeast("member", "owner")).toBe(false);
  });

  it("only lets the owner remove people, and never the owner", () => {
    expect(canRemove("owner", "member")).toBe(true);
    expect(canRemove("owner", "owner")).toBe(false);
    expect(canRemove("member", "member")).toBe(false);
  });

  it("rejects unknown roles, including ones stored before a change", () => {
    expect(isRole("owner")).toBe(true);
    expect(isRole("admin")).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});
