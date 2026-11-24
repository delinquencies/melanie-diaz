// Whole-life calendar: salon appointments + external busy time + vacations/breaks.
// Provider-independent: providers implement { exchangeCode, ensureFresh, listCalendars, freeBusy }.
import { newId, newToken } from "../lib/security.js";
import * as google from "../providers/calendar/google.js";
import * as ical from "../providers/calendar/ical.js";

const fail = (code, status = 400) => Object.assign(new Error(code), { code, status });
const PROVIDERS = { google };

export function addTimeBlock(ctx, { kind, start, end, label }) {
  if (!["vacation", "break", "blocked", "extra_open"].includes(kind)) throw fail("invalid_kind");
  const s = new Date(start), e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) throw fail("invalid_range");
  if (e - s > 60 * 86400000) throw fail("range_too_long");
  const id = newId("tb_");
  ctx.db.run("INSERT INTO time_blocks (id, kind, starts_at, ends_at, label, created_at) VALUES (?,?,?,?,?,?)",
    id, kind, s.toISOString(), e.toISOString(), label ? String(label).slice(0, 120) : null, ctx.now().toISOString());
  return id;
}

export const removeTimeBlock = (ctx, id) => ctx.db.run("DELETE FROM time_blocks WHERE id = ?", id).changes > 0;

/** Owner-only unified view. Personal calendar entries carry no titles (we never store them). */
export function unifiedView(ctx, fromIso, toIso) {
  const { db } = ctx;
  const items = [];
  for (const a of db.all(
    `SELECT a.id, a.starts_at, a.ends_at, a.status, a.source, c.first_name, c.last_name,
            (SELECT GROUP_CONCAT(service_id) FROM appointment_services s WHERE s.appointment_id = a.id) AS services
       FROM appointments a LEFT JOIN clients c ON c.id = a.client_id
      WHERE a.starts_at < ? AND a.ends_at > ? AND a.status IN ('booked','completed')`, toIso, fromIso)) {
    items.push({ type: "appointment", layer: "business", id: a.id, start: a.starts_at, end: a.ends_at, status: a.status,
      sandbox: a.source === "sandbox", title: [a.first_name, a.last_name].filter(Boolean).join(" ") || "Unassigned client", services: a.services });
  }
  for (const b of db.all(
    `SELECT b.id, b.starts_at, b.ends_at, c.kind, c.name, c.blocks_availability FROM busy_blocks b JOIN calendars c ON c.id = b.calendar_id
      WHERE b.starts_at < ? AND b.ends_at > ?`, toIso, fromIso)) {
    items.push({ type: "busy", layer: b.kind, id: b.id, start: b.starts_at, end: b.ends_at, title: b.kind === "personal" ? "Personal — busy" : `${b.name} — busy`, blocksAvailability: !!b.blocks_availability });
  }
  for (const b of db.all(
    `SELECT b.id, b.starts_at, b.ends_at, f.kind, f.name, f.blocks_availability FROM feed_busy_blocks b JOIN calendar_feeds f ON f.id = b.feed_id
      WHERE b.starts_at < ? AND b.ends_at > ?`, toIso, fromIso)) {
    items.push({ type: "busy", layer: b.kind, id: b.id, start: b.starts_at, end: b.ends_at, title: b.kind === "personal" ? "Personal — busy" : `${b.name} — busy`, blocksAvailability: !!b.blocks_availability });
  }
  for (const t of db.all("SELECT * FROM time_blocks WHERE starts_at < ? AND ends_at > ?", toIso, fromIso)) {
    items.push({ type: "block", layer: t.kind === "extra_open" ? "business" : "personal", id: t.id, kind: t.kind, start: t.starts_at, end: t.ends_at, title: t.label || t.kind });
  }
  items.sort((a, b) => a.start.localeCompare(b.start));
  // Conflict detection: any appointment overlapping a blocking item
  const blocking = items.filter((i) => (i.type === "busy" && i.blocksAvailability) || (i.type === "block" && i.kind !== "extra_open"));
  for (const a of items.filter((i) => i.type === "appointment" && i.status === "booked")) {
    a.conflicts = blocking.filter((b) => a.start < b.end && b.start < a.end).map((b) => b.id);
  }
  return items;
}

