// Database adapters. Both expose the same tiny synchronous interface: all / get / run / tx.
//  - openDatabase(file):          Node's built-in SQLite (local + tests)
//  - openDurableDatabase(storage): Cloudflare Durable Object SQLite (ctx.storage) — also synchronous
import { SCHEMA, SCHEMA_VERSION } from "./schema.js";

/** Split the schema into single statements (comments removed). */
export function schemaStatements() {
  return SCHEMA.replace(/--[^\n]*/g, "").split(";").map((s) => s.trim()).filter(Boolean);
}

export async function openDatabase(file = ":memory:") {
  const { DatabaseSync } = await import("node:sqlite");
  if (file !== ":memory:") {
    const { mkdirSync } = await import("node:fs");
    const { dirname } = await import("node:path");
    mkdirSync(dirname(file), { recursive: true });
  }
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  for (const stmt of schemaStatements()) db.exec(stmt);
  if (!db.prepare("SELECT version FROM schema_version").get()) db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(SCHEMA_VERSION);

  const api = {
    all: (sql, ...p) => db.prepare(sql).all(...p),
    get: (sql, ...p) => db.prepare(sql).get(...p),
    run: (sql, ...p) => { const r = db.prepare(sql).run(...p); return { changes: Number(r.changes) }; },
    /** IMMEDIATE transaction: takes the write lock up front → no double booking. */
    tx(fn) {
      db.exec("BEGIN IMMEDIATE");
      try { const out = fn(api); db.exec("COMMIT"); return out; }
      catch (err) { db.exec("ROLLBACK"); throw err; }
    },
    close: () => db.close(),
  };
  return api;
}

/** Durable Object SQLite. A single DO instance serialises all requests, and transactionSync is atomic. */
export function openDurableDatabase(storage) {
  const sql = storage.sql;
  for (const stmt of schemaStatements()) {
    if (/^PRAGMA/i.test(stmt)) continue; // DO SQLite manages pragmas itself (foreign keys are enforced)
    sql.exec(stmt);
  }
  if (!sql.exec("SELECT version FROM schema_version").toArray().length) sql.exec("INSERT INTO schema_version (version) VALUES (?)", SCHEMA_VERSION);
  const clean = (p) => p.map((v) => (v === undefined ? null : v));
  const api = {
    all: (q, ...p) => sql.exec(q, ...clean(p)).toArray(),
    get: (q, ...p) => sql.exec(q, ...clean(p)).toArray()[0],
    run: (q, ...p) => { const c = sql.exec(q, ...clean(p)); c.toArray(); return { changes: c.rowsWritten }; },
    tx: (fn) => storage.transactionSync(() => fn(api)),
    close() {},
  };
  return api;
}
