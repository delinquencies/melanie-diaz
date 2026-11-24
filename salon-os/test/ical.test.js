import { test } from "node:test";
import assert from "node:assert/strict";
import { busyFromIcs, normaliseFeedUrl } from "../src/providers/calendar/ical.js";
import { setup, ownerSession, NOW } from "./helpers.js";

const cal = (...events) => ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Google Inc//Google Calendar 70.9054//EN", ...events.flat(), "END:VCALENDAR"].join("\r\n");
const ev = (...lines) => ["BEGIN:VEVENT", ...lines, "SUMMARY:Dentist — private", "DESCRIPTION:secret note", "LOCATION:Somewhere", "END:VEVENT"];
const win = { fromMs: NOW.getTime(), toMs: NOW.getTime() + 60 * 86400000 };

test("ical: timed UTC and TZID events become busy intervals; titles are never returned", () => {
  const { busy } = busyFromIcs(cal(
    ev("UID:a", "DTSTART:20261124T150000Z", "DTEND:20261124T160000Z"),
    ev("UID:b", "DTSTART;TZID=America/Chicago:20261125T090000", "DTEND;TZID=America/Chicago:20261125T103000"),
  ), win);
  assert.deepEqual(busy, [
    { start: "2026-11-24T15:00:00.000Z", end: "2026-11-24T16:00:00.000Z" },
    { start: "2026-11-25T15:00:00.000Z", end: "2026-11-25T16:30:00.000Z" },
  ]);
  assert.ok(!JSON.stringify(busy).includes("Dentist"));
});

test("ical: free (transparent), cancelled and past events are skipped; folded lines are read", () => {
  const { busy } = busyFromIcs(cal(
    ev("UID:free", "DTSTART:20261124T150000Z", "DTEND:20261124T160000Z", "TRANSP:TRANSPARENT"),
    ev("UID:cx", "DTSTART:20261124T170000Z", "DTEND:20261124T180000Z", "STATUS:CANCELLED"),
    ev("UID:old", "DTSTART:20251124T170000Z", "DTEND:20251124T180000Z"),
    ["BEGIN:VEVENT", "UID:fold", "DTSTART;TZID=America/C", " hicago:20261126T120000", "DURATION:PT2H", "END:VEVENT"],
  ), win);
  assert.deepEqual(busy, [{ start: "2026-11-26T18:00:00.000Z", end: "2026-11-26T20:00:00.000Z" }]);
});

test("ical: all-day events block the whole local day (Chicago)", () => {
  const { busy } = busyFromIcs(cal(ev("UID:v", "DTSTART;VALUE=DATE:20261201", "DTEND;VALUE=DATE:20261203")), win);
  assert.deepEqual(busy, [{ start: "2026-12-01T06:00:00.000Z", end: "2026-12-03T06:00:00.000Z" }]);
});

test("ical: weekly recurrence with EXDATE, a moved instance, and DST kept in local time", () => {
  // Every Tuesday 6–7pm Chicago since October (before DST ended on Nov 1).
  const { busy } = busyFromIcs(cal(
    ev("UID:gym", "DTSTART;TZID=America/Chicago:20261006T180000", "DTEND;TZID=America/Chicago:20261006T190000",
      "RRULE:FREQ=WEEKLY;BYDAY=TU;UNTIL=20261215T235959Z", "EXDATE;TZID=America/Chicago:20261201T180000"),
    ev("UID:gym", "RECURRENCE-ID;TZID=America/Chicago:20261208T180000", "DTSTART;TZID=America/Chicago:20261209T070000", "DTEND;TZID=America/Chicago:20261209T080000"),
  ), win);
  // Series started in CDT (23:00Z); after DST ends it stays 6pm local = 00:00Z next day.
  assert.deepEqual(busy.map((b) => b.start), [
    "2026-11-25T00:00:00.000Z", // Tue Nov 24 18:00 CST
    // Dec 1 excluded by EXDATE
    "2026-12-09T13:00:00.000Z", // Dec 8 instance moved to Wed Dec 9 07:00
    // Dec 15 18:00 CST is after UNTIL (Dec 15 23:59:59Z = 17:59 CST)
  ]);
});

test("ical: monthly by nth weekday, daily with COUNT and INTERVAL", () => {
  const { busy } = busyFromIcs(cal(
    ev("UID:m", "DTSTART;TZID=America/Chicago:20260901T100000", "DTEND;TZID=America/Chicago:20260901T110000", "RRULE:FREQ=MONTHLY;BYDAY=-1FR"),
    ev("UID:d", "DTSTART:20261123T120000Z", "DTEND:20261123T123000Z", "RRULE:FREQ=DAILY;INTERVAL=2;COUNT=3"),
  ), win);
  assert.deepEqual(busy.map((b) => b.start), [
    "2026-11-23T12:00:00.000Z", // daily #1 (ends after window start, still overlapping? starts before NOW → only kept if it overlaps)
    "2026-11-25T12:00:00.000Z",
    "2026-11-27T12:00:00.000Z",
    "2026-11-27T16:00:00.000Z", // last Friday of November
    "2026-12-25T16:00:00.000Z", // last Friday of December
  ].filter((s) => Date.parse(s) + 3600000 > NOW.getTime()));
});

