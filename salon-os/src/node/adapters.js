// Node-only adapters: config from disk, photo storage on disk, static files from public/.
import { readFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { readFile, writeFile, rm } from "node:fs/promises";
import { join, normalize, extname } from "node:path";
import { buildConfig } from "../domain/config.js";

export function loadConfigFromDir(dir) {
  const read = (p) => JSON.parse(readFileSync(p, "utf8"));
  return buildConfig({
    catalog: read(join(dir, "catalog.json")),
    schedule: read(join(dir, "schedule.json")),
    forms: readdirSync(join(dir, "forms")).filter((f) => f.endsWith(".json")).map((f) => read(join(dir, "forms", f))),
  });
}

/** Blob storage on the local filesystem (same interface as the R2 adapter). */
export function fsBlobStore(dir) {
  return {
    async put(key, bytes) { mkdirSync(dir, { recursive: true }); await writeFile(join(dir, key), bytes, { mode: 0o600 }); },
    async get(key) { const p = join(dir, key); return existsSync(p) ? new Uint8Array(await readFile(p)) : null; },
    async delete(key) { await rm(join(dir, key), { force: true }); },
  };
}

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json" };

/** Serves /book/, /admin/, /shared/ from public/. Returns null when not found. */
export function fsStatic(publicDir, headers) {
  const root = normalize(publicDir);
  return async (path) => {
    if (path === "/") return new Response(null, { status: 302, headers: { location: "/book/" } });
    if (!/^\/(book|admin|shared)\//.test(path)) return null;
    let decoded;
    try { decoded = decodeURIComponent(path); } catch { return null; }
    const full = normalize(join(root, decoded.endsWith("/") ? decoded + "index.html" : decoded));
    if (!full.startsWith(root)) return null;
    try {
      const body = await readFile(full);
      return new Response(body, { status: 200, headers: { ...headers, "content-type": MIME[extname(full)] || "application/octet-stream", "cache-control": "no-cache" } });
    } catch { return null; }
  };
}
