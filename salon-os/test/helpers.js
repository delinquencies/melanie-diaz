import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { createNodeApp } from "../src/server.js";
import { createOwner } from "../src/auth.js";

// Sunday 22 Nov 2026, 10:00 CST
export const NOW = new Date("2026-11-22T16:00:00Z");

export async function setup({ now = NOW, env = {}, fetch } = {}) {
  const storageDir = mkdtempSync(join(tmpdir(), "salonos-"));
  let clock = now;
  const { app, db } = await createNodeApp({
    now: () => clock, fetch, uploadsDir: storageDir,
    env: { SALON_OS_DATA_KEY: randomBytes(32).toString("base64"), ...env },
  });
  return { app, ctx: app.ctx, db, storageDir, setNow: (d) => { clock = d; } };
}

/** Minimal JPEG with an APP1/EXIF segment containing a fake GPS marker. */
export function jpegWithExif() {
  const app0 = Buffer.concat([Buffer.from([0xff, 0xe0, 0x00, 0x10]), Buffer.from("JFIF\0"), Buffer.alloc(9)]);
  const exifPayload = Buffer.from("Exif\0\0GPSLatitude=29.73;GPSLongitude=-94.97");
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1]), Buffer.from([0, exifPayload.length + 2]), exifPayload]);
  const sos = Buffer.from([0xff, 0xda, 0x00, 0x08, 1, 2, 3, 4, 5, 6, 0x11, 0x22, 0x33, 0xff, 0xd9]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, app1, sos]);
}

export const validNewAnswers = (o = {}) => ({
  first_name: "Ana", last_name: "Rivera", email: "Ana@Example.com", phone: "(281) 555-0100", preferred_contact: "text",
  heard_about: "instagram", goals: "Healthy defined curls", has_sensitivities: "no", ...o,
});

export async function ownerSession(app, db, { email = "owner@example.com", password = "correct horse battery" } = {}) {
  createOwner(db, email, password, new Date().toISOString());
  const res = await app.handle(new Request("http://t/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) }));
  const cookie = res.headers.get("set-cookie").split(";")[0];
  return cookie;
}
