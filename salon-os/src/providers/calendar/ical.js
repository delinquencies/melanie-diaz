// iCal (.ics) calendar link — e.g. Google Calendar's "Secret address in iCal format".
// No OAuth, no Google Cloud project. The feed contains full event details, so this parser
// reads ONLY timing properties (DTSTART/DTEND/DURATION/RRULE/EXDATE/RDATE/RECURRENCE-ID/STATUS/TRANSP).
// SUMMARY, DESCRIPTION, LOCATION, ATTENDEE etc. are never parsed, returned or stored.
import { SALON_TZ, zonedToUtc, addDays, weekdayOf } from "../../lib/time.js";

const fail = (code, status = 400) => Object.assign(new Error(code), { code, status });
const MAX_BYTES = 5 * 1024 * 1024;
const KEEP = new Set(["BEGIN", "END", "UID", "DTSTART", "DTEND", "DURATION", "RRULE", "RDATE", "EXDATE", "RECURRENCE-ID", "STATUS", "TRANSP"]);
const DAYS = ["su", "mo", "tu", "we", "th", "fr", "sa"];

// ───────── URL handling ─────────
/** Accepts https:// or webcal:// links to a public host. Returns a normalised https URL string. */
export function normaliseFeedUrl(raw) {
  let s = String(raw || "").trim();
  if (/^webcals?:\/\//i.test(s)) s = s.replace(/^webcals?:\/\//i, "https://");
  let u;
  try { u = new URL(s); } catch { throw fail("invalid_calendar_url"); }
  if (u.protocol !== "https:") throw fail("calendar_url_must_be_https");
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local") ||
      /^\d+(\.\d+){3}$/.test(h) || h.includes(":") || h.startsWith("[")) throw fail("invalid_calendar_url");
  if (s.length > 2048) throw fail("invalid_calendar_url");
  return u.toString();
}

/** A label that identifies the link without revealing its secret part. */
export const feedHint = (url) => new URL(url).hostname;

export async function fetchFeed(fetchFn, url) {
  let res;
  try { res = await fetchFn(url, { headers: { accept: "text/calendar, text/plain;q=0.5" }, redirect: "follow" }); }
  catch { throw fail("calendar_fetch_failed", 502); }
  if (res.status === 404 || res.status === 401 || res.status === 403) throw fail("calendar_link_not_found_or_reset", 502);
  if (!res.ok) throw fail("calendar_fetch_failed", 502);
  const len = Number(res.headers.get("content-length") || 0);
  if (len > MAX_BYTES) throw fail("calendar_too_large", 502);
  const text = await res.text();
  if (text.length > MAX_BYTES) throw fail("calendar_too_large", 502);
  if (!/BEGIN:VCALENDAR/i.test(text.slice(0, 2000))) throw fail("not_an_ical_calendar", 502);
  return text;
}

// ───────── Parsing ─────────
function contentLines(text) {
  const unfolded = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "");
  const out = [];
  for (const line of unfolded.split("\n")) {
    if (!line) continue;
    // Name and params end at the first ':' that is not inside double quotes.
    let i = 0, q = false;
    for (; i < line.length; i++) { const c = line[i]; if (c === '"') q = !q; else if (c === ":" && !q) break; }
    if (i >= line.length) continue;
    const head = line.slice(0, i), value = line.slice(i + 1);
    const [rawName, ...rawParams] = head.split(";");
    const name = rawName.toUpperCase();
    if (!KEEP.has(name)) continue; // titles, descriptions, attendees, locations: dropped here
    const params = {};
    for (const p of rawParams) { const j = p.indexOf("="); if (j > 0) params[p.slice(0, j).toUpperCase()] = p.slice(j + 1).replace(/^"|"$/g, ""); }
    out.push({ name, params, value });
  }
  return out;
}

const validTz = (() => { const ok = new Map(); return (tz) => {
  if (!tz) return null;
  if (!ok.has(tz)) { try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); ok.set(tz, true); } catch { ok.set(tz, false); } }
  return ok.get(tz) ? tz : null;
}; })();

/** "20261125T150000Z" | "20261125T150000" | "20261125" → { date, time, utc, allDay, tz } */
function parseDateValue(value, params, defaultTz) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const date = `${m[1]}-${m[2]}-${m[3]}`;
  if (!m[4] || params.VALUE === "DATE") return { date, time: "00:00", allDay: true, utc: false, tz: defaultTz };
  return { date, time: `${m[4]}:${m[5]}`, allDay: false, utc: !!m[7], tz: m[7] ? "UTC" : (validTz(params.TZID) || defaultTz) };
}

const toUtcMs = (d) => d.utc ? Date.parse(`${d.date}T${d.time}:00Z`) : zonedToUtc(d.date, d.time, d.tz).getTime();

function parseDuration(v) {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(String(v || "").trim());
  if (!m) return null;
  const ms = (((+(m[2] || 0) * 7 + +(m[3] || 0)) * 24 + +(m[4] || 0)) * 60 + +(m[5] || 0)) * 60000 + +(m[6] || 0) * 1000;
  return m[1] === "-" ? -ms : ms;
}

