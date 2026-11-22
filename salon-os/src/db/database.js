// Thin database adapter. Local/sandbox uses Node's built-in SQLite.
// The interface (all/get/run/tx) is deliberately small so a Cloudflare D1 adapter can replace it.
import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "schema.sql"), "utf8");
const SCHEMA_VERSION = 1;

export function openDatabase(file = ":memory:") {
  if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  const row = db.prepare("SELECT version FROM schema_version").get();
  if (!row) db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(SCHEMA_VERSION);

  const api = {
    all: (sql, ...p) => db.prepare(sql).all(...p),
    get: (sql, ...p) => db.prepare(sql).get(...p),
    run: (sql, ...p) => db.prepare(sql).run(...p),
    /** Run fn inside an IMMEDIATE transaction (takes the write lock up front → no double booking). */
    tx(fn) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const out = fn(api);
        db.exec("COMMIT");
        return out;
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
    },
    close: () => db.close(),
  };
  return api;
}
