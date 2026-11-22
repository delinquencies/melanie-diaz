import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { setup, jpegWithExif, validNewAnswers } from "./helpers.js";
import { submitIntake } from "../src/domain/intake.js";
import { sniffImage, stripMetadata, storePhoto } from "../src/domain/photos.js";
import { clientProfile, addNote, addTreatment, deleteClient, exportClient } from "../src/domain/clients.js";
import { acquisitionReport } from "../src/domain/attribution.js";

const base = (o = {}) => ({ formId: "client-intake", serviceId: "first-time-curly-experience", clientType: "new", lang: "en",
  answers: validNewAnswers(), consents: { storage: true }, ...o });

test("photos: magic-byte sniffing and EXIF/GPS stripping", async () => {
  const jpg = jpegWithExif();
  assert.equal(sniffImage(jpg), "image/jpeg");
  assert.equal(sniffImage(Buffer.from("<svg onload=alert(1)>")), null);
  const clean = stripMetadata(jpg, "image/jpeg");
  assert.ok(jpg.includes("GPSLatitude"));
  assert.ok(!clean.includes("GPSLatitude"));
  assert.equal(clean[0], 0xff); assert.equal(clean.at(-1), 0xd9);
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", Buffer.alloc(13)), chunk("tEXt", Buffer.from("Location\0Baytown")), chunk("IEND", Buffer.alloc(0))]);
  assert.ok(!stripMetadata(png, "image/png").includes("Baytown"));
});
function chunk(type, data) { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(type, 4, "ascii"); data.copy(b, 8); return b; }

test("photos are stored encrypted, never as plain image files", async () => {
  const { ctx, storageDir } = await setup();
  const r = await storePhoto(ctx.storage, jpegWithExif());
  const onDisk = readFileSync(join(storageDir, r.storageKey));
  assert.equal(sniffImage(onDisk), null);
  await assert.rejects(() => storePhoto(ctx.storage, Buffer.from("not an image")), /JPEG, PNG or WebP/);
});

test("new client intake: stored encrypted, consent + acquisition recorded, Goldie hand-off", async () => {
  const { ctx, db } = await setup();
  const out = await submitIntake(ctx, base({
    answers: validNewAnswers({ has_sensitivities: "yes", sensitivity_details: "Reacts to coconut oil" }),
    captured: { utm_source: "instagram", utm_campaign: "fall", referrer: "https://l.instagram.com/?u=secret-path", junk: "x" },
  }));
  assert.match(out.next.url, /book\.heygoldie\.com\/BRUJAS\/checkout\?serviceIds=fb8b8594/);
  const row = db.get("SELECT * FROM intake_submissions");
  assert.ok(!row.answers_enc.includes("coconut"));
  assert.equal(row.has_sensitive, 1);
  const c = db.get("SELECT * FROM clients");
  assert.equal(c.email, "ana@example.com");
  assert.equal(c.phone, "+12815550100");
  const acq = db.get("SELECT * FROM client_acquisition");
  assert.equal(acq.reported_source, "instagram");
  const cap = JSON.parse(acq.captured_json);
  assert.equal(cap.referrer_host, "l.instagram.com");
  assert.equal(cap.junk, undefined);
  assert.ok(!acq.captured_json.includes("secret-path"));
  assert.equal(db.get("SELECT COUNT(*) n FROM consents WHERE kind='intake_storage'").n, 1);
  const p = clientProfile(ctx, c.id);
  assert.equal(p.sensitivities[0].value, "Reacts to coconut oil");
});

test("consent is required; photo consent required when photos sent", async () => {
  const { ctx, db } = await setup();
  await assert.rejects(() => submitIntake(ctx, base({ consents: {} })), { code: "consent_required" });
  await assert.rejects(() => submitIntake(ctx, base({ photos: [{ fieldId: "photos_current", bytes: jpegWithExif() }] })), { code: "photo_consent_required" });
  assert.equal(db.get("SELECT COUNT(*) n FROM clients").n, 0);
});

