import { test } from "node:test";
import assert from "node:assert/strict";
import { setup, NOW, validNewAnswers } from "./helpers.js";
import { planServices, createSandboxAppointment, setSandboxStatus, sandboxAvailability, checkEligibility } from "../src/domain/appointments.js";
import { submitIntake } from "../src/domain/intake.js";
import { addTimeBlock, unifiedView, startConnect, finishConnect, syncBusy } from "../src/domain/calendar.js";
import { buildAuthUrl } from "../src/providers/calendar/google.js";

const TUE_11 = "2026-11-24T17:00:00.000Z";

test("service planning: totals, 25% deposit, duplicate haircut blocked", () => {
  const { ctx } = setup();
  const p = planServices(ctx.config, ["signature-silk-press"]);
  assert.equal(p.totalCents, 11000); assert.equal(p.depositCents, 2750); assert.equal(p.balanceCents, 8250);
  assert.throws(() => planServices(ctx.config, ["first-time-curly-experience", "dry-curly-cut"]), { code: "duplicate_included_service" });
});

test("sandbox booking: slot revalidated; double booking impossible; cancel frees time", () => {
  const { ctx } = setup();
  const a = createSandboxAppointment(ctx, { serviceIds: ["signature-silk-press"], start: TUE_11 });
  assert.equal(a.sandbox, true);
  assert.throws(() => createSandboxAppointment(ctx, { serviceIds: ["signature-silk-press"], start: TUE_11 }), { code: "slot_unavailable" });
  assert.throws(() => createSandboxAppointment(ctx, { serviceIds: ["signature-silk-press"], start: "2026-11-24T17:15:00.000Z" }), { code: "slot_unavailable" }); // off-grid
  const slots = sandboxAvailability(ctx, { serviceIds: ["signature-silk-press"], date: "2026-11-24" }).days[0].slots.map((s) => s.start);
  assert.ok(!slots.includes(TUE_11));
  setSandboxStatus(ctx, a.id, "cancelled");
  const after = sandboxAvailability(ctx, { serviceIds: ["signature-silk-press"], date: "2026-11-24" }).days[0].slots.map((s) => s.start);
  assert.ok(after.includes(TUE_11));
  assert.throws(() => setSandboxStatus(ctx, a.id, "completed"), { code: "invalid_transition" });
});

test("sandbox never edits non-sandbox appointments", () => {
  const { ctx, db } = setup();
  db.run(`INSERT INTO appointments (id, source, status, starts_at, ends_at, service_ends_at, total_cents, created_at, updated_at)
          VALUES ('real1','manual','booked',?,?,?,0,?,?)`, TUE_11, "2026-11-24T18:00:00.000Z", "2026-11-24T18:00:00.000Z", NOW.toISOString(), NOW.toISOString());
  assert.throws(() => setSandboxStatus(ctx, "real1", "cancelled"), { code: "not_sandbox" });
});

test("eligibility: returning-only services need VERIFIED history within the window", () => {
  const { ctx, db } = setup();
  const s = ctx.config.service("dry-curly-cut");
  assert.equal(checkEligibility(ctx, null, s).eligible, false);
  const out = submitIntake(ctx, { formId: "client-intake", serviceId: "first-time-curly-experience", clientType: "new", answers: validNewAnswers(), consents: { storage: true } });
  const cid = out._clientId;
  assert.equal(checkEligibility(ctx, cid, s).reason, "returning_history_not_verified");
  // A sandbox "completed" appointment must NOT count as verified history
  const sb = createSandboxAppointment(ctx, { clientId: cid, serviceIds: ["first-time-curly-experience"], start: TUE_11 });
  setSandboxStatus(ctx, sb.id, "completed");
  assert.equal(checkEligibility(ctx, cid, s).eligible, false);
  // A real (manually recorded) First-Time Experience 8 months ago → too old
  const add = (id, iso) => {
    db.run(`INSERT INTO appointments (id, client_id, source, status, starts_at, ends_at, service_ends_at, total_cents, created_at, updated_at)
            VALUES (?,?,'manual','completed',?,?,?,16000,?,?)`, id, cid, iso, iso, iso, iso, iso);
    db.run("INSERT INTO appointment_services VALUES (?, 'first-time-curly-experience', 16000, 145)", id);
  };
  add("old", "2026-03-10T17:00:00.000Z");
  assert.match(checkEligibility(ctx, cid, s).reason, /within_6_months/);
  add("recent", "2026-09-10T17:00:00.000Z");
  assert.equal(checkEligibility(ctx, cid, s).eligible, true);
  assert.equal(checkEligibility(ctx, cid, ctx.config.service("first-time-curly-reset")).reason, "first_time_service_for_returning_client");
});

