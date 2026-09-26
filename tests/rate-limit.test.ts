import { describe, it, expect } from "vitest";
import { clientIp, nextWindow } from "@/lib/rate-limit";

const limit = { max: 3, windowMs: 60_000 };
const t0 = new Date("2026-09-27T10:00:00Z");

describe("nextWindow", () => {
  it("allows up to max in a window, then refuses with a wait", () => {
    let row = null as { count: number; windowStart: Date } | null;
    for (let i = 1; i <= 3; i++) {
      const n = nextWindow(row, limit, new Date(t0.getTime() + i * 1000));
      expect(n.allowed).toBe(true);
      row = { count: n.count, windowStart: n.windowStart };
    }
    const blocked = nextWindow(row, limit, new Date(t0.getTime() + 10_000));
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBe(51);
  });

  it("starts a fresh window once the old one has passed", () => {
    const n = nextWindow({ count: 99, windowStart: t0 }, limit, new Date(t0.getTime() + 60_000));
    expect(n.allowed).toBe(true);
    expect(n.count).toBe(1);
  });
});

describe("clientIp", () => {
  it("takes the first forwarded address", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
    expect(clientIp(new Headers({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
