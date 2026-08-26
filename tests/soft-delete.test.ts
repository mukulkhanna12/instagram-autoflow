import { describe, it, expect } from "vitest";
import { applyLiveFilter } from "@/lib/db";

// The filter the extension applies to rows owned by an account.
const liveChild = { isDeleted: false, igAccount: { isDeleted: false } };

describe("the live-row filter", () => {
  it("adds a where when the query had none", () => {
    expect(applyLiveFilter({}, liveChild)).toEqual({ where: liveChild });
  });

  it("keeps the caller's own conditions", () => {
    const out = applyLiveFilter({ where: { igAccountId: "acc1" } }, liveChild);
    expect(out.where).toEqual({ igAccountId: "acc1", ...liveChild });
  });

  it("leaves everything but where untouched", () => {
    const out = applyLiveFilter(
      { where: { id: "a" }, orderBy: { position: "asc" }, include: { igAccount: true } },
      liveChild
    );
    expect(out.orderBy).toEqual({ position: "asc" });
    expect(out.include).toEqual({ igAccount: true });
  });

  // The whole point: no call site can opt back into hidden rows.
  it("overrides a caller trying to ask for deleted rows", () => {
    const out = applyLiveFilter({ where: { isDeleted: true } }, liveChild);
    expect(out.where!.isDeleted).toBe(false);
  });

  it("overrides a caller trying to reach a disconnected account's rows", () => {
    const out = applyLiveFilter(
      { where: { igAccount: { isDeleted: true } } },
      liveChild
    );
    expect(out.where!.igAccount).toEqual({ isDeleted: false });
  });

  it("does not mutate the caller's args object", () => {
    const args = { where: { igAccountId: "acc1" } };
    applyLiveFilter(args, liveChild);
    expect(args).toEqual({ where: { igAccountId: "acc1" } });
  });

  it("hides consumed queued flows as well as deleted ones", () => {
    const out = applyLiveFilter({ where: { igAccountId: "acc1" } }, {
      ...liveChild,
      consumedAt: null,
    });
    expect(out.where).toEqual({ igAccountId: "acc1", ...liveChild, consumedAt: null });
  });

  // findUnique carries a compound key; the filter must not disturb it.
  it("preserves a compound unique key", () => {
    const out = applyLiveFilter(
      { where: { igAccountId_postId: { igAccountId: "acc1", postId: "p1" } } as Record<string, unknown> },
      liveChild
    );
    expect(out.where!.igAccountId_postId).toEqual({ igAccountId: "acc1", postId: "p1" });
    expect(out.where!.isDeleted).toBe(false);
  });
});
