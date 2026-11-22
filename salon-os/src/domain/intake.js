// Intake submission: validate against the versioned form, require consent, match/create the client,
// encrypt answers, store photos, record first-touch attribution. Goldie stays the booking authority.
import { newId } from "../lib/security.js";
import { cleanText } from "../lib/contact.js";
import { validateAnswers } from "../shared/intake-engine.js";
import { upsertFromIntake, audit } from "./clients.js";
import { recordAcquisition, sanitizeCaptured } from "./attribution.js";
import { storePhoto, deletePhotoFile } from "./photos.js";

const fail = (code, detail) => Object.assign(new Error(code), { code, detail, status: 400 });

/**
 * @param ctx {db, cipher, config, storage, now}
 * @param input { formId, formVersion?, serviceId, clientType, lang, answers, consents: {storage, photos},
 *                captured, photos: [{ fieldId, bytes: Buffer }] }
 */
export function submitIntake(ctx, input) {
  const { db, cipher, config } = ctx;
  const nowIso = ctx.now().toISOString();

  const form = input.formVersion ? config.form(input.formId, input.formVersion) : config.latestForm(input.formId);
  if (!form) throw fail("unknown_form");
  const service = input.serviceId ? config.service(input.serviceId) : null;
  if (input.serviceId && !service) throw fail("unknown_service");
  const clientType = input.clientType === "returning" ? "returning" : input.clientType === "new" ? "new" : null;
  if (!clientType) throw fail("client_type_required");
  if (service && !service.clientTypes.includes(clientType)) {
    throw fail("service_not_for_client_type", { allowed: service.clientTypes });
  }

  // Consent is required before anything is stored.
  if (input.consents?.storage !== true) throw fail("consent_required");
  const photos = Array.isArray(input.photos) ? input.photos : [];
  if (photos.length && input.consents?.photos !== true) throw fail("photo_consent_required");

  const photoCounts = {};
  for (const p of photos) photoCounts[p.fieldId] = (photoCounts[p.fieldId] || 0) + 1;
  const photoFields = new Set(form.sections.flatMap((s) => s.fields.filter((f) => f.type === "photo").map((f) => f.id)));
  for (const p of photos) if (!photoFields.has(p.fieldId)) throw fail("unknown_photo_field");

  const v = validateAnswers(form, { intakeTags: service?.intakeTags || [], clientType }, input.answers || {}, photoCounts);
  if (!v.ok) throw fail("validation", v.errors);

  // Store photo files first (outside the DB transaction); remove them if the DB write fails.
  const stored = [];
  try {
    for (const p of photos) {
      const field = form.sections.flatMap((s) => s.fields).find((f) => f.id === p.fieldId);
      stored.push({ ...storePhoto(ctx.storage, p.bytes), kind: field.photoKind || "current" });
    }
  } catch (err) {
    for (const s of stored) deletePhotoFile(ctx.storage, s.storageKey);
    throw fail(err.code || "photo_invalid");
  }

  try {
    return db.tx(() => {
      const a = v.clean;
      const client = upsertFromIntake(db, {
        first_name: cleanText(a.first_name, 80), last_name: cleanText(a.last_name, 80), email: a.email, phone: a.phone,
        preferred_contact: a.preferred_contact, lang: input.lang === "es" ? "es" : "en",
      }, clientType, nowIso);

      for (const kind of ["storage", "photos"]) {
        if (kind === "photos" && !photos.length) continue;
        db.run("INSERT INTO consents (id, client_id, kind, version, granted, recorded_at) VALUES (?,?,?,?,1,?)",
          newId("cn_"), client.id, kind === "storage" ? "intake_storage" : "photos", form.consent.version, nowIso);
      }

      recordAcquisition(db, client.id, {
        reported: a.heard_about, reportedOther: cleanText(a.heard_about_other, 120), referrerName: cleanText(a.referrer_name, 120),
        captured: sanitizeCaptured(input.captured),
      }, nowIso);

      const submissionId = newId("in_");
      db.run(
        `INSERT INTO intake_submissions (id, client_id, form_id, form_version, service_id, answers_enc, has_sensitive, booking_handoff, submitted_at)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        submissionId, client.id, form.id, form.version, service?.id || null, cipher.encryptJSON(a), v.sensitiveFields.length ? 1 : 0,
        "goldie", nowIso);

      for (const s of stored) {
        db.run("INSERT INTO photos (id, client_id, submission_id, kind, mime, bytes, storage_key, created_at) VALUES (?,?,?,?,?,?,?,?)",
          newId("pf_"), client.id, submissionId, s.kind, s.mime, s.bytes, s.storageKey, nowIso);
      }
      audit(db, "public", "intake.submitted", submissionId, nowIso);
      return {
        submissionId,
        // Do not reveal to the public whether a client record existed (avoids enumeration).
        next: { provider: "goldie", url: config.goldieUrl(service) },
        _clientId: client.id, _needsReview: client.needsReview,
      };
    });
  } catch (err) {
    for (const s of stored) deletePhotoFile(ctx.storage, s.storageKey);
    throw err;
  }
}

export function listIntakes(ctx, { status } = {}) {
  const rows = ctx.db.all(
    `SELECT s.id, s.client_id, s.form_id, s.form_version, s.service_id, s.has_sensitive, s.status, s.submitted_at,
            c.first_name, c.last_name, c.client_type_reported, c.needs_review,
            (SELECT COUNT(*) FROM photos p WHERE p.submission_id = s.id) AS photo_count
       FROM intake_submissions s JOIN clients c ON c.id = s.client_id
      ${status ? "WHERE s.status = ?" : ""} ORDER BY s.submitted_at DESC LIMIT 200`, ...(status ? [status] : []));
  return rows;
}

export function setIntakeStatus(ctx, id, status) {
  if (!["new", "reviewed", "archived"].includes(status)) throw fail("invalid_status");
  return ctx.db.run("UPDATE intake_submissions SET status = ? WHERE id = ?", status, id).changes === 1;
}
