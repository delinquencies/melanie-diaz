// Client records: matching (new vs returning), profiles, professional notes, export, deletion.
import { newId } from "../lib/security.js";
import { normalizeEmail, normalizePhone } from "../lib/contact.js";
import { fieldIndex } from "../../public/shared/intake-engine.js";
import { deletePhotoFile } from "./photos.js";

export function audit(db, actor, action, subject, nowIso) {
  db.run("INSERT INTO audit_log (id, actor, action, subject, at) VALUES (?,?,?,?,?)", newId("au_"), actor, action, subject || null, nowIso);
}

/**
 * Find an existing client by normalized email or phone (never by name).
 * Returns { client, conflict } — conflict=true when email and phone point at different people.
 */
export function findMatch(db, { email, phone }) {
  const byEmail = email ? db.get("SELECT * FROM clients WHERE email = ? AND status='active'", email) : null;
  const byPhone = phone ? db.get("SELECT * FROM clients WHERE phone = ? AND status='active'", phone) : null;
  if (byEmail && byPhone && byEmail.id !== byPhone.id) return { client: byEmail, conflict: true };
  return { client: byEmail || byPhone || null, conflict: false };
}

/** Verified history = at least one completed, non-sandbox appointment. */
export function hasVerifiedHistory(db, clientId) {
  return !!db.get("SELECT 1 FROM appointments WHERE client_id = ? AND status='completed' AND source <> 'sandbox' LIMIT 1", clientId);
}

/**
 * Create or enrich a client from intake contact answers.
 * Existing values are not overwritten except preferences the client just gave us.
 */
export function upsertFromIntake(db, contact, reportedType, nowIso) {
  const email = normalizeEmail(contact.email);
  const phone = normalizePhone(contact.phone);
  if (email === undefined) throw Object.assign(new Error("invalid email"), { code: "invalid_email" });
  if (phone === undefined) throw Object.assign(new Error("invalid phone"), { code: "invalid_phone" });
  const { client, conflict } = findMatch(db, { email, phone });

  if (!client) {
    const id = newId("cl_");
    db.run(
      `INSERT INTO clients (id, first_name, last_name, email, phone, preferred_contact, preferred_language,
         client_type_reported, history_verified, needs_review, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,0,?,?,?)`,
      id, contact.first_name, contact.last_name || null, email, phone, contact.preferred_contact || null,
      contact.lang || null, reportedType, reportedType === "returning" ? 1 : 0, nowIso, nowIso);
    return { id, matched: false, needsReview: reportedType === "returning", reason: reportedType === "returning" ? "reported_returning_no_record" : null };
  }

  const verified = hasVerifiedHistory(db, client.id);
  let reason = null;
  if (conflict) reason = "email_phone_match_different_clients";
  else if (reportedType === "returning" && !verified) reason = "reported_returning_unverified";
  else if (reportedType === "new" && verified) reason = "reported_new_but_has_history";
  db.run(
    `UPDATE clients SET last_name = COALESCE(last_name, ?), email = COALESCE(email, ?), phone = COALESCE(phone, ?),
       preferred_contact = COALESCE(?, preferred_contact), preferred_language = COALESCE(?, preferred_language),
       client_type_reported = ?, history_verified = ?, needs_review = CASE WHEN ? THEN 1 ELSE needs_review END, updated_at = ?
     WHERE id = ?`,
    contact.last_name || null, conflict ? null : email, conflict ? null : phone, contact.preferred_contact || null, contact.lang || null,
    reportedType, verified ? 1 : 0, reason ? 1 : 0, nowIso, client.id);
  return { id: client.id, matched: true, needsReview: !!reason, reason };
}

export function listClients(db, { q, needsReview } = {}) {
  const where = ["c.status = 'active'"];
  const p = [];
  if (q) {
    where.push("(c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)");
    const like = `%${String(q).slice(0, 80)}%`;
    p.push(like, like, like, like);
  }
  if (needsReview) where.push("c.needs_review = 1");
  return db.all(
    `SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.client_type_reported, c.history_verified, c.needs_review, c.created_at,
            a.reported_source,
            (SELECT COUNT(*) FROM intake_submissions s WHERE s.client_id = c.id AND s.status='new') AS new_intakes
       FROM clients c LEFT JOIN client_acquisition a ON a.client_id = c.id
      WHERE ${where.join(" AND ")} ORDER BY c.created_at DESC LIMIT 200`, ...p);
}