function parseRrule(v) {
  const r = {};
  for (const part of v.split(";")) { const [k, val] = part.split("="); if (k && val !== undefined) r[k.toUpperCase()] = val.toUpperCase(); }
  return r;
}

function readEvents(lines, defaultTz) {
  const events = [];
  let ev = null, depth = 0;
  for (const l of lines) {
    if (l.name === "BEGIN") {
      if (l.value.toUpperCase() === "VEVENT" && !ev) { ev = { exdates: [], rdates: [] }; depth = 0; }
      else if (ev) depth++; // nested VALARM etc.
      continue;
    }
    if (l.name === "END") {
      if (ev && l.value.toUpperCase() === "VEVENT" && depth === 0) { events.push(ev); ev = null; }
      else if (ev) depth--;
      continue;
    }
    if (!ev || depth > 0) continue;
    switch (l.name) {
      case "UID": ev.uid = l.value; break;
      case "DTSTART": ev.start = parseDateValue(l.value, l.params, defaultTz); break;
      case "DTEND": ev.end = parseDateValue(l.value, l.params, defaultTz); break;
      case "DURATION": ev.duration = parseDuration(l.value); break;
      case "RRULE": ev.rrule = parseRrule(l.value); break;
      case "RECURRENCE-ID": ev.recurrenceId = parseDateValue(l.value, l.params, defaultTz); break;
      case "STATUS": ev.status = l.value.toUpperCase(); break;
      case "TRANSP": ev.transp = l.value.toUpperCase(); break;
      case "EXDATE": for (const v of l.value.split(",")) { const d = parseDateValue(v, l.params, defaultTz); if (d) ev.exdates.push(d); } break;
      case "RDATE": if (l.params.VALUE !== "PERIOD") for (const v of l.value.split(",")) { const d = parseDateValue(v, l.params, defaultTz); if (d) ev.rdates.push(d); } break;
    }
  }
  return events;
}

// ───────── Recurrence (RFC 5545 subset used by Google, Apple and Outlook) ─────────
const ymd = (s) => s.split("-").map(Number);
const pad = (n) => String(n).padStart(2, "0");
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m is 1-based
const dateOf = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const dayDiff = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
const SUPPORTED = new Set(["FREQ", "INTERVAL", "COUNT", "UNTIL", "BYDAY", "BYMONTHDAY", "BYMONTH", "WKST"]);

function parseByDay(s) {
  return (s || "").split(",").filter(Boolean).map((t) => {
    const m = /^([+-]?\d{1,2})?(SU|MO|TU|WE|TH|FR|SA)$/.exec(t);
    return m ? { n: m[1] ? Number(m[1]) : 0, wd: DAYS.indexOf(m[2].toLowerCase()) } : null;
  });
}

/** Days in a month matching BYDAY (with optional ordinals) / BYMONTHDAY. */
function monthDays(y, m, byDay, byMonthDay, fallbackDay) {
  const dim = daysInMonth(y, m);
  let out = [];
  if (byMonthDay.length) {
    for (const n of byMonthDay) { const d = n > 0 ? n : dim + n + 1; if (d >= 1 && d <= dim) out.push(d); }
  }
  if (byDay.length) {
    const firstWd = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const fromDay = [];
    for (const { n, wd } of byDay) {
      const all = [];
      for (let d = 1 + ((wd - firstWd + 7) % 7); d <= dim; d += 7) all.push(d);
      if (!n) fromDay.push(...all);
      else { const d = n > 0 ? all[n - 1] : all[all.length + n]; if (d) fromDay.push(d); }
    }
    out = byMonthDay.length ? out.filter((d) => fromDay.includes(d)) : fromDay;
  }
  if (!byMonthDay.length && !byDay.length) out = fallbackDay <= dim ? [fallbackDay] : [];
  return [...new Set(out)].sort((a, b) => a - b);
}

/**
 * Occurrence start dates (local "YYYY-MM-DD") for an RRULE, in order, starting at dtstart.
 * Yields until the rule ends or `lastDate` is passed. Returns null for rules we can't read.
 */
