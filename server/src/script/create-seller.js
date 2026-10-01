// Creates the store's seller account (customers sign up themselves on the
// site; seller accounts can only be made from here).
//
// Usage:
//   npm run create-seller -- --email you@example.com --name "HUSH Studio" [--password "..."]
//
// If --password is left out a strong one is generated and printed once.
// Running it again for an existing email makes that account a seller and,
// only when --password is given, resets its password.

import crypto from "crypto";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import userModel from "../models/user.model.js";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function generatePassword() {
  // no look-alike characters, so it's easy to type from a screen
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(16);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function main() {
  const email = (arg("email") || process.env.SELLER_EMAIL || "").trim().toLowerCase();
  const name = (arg("name") || process.env.SELLER_NAME || "HUSH Studio").trim();
  const givenPassword = arg("password") || process.env.SELLER_PASSWORD;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Pass the seller\'s email: npm run create-seller -- --email you@example.com');
  }
  if (givenPassword && givenPassword.length < 8) {
    throw new Error("Use a password of at least 8 characters");
  }

  await connectDB();

  const existing = await userModel.findOne({ email });
  if (existing) {
    existing.role = "seller";
    existing.name = name || existing.name;
    if (givenPassword) existing.passwordHash = await bcrypt.hash(givenPassword, 10);
    await existing.save();
    console.log(`\n${email} is now a seller${givenPassword ? " and its password was reset" : ""}.`);
  } else {
    const password = givenPassword || generatePassword();
    await userModel.create({ name, email, role: "seller", passwordHash: await bcrypt.hash(password, 10) });
    console.log("\nSeller account created:");
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${givenPassword ? "(the one you passed)" : password}`);
    console.log("\nSign in on the site and change the password from My account → Settings.");
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(`create-seller failed: ${err.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