test("ical: unreadable repeat rules are counted, not guessed", () => {
  const { busy, skippedRules } = busyFromIcs(cal(ev("UID:x", "DTSTART:20261124T150000Z", "DTEND:20261124T160000Z", "RRULE:FREQ=MONTHLY;BYSETPOS=-1;BYDAY=MO,TU")), win);
  assert.equal(skippedRules, 1);
  assert.equal(busy.length, 1); // first instance still blocks
});

test("ical: link validation", () => {
  assert.equal(normaliseFeedUrl("webcal://calendar.google.com/calendar/ical/x/private-abc/basic.ics"), "https://calendar.google.com/calendar/ical/x/private-abc/basic.ics");
  for (const bad of ["http://calendar.google.com/x.ics", "https://localhost/x.ics", "https://127.0.0.1/x.ics", "ftp://x/y", "not a url"]) {
    assert.throws(() => normaliseFeedUrl(bad));
  }
});

test("calendar link API: added after check, stored encrypted, blocks sandbox availability, removable", async () => {
  const URL_ = "https://calendar.google.com/calendar/ical/me%40gmail.com/private-abc123/basic.ics";
  const body = cal(ev("UID:a", "DTSTART;TZID=America/Chicago:20261124T090000", "DTEND;TZID=America/Chicago:20261124T170000"));
  const fetch = async (u) => (String(u) === URL_ ? new Response(body, { headers: { "content-type": "text/calendar" } }) : new Response("nope", { status: 404 }));
  const { app, db } = await setup({ fetch });
  const cookie = await ownerSession(app, db);
  const call = (method, path, json) => app.handle(new Request(`http://t${path}`, { method, headers: { cookie, "x-salon-os": "1", "content-type": "application/json" }, body: json ? JSON.stringify(json) : undefined }));

  const availPath = `/api/admin/sandbox/availability?services=${encodeURIComponent(app.ctx.config.catalog.services[0].id)}&date=2026-11-24`;
  const before = JSON.stringify(await (await call("GET", availPath)).json());

  const bad = await call("POST", "/api/admin/calendar-feeds", { name: "x", url: "https://calendar.google.com/wrong.ics" });
  assert.equal(bad.status, 502);
  assert.equal(db.get("SELECT COUNT(*) n FROM calendar_feeds").n, 0, "a broken link is not saved");

  const ok = await call("POST", "/api/admin/calendar-feeds", { name: "Personal", url: URL_ });
  assert.equal(ok.status, 201);
  const { id, busyBlocks } = await ok.json();
  assert.equal(busyBlocks, 1);
  const row = db.get("SELECT * FROM calendar_feeds WHERE id = ?", id);
  assert.ok(!row.url_enc.includes("private-abc123"), "link stored encrypted");

  const status = await (await call("GET", "/api/admin/integrations")).json();
  assert.equal(status.feeds[0].url_hint, "calendar.google.com");
  assert.ok(!JSON.stringify(status).includes("private-abc123"), "link never returned");

  const view = await (await call("GET", "/api/admin/calendar?from=2026-11-23T00:00:00Z&to=2026-11-30T00:00:00Z")).json();
  const busy = view.filter((i) => i.type === "busy");
  assert.equal(busy.length, 1);
  assert.equal(busy[0].title, "Personal — busy");

  const after = JSON.stringify(await (await call("GET", availPath)).json());
  assert.notEqual(after, before, "busy 9am–5pm changes Tuesday's availability");
  assert.ok(!after.includes("2026-11-24T16:00:00.000Z"), "no 10am slot inside busy time");

  // A reset link is reported, not silently ignored
  app.ctx.fetch = async () => new Response("gone", { status: 404 });
  const sync = await (await call("POST", "/api/admin/calendar/sync")).json();
  assert.equal(sync.feeds[0].error, "calendar_link_not_found_or_reset");
  assert.equal(db.get("SELECT last_error FROM calendar_feeds WHERE id = ?", id).last_error, "calendar_link_not_found_or_reset");

  assert.equal((await call("DELETE", `/api/admin/calendar-feeds/${id}`)).status, 200);
  assert.equal(db.get("SELECT COUNT(*) n FROM feed_busy_blocks").n, 0);
});