test("vacations and personal busy time block sandbox availability", () => {
  const { ctx } = setup();
  addTimeBlock(ctx, { kind: "vacation", start: "2026-11-25T00:00:00Z", end: "2026-11-27T06:00:00Z", label: "Thanksgiving" });
  const days = sandboxAvailability(ctx, { serviceIds: ["dry-curly-cut"], date: "2026-11-25", days: 2 }).days;
  assert.equal(days[0].slots.length, 0); assert.equal(days[1].slots.length, 0);
});

test("Google: auth URL, state check, token storage encrypted, busy sync without titles", async () => {
  const calls = [];
  const fakeFetch = async (url, opts = {}) => {
    calls.push(String(url));
    const json = (b) => new Response(JSON.stringify(b), { status: 200, headers: { "content-type": "application/json" } });
    if (String(url).startsWith("https://oauth2.googleapis.com/token")) return json({ access_token: "at1", refresh_token: "rt1", expires_in: 3600 });
    if (String(url).includes("/calendarList")) return json({ items: [{ id: "me@gmail.com", summary: "Melanie", primary: true }] });
    if (String(url).endsWith("/freeBusy")) {
      const body = JSON.parse(opts.body);
      return json({ calendars: { [body.items[0].id]: { busy: [{ start: "2026-11-24T19:00:00Z", end: "2026-11-24T20:00:00Z" }] } } });
    }
    return new Response("{}", { status: 404 });
  };
  const env = { GOOGLE_CLIENT_ID: "cid", GOOGLE_CLIENT_SECRET: "sec", GOOGLE_REDIRECT_URI: "http://localhost/cb" };
  const { ctx, db } = setup({ env, fetch: fakeFetch });

  const u = new URL(buildAuthUrl(env, "st"));
  assert.equal(u.searchParams.get("access_type"), "offline");
  assert.match(u.searchParams.get("scope"), /calendar\.readonly/);

  db.run("INSERT INTO owners (id, email, password_hash, created_at) VALUES ('ow1','o@x.co','x','now')");
  const authUrl = new URL(startConnect(ctx, "google", "ow1"));
  const state = authUrl.searchParams.get("state");
  await assert.rejects(finishConnect(ctx, "google", { code: "c", state: "forged" }, "ow1"), { code: "invalid_oauth_state" });
  const state2 = new URL(startConnect(ctx, "google", "ow1")).searchParams.get("state");
  assert.notEqual(state, state2);
  await finishConnect(ctx, "google", { code: "c", state: state2 }, "ow1");
  assert.ok(!db.get("SELECT tokens_enc FROM calendar_accounts").tokens_enc.includes("rt1"));

  const r = await syncBusy(ctx);
  assert.equal(r.busyBlocks, 1);
  const view = unifiedView(ctx, "2026-11-24T00:00:00Z", "2026-11-25T00:00:00Z");
  assert.equal(view[0].title, "Personal — busy");
  const slots = sandboxAvailability(ctx, { serviceIds: ["dry-curly-cut"], date: "2026-11-24" }).days[0].slots.map((s) => s.start);
  assert.ok(!slots.includes("2026-11-24T19:00:00.000Z"));
});
