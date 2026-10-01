// Wipes the store back to empty before launch: deletes every product, order,
// cart and notification, and every user account except the ones you keep.
// A JSON backup of everything is written to server/backups/ first.
//
// Usage (dry run, shows what would be deleted):
//   npm run reset-store -- --keep seller@example.com
// Actually delete:
//   npm run reset-store -- --keep seller@example.com --yes
//
// --keep can be repeated. Product photos uploaded to ImageKit are not touched.

import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";

const keep = process.argv
  .flatMap((a, i, all) => (a === "--keep" && all[i + 1] ? [all[i + 1].trim().toLowerCase()] : []));
const confirmed = process.argv.includes("--yes");

const COLLECTIONS = ["products", "orders", "carts", "notifications"];

async function main() {
  if (keep.length === 0) {
    throw new Error("Pass the seller account to keep: --keep seller@example.com");
  }

  await connectDB();
  const db = mongoose.connection.db;
  const users = db.collection("users");

  const kept = await users.find({ email: { $in: keep } }, { projection: { email: 1, role: 1 } }).toArray();
  const missing = keep.filter((email) => !kept.some((u) => u.email === email));
  if (missing.length) {
    throw new Error(`No account found for ${missing.join(", ")}. Create it first with npm run create-seller.`);
  }
  const userFilter = { email: { $nin: keep } };

  console.log(`Keeping: ${kept.map((u) => `${u.email} (${u.role})`).join(", ")}`);
  console.log("Will delete:");
  for (const name of COLLECTIONS) {
    console.log(`  ${name}: ${await db.collection(name).countDocuments()}`);
  }
  const doomed = await users.find(userFilter, { projection: { email: 1, role: 1 } }).toArray();
  console.log(`  users: ${doomed.length}${doomed.length ? ` (${doomed.map((u) => u.email).join(", ")})` : ""}`);

  if (!confirmed) {
    console.log("\nDry run only. Re-run with --yes to delete.");
    return;
  }

  const backup = { users: await users.find(userFilter).toArray() };
  for (const name of COLLECTIONS) backup[name] = await db.collection(name).find({}).toArray();
  const dir = path.resolve("backups");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `store-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify(backup));
  console.log(`\nBackup written to ${file}`);

  for (const name of COLLECTIONS) {
    const { deletedCount } = await db.collection(name).deleteMany({});
    console.log(`Deleted ${deletedCount} ${name}`);
  }
  const { deletedCount } = await users.deleteMany(userFilter);
  console.log(`Deleted ${deletedCount} users`);

  // carts gained a unique index per user; rebuild indexes from the models
  await db.collection("carts").dropIndexes().catch(() => {});
  console.log("\nDone. The store is empty and ready for your own products.");
}

main()
  .catch((err) => {
    console.error(`reset-store failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect().catch(() => {}));
