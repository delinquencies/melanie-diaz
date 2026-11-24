// Cloudflare entry point.
//  - Static pages (public/) are served by Workers Static Assets.
//  - /api/* goes to ONE Durable Object ("melanie-diaz") that owns the SQLite database,
//    so every write is serialised and transactions are atomic (no double booking).
//  - Encrypted photos live in R2. A cron trigger syncs Google free/busy every 30 minutes.
import { DurableObject } from "cloudflare:workers";
import { createApp } from "./app.js";
import { buildConfig } from "./domain/config.js";
import { openDurableDatabase } from "./db/database.js";
import { syncBusy } from "./domain/calendar.js";
import catalog from "../config/catalog.json";
import schedule from "../config/schedule.json";
import intakeV1 from "../config/forms/intake.v1.json";

const config = buildConfig({ catalog, schedule, forms: [intakeV1] });
const MAX_BODY = 30 * 1024 * 1024;

/** Blob store inside the Durable Object's SQLite (rows are capped at 2 MB, so chunk at 1 MB). */
const CHUNK = 1024 * 1024;
function sqliteBlobStore(db) {
  return {
    async put(key, bytes) {
      const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      db.tx(() => {
        db.run("DELETE FROM blob_chunks WHERE blob_key = ?", key);
        for (let i = 0, n = 0; i < u8.length; i += CHUNK, n++) {
          // Copy into a fresh, exactly-sized buffer (Buffer.slice is a view into a shared pool).
          const part = new Uint8Array(u8.subarray(i, i + CHUNK));
          db.run("INSERT INTO blob_chunks (blob_key, idx, data) VALUES (?,?,?)", key, n, part.buffer);
        }
      });
    },
    async get(key) {
      const rows = db.all("SELECT data FROM blob_chunks WHERE blob_key = ? ORDER BY idx", key);
      if (!rows.length) return null;
      const parts = rows.map((r) => new Uint8Array(r.data));
      const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
      let o = 0;
      for (const p of parts) { out.set(p, o); o += p.length; }
      return out;
    },
    async delete(key) { db.run("DELETE FROM blob_chunks WHERE blob_key = ?", key); },
  };
}

function r2Store(bucket) {
  return {
    put: (key, bytes) => bucket.put(key, bytes),
    async get(key) { const o = await bucket.get(key); return o ? new Uint8Array(await o.arrayBuffer()) : null; },
    delete: (key) => bucket.delete(key),
  };
}

export class SalonOS extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.db = openDurableDatabase(ctx.storage);
    // R2 when bound (enable R2 on the account to use it); otherwise encrypted chunks in this DO's SQLite.
    const blobs = env.PHOTOS ? r2Store(env.PHOTOS) : sqliteBlobStore(this.db);
    this.app = createApp({ db: this.db, env, config, blobs });
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/__internal/sync") {
      const accounts = this.db.get("SELECT (SELECT COUNT(*) FROM calendar_accounts) + (SELECT COUNT(*) FROM calendar_feeds) AS n").n;
      if (!accounts) return Response.json({ skipped: "no calendar connected" });
      return Response.json(await syncBusy(this.app.ctx));
    }
    return this.app.handle(request, { ip: request.headers.get("cf-connecting-ip") || "unknown" });
  }
}

const salon = (env) => env.SALON.get(env.SALON.idFromName("melanie-diaz"));

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      if (Number(request.headers.get("content-length") || 0) > MAX_BODY) {
        return Response.json({ error: "payload_too_large" }, { status: 413 });
      }
      return salon(env).fetch(request);
    }
    if (url.pathname === "/") return Response.redirect(new URL("/book/", url).toString(), 302);
    return env.ASSETS.fetch(request);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(salon(env).fetch("https://salon-os.internal/__internal/sync", { method: "POST" }));
  },
};
