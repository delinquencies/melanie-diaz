# Salon OS — living implementation doc

_Last updated: 2026-11-22._ Keep this file short and current. It replaces separate plan/status files.

## Boundaries (non-negotiable)
- **Goldie is the live booking authority.** Salon OS never creates, changes or reads live Goldie bookings; there is no supported Goldie API.
- The native booking engine runs in **sandbox** only (`source='sandbox'`, excluded from all reports).
- No payment processing until a provider is approved. `transactions` exists only to *record* entries.
- Prices are mirrored from Goldie (`salon-os/config/catalog.json`) and never set by the website.
- Nothing is published or deployed without explicit authorization.

## Status

| Area | State | Notes |
|---|---|---|
| Data model | ✅ built | `clients`, `appointments`, `transactions` + intake, photos, consents, notes, treatment records, calendars, busy blocks, time blocks, audit log |
| Configurable intake | ✅ built + tested | Versioned JSON forms; conditional questions; required/optional fields; per-service sections (curly / silk press / color / chemical); new vs returning; drafts saved on the device only |
| Sensitive data | ✅ | AES-256-GCM at rest for answers, notes, formulas, photos, OAuth tokens. Photos: magic-byte checked, EXIF/GPS stripped, encrypted, served only to the signed-in owner. Consent recorded with text version. |
| New vs returning | ✅ | Self-reported, then reconciled by normalized email/phone (never by name). Unverified "returning" or a contact conflict → `needs_review`. The public API never reveals whether someone is a client. |
| Client profiles | ✅ | Client-submitted data kept separate from Melanie's notes; treatment records append-only (corrections supersede); export JSON; hard delete with confirmation |
| Attribution | ✅ | "How did you hear…" stored separately from captured UTM / click ids / referrer host. First touch never overwritten. Nothing inferred. |
| Booking journey hand-off | ✅ (local) | `/book/` → intake → **Goldie deep link to the exact service**. "Skip and book directly" always visible; if the backend is down, the page falls back to Goldie. |
| Availability engine (sandbox) | ✅ built + tested | America/Chicago incl. DST; per-day hours; 30-min grid; buffers; processing time; min notice; horizon; vacations/breaks/blocks; extra openings; personal busy time. Bookings revalidated inside an IMMEDIATE transaction (no double booking). |
| Eligibility (sandbox) | ✅ | First-time vs returning; Dry Curly Cut needs a **verified** First-Time Experience/Reset within 6 months; duplicate haircut blocked; owner override |
| Google Calendar | ✅ code + tests (mocked) · ⛔ not connected | OAuth (offline, state-checked), read-only scope, freeBusy only (no event titles stored). Each calendar: personal/business + "blocks salon time". Needs credentials. |
| Unified calendar | ✅ | Day/week/month list views; appointments + personal busy (no details) + blocks; conflict flags |
| Owner dashboard | ✅ | Login (scrypt, throttled, HttpOnly session), Today, Calendar, Intakes, Clients, Booking sandbox, Marketing, Settings. Shows only real data; sandbox is labelled. |
| Financials / retail / ad spend | ⏳ schema only | `transactions` table ready; no UI, no processor, no inventory tables yet (by design) |
| Deployment | ⛔ not done | Runs locally on Node. Not on Cloudflare. |

Tests: `cd salon-os && npm test` → 39 passing (intake engine, security, DST/availability, intake + clients, appointments + calendar, HTTP/security).

## Decisions made
1. **Zero dependencies.** Node built-ins only (`node:sqlite`, `node:test`, `node:crypto`).
2. **Fetch-style handlers + a thin DB adapter** so the same code can move to Cloudflare Workers + D1 (same SQL dialect).
3. **Drafts stay on the client's device** (localStorage) and are deleted after submit. Nothing is stored server-side before consent.
4. **Google is never the appointment database.** We read free/busy only; Salon OS is the system of record for its own (sandbox) appointments.
5. **Connected calendars default to "personal, blocks salon time".** It's safer to over-block until Melanie labels them.
6. **Session cookie is `SameSite=Lax`** (needed for the OAuth return). CSRF is blocked by the required `x-salon-os` header on every admin write.
7. **Single owner account.** Staff roles come later if needed.

## Needed from you
- **Hosting decision for Salon OS:** recommended Cloudflare Workers + D1 + R2 (same account as the site). Needs Cloudflare account access.
- **Google Cloud OAuth client** (Calendar API enabled): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, redirect URI.
- **A production data key** (`SALON_OS_DATA_KEY`), stored in a password manager and backed up.
- **Melanie to review:** intake questions and Spanish wording (`config/forms/intake.v1.json`, marked `draft-es-needs-review`), and the consent text.
- **Catalog truth** (from the booking audit, unchanged): the website's 7 services vs Goldie's 8; the Wash & Go 15-min duration; the Olaplex description; holidays; buffer and minimum-notice preferences; whether the 25% deposit and 24 h policy are final.
- **Privacy:** confirm the retention period for intake data and photos (none enforced yet).

## Open issues / risks
- **The public site still uses hard-coded, outdated prices**, and `data/services.json` on the design branch also uses website prices. Both must be replaced from `salon-os/config/catalog.json` once Melanie confirms the catalog.
- **`salon-os/` lives in the site repo.** If Cloudflare Pages publishes the repo root, the Salon OS *source* (not data) would be publicly readable. Set the Pages output to exclude it, or split the repo.
- The intake isn't linked to Goldie bookings (no API). Melanie matches them by name/email in the Intakes list.
- `docs/` holds earlier research (`DESIGN_*.md`, `COMPONENT_INVENTORY.md`, `IMPLEMENTATION_PLAN.md`, `docs/booking/*.md`). They're superseded by this file for planning; they're kept as reference, and are candidates to delete or merge on approval.
- Rate limits are in-memory (per process). Move to a durable store when deployed.
- `node:sqlite` prints an experimental warning on Node 22/24 (suppressed in npm scripts).

## Next (recommended order)
1. **Deploy Salon OS privately** (Workers + D1 + R2, Cloudflare Access in front of `/admin`). Connect Google Calendar.
2. **Swap the public site's Book buttons to `/book/`** (intake first, then Goldie), after Melanie approves the form. Fix the catalog at the same time.
3. **Manual appointment entry** in the dashboard (record real Goldie bookings/completions). This unlocks verified history, repeat-booking and LTV metrics.
4. **Transactions UI:** record deposits, balances, tips, refunds and expenses by hand; collected-vs-booked reporting.
5. **Retail and ad-spend tables**, then cost-per-acquisition.
6. Only then consider switching live booking to the native engine (needs payment provider approval and the migration plan).
