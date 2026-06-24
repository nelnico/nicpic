/**
 * Audits and optionally deletes orphaned assets:
 *   - R2 files with no matching DB photo record
 *   - DB photo records whose R2 files are missing
 *
 * Usage:
 *   node scripts/cleanup-orphans.mjs          # dry run (report only)
 *   node scripts/cleanup-orphans.mjs --delete  # delete orphans on both ends
 *
 * Reads credentials from .env.local automatically.
 */

import { readFileSync } from "fs";
import { createRequire } from "module";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dir = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = resolve(__dir, "..");
const require = createRequire(resolve(projectRoot, "package.json"));

// Parse .env.local
const env = Object.fromEntries(
  readFileSync(resolve(projectRoot, ".env.local"), "utf8")
    .split("\n")
    .filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; })
);

const { Client } = require("pg");
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require("@aws-sdk/client-s3");

const DELETE = process.argv.includes("--delete");

// --- Database ---
const db = new Client({ connectionString: env.DATABASE_URL });
await db.connect();
const { rows } = await db.query('SELECT id, "r2Key", "r2ThumbKey" FROM "Photo"');

const dbKeyToId = new Map();
for (const row of rows) {
  if (row.r2Key) dbKeyToId.set(row.r2Key, row.id);
  if (row.r2ThumbKey) dbKeyToId.set(row.r2ThumbKey, row.id);
}

// --- R2 ---
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});

const r2Keys = new Set();
let token;
do {
  const res = await r2.send(new ListObjectsV2Command({ Bucket: env.R2_BUCKET_NAME, ContinuationToken: token }));
  for (const obj of res.Contents ?? []) r2Keys.add(obj.Key);
  token = res.NextContinuationToken;
} while (token);

// --- Compare ---
const inDbNotR2 = [...dbKeyToId.keys()].filter(k => !r2Keys.has(k));
const inR2NotDb = [...r2Keys].filter(k => !dbKeyToId.has(k));

console.log(`\nDB keys : ${dbKeyToId.size}`);
console.log(`R2 keys : ${r2Keys.size}`);

if (inDbNotR2.length === 0 && inR2NotDb.length === 0) {
  console.log("\n✓ Everything is in sync.");
  await db.end();
  process.exit(0);
}

if (inDbNotR2.length > 0) {
  console.log(`\n--- In DB but NOT in R2 (${inDbNotR2.length}) ---`);
  inDbNotR2.forEach(k => console.log(" ", k));
}
if (inR2NotDb.length > 0) {
  console.log(`\n--- In R2 but NOT in DB (${inR2NotDb.length}) ---`);
  inR2NotDb.forEach(k => console.log(" ", k));
}

if (!DELETE) {
  console.log("\nDry run — pass --delete to remove orphans.");
  await db.end();
  process.exit(0);
}

// --- Delete ---
console.log("\nDeleting...");

// Orphaned R2 files
if (inR2NotDb.length > 0) {
  const res = await r2.send(new DeleteObjectsCommand({
    Bucket: env.R2_BUCKET_NAME,
    Delete: { Objects: inR2NotDb.map(Key => ({ Key })) },
  }));
  console.log(`R2: deleted ${res.Deleted?.length ?? 0}`);
  if (res.Errors?.length) console.error("R2 errors:", res.Errors);
}

// Orphaned DB records — find photo IDs where ALL their keys are missing from R2
if (inDbNotR2.length > 0) {
  const orphanedIds = new Set(inDbNotR2.map(k => dbKeyToId.get(k)));
  // Only delete a photo row if both its r2Key AND r2ThumbKey are missing
  const safeToDelete = rows.filter(r =>
    orphanedIds.has(r.id) &&
    (!r.r2Key || inDbNotR2.includes(r.r2Key)) &&
    (!r.r2ThumbKey || inDbNotR2.includes(r.r2ThumbKey))
  );
  if (safeToDelete.length > 0) {
    const ids = safeToDelete.map(r => r.id);
    await db.query('DELETE FROM "Photo" WHERE id = ANY($1)', [ids]);
    console.log(`DB: deleted ${ids.length} photo record(s)`);
  } else {
    console.log("DB: no fully-orphaned records to delete (partial key loss — review manually)");
  }
}

await db.end();
console.log("\nDone.");
