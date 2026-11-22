// Node HTTP adapter for the fetch-style app. Local/sandbox use: `npm start`.
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "./db/database.js";
import { createApp, SECURITY_HEADERS } from "./app.js";
import { loadConfigFromDir, fsBlobStore, fsStatic } from "./node/adapters.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MAX_BODY = 30 * 1024 * 1024;

export function toNodeHandler(app) {
  return async (req, res) => {
    const chunks = [];
    let size = 0;
    if (req.method !== "GET" && req.method !== "HEAD") {
      for await (const c of req) {
        size += c.length;
        if (size > MAX_BODY) { res.writeHead(413, { "content-type": "application/json" }); res.end('{"error":"payload_too_large"}'); req.destroy(); return; }
        chunks.push(c);
      }
    }
    const host = req.headers.host || "localhost";
    const request = new Request(`http://${host}${req.url}`, {
      method: req.method, headers: req.headers, body: chunks.length ? Buffer.concat(chunks) : undefined,
    });
    const response = await app.handle(request, { ip: req.socket.remoteAddress || "unknown" });
    const headers = {};
    response.headers.forEach((v, k) => { headers[k] = v; });
    res.writeHead(response.status, headers);
    res.end(response.body ? Buffer.from(await response.arrayBuffer()) : undefined);
  };
}

/** Local sandbox convenience: a dev-only key in data/ (gitignored). Production must set SALON_OS_DATA_KEY. */
function ensureDevKey() {
  if (process.env.SALON_OS_DATA_KEY) return;
  if (process.env.NODE_ENV === "production") throw new Error("SALON_OS_DATA_KEY is required in production");
  const file = join(ROOT, "data", "dev-data-key.txt");
  mkdirSync(dirname(file), { recursive: true });
  if (!existsSync(file)) writeFileSync(file, randomBytes(32).toString("base64"), { mode: 0o600 });
  process.env.SALON_OS_DATA_KEY = readFileSync(file, "utf8").trim();
  console.warn("Using a DEV data key from data/dev-data-key.txt (sandbox only).");
}

export async function createNodeApp({ dbFile = ":memory:", env = process.env, now, fetch, uploadsDir = join(ROOT, "data", "uploads") } = {}) {
  const db = await openDatabase(dbFile);
  const app = createApp({
    db, env, now, fetch,
    config: loadConfigFromDir(join(ROOT, "config")),
    blobs: fsBlobStore(uploadsDir),
    staticFile: fsStatic(join(ROOT, "public"), SECURITY_HEADERS),
  });
  return { app, db };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  ensureDevKey();
  const { app } = await createNodeApp({ dbFile: process.env.SALON_OS_DB || join(ROOT, "data", "salon-os.db") });
  const port = Number(process.env.PORT || 8787);
  createServer(toNodeHandler(app)).listen(port, "127.0.0.1", () => {
    console.log(`Salon OS (sandbox) on http://127.0.0.1:${port}  ·  intake /book/  ·  dashboard /admin/`);
  });
}
