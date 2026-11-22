// Secure photo handling: verify real image bytes, strip location/camera metadata, encrypt at rest.
// Storage is a blob store with async put/get/delete (local folder in Node, R2 on Cloudflare).
import { Buffer } from "node:buffer";
import { newId } from "../lib/security.js";

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const KEY_RE = /^ph_[A-Za-z0-9_-]+\.bin$/;

// Plain byte helpers (identical behaviour on Node and Cloudflare's Buffer implementation).
const u16be = (b, i) => (b[i] << 8) | b[i + 1];
const u32be = (b, i) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
const u32le = (b, i) => b[i] + (b[i + 1] << 8) + (b[i + 2] << 16) + ((b[i + 3] << 24) >>> 0);
const ascii = (b, s, e) => String.fromCharCode(...b.slice(s, e));
const concat = (parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return Buffer.from(out.buffer, out.byteOffset, out.length);
};
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Detect type from magic bytes (never trust the filename or browser-sent type). */
export function sniffImage(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && PNG_SIG.every((v, i) => buf[i] === v)) return "image/png";
  if (buf.length > 12 && ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 12) === "WEBP") return "image/webp";
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
  const out = [buf.slice(0, 2)];
  let i = 2;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff) throw new Error("corrupt jpeg");
    const marker = buf[i + 1];
    if (marker === 0xda) { out.push(buf.slice(i)); return concat(out); } // start of scan: rest is image data
    if (marker === 0xd9) { out.push(buf.slice(i, i + 2)); return concat(out); }
    const len = u16be(buf, i + 2);
    if (len < 2 || i + 2 + len > buf.length) throw new Error("corrupt jpeg");
    const drop = marker === 0xe1 /* APP1 EXIF/XMP */ || marker === 0xed /* APP13 IPTC */ || marker === 0xfe /* COM */;
    if (!drop) out.push(buf.slice(i, i + 2 + len));
    i += 2 + len;
  }
  throw new Error("corrupt jpeg");
}

function stripPng(buf) {
  const out = [buf.slice(0, 8)];
  let i = 8;
  const DROP = new Set(["eXIf", "tEXt", "iTXt", "zTXt", "tIME"]);
  while (i + 12 <= buf.length) {
    const len = u32be(buf, i);
    const type = ascii(buf, i + 4, i + 8);
    const end = i + 12 + len;
    if (end > buf.length) throw new Error("corrupt png");
    if (!DROP.has(type)) out.push(buf.slice(i, end));
    i = end;
    if (type === "IEND") break;
  }
  return concat(out);
}

function stripWebp(buf) {
  const chunks = [];
  let i = 12;
  while (i + 8 <= buf.length) {
    const type = ascii(buf, i, i + 4);
    const len = u32le(buf, i + 4);
    const end = i + 8 + len + (len % 2);
    if (end > buf.length + 1) throw new Error("corrupt webp");
    if (type !== "EXIF" && type !== "XMP ") {
      const c = new Uint8Array(buf.slice(i, Math.min(end, buf.length)));
      if (type === "VP8X") c[8] &= ~(0x08 | 0x04); // clear EXIF + XMP flags
      chunks.push(c);
    }
    i = end;
  }
  const bodyLen = 4 + chunks.reduce((n, c) => n + c.length, 0);
  const head = new Uint8Array([0x52, 0x49, 0x46, 0x46, bodyLen & 0xff, (bodyLen >> 8) & 0xff, (bodyLen >> 16) & 0xff, (bodyLen >>> 24) & 0xff, 0x57, 0x45, 0x42, 0x50]);
  return concat([head, ...chunks]);
}

/** Validate + clean + encrypt (sync, pure). Returns { mime, bytes, storageKey, sealed }. */
export function preparePhoto(cipher, raw) {
  if (!raw || !raw.length) throw Object.assign(new Error("empty file"), { code: "photo_empty" });
  if (raw.length > MAX_PHOTO_BYTES) throw Object.assign(new Error("file too large"), { code: "photo_too_large" });
  const mime = sniffImage(raw);
  if (!mime) throw Object.assign(new Error("not a JPEG, PNG or WebP image"), { code: "photo_type" });
  let clean;
  try { clean = stripMetadata(raw, mime); } catch { throw Object.assign(new Error("unreadable image"), { code: "photo_corrupt" }); }
  return { mime, bytes: clean.length, storageKey: newId("ph_") + ".bin", sealed: cipher.encryptBytes(clean) };
}

/** Prepare and upload. */
export async function storePhoto({ cipher, blobs }, raw) {
  const p = preparePhoto(cipher, Buffer.from(raw));
  await blobs.put(p.storageKey, p.sealed);
  return { mime: p.mime, bytes: p.bytes, storageKey: p.storageKey };
}

export async function readPhoto({ cipher, blobs }, storageKey) {
  if (!KEY_RE.test(storageKey)) throw new Error("bad key");
  const sealed = await blobs.get(storageKey);
  if (!sealed) throw Object.assign(new Error("missing"), { code: "not_found", status: 404 });
  return cipher.decryptBytes(Buffer.from(sealed));
}

export async function deletePhotoFile({ blobs }, storageKey) {
  if (KEY_RE.test(storageKey)) await blobs.delete(storageKey);
}
