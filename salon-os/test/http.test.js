import { test } from "node:test";
import assert from "node:assert/strict";
import { setup, jpegWithExif, validNewAnswers, ownerSession } from "./helpers.js";

const req = (path, opts = {}) => new Request("http://t" + path, opts);

test("public catalog exposes Goldie deep links and deposit, not internal data", async () => {
  const { app } = setup();
  const res = await app.handle(req("/api/public/catalog"));
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-security-policy"), /default-src 'self'/);
  const body = await res.json();
  assert.equal(body.liveProvider, "goldie");
  const silk = body.services.find((s) => s.id === "signature-silk-press");
  assert.equal(silk.depositCents, 2750);
  assert.match(silk.bookingUrl, /serviceIds=4156d413/);
  assert.equal(silk.goldieId, undefined);
});

test("intake over HTTP (multipart with photo) → 201 and next step to Goldie", async () => {
  const { app, db } = setup();
  const fd = new FormData();
  fd.append("payload", JSON.stringify({ formId: "client-intake", serviceId: "signature-silk-press", clientType: "new",
    answers: validNewAnswers({ silk_chemical_history: ["none"] }), consents: { storage: true, photos: true } }));
  fd.append("photo:photos_current", new Blob([jpegWithExif()], { type: "image/jpeg" }), "me.jpg");
  const res = await app.handle(req("/api/public/intake", { method: "POST", body: fd }), { ip: "1.1.1.1" });
  const body = await res.json();
  assert.equal(res.status, 201, JSON.stringify(body));
  assert.match(body.next.url, /book\.heygoldie\.com/);
  assert.equal(body._clientId, undefined); // no client existence leak
  assert.equal(db.get("SELECT COUNT(*) n FROM photos").n, 1);
});

test("intake validation errors come back per field; honeypot stores nothing", async () => {
  const { app, db } = setup();
  const bad = new FormData();
  bad.append("payload", JSON.stringify({ formId: "client-intake", serviceId: "signature-silk-press", clientType: "new", answers: { first_name: "A" }, consents: { storage: true } }));
  const r1 = await app.handle(req("/api/public/intake", { method: "POST", body: bad }));
  assert.equal(r1.status, 400);
  assert.equal((await r1.json()).detail.email, "required");
  const bot = new FormData();
  bot.append("payload", JSON.stringify({ website: "spam" }));
  const r2 = await app.handle(req("/api/public/intake", { method: "POST", body: bot }));
  assert.equal(r2.status, 200);
  assert.equal(db.get("SELECT COUNT(*) n FROM clients").n, 0);
});

test("admin API requires a session; CSRF header required for changes; photos private", async () => {
  const { app, db } = setup();
  assert.equal((await app.handle(req("/api/admin/clients"))).status, 401);
  assert.equal((await app.handle(req("/api/admin/photos/x"))).status, 401);
  const cookie = await ownerSession(app, db);
  const ok = await app.handle(req("/api/admin/clients", { headers: { cookie } }));
  assert.equal(ok.status, 200);
  const noCsrf = await app.handle(req("/api/admin/time-blocks", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ kind: "break", start: "2026-11-24T18:00:00Z", end: "2026-11-24T18:30:00Z" }) }));
  assert.equal(noCsrf.status, 403);
  const withCsrf = await app.handle(req("/api/admin/time-blocks", { method: "POST", headers: { cookie, "x-salon-os": "1", "content-type": "application/json" }, body: JSON.stringify({ kind: "break", start: "2026-11-24T18:00:00Z", end: "2026-11-24T18:30:00Z" }) }));
  assert.equal(withCsrf.status, 201);
});

test("login is throttled after 5 failures and cookie is HttpOnly", async () => {
  const { app, db } = setup();
  await ownerSession(app, db);
  const bad = () => app.handle(req("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "owner@example.com", password: "wrong-password!!" }) }), { ip: "9.9.9.9" });
  for (let i = 0; i < 5; i++) assert.equal((await bad()).status, 401);
  assert.equal((await bad()).status, 429);
  const good = await app.handle(req("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "owner@example.com", password: "correct horse battery" }) }), { ip: "8.8.8.8" });
  assert.match(good.headers.get("set-cookie"), /HttpOnly; SameSite=Lax/);
});

test("Google connect explains missing credentials instead of pretending", async () => {
  const { app, db } = setup();
  const cookie = await ownerSession(app, db);
  const res = await app.handle(req("/api/admin/oauth/google/start", { headers: { cookie } }));
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error, "calendar_provider_not_configured");
});

test("static files served; traversal blocked; unknown API 404", async () => {
  const { app } = setup();
  assert.equal((await app.handle(req("/book/"))).status, 200);
  assert.equal((await app.handle(req("/shared/intake-engine.js"))).status, 200);
  assert.notEqual((await app.handle(req("/book/../../config/catalog.json"))).status, 200);
  assert.notEqual((await app.handle(req("/admin/%2e%2e/%2e%2e/src/app.js"))).status, 200);
  assert.equal((await app.handle(req("/api/nope"))).status, 404);
});
