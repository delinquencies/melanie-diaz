// HTTP application (fetch-style: Request → Response). Runtime-neutral: the Node adapter (src/server.js)
// and the Cloudflare Worker (src/worker.js) both inject db, config, blob storage and static handling.
import { Buffer } from "node:buffer";
import { makeCipher, loadKey } from "./lib/security.js";
import { submitIntake, listIntakes, setIntakeStatus } from "./domain/intake.js";
import { listClients, clientProfile, addNote, addTreatment, exportClient, deleteClient, audit } from "./domain/clients.js";
import { readPhoto } from "./domain/photos.js";
import { acquisitionReport } from "./domain/attribution.js";
import { sandboxAvailability, createSandboxAppointment, setSandboxStatus } from "./domain/appointments.js";
import { addTimeBlock, removeTimeBlock, unifiedView, startConnect, finishConnect, updateCalendar, syncBusy, integrationsStatus, addFeed, updateFeed, removeFeed } from "./domain/calendar.js";
import { bookingProviders, liveProvider } from "./providers/booking.js";
import { login, logout, sessionOwner, sessionCookie, clearCookie, readCookie, makeThrottle, SESSION_COOKIE, createOwner } from "./auth.js";
import { sha256 } from "./lib/security.js";

export const SECURITY_HEADERS = {
  "content-security-policy": "default-src 'self'; img-src 'self' blob: data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'; object-src 'none'",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

/**
 * @param o.db         database adapter {all,get,run,tx}
 * @param o.config     result of buildConfig()
 * @param o.blobs      blob store {put,get,delete} for encrypted photos
 * @param o.staticFile optional async (path) => Response|null
 */
export function createApp({ db, config, blobs, staticFile = async () => null, env = {}, now = () => new Date(), fetch: fetchFn = globalThis.fetch }) {
  const cipher = makeCipher(loadKey(env.SALON_OS_DATA_KEY));
  const ctx = { db, cipher, config, env, now, fetch: fetchFn, storage: { cipher, blobs } };
  const secure = env.NODE_ENV === "production";
  const loginThrottle = makeThrottle({ max: 5, windowMs: 15 * 60000 });
  const intakeThrottle = makeThrottle({ max: 20, windowMs: 60 * 60000 });

  const respond = (status, body, headers = {}) => new Response(
    body == null ? null : typeof body === "string" ? body : JSON.stringify(body),
    { status, headers: { ...SECURITY_HEADERS, "cache-control": "no-store", ...(typeof body === "string" || body == null ? {} : { "content-type": "application/json" }), ...headers } });
  const err = (status, code, detail) => respond(status, { error: code, ...(detail ? { detail } : {}) });

  const routes = [];
  const on = (method, pattern, handler, { admin = false } = {}) =>
    routes.push({ method, re: new RegExp("^" + pattern.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$"), handler, admin });

  // ───────── Public ─────────
  on("GET", "/api/public/catalog", () => respond(200, {
    liveProvider: liveProvider().id,
    services: config.catalog.services.map((s) => ({
      id: s.id, name: s.name, priceCents: s.priceCents, pricing: s.pricing, durationMin: s.durationMin, clientTypes: s.clientTypes,
      includesCut: s.includesCut, intakeTags: s.intakeTags,
      depositCents: Math.round(s.priceCents * (config.schedule.depositPercent || 0) / 100),
      bookingUrl: liveProvider().bookingUrl(config, s),
    })),
    policy: { depositPercent: config.schedule.depositPercent, cancelWindowHours: config.schedule.cancelWindowHours },
  }));

  on("GET", "/api/public/forms/:id", (req, p) => {
    const f = config.latestForm(p.id);
    return f ? respond(200, f) : err(404, "unknown_form");
  });

  on("POST", "/api/public/intake", async (req, p, ip) => {
    // Kill switch: production ships with PUBLIC_INTAKE=off until Melanie approves the form.
    if (env.PUBLIC_INTAKE === "off") return err(503, "intake_not_enabled");
    if (intakeThrottle.blocked(ip, now().getTime())) return err(429, "too_many_requests");
    intakeThrottle.fail(ip, now().getTime()); // count every submission attempt
    let form;
    try { form = await req.formData(); } catch { return err(400, "multipart_required"); }
    let payload;
    try { payload = JSON.parse(form.get("payload") || "{}"); } catch { return err(400, "invalid_payload"); }
    if (payload.website) return respond(200, { ok: true }); // honeypot: pretend success, store nothing
    const photos = [];
    for (const [key, value] of form.entries()) {
      if (!key.startsWith("photo:") || typeof value === "string") continue;
      photos.push({ fieldId: key.slice(6), bytes: Buffer.from(await value.arrayBuffer()) });
    }
    if (photos.length > 6) return err(400, "too_many_files");
    const out = await submitIntake(ctx, { ...payload, photos });
    return respond(201, { ok: true, submissionId: out.submissionId, next: out.next });
  });

  // ───────── One-time owner setup (deployed environments) ─────────
  // Works only when SETUP_TOKEN is configured AND no owner exists yet. Delete the secret afterwards.
  on("POST", "/api/setup/owner", async (req, p, ip) => {
    const t = now().getTime();
    if (loginThrottle.blocked(`setup:${ip}`, t)) return err(429, "too_many_attempts");
    const expected = env.SETUP_TOKEN;
    const given = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!expected || given.length !== expected.length || sha256(given) !== sha256(expected)) {
      loginThrottle.fail(`setup:${ip}`, t);
      return err(403, "forbidden");
    }
    if (db.get("SELECT 1 AS x FROM owners")) return err(409, "owner_exists");
    const b = await req.json().catch(() => ({}));
    try { createOwner(db, b.email, b.password, now().toISOString()); }
    catch (e) { return err(400, "invalid_owner", e.message); }
    audit(db, "system", "owner.created", null, now().toISOString());
    return respond(201, { ok: true });
  });

  // ───────── Owner auth ─────────
  on("POST", "/api/admin/login", async (req, p, ip) => {
    const t = now().getTime();
    if (loginThrottle.blocked(ip, t)) return err(429, "too_many_attempts");
    const body = await req.json().catch(() => ({}));
    const s = login(db, body.email, body.password, now());
    if (!s) { loginThrottle.fail(ip, t); return err(401, "invalid_credentials"); }
    loginThrottle.reset(ip);
    audit(db, `owner:${s.ownerId}`, "login", null, now().toISOString());
    return respond(200, { ok: true }, { "set-cookie": sessionCookie(s.token, secure) });
  });
  on("POST", "/api/admin/logout", (req) => { logout(db, readCookie(req, SESSION_COOKIE)); return respond(200, { ok: true }, { "set-cookie": clearCookie(secure) }); });
  on("GET", "/api/admin/me", (req, p, ip, owner) => respond(200, { email: owner.email }), { admin: true });

  // ───────── Clients & intake ─────────
  on("GET", "/api/admin/clients", (req) => {
    const u = new URL(req.url);
    return respond(200, listClients(db, { q: u.searchParams.get("q"), needsReview: u.searchParams.get("review") === "1" }));
  }, { admin: true });
  on("GET", "/api/admin/clients/:id", (req, p, ip, owner) => {
    const prof = clientProfile(ctx, p.id);
    if (!prof) return err(404, "not_found");
    audit(db, `owner:${owner.id}`, "client.viewed", p.id, now().toISOString());
    return respond(200, prof);
  }, { admin: true });
  on("POST", "/api/admin/clients/:id/notes", async (req, p) => respond(201, { id: addNote(ctx, p.id, await req.json()) }), { admin: true });
  on("POST", "/api/admin/clients/:id/treatments", async (req, p) => respond(201, { id: addTreatment(ctx, p.id, await req.json()) }), { admin: true });
  on("GET", "/api/admin/clients/:id/export", (req, p, ip, owner) => {
    const data = exportClient(ctx, p.id);
    if (!data) return err(404, "not_found");
    audit(db, `owner:${owner.id}`, "client.exported", p.id, now().toISOString());
    return respond(200, data, { "content-disposition": `attachment; filename="client-${p.id}.json"` });
  }, { admin: true });
  on("DELETE", "/api/admin/clients/:id", async (req, p, ip, owner) => {
    const body = await req.json().catch(() => ({}));
    if (body.confirm !== p.id) return err(400, "confirmation_required");
    return (await deleteClient(ctx, p.id, `owner:${owner.id}`)) ? respond(200, { ok: true }) : err(404, "not_found");
  }, { admin: true });
  on("GET", "/api/admin/photos/:id", async (req, p) => {
    const ph = db.get("SELECT * FROM photos WHERE id = ?", p.id);
    if (!ph) return err(404, "not_found");
    return new Response(await readPhoto(ctx.storage, ph.storage_key), { status: 200, headers: { ...SECURITY_HEADERS, "content-type": ph.mime, "cache-control": "private, no-store" } });
  }, { admin: true });
  on("GET", "/api/admin/intakes", (req) => respond(200, listIntakes(ctx, { status: new URL(req.url).searchParams.get("status") || undefined })), { admin: true });
  on("POST", "/api/admin/intakes/:id/status", async (req, p) => {
    const b = await req.json();
    return setIntakeStatus(ctx, p.id, b.status) ? respond(200, { ok: true }) : err(404, "not_found");
  }, { admin: true });

  // ───────── Calendar ─────────
  on("GET", "/api/admin/calendar", (req) => {
    const u = new URL(req.url);
    const from = u.searchParams.get("from"), to = u.searchParams.get("to");
    if (!from || !to || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) return err(400, "from_to_required");
    if (Date.parse(to) - Date.parse(from) > 42 * 86400000) return err(400, "range_too_long");
    return respond(200, unifiedView(ctx, new Date(from).toISOString(), new Date(to).toISOString()));
  }, { admin: true });
  on("POST", "/api/admin/time-blocks", async (req) => respond(201, { id: addTimeBlock(ctx, await req.json()) }), { admin: true });
  on("DELETE", "/api/admin/time-blocks/:id", (req, p) => removeTimeBlock(ctx, p.id) ? respond(200, { ok: true }) : err(404, "not_found"), { admin: true });
  on("GET", "/api/admin/integrations", () => respond(200, { ...integrationsStatus(ctx), booking: Object.values(bookingProviders).map(({ id, live, capabilities }) => ({ id, live, capabilities })) }), { admin: true });
  on("GET", "/api/admin/oauth/google/start", (req, p, ip, owner) => respond(302, null, { location: startConnect(ctx, "google", owner.id) }), { admin: true });
  on("GET", "/api/admin/oauth/google/callback", async (req, p, ip, owner) => {
    const u = new URL(req.url);
    if (u.searchParams.get("error")) return respond(302, null, { location: "/admin/#/settings?google=denied" });
    await finishConnect(ctx, "google", { code: u.searchParams.get("code"), state: u.searchParams.get("state") }, owner.id);
    return respond(302, null, { location: "/admin/#/settings?google=connected" });
  }, { admin: true });
  on("POST", "/api/admin/calendars/:id", async (req, p) => updateCalendar(ctx, p.id, await req.json()) ? respond(200, { ok: true }) : err(404, "not_found"), { admin: true });
  on("POST", "/api/admin/calendar/sync", async () => respond(200, await syncBusy(ctx)), { admin: true });
  on("POST", "/api/admin/calendar-feeds", async (req, p, ip, owner) => {
    const r = await addFeed(ctx, await req.json());
    audit(db, `owner:${owner.id}`, "calendar_feed.added", r.id, now().toISOString());
    return respond(201, r);
  }, { admin: true });
  on("POST", "/api/admin/calendar-feeds/:id", async (req, p) => updateFeed(ctx, p.id, await req.json()) ? respond(200, { ok: true }) : err(404, "not_found"), { admin: true });
  on("DELETE", "/api/admin/calendar-feeds/:id", (req, p, ip, owner) => {
    if (!removeFeed(ctx, p.id)) return err(404, "not_found");
    audit(db, `owner:${owner.id}`, "calendar_feed.removed", p.id, now().toISOString());
    return respond(200, { ok: true });
  }, { admin: true });

  // ───────── Native booking engine (sandbox) ─────────
  on("GET", "/api/admin/sandbox/availability", (req) => {
    const u = new URL(req.url);
    return respond(200, sandboxAvailability(ctx, { serviceIds: (u.searchParams.get("services") || "").split(",").filter(Boolean), date: u.searchParams.get("date"), days: u.searchParams.get("days") }));
  }, { admin: true });
  on("POST", "/api/admin/sandbox/appointments", async (req) => respond(201, createSandboxAppointment(ctx, await req.json())), { admin: true });
  on("POST", "/api/admin/sandbox/appointments/:id/status", async (req, p) => {
    const b = await req.json();
    return respond(200, { ok: setSandboxStatus(ctx, p.id, b.status, b.detail) });
  }, { admin: true });

  // ───────── Reports ─────────
  on("GET", "/api/admin/reports/acquisition", () => respond(200, acquisitionReport(db)), { admin: true });
  on("GET", "/api/admin/overview", () => {
    const nowIso = now().toISOString();
    return respond(200, {
      newIntakes: db.get("SELECT COUNT(*) n FROM intake_submissions WHERE status='new'").n,
      needsReview: db.get("SELECT COUNT(*) n FROM clients WHERE needs_review=1 AND status='active'").n,
      clients: db.get("SELECT COUNT(*) n FROM clients WHERE status='active'").n,
      upcomingRealAppointments: db.get("SELECT COUNT(*) n FROM appointments WHERE status='booked' AND source<>'sandbox' AND starts_at >= ?", nowIso).n,
      upcomingSandboxAppointments: db.get("SELECT COUNT(*) n FROM appointments WHERE status='booked' AND source='sandbox' AND starts_at >= ?", nowIso).n,
      dataSources: { bookings: "Goldie (not synced — no supported API)", payments: "none connected", calendar: (() => { const s = integrationsStatus(ctx); return s.google.accounts.length ? "Google connected" : s.feeds.length ? "calendar link connected" : "not connected"; })() },
    });
  }, { admin: true });

  async function handle(req, { ip = "local" } = {}) {
    const url = new URL(req.url);
    try {
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = url.pathname.match(r.re);
        if (!m) continue;
        let owner = null;
        if (r.admin) {
          owner = sessionOwner(db, readCookie(req, SESSION_COOKIE), now());
          if (!owner) return err(401, "unauthorized");
          // CSRF: state-changing admin calls must carry a custom header (cross-site forms can't set it).
          if (req.method !== "GET" && req.headers.get("x-salon-os") !== "1") return err(403, "csrf");
        }
        return await r.handler(req, m.groups || {}, ip, owner);
      }
      if (url.pathname.startsWith("/api/")) return err(404, "not_found");
      if (req.method === "GET") return (await staticFile(url.pathname)) || err(404, "not_found");
      return err(405, "method_not_allowed");
    } catch (e) {
      if (e.code) return err(e.status || 400, e.code, e.detail);
      console.error(e);
      return err(500, "server_error");
    }
  }

  return { handle, ctx };
}
