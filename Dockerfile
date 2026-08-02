# syntax=docker/dockerfile:1

# ── Dependencies ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Build ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate the Prisma client, then build the standalone Next.js server.
RUN npx prisma generate && npm run build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Non-root user for the running container.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# The standalone output bundles only what the server needs.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma schema + engine, so `prisma db push` can run at deploy time if needed.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