// ───────── OAuth connection flow ─────────
export function startConnect(ctx, provider, ownerId) {
  const p = PROVIDERS[provider];
  if (!p || !p.googleConfigured(ctx.env)) throw fail("calendar_provider_not_configured", 409);
  const state = newToken();
  ctx.db.run("INSERT INTO oauth_states (state, owner_id, expires_at) VALUES (?,?,?)", state, ownerId, new Date(ctx.now().getTime() + 10 * 60000).toISOString());
  return p.buildAuthUrl(ctx.env, state);
}

export async function finishConnect(ctx, provider, { code, state }, ownerId) {
  const p = PROVIDERS[provider];
  const row = ctx.db.get("SELECT * FROM oauth_states WHERE state = ?", String(state || ""));
  ctx.db.run("DELETE FROM oauth_states WHERE state = ?", String(state || ""));
  if (!row || row.owner_id !== ownerId || row.expires_at < ctx.now().toISOString()) throw fail("invalid_oauth_state", 400);
  const tokens = await p.exchangeCode(ctx.env, ctx.fetch, String(code || ""), ctx.now());
  const cals = await p.listCalendars(ctx.fetch, tokens.access_token);
  const nowIso = ctx.now().toISOString();
  const accountId = newId("ca_");
  ctx.db.tx(() => {
    ctx.db.run("INSERT INTO calendar_accounts (id, provider, account_label, tokens_enc, created_at, updated_at) VALUES (?,?,?,?,?,?)",
      accountId, provider, cals.find((c) => c.primary)?.externalId || null, ctx.cipher.encryptJSON(tokens), nowIso, nowIso);
    for (const c of cals) {
      // Safe default: every connected calendar is treated as personal and blocks salon time until Melanie changes it.
      ctx.db.run("INSERT INTO calendars (id, account_id, external_id, name, kind, blocks_availability) VALUES (?,?,?,?, 'personal', 1)",
        newId("cal_"), accountId, c.externalId, c.name.slice(0, 120));
    }
  });
  return { accountId, calendars: cals.length };
}

export function updateCalendar(ctx, id, { kind, blocksAvailability }) {
  if (kind && !["personal", "business"].includes(kind)) throw fail("invalid_kind");
  const r = ctx.db.run("UPDATE calendars SET kind = COALESCE(?, kind), blocks_availability = COALESCE(?, blocks_availability) WHERE id = ?",
    kind || null, typeof blocksAvailability === "boolean" ? (blocksAvailability ? 1 : 0) : null, id);
  return r.changes > 0;
}

/** Pull busy intervals for the next `days` days and replace the cached copy. */
export async function syncBusy(ctx, { days = 60 } = {}) {
  const { db, cipher } = ctx;
  const now = ctx.now();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + days * 86400000).toISOString();
  let total = 0;
  for (const acct of db.all("SELECT * FROM calendar_accounts")) {
    const p = PROVIDERS[acct.provider];
    const { tokens, refreshed } = await p.ensureFresh(ctx.env, ctx.fetch, cipher.decryptJSON(acct.tokens_enc), now);
    if (refreshed) db.run("UPDATE calendar_accounts SET tokens_enc = ?, updated_at = ? WHERE id = ?", cipher.encryptJSON(tokens), now.toISOString(), acct.id);
    const cals = db.all("SELECT * FROM calendars WHERE account_id = ?", acct.id);
    if (!cals.length) continue;
    const busy = await p.freeBusy(ctx.fetch, tokens.access_token, cals.map((c) => c.external_id), timeMin, timeMax);
    db.tx(() => {
      for (const c of cals) {
        db.run("DELETE FROM busy_blocks WHERE calendar_id = ? AND ends_at > ?", c.id, timeMin);
        for (const b of busy[c.external_id] || []) {
          db.run("INSERT INTO busy_blocks (id, calendar_id, starts_at, ends_at, synced_at) VALUES (?,?,?,?,?)",
            newId("bb_"), c.id, new Date(b.start).toISOString(), new Date(b.end).toISOString(), now.toISOString());
          total++;
        }
      }
    });
  }
  const feeds = [];
  for (const f of db.all("SELECT id FROM calendar_feeds")) {
    const r = await syncFeed(ctx, f.id, { days });
    feeds.push(r);
    total += r.busyBlocks || 0;
  }
  return { busyBlocks: total, feeds, window: { timeMin, timeMax } };
}