/** Full profile for the owner. Client-submitted vs professional data kept in separate keys. */
export function clientProfile(ctx, id) {
  const { db, cipher, config } = ctx;
  const c = db.get("SELECT * FROM clients WHERE id = ? AND status='active'", id);
  if (!c) return null;
  const acq = db.get("SELECT * FROM client_acquisition WHERE client_id = ?", id);
  const submissions = db.all("SELECT * FROM intake_submissions WHERE client_id = ? ORDER BY submitted_at DESC", id).map((s) => {
    const form = config.form(s.form_id, s.form_version);
    const idx = form ? fieldIndex(form) : {};
    const answers = cipher.decryptJSON(s.answers_enc);
    return {
      id: s.id, formId: s.form_id, formVersion: s.form_version, serviceId: s.service_id, status: s.status,
      submittedAt: s.submitted_at, bookingHandoff: s.booking_handoff,
      answers: Object.entries(answers).map(([k, v]) => ({ id: k, label: idx[k]?.label?.en || k, section: idx[k]?.section || null, sensitive: !!idx[k]?.sensitive, value: v })),
    };
  });
  const sensitivities = [];
  for (const s of submissions) for (const a of s.answers) if (a.sensitive) sensitivities.push({ from: "client", submittedAt: s.submittedAt, label: a.label, value: a.value });
  const notes = db.all("SELECT * FROM client_notes WHERE client_id = ? ORDER BY created_at DESC", id).map((n) => ({
    id: n.id, kind: n.kind, body: cipher.decryptText(n.body_enc), createdAt: n.created_at,
  }));
  for (const n of notes) if (n.kind === "sensitivity") sensitivities.push({ from: "melanie", submittedAt: n.createdAt, label: "Professional note", value: n.body });
  const treatments = db.all("SELECT * FROM treatment_records WHERE client_id = ? ORDER BY performed_on DESC, created_at DESC", id).map((t) => ({
    id: t.id, performedOn: t.performed_on, services: t.services, productsUsed: t.products_used,
    formula: cipher.decryptText(t.formula_enc), notes: cipher.decryptText(t.notes_enc), supersedes: t.supersedes_id, createdAt: t.created_at,
  }));
  const appointments = db.all(
    `SELECT a.*, GROUP_CONCAT(s.service_id) AS services FROM appointments a
       LEFT JOIN appointment_services s ON s.appointment_id = a.id
      WHERE a.client_id = ? GROUP BY a.id ORDER BY a.starts_at DESC`, id);
  const photos = db.all("SELECT id, kind, mime, bytes, submission_id, created_at FROM photos WHERE client_id = ? ORDER BY created_at DESC", id);
  const consents = db.all("SELECT kind, version, granted, recorded_at FROM consents WHERE client_id = ? ORDER BY recorded_at DESC", id);
  const ltv = db.get("SELECT COALESCE(SUM(amount_cents),0) AS cents FROM transactions WHERE client_id = ? AND status='recorded' AND kind IN ('service_payment','deposit','retail_sale','tip','refund')", id).cents;
  const nowIso = ctx.now().toISOString();
  return {
    client: c,
    acquisition: acq ? { reported: acq.reported_source, reportedOther: acq.reported_other, referrerName: acq.referrer_name, captured: acq.captured_json ? JSON.parse(acq.captured_json) : null, firstSeenAt: acq.first_seen_at } : null,
    submitted: { intakes: submissions, photos, consents },             // client-submitted
    professional: { notes, treatments },                                // Melanie's records
    sensitivities,
    appointments: {
      upcoming: appointments.filter((a) => a.starts_at >= nowIso && a.status === "booked"),
      history: appointments.filter((a) => !(a.starts_at >= nowIso && a.status === "booked")),
    },
    lifetimeCollectedCents: ltv,  // recorded transactions only
  };
}

export function addNote(ctx, clientId, { kind, body }) {
  const { db, cipher } = ctx;
  if (!["consultation", "general", "preference", "sensitivity"].includes(kind)) throw Object.assign(new Error("bad kind"), { code: "invalid" });
  if (!body || String(body).trim().length === 0 || String(body).length > 5000) throw Object.assign(new Error("bad body"), { code: "invalid" });
  if (!db.get("SELECT 1 FROM clients WHERE id = ? AND status='active'", clientId)) throw Object.assign(new Error("not found"), { code: "not_found" });
  const id = newId("no_");
  db.run("INSERT INTO client_notes (id, client_id, kind, body_enc, created_at) VALUES (?,?,?,?,?)", id, clientId, kind, cipher.encryptText(String(body).trim()), ctx.now().toISOString());
  return id;
}

/** Treatment records are append-only; a correction is a new row that supersedes the old one. */
export function addTreatment(ctx, clientId, t) {
  const { db, cipher } = ctx;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.performedOn || "")) throw Object.assign(new Error("performedOn YYYY-MM-DD"), { code: "invalid" });
  if (!db.get("SELECT 1 FROM clients WHERE id = ? AND status='active'", clientId)) throw Object.assign(new Error("not found"), { code: "not_found" });
  if (t.supersedes && !db.get("SELECT 1 FROM treatment_records WHERE id = ? AND client_id = ?", t.supersedes, clientId)) throw Object.assign(new Error("bad supersedes"), { code: "invalid" });
  const id = newId("tr_");
  db.run(
    `INSERT INTO treatment_records (id, client_id, appointment_id, performed_on, services, formula_enc, products_used, notes_enc, supersedes_id, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    id, clientId, t.appointmentId || null, t.performedOn, t.services?.slice(0, 500) || null, cipher.encryptText(t.formula || null),
    t.productsUsed?.slice(0, 1000) || null, cipher.encryptText(t.notes || null), t.supersedes || null, ctx.now().toISOString());
  return id;
}

/** Everything we hold about a client, decrypted (for a data-access request). Photos listed by id. */
export function exportClient(ctx, id) {
  const p = clientProfile(ctx, id);
  if (!p) return null;
  return { exportedAt: ctx.now().toISOString(), ...p };
}

/** Hard delete: rows cascade; encrypted photo files removed. Audit keeps only the id + action. */
export async function deleteClient(ctx, id, actor) {
  const { db } = ctx;
  const photos = db.all("SELECT storage_key FROM photos WHERE client_id = ?", id);
  const res = db.tx(() => {
    db.run("UPDATE appointments SET client_id = NULL WHERE client_id = ?", id);
    db.run("UPDATE transactions SET client_id = NULL WHERE client_id = ?", id);
    // Explicit deletes (don't rely on ON DELETE CASCADE being enforced by every runtime).
    for (const t of ["photos", "intake_submissions", "consents", "client_notes", "treatment_records", "client_acquisition"]) {
      db.run(`DELETE FROM ${t} WHERE client_id = ?`, id);
    }
    return db.run("DELETE FROM clients WHERE id = ?", id);
  });
  if (!res.changes) return false;
  for (const p of photos) await deletePhotoFile(ctx.storage, p.storage_key).catch(() => {});
  audit(db, actor, "client.deleted", id, ctx.now().toISOString());
  return true;
}
