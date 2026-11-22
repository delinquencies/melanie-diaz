// Secure photo handling: verify real image bytes, strip location/camera metadata, encrypt at rest.
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { newId } from "../lib/security.js";

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

/** Detect type from magic bytes (never trust the filename or browser-sent type). */
export function sniffImage(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Remove EXIF/XMP/IPTC (GPS location, device info). Returns a new Buffer. */
export function stripMetadata(buf, mime) {
  if (mime === "image/jpeg") return stripJpeg(buf);
  if (mime === "image/png") return stripPng(buf);
  if (mime === "image/webp") return stripWebp(buf);
  throw new Error("unsupported type");
}

function stripJpeg(buf) {
  const out = [buf.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff) throw new Error("corrupt jpeg");
    const marker = buf[i + 1];
    if (marker === 0xda) { out.push(buf.subarray(i)); return Buffer.concat(out); } // start of scan: rest is image data
    if (marker === 0xd9) { out.push(buf.subarray(i, i + 2)); return Buffer.concat(out); }
    const len = buf.readUInt16BE(i + 2);
    const seg = buf.subarray(i, i + 2 + len);
    const drop = marker === 0xe1 /* APP1 EXIF/XMP */ || marker === 0xed /* APP13 IPTC */ || marker === 0xfe /* COM */;
    if (!drop) out.push(seg);
    i += 2 + len;
  }
  throw new Error("corrupt jpeg");
}

function stripPng(buf) {
  const out = [buf.subarray(0, 8)];
  let i = 8;
  const DROP = new Set(["eXIf", "tEXt", "iTXt", "zTXt", "tIME"]);
  while (i + 12 <= buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString("ascii", i + 4, i + 8);
    const end = i + 12 + len;
    if (end > buf.length) throw new Error("corrupt png");
    if (!DROP.has(type)) out.push(buf.subarray(i, end));
    i = end;
    if (type === "IEND") break;
  }
  return Buffer.concat(out);
}

function stripWebp(buf) {
  const chunks = [];
  let i = 12;
  while (i + 8 <= buf.length) {
    const type = buf.toString("ascii", i, i + 4);
    const len = buf.readUInt32LE(i + 4);
    const end = i + 8 + len + (len % 2);
    if (end > buf.length + 1) throw new Error("corrupt webp");
    if (type !== "EXIF" && type !== "XMP ") {
      const c = Buffer.from(buf.subarray(i, Math.min(end, buf.length)));
      if (type === "VP8X") c[8] &= ~(0x08 | 0x04); // clear EXIF + XMP flags
      chunks.push(c);
    }
    i = end;
  }
  const body = Buffer.concat([Buffer.from("WEBP"), ...chunks]);
  const head = Buffer.alloc(8);
  head.write("RIFF", 0, "ascii");
  head.writeUInt32LE(body.length, 4);
  return Buffer.concat([head, body]);
}

/** Validate + clean + encrypt + write. Returns { mime, bytes, storageKey }. */
export function storePhoto({ cipher, dir }, raw) {
  if (!raw || !raw.length) throw Object.assign(new Error("empty file"), { code: "photo_empty" });
  if (raw.length > MAX_PHOTO_BYTES) throw Object.assign(new Error("file too large"), { code: "photo_too_large" });
  const mime = sniffImage(raw);
  if (!mime) throw Object.assign(new Error("not a JPEG, PNG or WebP image"), { code: "photo_type" });
  let clean;
  try { clean = stripMetadata(raw, mime); } catch { throw Object.assign(new Error("unreadable image"), { code: "photo_corrupt" }); }
  mkdirSync(dir, { recursive: true });
  const storageKey = newId("ph_") + ".bin";
  writeFileSync(join(dir, storageKey), cipher.encryptBytes(clean), { mode: 0o600 });
  return { mime, bytes: clean.length, storageKey };
}

export function readPhoto({ cipher, dir }, storageKey) {
  if (!/^ph_[A-Za-z0-9_-]+\.bin$/.test(storageKey)) throw new Error("bad key");
  return cipher.decryptBytes(readFileSync(join(dir, storageKey)));
}

export function deletePhotoFile({ dir }, storageKey) {
  const p = join(dir, storageKey);
  if (/^ph_[A-Za-z0-9_-]+\.bin$/.test(storageKey) && existsSync(p)) rmSync(p);
}
