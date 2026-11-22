// Single-owner authentication: scrypt password, random session token (only its hash is stored),
// HttpOnly + SameSite=Lax cookie (Lax so the Google OAuth redirect keeps the session; CSRF is blocked by the x-salon-os header check), login throttling.
import { newId, newToken, sha256, hashPassword, verifyPassword } from "./lib/security.js";

export const SESSION_COOKIE = "sos_session";
const SESSION_HOURS = 12;

export function createOwner(db, email, password, nowIso) {
  const e = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw new Error("valid email required");
  if (db.get("SELECT 1 FROM owners")) throw new Error("an owner already exists");
  const id = newId("ow_");
  db.run("INSERT INTO owners (id, email, password_hash, created_at) VALUES (?,?,?,?)", id, e, hashPassword(password), nowIso);
  return id;
}

/** In-memory throttle: max 5 failed attempts per IP per 15 minutes. */
export function makeThrottle({ max = 5, windowMs = 15 * 60000 } = {}) {
  const hits = new Map();
  return {
    blocked(key, now) {
      const h = (hits.get(key) || []).filter((t) => now - t < windowMs);
      hits.set(key, h);
      return h.length >= max;
    },
    fail(key, now) { hits.set(key, [...(hits.get(key) || []), now]); },
    reset(key) { hits.delete(key); },
  };
}

let dummyHash;
export function login(db, email, password, now) {
  const owner = db.get("SELECT * FROM owners WHERE email = ?", String(email || "").trim().toLowerCase());
  // Always run a hash comparison so timing doesn't reveal whether the email exists.
  dummyHash ||= hashPassword(newToken());
  const ok = verifyPassword(password, owner?.password_hash || dummyHash);
  if (!owner || !ok) return null;
  const token = newToken();
  db.run("DELETE FROM sessions WHERE expires_at < ?", now.toISOString());
  db.run("INSERT INTO sessions (token_hash, owner_id, expires_at, created_at) VALUES (?,?,?,?)",
    sha256(token), owner.id, new Date(now.getTime() + SESSION_HOURS * 3600000).toISOString(), now.toISOString());
  return { token, ownerId: owner.id };
}

export function sessionOwner(db, token, now) {
  if (!token) return null;
  const s = db.get("SELECT * FROM sessions WHERE token_hash = ?", sha256(token));
  if (!s || s.expires_at < now.toISOString()) return null;
  return db.get("SELECT id, email FROM owners WHERE id = ?", s.owner_id);
}

export const logout = (db, token) => token && db.run("DELETE FROM sessions WHERE token_hash = ?", sha256(token));

export function sessionCookie(token, secure) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_HOURS * 3600}${secure ? "; Secure" : ""}`;
}
export const clearCookie = (secure) => `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;

export function readCookie(req, name) {
  const raw = req.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}
