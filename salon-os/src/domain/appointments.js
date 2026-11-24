// Native booking engine — SANDBOX ONLY. Goldie remains the live booking authority.
// Every appointment created here has source='sandbox' and is excluded from real reports.
import { newId } from "../lib/security.js";
import { utcToZoned, addDays } from "../lib/time.js";
import { computeSlots } from "./availability.js";
import { hasVerifiedHistory } from "./clients.js";

const fail = (code, detail, status = 400) => Object.assign(new Error(code), { code, detail, status });

/** Combine services into one appointment plan (req 28–30). Rejects duplicate included cuts (req 5, 29). */
export function planServices(config, serviceIds) {
  if (!Array.isArray(serviceIds) || !serviceIds.length || serviceIds.length > 4) throw fail("services_required");
  const services = serviceIds.map((id) => config.service(id) || (() => { throw fail("unknown_service", id); })());
  if (new Set(serviceIds).size !== serviceIds.length) throw fail("duplicate_service");
  if (services.filter((s) => s.includesCut).length > 1) throw fail("duplicate_included_service", "more than one service includes a haircut");
  const serviceMin = services.reduce((n, s) => n + s.durationMin, 0);
  const processingMin = services.reduce((n, s) => n + (s.processingMin || 0), 0);
  const bufferMin = config.schedule.bufferMin || 0;
  const totalCents = services.reduce((n, s) => n + s.priceCents, 0);
  const depositCents = Math.round((totalCents * (config.schedule.depositPercent || 0)) / 100);
  return {
    services, serviceMin, chairMin: serviceMin + processingMin + bufferMin, totalCents, depositCents,
    balanceCents: totalCents - depositCents,
    consultationRequired: services.some((s) => s.consultation === "required-before"),
  };
}

/** Eligibility from VERIFIED records only (completed, non-sandbox appointments). Never from a name. */
export function checkEligibility(ctx, clientId, service) {
  const { db, config } = ctx;
  const alt = (type) => config.catalog.services.filter((s) => s.clientTypes.includes(type)).map((s) => s.id);
  const verified = clientId ? hasVerifiedHistory(db, clientId) : false;
  const onlyNew = service.clientTypes.length === 1 && service.clientTypes[0] === "new";
  const onlyReturning = service.clientTypes.length === 1 && service.clientTypes[0] === "returning";

  if (onlyNew && verified) return { eligible: false, reason: "first_time_service_for_returning_client", alternatives: alt("returning") };
  if (onlyReturning) {
    if (!verified) return { eligible: false, reason: "returning_history_not_verified", alternatives: alt("new") };
    const rule = service.eligibility?.requiresCompletedWithin;
    if (rule) {
      const cutoff = new Date(ctx.now());
      cutoff.setUTCMonth(cutoff.getUTCMonth() - rule.months);
      const placeholders = rule.serviceIds.map(() => "?").join(",");
      const ok = db.get(
        `SELECT 1 FROM appointments a JOIN appointment_services s ON s.appointment_id = a.id
          WHERE a.client_id = ? AND a.status = 'completed' AND a.source <> 'sandbox'
            AND a.starts_at >= ? AND s.service_id IN (${placeholders}) LIMIT 1`,
        clientId, cutoff.toISOString(), ...rule.serviceIds);
      if (!ok) return { eligible: false, reason: `requires_${rule.serviceIds.join("_or_")}_within_${rule.months}_months`, alternatives: rule.serviceIds };
    }
  }
  return { eligible: true };
}

/** Everything that occupies the chair or Melanie's time, as busy intervals. */
export function busyIntervals(db, fromIso, toIso, { excludeAppointmentId } = {}) {
  const appts = db.all(
    "SELECT id, starts_at, ends_at FROM appointments WHERE status = 'booked' AND starts_at < ? AND ends_at > ?", toIso, fromIso)
    .filter((a) => a.id !== excludeAppointmentId);
  const ext = db.all(
    `SELECT b.starts_at, b.ends_at FROM busy_blocks b JOIN calendars c ON c.id = b.calendar_id
      WHERE c.blocks_availability = 1 AND b.starts_at < ? AND b.ends_at > ?
     UNION ALL
     SELECT b.starts_at, b.ends_at FROM feed_busy_blocks b JOIN calendar_feeds f ON f.id = b.feed_id
      WHERE f.blocks_availability = 1 AND b.starts_at < ? AND b.ends_at > ?`, toIso, fromIso, toIso, fromIso);
  const blocks = db.all("SELECT starts_at, ends_at FROM time_blocks WHERE kind IN ('vacation','break','blocked') AND starts_at < ? AND ends_at > ?", toIso, fromIso);
  const extra = db.all("SELECT starts_at, ends_at FROM time_blocks WHERE kind = 'extra_open' AND starts_at < ? AND ends_at > ?", toIso, fromIso);
  const toI = (r) => ({ start: new Date(r.starts_at), end: new Date(r.ends_at) });
  return { busy: [...appts, ...ext, ...blocks].map(toI), extraOpen: extra.map(toI) };
}

