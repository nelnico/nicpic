/**
 * Backfills sortDate on all Photo rows: takenAt if set, else createdAt (upload time).
 * One-time migration support for switching gallery order from manual position to date.
 *
 * Usage: node scripts/backfill-sort-date.mjs
 */

import { readFileSync } from "fs";
import { createRequire } from "module";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dir = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = resolve(__dir, "..");
const require = createRequire(resolve(projectRoot, "package.json"));

const env = Object.fromEntries(
  readFileSync(resolve(projectRoot, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    })
);

const { Client } = require("pg");
const client = new Client({ connectionString: env.DATABASE_URL });
await client.connect();

const result = await client.query(`
  UPDATE "Photo"
  SET "sortDate" = COALESCE("takenAt", "createdAt")
`);

console.log(`Backfilled ${result.rowCount} photos.`);
await client.end();