test("photos saved with consent; bad photo rolls back everything", async () => {
  const { ctx, db, storageDir } = await setup();
  await submitIntake(ctx, base({ consents: { storage: true, photos: true }, photos: [{ fieldId: "photos_current", bytes: jpegWithExif() }] }));
  assert.equal(db.get("SELECT COUNT(*) n FROM photos").n, 1);
  const before = readdirSync(storageDir).length;
  await assert.rejects(() => submitIntake(ctx, base({ answers: validNewAnswers({ email: "b@example.com", phone: "2815550111" }), consents: { storage: true, photos: true },
    photos: [{ fieldId: "photos_current", bytes: jpegWithExif() }, { fieldId: "photos_inspiration", bytes: Buffer.from("nope") }] })), { code: "photo_type" });
  assert.equal(readdirSync(storageDir).length, before);
  assert.equal(db.get("SELECT COUNT(*) n FROM clients").n, 1);
});

test("service/client-type mismatch rejected; returning without record flagged for review", async () => {
  const { ctx, db } = await setup();
  await assert.rejects(() => submitIntake(ctx, base({ serviceId: "dry-curly-cut" })), { code: "service_not_for_client_type" });
  const out = await submitIntake(ctx, base({ serviceId: "dry-curly-cut", clientType: "returning",
    answers: { first_name: "Bea", email: "bea@example.com", phone: "2815550122" } }));
  assert.equal(out._needsReview, true);
  assert.equal(db.get("SELECT needs_review FROM clients").needs_review, 1);
});

test("matching by email/phone (not name); first-touch acquisition preserved", async () => {
  const { ctx, db } = await setup();
  await submitIntake(ctx, base());
  await submitIntake(ctx, base({ serviceId: "signature-silk-press", answers: validNewAnswers({ first_name: "Different", heard_about: "google_maps", phone: "+1 281 555 0100", silk_chemical_history: ["none"] }) }));
  assert.equal(db.get("SELECT COUNT(*) n FROM clients").n, 1);
  assert.equal(db.get("SELECT reported_source FROM client_acquisition").reported_source, "instagram");
  assert.equal(db.get("SELECT COUNT(*) n FROM intake_submissions").n, 2);
  // Same name, different contact → separate client (never matched by name)
  await submitIntake(ctx, base({ answers: validNewAnswers({ email: "other@example.com", phone: "2815550199" }) }));
  assert.equal(db.get("SELECT COUNT(*) n FROM clients").n, 2);
});

test("professional notes/treatments are separate, encrypted and append-only; export & delete", async () => {
  const { ctx, db, storageDir } = await setup();
  await submitIntake(ctx, base({ consents: { storage: true, photos: true }, photos: [{ fieldId: "photos_current", bytes: jpegWithExif() }] }));
  const id = db.get("SELECT id FROM clients").id;
  addNote(ctx, id, { kind: "consultation", body: "Low porosity, avoid heavy butters" });
  const t1 = addTreatment(ctx, id, { performedOn: "2026-11-24", formula: "7N + 20vol", services: "first-time-curly-experience" });
  addTreatment(ctx, id, { performedOn: "2026-11-24", formula: "7N + 10vol", supersedes: t1 });
  assert.ok(!db.get("SELECT body_enc FROM client_notes").body_enc.includes("porosity"));
  const p = clientProfile(ctx, id);
  assert.equal(p.professional.notes[0].body, "Low porosity, avoid heavy butters");
  assert.equal(p.professional.treatments.length, 2); // history kept
  assert.equal(p.submitted.intakes.length, 1);
  assert.ok(exportClient(ctx, id).exportedAt);
  assert.equal(await deleteClient(ctx, id, "owner:test"), true);
  assert.equal(db.get("SELECT COUNT(*) n FROM clients").n, 0);
  assert.equal(db.get("SELECT COUNT(*) n FROM intake_submissions").n, 0);
  assert.equal(readdirSync(storageDir).length, 0);
  assert.equal(db.get("SELECT action FROM audit_log WHERE subject = ?", id).action, "client.deleted");
});

test("acquisition report never fabricates", async () => {
  const { ctx, db } = await setup();
  await submitIntake(ctx, base());
  await submitIntake(ctx, base({ clientType: "returning", serviceId: "signature-silk-press", answers: { first_name: "R", email: "r@example.com", phone: "2815550155" } }));
  const r = acquisitionReport(db);
  assert.equal(r.byReportedSource.instagram, 1);
  assert.equal(r.byReportedSource.not_reported, 1);
  assert.equal(r.byCapturedSource.none_captured, 2);
  assert.equal(r.costPerAcquisition, null);
  assert.equal(r.repeatBooking, null);
});