// ───────── Calendar links (iCal) ─────────
/** Fetch one link and replace its cached busy time. Never throws: errors are recorded on the feed. */
export async function syncFeed(ctx, id, { days = 60, url } = {}) {
  const { db, cipher } = ctx;
  const now = ctx.now();
  const fromMs = now.getTime(), toMs = fromMs + days * 86400000;
  const row = db.get("SELECT * FROM calendar_feeds WHERE id = ?", id);
  if (!row) return { id, error: "not_found" };
  try {
    const text = await ical.fetchFeed(ctx.fetch, url || cipher.decryptText(row.url_enc));
    const { busy, skippedRules } = ical.busyFromIcs(text, { fromMs, toMs });
    const nowIso = now.toISOString(), fromIso = new Date(fromMs).toISOString();
    db.tx(() => {
      db.run("DELETE FROM feed_busy_blocks WHERE feed_id = ? AND ends_at > ?", id, fromIso);
      for (const b of busy) db.run("INSERT INTO feed_busy_blocks (id, feed_id, starts_at, ends_at, synced_at) VALUES (?,?,?,?,?)", newId("fb_"), id, b.start, b.end, nowIso);
      db.run("UPDATE calendar_feeds SET last_synced_at = ?, last_error = NULL, last_count = ?, skipped_rules = ? WHERE id = ?", nowIso, busy.length, skippedRules, id);
    });
    return { id, busyBlocks: busy.length, skippedRules };
  } catch (e) {
    db.run("UPDATE calendar_feeds SET last_error = ? WHERE id = ?", String(e.code || "calendar_fetch_failed").slice(0, 80), id);
    return { id, busyBlocks: 0, error: e.code || "calendar_fetch_failed" };
  }
}

/** Add a calendar link. It is checked (fetched and read) before it is saved. */
export async function addFeed(ctx, { name, url }) {
  const clean = ical.normaliseFeedUrl(url);
  // Validate first so a wrong link is never stored.
  const text = await ical.fetchFeed(ctx.fetch, clean);
  ical.busyFromIcs(text, { fromMs: ctx.now().getTime(), toMs: ctx.now().getTime() + 86400000 });
  const id = newId("cf_");
  ctx.db.run("INSERT INTO calendar_feeds (id, name, url_enc, url_hint, kind, blocks_availability, created_at) VALUES (?,?,?,?, 'personal', 1, ?)",
    id, String(name || "").trim().slice(0, 80) || "Personal calendar", ctx.cipher.encryptText(clean), ical.feedHint(clean), ctx.now().toISOString());
  const result = await syncFeed(ctx, id, { url: clean });
  return { id, ...result };
}

export function updateFeed(ctx, id, { kind, blocksAvailability, name }) {
  if (kind && !["personal", "business"].includes(kind)) throw fail("invalid_kind");
  const r = ctx.db.run("UPDATE calendar_feeds SET kind = COALESCE(?, kind), blocks_availability = COALESCE(?, blocks_availability), name = COALESCE(?, name) WHERE id = ?",
    kind || null, typeof blocksAvailability === "boolean" ? (blocksAvailability ? 1 : 0) : null, name ? String(name).trim().slice(0, 80) : null, id);
  return r.changes > 0;
}

export function removeFeed(ctx, id) {
  return ctx.db.tx(() => {
    ctx.db.run("DELETE FROM feed_busy_blocks WHERE feed_id = ?", id);
    return ctx.db.run("DELETE FROM calendar_feeds WHERE id = ?", id).changes > 0;
  });
}

export function integrationsStatus(ctx) {
  return {
    feeds: ctx.db.all(`SELECT id, name, url_hint, kind, blocks_availability, last_synced_at, last_error, last_count, skipped_rules
      FROM calendar_feeds ORDER BY created_at`),
    google: {
      configured: google.googleConfigured(ctx.env),
      accounts: ctx.db.all("SELECT id, account_label, updated_at FROM calendar_accounts WHERE provider='google'"),
      calendars: ctx.db.all("SELECT id, account_id, name, kind, blocks_availability FROM calendars ORDER BY name"),
    },
    goldie: { mode: "link-out", api: false, note: "No supported Goldie API; bookings stay in Goldie." },
  };
}
