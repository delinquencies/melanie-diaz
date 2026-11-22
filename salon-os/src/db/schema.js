export const SCHEMA_VERSION = 1;
export const SCHEMA = `
-- Salon OS schema (SQLite: Node node:sqlite locally, Cloudflare Durable Object SQLite in production). Money = integer cents. Time = UTC ISO-8601 strings.
-- Three core records: client, appointment, transaction. Everything else hangs off them.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);

-- ───────────── Clients ─────────────
CREATE TABLE IF NOT EXISTS clients (
  id                TEXT PRIMARY KEY,
  first_name        TEXT NOT NULL,
  last_name         TEXT,
  email             TEXT,                 -- normalized lower-case
  phone             TEXT,                 -- normalized E.164 (+1XXXXXXXXXX)
  preferred_contact TEXT CHECK (preferred_contact IN ('text','call','email','whatsapp') OR preferred_contact IS NULL),
  preferred_language TEXT CHECK (preferred_language IN ('en','es') OR preferred_language IS NULL),
  -- New vs returning: what the client told us vs what records prove. Never inferred from name alone.
  client_type_reported TEXT CHECK (client_type_reported IN ('new','returning') OR client_type_reported IS NULL),
  history_verified  INTEGER NOT NULL DEFAULT 0,   -- 1 only when a completed appointment is on record
  needs_review      INTEGER NOT NULL DEFAULT 0,   -- e.g. reported returning but no matching record
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','deleted')),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS clients_email ON clients(email) WHERE email IS NOT NULL AND status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS clients_phone ON clients(phone) WHERE phone IS NOT NULL AND status = 'active';

-- Original acquisition is written once and never overwritten (first touch).
CREATE TABLE IF NOT EXISTS client_acquisition (
  client_id         TEXT PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  reported_source   TEXT,                 -- self-reported answer ("How did you hear about Melanie?")
  reported_other    TEXT,
  referrer_name     TEXT,                 -- optional, only for referrals
  captured_json     TEXT,                 -- automatically captured UTM / click ids / referrer (may be NULL)
  first_seen_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS consents (
  id            TEXT PRIMARY KEY,
  client_id     TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,            -- 'intake_storage' | 'photos' | 'marketing'
  version       TEXT NOT NULL,            -- version of the consent text shown
  granted       INTEGER NOT NULL,
  recorded_at   TEXT NOT NULL
);

-- ───────────── Intake ─────────────
CREATE TABLE IF NOT EXISTS intake_submissions (
  id              TEXT PRIMARY KEY,
  client_id       TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  form_id         TEXT NOT NULL,
  form_version    INTEGER NOT NULL,
  service_id      TEXT,                   -- catalog service the client was booking
  answers_enc     TEXT NOT NULL,          -- AES-256-GCM encrypted JSON of all answers
  has_sensitive   INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','archived')),
  booking_handoff TEXT,                   -- 'goldie' | 'native-sandbox' | NULL (skipped)
  submitted_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS photos (
  id              TEXT PRIMARY KEY,
  client_id       TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  submission_id   TEXT REFERENCES intake_submissions(id) ON DELETE SET NULL,
  kind            TEXT NOT NULL CHECK (kind IN ('current','inspiration','professional')),
  mime            TEXT NOT NULL,
  bytes           INTEGER NOT NULL,
  storage_key     TEXT NOT NULL,          -- encrypted file name in private storage
  created_at      TEXT NOT NULL
);

-- ───────────── Professional records (Melanie) — append-only ─────────────
CREATE TABLE IF NOT EXISTS client_notes (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('consultation','general','preference','sensitivity')),
  body_enc    TEXT NOT NULL,
  author      TEXT NOT NULL DEFAULT 'owner',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS treatment_records (
  id              TEXT PRIMARY KEY,
  client_id       TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  appointment_id  TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  performed_on    TEXT NOT NULL,           -- local date YYYY-MM-DD
  services        TEXT,                    -- free text / service ids
  formula_enc     TEXT,                    -- color/chemical formula (encrypted)
  products_used   TEXT,
  notes_enc       TEXT,
  supersedes_id   TEXT REFERENCES treatment_records(id),  -- corrections add a new row; history kept
  created_at      TEXT NOT NULL
);

-- ───────────── Appointments ─────────────
CREATE TABLE IF NOT EXISTS appointments (
  id            TEXT PRIMARY KEY,
  client_id     TEXT REFERENCES clients(id) ON DELETE SET NULL,
  source        TEXT NOT NULL CHECK (source IN ('sandbox','goldie-import','manual')),
  status        TEXT NOT NULL CHECK (status IN ('booked','completed','cancelled','no_show','late_cancel')),
  starts_at     TEXT NOT NULL,             -- UTC
  ends_at       TEXT NOT NULL,             -- UTC, includes buffer/processing (blocks the chair)
  service_ends_at TEXT NOT NULL,           -- UTC, end of client-facing service time
  total_cents   INTEGER NOT NULL,          -- booked service value (not collected revenue)
  deposit_cents INTEGER NOT NULL DEFAULT 0,
  consultation_required INTEGER NOT NULL DEFAULT 0,
  external_ref  TEXT,                      -- e.g. Goldie booking id if ever imported
  notes         TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS appts_time ON appointments(starts_at, ends_at);

CREATE TABLE IF NOT EXISTS appointment_services (
  appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id     TEXT NOT NULL,
  price_cents    INTEGER NOT NULL,          -- price at time of booking (history preserved)
  duration_min   INTEGER NOT NULL,
  PRIMARY KEY (appointment_id, service_id)
);

CREATE TABLE IF NOT EXISTS appointment_events (   -- status history / audit
  id             TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  event          TEXT NOT NULL,
  detail         TEXT,
  at             TEXT NOT NULL
);

-- ───────────── Transactions (foundation only; no processor connected) ─────────────
CREATE TABLE IF NOT EXISTS transactions (
  id              TEXT PRIMARY KEY,
  kind            TEXT NOT NULL CHECK (kind IN ('deposit','service_payment','tip','refund','retail_sale','expense','adjustment')),
  amount_cents    INTEGER NOT NULL,          -- positive in, negative out (refund/expense negative)
  client_id       TEXT REFERENCES clients(id) ON DELETE SET NULL,
  appointment_id  TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  applies_to_id   TEXT REFERENCES transactions(id),  -- refund→payment, deposit applied→payment
  method          TEXT,                       -- card/cash/etc. Recorded, not processed.
  external_ref    TEXT,                       -- processor reference when one exists
  status          TEXT NOT NULL CHECK (status IN ('recorded','pending','void')),
  occurred_at     TEXT NOT NULL,
  memo            TEXT,
  created_at      TEXT NOT NULL
);

-- ───────────── Calendars ─────────────
CREATE TABLE IF NOT EXISTS calendar_accounts (
  id            TEXT PRIMARY KEY,
  provider      TEXT NOT NULL CHECK (provider IN ('google')),
  account_label TEXT,
  tokens_enc    TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS calendars (
  id                  TEXT PRIMARY KEY,
  account_id          TEXT NOT NULL REFERENCES calendar_accounts(id) ON DELETE CASCADE,
  external_id         TEXT NOT NULL,
  name                TEXT NOT NULL,
  kind                TEXT NOT NULL CHECK (kind IN ('personal','business')),
  blocks_availability INTEGER NOT NULL DEFAULT 1,
  UNIQUE (account_id, external_id)
);

-- Busy time from external calendars. Personal events store NO title/description.
CREATE TABLE IF NOT EXISTS busy_blocks (
  id           TEXT PRIMARY KEY,
  calendar_id  TEXT NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  starts_at    TEXT NOT NULL,
  ends_at      TEXT NOT NULL,
  synced_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS busy_time ON busy_blocks(starts_at, ends_at);

-- Vacations, breaks, manual blocks, one-off openings.
CREATE TABLE IF NOT EXISTS time_blocks (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('vacation','break','blocked','extra_open')),
  starts_at   TEXT NOT NULL,
  ends_at     TEXT NOT NULL,
  label       TEXT,                         -- private; never shown to clients
  created_at  TEXT NOT NULL
);

-- ───────────── Owner auth & audit ─────────────
CREATE TABLE IF NOT EXISTS owners (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id        TEXT PRIMARY KEY,
  actor     TEXT NOT NULL,               -- 'owner:<id>' | 'public' | 'system'
  action    TEXT NOT NULL,
  subject   TEXT,
  at        TEXT NOT NULL
);

-- Encrypted blobs (photos) stored in 1 MB chunks when no object store (R2) is configured.
CREATE TABLE IF NOT EXISTS blob_chunks (
  blob_key  TEXT NOT NULL,
  idx       INTEGER NOT NULL,
  data      BLOB NOT NULL,
  PRIMARY KEY (blob_key, idx)
);

CREATE TABLE IF NOT EXISTS oauth_states (
  state       TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL,
  expires_at  TEXT NOT NULL
);
`;
