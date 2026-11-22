import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { makeCipher, hashPassword, verifyPassword, loadKey } from "../src/lib/security.js";
import { zonedToUtc, utcToZoned, offsetMinutes } from "../src/lib/time.js";
import { normalizeEmail, normalizePhone } from "../src/lib/contact.js";

test("AES-GCM round trip and tamper detection", () => {
  const c = makeCipher(randomBytes(32));
  const blob = c.encryptJSON({ allergy: "coconut" });
  assert.ok(!blob.includes("coconut"));
  assert.deepEqual(c.decryptJSON(blob), { allergy: "coconut" });
  const parts = blob.split(".");
  parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith("AA") ? "BB" : "AA");
  assert.throws(() => c.decryptText(parts.join(".")));
  const bytes = Buffer.from("photo-bytes");
  assert.deepEqual(c.decryptBytes(c.encryptBytes(bytes)), bytes);
});

test("data key must be 32 bytes", () => {
  assert.throws(() => loadKey(undefined));
  assert.throws(() => loadKey(Buffer.alloc(16).toString("base64")));
});

test("password hashing", () => {
  const h = hashPassword("a very long passphrase");
  assert.equal(verifyPassword("a very long passphrase", h), true);
  assert.equal(verifyPassword("wrong", h), false);
  assert.throws(() => hashPassword("short"));
});

test("America/Chicago conversions across DST", () => {
  assert.equal(zonedToUtc("2026-11-24", "11:00").toISOString(), "2026-11-24T17:00:00.000Z"); // CST (-6)
  assert.equal(zonedToUtc("2027-07-13", "11:00").toISOString(), "2027-07-13T16:00:00.000Z"); // CDT (-5)
  assert.equal(offsetMinutes("America/Chicago", new Date("2027-03-13T18:00:00Z")), -360);
  assert.equal(offsetMinutes("America/Chicago", new Date("2027-03-16T18:00:00Z")), -300);
  // Spring forward: 02:30 doesn't exist on 2027-03-14 → rolls forward, never throws
  assert.ok(zonedToUtc("2027-03-14", "02:30") instanceof Date);
  assert.deepEqual(utcToZoned(new Date("2026-11-24T17:00:00Z")), { date: "2026-11-24", time: "11:00", weekday: "tue" });
});

test("contact normalization", () => {
  assert.equal(normalizeEmail(" Ana@Example.COM "), "ana@example.com");
  assert.equal(normalizeEmail("nope"), undefined);
  assert.equal(normalizePhone("(281) 555-0100"), "+12815550100");
  assert.equal(normalizePhone("+1 281.555.0100"), "+12815550100");
  assert.equal(normalizePhone("123"), undefined);
});
