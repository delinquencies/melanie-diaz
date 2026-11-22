// Encryption at rest (AES-256-GCM), password hashing (scrypt), tokens.
import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { Buffer } from "node:buffer";

export const newId = (prefix = "") => prefix + randomBytes(12).toString("base64url");
export const newToken = () => randomBytes(32).toString("base64url");
export const sha256 = (s) => createHash("sha256").update(s).digest("hex");

/** Key comes from SALON_OS_DATA_KEY (32 bytes, base64). */
export function loadKey(b64) {
  if (!b64) throw new Error("SALON_OS_DATA_KEY is not set");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error("SALON_OS_DATA_KEY must be 32 bytes (base64)");
  return key;
}

export function makeCipher(key) {
  return {
    /** Encrypt a string → "v1.<iv>.<tag>.<data>" (base64url parts). */
    encryptText(plain) {
      if (plain == null) return null;
      const iv = randomBytes(12);
      const c = createCipheriv("aes-256-gcm", key, iv);
      const data = Buffer.concat([c.update(String(plain), "utf8"), c.final()]);
      return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
    },
    decryptText(blob) {
      if (blob == null) return null;
      const [v, iv, tag, data] = String(blob).split(".");
      if (v !== "v1") throw new Error("Unknown ciphertext version");
      const d = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
      d.setAuthTag(Buffer.from(tag, "base64url"));
      return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
    },
    encryptJSON(obj) { return this.encryptText(JSON.stringify(obj)); },
    decryptJSON(blob) { return blob == null ? null : JSON.parse(this.decryptText(blob)); },
    /** Encrypt raw bytes → Buffer [iv(12) | tag(16) | data]. */
    encryptBytes(buf) {
      const iv = randomBytes(12);
      const c = createCipheriv("aes-256-gcm", key, iv);
      const data = Buffer.concat([c.update(buf), c.final()]);
      return Buffer.concat([iv, c.getAuthTag(), data]);
    },
    decryptBytes(buf) {
      const d = createDecipheriv("aes-256-gcm", key, buf.subarray(0, 12));
      d.setAuthTag(buf.subarray(12, 28));
      return Buffer.concat([d.update(buf.subarray(28)), d.final()]);
    },
  };
}

// scrypt N=2^15 (≈32MB) — strong but fast enough for a single-owner login.
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export function hashPassword(password) {
  if (typeof password !== "string" || password.length < 12) throw new Error("Password must be at least 12 characters");
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32, SCRYPT);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}
export function verifyPassword(password, stored) {
  const [alg, salt, hash] = String(stored).split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const test = scryptSync(String(password), Buffer.from(salt, "base64url"), 32, SCRYPT);
  const want = Buffer.from(hash, "base64url");
  return want.length === test.length && timingSafeEqual(want, test);
}
