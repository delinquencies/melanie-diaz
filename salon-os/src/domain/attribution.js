// Marketing attribution. Self-reported ("How did you hear…") is stored separately from
// automatically captured data (UTM, click ids, referrer). Nothing is inferred when missing.

export const REPORTED_SOURCES = ["google_search", "google_maps", "instagram", "facebook", "referral", "in_person", "other"];

const CAPTURE_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "gclid", "gbraid", "wbraid", "fbclid", "msclkid", "ttclid"];

/** Allow-list and size-limit whatever the browser sent. Returns null when nothing was captured. */
export function sanitizeCaptured(input) {
  if (!input || typeof input !== "object") return null;
  const out = {};
  for (const k of CAPTURE_KEYS) {
    const v = input[k];
    if (typeof v === "string" && v.trim()) out[k] = v.trim().slice(0, 200);
  }
  if (typeof input.referrer === "string" && input.referrer) {
    try {
      const host = new URL(input.referrer).hostname.toLowerCase();
      if (host && !host.endsWith("melanie-diaz.com")) out.referrer_host = host.slice(0, 120); // host only, never full URL
    } catch { /* ignore invalid */ }
  }
  if (typeof input.landing_path === "string" && input.landing_path.startsWith("/")) out.landing_path = input.landing_path.split("?")[0].slice(0, 200);
  if (typeof input.first_seen_at === "string" && !Number.isNaN(Date.parse(input.first_seen_at))) out.first_seen_at = new Date(input.first_seen_at).toISOString();
  const meaningful = Object.keys(out).filter((k) => k !== "landing_path" && k !== "first_seen_at");
  return meaningful.length ? out : null;
}

/** First touch only: never overwrites an existing acquisition record. */
export function recordAcquisition(db, clientId, { reported, reportedOther, referrerName, captured }, nowIso) {
  const exists = db.get("SELECT client_id FROM client_acquisition WHERE client_id = ?", clientId);
  if (exists) return false;
  const src = REPORTED_SOURCES.includes(reported) ? reported : null;
  db.run(
    `INSERT INTO client_acquisition (client_id, reported_source, reported_other, referrer_name, captured_json, first_seen_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    clientId, src, src === "other" ? reportedOther || null : null, src === "referral" ? referrerName || null : null,
    captured ? JSON.stringify(captured) : null, captured?.first_seen_at || nowIso,
  );
  return true;
}

/**
 * Acquisition report over REAL data only. Sandbox appointments are excluded.
 * Revenue uses recorded transactions (collected), never booked value.
 */
export function acquisitionReport(db, { from, to } = {}) {
  const where = [];
  const p = [];
  if (from) { where.push("c.created_at >= ?"); p.push(from); }
  if (to) { where.push("c.created_at < ?"); p.push(to); }
  const w = where.length ? "AND " + where.join(" AND ") : "";
  const rows = db.all(
    `SELECT a.reported_source AS reported, a.captured_json AS captured, c.id AS client_id
       FROM clients c LEFT JOIN client_acquisition a ON a.client_id = c.id
      WHERE c.status = 'active' ${w}`, ...p);

  const reported = {}; const captured = {}; const campaigns = {};
  let referrals = 0;
  for (const r of rows) {
    const rs = r.reported || "not_reported";
    reported[rs] = (reported[rs] || 0) + 1;
    if (r.reported === "referral") referrals++;
    const cap = r.captured ? JSON.parse(r.captured) : null;
    const cs = cap?.utm_source || (cap?.gclid || cap?.gbraid || cap?.wbraid ? "google_ads(click id)" : cap?.fbclid ? "meta(click id)" : cap?.referrer_host || "none_captured");
    captured[cs] = (captured[cs] || 0) + 1;
    if (cap?.utm_campaign) campaigns[cap.utm_campaign] = (campaigns[cap.utm_campaign] || 0) + 1;
  }

  const revenue = db.all(
    `SELECT COALESCE(a.reported_source,'not_reported') AS source, SUM(t.amount_cents) AS cents
       FROM transactions t JOIN clients c ON c.id = t.client_id
       LEFT JOIN client_acquisition a ON a.client_id = c.id
      WHERE t.status = 'recorded' AND t.kind IN ('service_payment','deposit','retail_sale','refund')
      GROUP BY 1`);

  const repeat = db.get(
    `SELECT COUNT(*) AS clients, SUM(CASE WHEN n >= 2 THEN 1 ELSE 0 END) AS repeaters FROM (
       SELECT client_id, COUNT(*) AS n FROM appointments
        WHERE status = 'completed' AND source <> 'sandbox' AND client_id IS NOT NULL GROUP BY client_id)`);

  return {
    newClients: rows.length,
    byReportedSource: reported,
    byCapturedSource: captured,
    bookingsByCampaign: campaigns,
    referrals,
    collectedRevenueByReportedSource: Object.fromEntries(revenue.map((r) => [r.source, r.cents])),
    repeatBooking: repeat?.clients ? { clientsWithCompleted: repeat.clients, repeaters: repeat.repeaters } : null,
    costPerAcquisition: null, // requires ad-spend records (not built yet) — never estimated
    notes: [
      "Self-reported and captured attribution are shown separately; missing data stays 'not_reported' / 'none_captured'.",
      "Revenue = recorded transactions only (none until a payment source is connected or entries are recorded).",
      "Repeat booking uses completed non-sandbox appointments only.",
    ],
  };
}