function expandDates(rule, startDate, lastDate) {
  if (Object.keys(rule).some((k) => !SUPPORTED.has(k))) return null;
  const freq = rule.FREQ;
  if (!["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) return null;
  const interval = Math.max(1, Number(rule.INTERVAL) || 1);
  const byDay = parseByDay(rule.BYDAY);
  if (byDay.includes(null)) return null;
  const byMonthDay = (rule.BYMONTHDAY || "").split(",").filter(Boolean).map(Number);
  const byMonth = (rule.BYMONTH || "").split(",").filter(Boolean).map(Number);
  if (byMonthDay.some((n) => !n || Math.abs(n) > 31) || byMonth.some((n) => !(n >= 1 && n <= 12))) return null;
  if (freq === "WEEKLY" && byDay.some((d) => d.n)) return null;
  if (freq === "YEARLY" && byDay.some((d) => d.n) && !byMonth.length) return null;

  const [sy, sm, sd] = ymd(startDate);
  const out = [];
  const inMonth = (date) => !byMonth.length || byMonth.includes(ymd(date)[1]);
  const MAX_PERIODS = 20000;
  for (let k = 0; k < MAX_PERIODS; k++) {
    let dates = [];
    if (freq === "DAILY") {
      const d = addDays(startDate, k * interval);
      if (d > lastDate) break;
      const wd = DAYS.indexOf(weekdayOf(d).slice(0, 2));
      if ((!byDay.length || byDay.some((b) => b.wd === wd)) && (!byMonthDay.length || byMonthDay.includes(ymd(d)[2]))) dates = [d];
    } else if (freq === "WEEKLY") {
      // Weeks start on WKST (default Monday).
      const wkst = DAYS.indexOf((rule.WKST || "MO").toLowerCase());
      const startWd = new Date(Date.UTC(sy, sm - 1, sd)).getUTCDay();
      const weekStart = addDays(startDate, -((startWd - wkst + 7) % 7) + k * 7 * interval);
      if (weekStart > lastDate) break;
      const wds = byDay.length ? byDay.map((b) => b.wd) : [startWd];
      dates = wds.map((wd) => addDays(weekStart, (wd - wkst + 7) % 7));
    } else if (freq === "MONTHLY") {
      const idx = (sm - 1) + k * interval, y = sy + Math.floor(idx / 12), m = (idx % 12) + 1;
      if (dateOf(y, m, 1) > lastDate) break;
      dates = monthDays(y, m, byDay, byMonthDay, sd).map((d) => dateOf(y, m, d));
    } else {
      const y = sy + k * interval;
      if (dateOf(y, 1, 1) > lastDate) break;
      for (const m of byMonth.length ? byMonth : [sm]) dates.push(...monthDays(y, m, byDay, byMonthDay, sd).map((d) => dateOf(y, m, d)));
    }
    dates = [...new Set(dates)].filter((d) => d >= startDate && inMonth(d)).sort();
    out.push(...dates);
    if (rule.COUNT && out.length >= Number(rule.COUNT)) return out.slice(0, Number(rule.COUNT));
  }
  return out;
}

/**
 * Busy intervals within [fromMs, toMs). Events marked free (TRANSP:TRANSPARENT) or cancelled are skipped,
 * matching how Google's own free/busy treats them.
 * @returns {{ busy: {start: string, end: string}[], skippedRules: number }}
 */
export function busyFromIcs(text, { fromMs, toMs, defaultTz = SALON_TZ }) {
  const events = readEvents(contentLines(text), defaultTz);
  const overrides = new Map(); // uid → Set of overridden instance start ms
  for (const e of events) if (e.uid && e.recurrenceId && e.start) {
    if (!overrides.has(e.uid)) overrides.set(e.uid, new Set());
    overrides.get(e.uid).add(toUtcMs({ ...e.recurrenceId, tz: e.recurrenceId.allDay ? e.start.tz : e.recurrenceId.tz }));
  }
  const busy = [];
  let skippedRules = 0;
  const lastDate = new Date(toMs + 2 * 86400000).toISOString().slice(0, 10);

  for (const e of events) {
    if (!e.start) continue;
    const blocks = e.status !== "CANCELLED" && e.transp !== "TRANSPARENT";
    // Length of one occurrence
    let durMs;
    if (e.end) durMs = toUtcMs(e.end) - toUtcMs(e.start);
    else if (e.duration != null) durMs = e.duration;
    else durMs = e.start.allDay ? 86400000 : 0;
    const allDayDays = e.start.allDay ? Math.max(1, Math.round(durMs / 86400000)) : 0;

    const occStart = (date) => toUtcMs({ ...e.start, date });
    const occEnd = (date, startMs) => e.start.allDay ? toUtcMs({ ...e.start, date: addDays(date, allDayDays) }) : startMs + durMs;
    const push = (date) => {
      const s = occStart(date), en = occEnd(date, s);
      if (en > s && s < toMs && en > fromMs) busy.push({ start: new Date(s).toISOString(), end: new Date(en).toISOString() });
    };

    if (!e.rrule || e.recurrenceId) { if (blocks) push(e.start.date); continue; }
    if (!blocks) continue;

    let dates = expandDates(e.rrule, e.start.date, lastDate);
    if (!dates) { skippedRules++; dates = [e.start.date]; }
    let untilMs = Infinity;
    if (e.rrule.UNTIL) { const u = parseDateValue(e.rrule.UNTIL, {}, e.start.tz); if (u) untilMs = u.allDay ? toUtcMs({ ...u, tz: e.start.tz, time: "23:59" }) : toUtcMs(u); }
    const ex = new Set(e.exdates.map((d) => d.allDay && !e.start.allDay ? `d:${d.date}` : toUtcMs(d)));
    const over = overrides.get(e.uid) || new Set();
    const seen = new Set();
    for (const date of [...dates, ...e.rdates.map((d) => d.date)]) {
      const s = occStart(date);
      if (seen.has(s) || s > untilMs || ex.has(s) || ex.has(`d:${date}`) || over.has(s)) continue;
      seen.add(s);
      push(date);
    }
  }
  busy.sort((a, b) => a.start.localeCompare(b.start));
  return { busy, skippedRules };
}