export function sandboxAvailability(ctx, { serviceIds, date, days = 1 }) {
  const plan = planServices(ctx.config, serviceIds);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) throw fail("date_required");
  const n = Math.min(Math.max(1, Number(days) || 1), 14);
  const fromIso = new Date(Date.parse(date + "T00:00:00Z") - 86400000).toISOString();
  const toIso = new Date(Date.parse(addDays(date, n) + "T00:00:00Z") + 86400000).toISOString();
  const { busy, extraOpen } = busyIntervals(ctx.db, fromIso, toIso);
  return {
    plan: { serviceIds, serviceMin: plan.serviceMin, chairMin: plan.chairMin, totalCents: plan.totalCents, depositCents: plan.depositCents, balanceCents: plan.balanceCents },
    days: computeSlots({ schedule: ctx.config.schedule, dateFrom: date, days: n, serviceMin: plan.serviceMin, chairMin: plan.chairMin, busy, extraOpen, now: ctx.now() }),
  };
}

/**
 * Create a sandbox appointment. Revalidates the slot inside an IMMEDIATE transaction,
 * so two concurrent requests can never take the same time (req 41, 48–49).
 */
export function createSandboxAppointment(ctx, { clientId = null, serviceIds, start, override = false, notes }) {
  const { db, config } = ctx;
  const plan = planServices(config, serviceIds);
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) throw fail("invalid_start");

  if (clientId && !db.get("SELECT 1 FROM clients WHERE id = ? AND status='active'", clientId)) throw fail("unknown_client", null, 404);
  if (!override) {
    for (const s of plan.services) {
      const e = checkEligibility(ctx, clientId, s);
      if (!e.eligible) throw fail("not_eligible", { service: s.id, ...e }, 409);
    }
  }

  return db.tx(() => {
    const local = utcToZoned(startDate, config.schedule.timezone).date;
    const fromIso = new Date(startDate.getTime() - 86400000).toISOString();
    const toIso = new Date(startDate.getTime() + 2 * 86400000).toISOString();
    const { busy, extraOpen } = busyIntervals(db, fromIso, toIso);
    const [day] = computeSlots({ schedule: config.schedule, dateFrom: local, days: 1, serviceMin: plan.serviceMin, chairMin: plan.chairMin, busy, extraOpen, now: ctx.now() });
    const slot = day.slots.find((s) => s.start === startDate.toISOString());
    if (!slot) throw fail("slot_unavailable", null, 409);

    const id = newId("ap_");
    const nowIso = ctx.now().toISOString();
    db.run(
      `INSERT INTO appointments (id, client_id, source, status, starts_at, ends_at, service_ends_at, total_cents, deposit_cents,
         consultation_required, notes, created_at, updated_at)
       VALUES (?,?, 'sandbox', 'booked', ?,?,?,?,?,?,?,?,?)`,
      id, clientId, slot.start, slot.chairEnd, slot.end, plan.totalCents, plan.depositCents, plan.consultationRequired ? 1 : 0,
      notes ? String(notes).slice(0, 1000) : null, nowIso, nowIso);
    for (const s of plan.services) {
      db.run("INSERT INTO appointment_services (appointment_id, service_id, price_cents, duration_min) VALUES (?,?,?,?)", id, s.id, s.priceCents, s.durationMin);
    }
    db.run("INSERT INTO appointment_events (id, appointment_id, event, detail, at) VALUES (?,?,?,?,?)", newId("ev_"), id, "created", override ? "eligibility override" : null, nowIso);
    return { id, start: slot.start, end: slot.end, chairEnd: slot.chairEnd, totalCents: plan.totalCents, depositCents: plan.depositCents, balanceCents: plan.balanceCents, sandbox: true };
  });
}

const TRANSITIONS = {
  booked: ["completed", "cancelled", "late_cancel", "no_show"],
  completed: [], cancelled: [], late_cancel: [], no_show: [],
};

/** Status change with history. Cancelling frees the slot (only 'booked' blocks time). Sandbox only. */
export function setSandboxStatus(ctx, id, status, detail) {
  const { db } = ctx;
  return db.tx(() => {
    const a = db.get("SELECT * FROM appointments WHERE id = ?", id);
    if (!a) throw fail("not_found", null, 404);
    if (a.source !== "sandbox") throw fail("not_sandbox", "Only sandbox appointments can be changed here", 403);
    if (!TRANSITIONS[a.status]?.includes(status)) throw fail("invalid_transition", { from: a.status, to: status }, 409);
    const nowIso = ctx.now().toISOString();
    db.run("UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?", status, nowIso, id);
    db.run("INSERT INTO appointment_events (id, appointment_id, event, detail, at) VALUES (?,?,?,?,?)", newId("ev_"), id, status, detail ? String(detail).slice(0, 500) : null, nowIso);
    return true;
  });
}

/** Policy helper: is a cancellation inside the configured window? (deposit outcome decided by owner policy) */
export function isLateCancellation(config, startsAtIso, at) {
  return new Date(startsAtIso).getTime() - at.getTime() < (config.schedule.cancelWindowHours || 24) * 3600000;
}
