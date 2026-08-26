#!/usr/bin/env node
/**
 * Rolling backup of the production database.
 *
 * Reads every table through Prisma — including soft-deleted rows, which the
 * app's own client hides — and writes one gzipped JSON file per run. Keeps the
 * last N days (default 7) and prunes older files.
 *
 * Deliberately not pg_dump: the Prisma Postgres connection needs no local
 * Postgres client, so this runs unchanged on a laptop, a server, or CI.
 *
 *   node scripts/backup-db.mjs                    # back up, prune to 7 days
 *   BACKUP_DIR=/path node scripts/backup-db.mjs   # somewhere else
 *   BACKUP_KEEP_DAYS=30 node scripts/backup-db.mjs
 *   node scripts/backup-db.mjs --list             # what's on disk
 *   node scripts/backup-db.mjs --verify <file>    # row counts in a backup
 *
 * The output contains real conversation history and Instagram usernames. It is
 * written outside the repo by default; keep it out of version control.
 */

import { PrismaClient } from "@prisma/client";
import { gzipSync, gunzipSync } from "node:zlib";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const BACKUP_DIR = process.env.BACKUP_DIR || join(homedir(), "backups", "instagram-autoflow");
const KEEP_DAYS = Number(process.env.BACKUP_KEEP_DAYS || 7);
const PREFIX = "autoflow-";

// Order matters on restore: parents before the rows that reference them.
const TABLES = [
  "user",
  "account",
  "session",
  "verificationToken",
  "loginCode",
  "instagramAccount",
  "reelDefaults",
  "queuedFlow",
  "postAutomation",
  "conversation",
];

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function listBackups() {
  try {
    return readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith(PREFIX) && f.endsWith(".json.gz"))
      .map((f) => ({ name: f, path: join(BACKUP_DIR, f), mtime: statSync(join(BACKUP_DIR, f)).mtime }))
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return [];
  }
}

function human(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function backup() {
  if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set");

  const prisma = new PrismaClient();
  mkdirSync(BACKUP_DIR, { recursive: true });

  const startedAt = new Date();
  const data = {};
  const counts = {};

  try {
    for (const table of TABLES) {
      if (!prisma[table]) {
        console.warn(`  ! skipping unknown table: ${table}`);
        continue;
      }
      // No where clause: soft-deleted rows are exactly what a backup is for.
      const rows = await prisma[table].findMany();
      data[table] = rows;
      counts[table] = rows.length;
      console.log(`  ${table.padEnd(20)} ${String(rows.length).padStart(6)} rows`);
    }
  } finally {
    await prisma.$disconnect();
  }

  const payload = {
    meta: {
      takenAt: startedAt.toISOString(),
      host: (() => {
        try {
          return new URL(process.env.DATABASE_URL).hostname;
        } catch {
          return "unknown";
        }
      })(),
      counts,
      totalRows: Object.values(counts).reduce((a, b) => a + b, 0),
      schemaTables: TABLES,
    },
    data,
  };

  const stamp = startedAt.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const file = join(BACKUP_DIR, `${PREFIX}${stamp}.json.gz`);
  // BigInt/Date are not JSON-native; Prisma returns Dates, so serialise them.
  const json = JSON.stringify(payload, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  writeFileSync(file, gzipSync(Buffer.from(json, "utf8")));

  console.log(`\n✓ ${file}`);
  console.log(`  ${payload.meta.totalRows} rows, ${human(statSync(file).size)}`);
  return file;
}

function prune() {
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  const old = listBackups().filter((b) => b.mtime.getTime() < cutoff);

  // Never prune the only copy, however old it is.
  const remaining = listBackups().length - old.length;
  if (remaining < 1) {
    console.log(`\n  (keeping ${old.length} expired backup(s) — they are the only copies)`);
    return;
  }

  for (const b of old) {
    unlinkSync(b.path);
    console.log(`  pruned ${b.name}`);
  }
  if (old.length) console.log(`\n✓ pruned ${old.length} backup(s) older than ${KEEP_DAYS} days`);
}

function verify(path) {
  if (!path) fail("usage: --verify <file>");
  const payload = JSON.parse(gunzipSync(readFileSync(path)).toString("utf8"));
  console.log(`taken   : ${payload.meta.takenAt}`);
  console.log(`host    : ${payload.meta.host}`);
  console.log(`rows    : ${payload.meta.totalRows}`);
  for (const [t, n] of Object.entries(payload.meta.counts)) {
    console.log(`  ${t.padEnd(20)} ${String(n).padStart(6)}`);
  }
}

const [, , cmd, arg] = process.argv;

if (cmd === "--list") {
  const all = listBackups();
  if (!all.length) {
    console.log(`no backups in ${BACKUP_DIR}`);
  } else {
    console.log(`${all.length} backup(s) in ${BACKUP_DIR}:\n`);
    for (const b of all) {
      console.log(`  ${b.mtime.toISOString().slice(0, 19)}  ${human(statSync(b.path).size).padStart(9)}  ${b.name}`);
    }
  }
} else if (cmd === "--verify") {
  verify(arg);
} else {
  console.log(`Backing up → ${BACKUP_DIR}\n`);
  backup()
    .then(() => prune())
    .catch((err) => fail(err.message));
}
