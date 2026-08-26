import { PrismaClient } from "@prisma/client";

/**
 * Nothing in this app is ever deleted from the database.
 *
 * `InstagramAccount`, `PostAutomation` and `QueuedFlow` carry an `isDeleted`
 * flag, and the extension below hides flagged rows from every read — so call
 * sites read the way they always did and cannot forget the filter. A query that
 * genuinely needs to see hidden rows (reviving one, or an audit) must go through
 * `dbUnfiltered`.
 *
 * Children are hidden by their parent rather than being flagged themselves:
 * an automation is invisible when its own flag is set *or* when its account is
 * disconnected. That keeps a disconnect O(1) — one row is written, not
 * thousands — and, crucially, means reconnecting does not resurrect an
 * automation that was deleted by hand before the disconnect. Its own flag is
 * still set, so it stays hidden.
 *
 * `Conversation` needs no flag: it is only ever reached through its automation,
 * which is already hidden.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  prismaRaw: PrismaClient;
};

const base =
  globalForPrisma.prismaRaw ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error"] : [] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaRaw = base;

/** Live rows only: not flagged, and belonging to a connected account. */
const liveChild = { isDeleted: false, igAccount: { isDeleted: false } };

/**
 * Merge the live-row filter into a query's `where`.
 *
 * The filter is applied last and so always wins: a caller cannot accidentally
 * (or deliberately) ask for hidden rows through the filtered client. A missing
 * `where` becomes one, and the caller's own conditions are preserved.
 *
 * Also serves `findUnique`, which takes no relation filters and is therefore
 * rewritten to `findFirst` — a findUnique `where` is always a valid findFirst
 * `where`, which makes that rewrite safe.
 */
export function applyLiveFilter<T extends { where?: Record<string, unknown> }>(
  args: T,
  filter: Record<string, unknown>
): T {
  return { ...args, where: { ...(args.where ?? {}), ...filter } };
}

const asFindFirst = applyLiveFilter;

export const db = base.$extends({
  name: "soft-delete",
  query: {
    instagramAccount: {
      async findMany({ args, query }) {
        return query({ ...args, where: { ...args.where, isDeleted: false } });
      },
      async findFirst({ args, query }) {
        return query({ ...args, where: { ...args.where, isDeleted: false } });
      },
      async count({ args, query }) {
        return query({ ...args, where: { ...args.where, isDeleted: false } });
      },
      async findUnique({ args, query }) {
        // Deliberately served by findFirst — see asFindFirst.
        return base.instagramAccount.findFirst(asFindFirst(args, { isDeleted: false }));
      },
    },
    postAutomation: {
      async findMany({ args, query }) {
        return query({ ...args, where: { ...args.where, ...liveChild } });
      },
      async findFirst({ args, query }) {
        return query({ ...args, where: { ...args.where, ...liveChild } });
      },
      async count({ args, query }) {
        return query({ ...args, where: { ...args.where, ...liveChild } });
      },
      async findUnique({ args, query }) {
        // Deliberately served by findFirst — see asFindFirst.
        return base.postAutomation.findFirst(asFindFirst(args, liveChild));
      },
    },
    queuedFlow: {
      async findMany({ args, query }) {
        return query({ ...args, where: { ...args.where, ...liveChild, consumedAt: null } });
      },
      async findFirst({ args, query }) {
        return query({ ...args, where: { ...args.where, ...liveChild, consumedAt: null } });
      },
      async count({ args, query }) {
        return query({ ...args, where: { ...args.where, ...liveChild, consumedAt: null } });
      },
      async findUnique({ args, query }) {
        // Deliberately served by findFirst — see asFindFirst.
        return base.queuedFlow.findFirst(asFindFirst(args, { ...liveChild, consumedAt: null }));
      },
    },
  },
});

/**
 * The unfiltered client — sees hidden rows. Only for reviving a soft-deleted
 * row, or an audit that must include them. Never use it for ordinary reads.
 */
export const dbUnfiltered = base;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db as unknown as PrismaClient;
}
