# Salon OS — living implementation doc

_Last updated: 2026-11-22 (deployed)._ Keep this file short and current. It replaces separate plan/status files.

## ▶ Resume here (paused 2026-11-22)
State: **live and private** at https://os.melanie-diaz.com behind Cloudflare Access (3 emails). Owner account created 2026-11-22; setup token deleted.
1. ~~Owner setup~~ ✅ done.
2. Move `SALON_OS_DATA_KEY` from `salon-os/data/PRODUCTION-SECRETS-move-to-password-manager.txt` into a password manager, then delete that file.
3. Cloudflare Pages: turn off preview builds for non-main branches (the design branch is pushed).
4. Then: deploy the calendar-link feature, Melanie pastes her iCal secret address in Settings; Melanie reviews the intake form.

## Boundaries (non-negotiable)
- **Goldie is the live booking authority.** Salon OS never creates, changes or reads live Goldie bookings; there is no supported Goldie API.
- The native booking engine runs in **sandbox** only (`source='sandbox'`, excluded from all reports).
- No payment processing until a provider is approved. `transactions` exists only to *record* entries.
- Prices are mirrored from Goldie (`salon-os/config/catalog.json`) and never set by the website.
- Nothing is published or deployed without explicit authorization. Deploying Salon OS does **not** touch melanie-diaz.com (separate Worker).

## Status

| Area | State | Notes |
|---|---|---|
| Data model | ✅ | `clients`, `appointments`, `transactions` + intake, photos, consents, notes, treatment records, calendars, busy blocks, time blocks, audit log |
| Configurable intake | ✅ | Versioned JSON forms; conditional questions; required/optional fields; per-service sections; new vs returning; drafts saved on the device only |
| Sensitive data | ✅ | AES-256-GCM at rest (answers, notes, formulas, photos, OAuth tokens). Photos: magic-byte checked, EXIF/GPS stripped, encrypted, owner-only. Consent recorded with text version. |
| New vs returning | ✅ | Self-reported, then reconciled by email/phone (never by name); unverified → `needs_review`; no client-existence leak |
| Client profiles | ✅ | Client-submitted vs Melanie's notes separated; append-only treatment records; export; hard delete |
| Attribution | ✅ | Self-reported vs captured (UTM / click ids / referrer host), first touch kept, nothing inferred |
| Booking hand-off | ✅ | `/book/` → intake → Goldie deep link to the exact service; "skip" always visible; falls back to Goldie if the backend is down |
| Availability engine (sandbox) | ✅ | America/Chicago + DST, hours, grid, buffers, processing, notice, horizon, blocks, extra openings, personal busy time; conflict-safe booking |
| Eligibility (sandbox) | ✅ | First-time vs returning; Dry Curly Cut needs a **verified** First-Time Experience/Reset within 6 months; duplicate haircut blocked; owner override |
| Calendar link (iCal) | ✅ code · ⛔ not deployed | **Preferred.** Settings → paste Google's "Secret address in iCal format". Link stored encrypted, never returned; only start/end kept (no titles). Handles repeats, exceptions, time zones/DST, free/cancelled events. Synced with the 30-min cron. |
| Google Calendar (OAuth) | ✅ code · optional | Read-only free/busy. Needs a Google Cloud OAuth client; not needed if the calendar link is used. |
| Owner dashboard | ✅ | Login, first-time setup, Today, Calendar, Intakes, Clients, Booking sandbox, Marketing, Settings |
| **Deployment** | ✅ **live, private** | https://os.melanie-diaz.com (Worker `melanie-diaz-salon-os`, free plan). Behind Cloudflare Access app **Salon OS** → policy **Salon OS owners** (3 emails). Anonymous requests verified to be redirected to Access login. Photos stored encrypted in the Durable Object (R2 not enabled on the account). `PUBLIC_INTAKE=off`. Main site verified unaffected. |
| Financials / retail / ad spend | ⏳ schema only | by design |

Tests: `cd salon-os && npm test` → **49 passing** on Node.

## Decisions made
1. **No runtime dependencies.** Node built-ins locally; `wrangler` is a dev-only deploy tool.
2. **Cloudflare Durable Object SQLite, not D1.** It's synchronous like our code (no rewrite), and a single DO instance serialises every write, so double booking is impossible by construction. Photos in R2.
3. **Private by default.** `workers_dev = false` (no public URL); a custom domain behind Cloudflare Access; `PUBLIC_INTAKE=off` until Melanie approves the form; owner created once via a setup token.
4. **Drafts stay on the client's device** and are deleted after submit. Nothing is stored server-side before consent.
5. **Google is never the appointment database** (free/busy only). Connected calendars default to "personal, blocks salon time".
6. **Session cookie `SameSite=Lax`** (OAuth return), CSRF blocked by the required `x-salon-os` header.
7. **Single owner account** for now.
9. **Website design (approved 2026-11-22):** accent **Sage `#A3B18A`** (deep sage `#56664A` for story rings), dark sections **Ink `#16130F`**, light sections **pure white `#FFFFFF`**, headlines **Fraunces**, body **Outfit**, hero photo **black & white**. Set in `assets/css/tokens.css`; the demo panel defaults to it. Not yet applied to the live site or Salon OS screens.
8. **Payments provider: Square (not Stripe)** — decided 2026-11-22. Any future native deposits, balances, tips, refunds and in-person card payments go through Square (Square's hosted checkout / Web Payments SDK online; Square Reader or Tap to Pay in person; Square webhooks record transactions in Salon OS). Goldie's own checkout (Stripe today) is unchanged while Goldie stays live. Not yet built; needs Melanie's Square account.

## Deploy runbook (Cloudflare) — done 2026-11-22; kept for redeploys/rebuilds
Run from `salon-os/`. Each command is safe to read before running.

1. **Sign in** (opens your browser; you log in to Cloudflare yourself):
   ```bash
   npx wrangler login
   ```
2. **Photo storage bucket:**
   ```bash
   npx wrangler r2 bucket create melanie-diaz-salon-os-photos
   ```
3. **Encryption key.** Generate it, **save it in your password manager first**, then paste it when asked:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   ```bash
   npx wrangler secret put SALON_OS_DATA_KEY
   ```
4. **One-time setup token** (paste any long random string; you'll use it once in step 8):
   ```bash
   npx wrangler secret put SETUP_TOKEN
   ```
5. **Private address.** In `wrangler.toml`, uncomment the `routes = …os.melanie-diaz.com…` line. This only adds a new `os.` subdomain, which requires melanie-diaz.com's DNS to be on this Cloudflare account. The main site is untouched.
6. **Lock it down before first use.** In Cloudflare → Zero Trust → Access → Applications → *Add a self-hosted app* for `os.melanie-diaz.com`, with a policy allowing only Melanie's and your email addresses. (Free for up to 50 users.)
7. **Deploy:**
   ```bash
   npx wrangler deploy
   ```
8. **Create Melanie's login.** Open `https://os.melanie-diaz.com/admin/` → *First-time setup* → enter the setup token, her email and a 12+ character password. Then remove the token:
   ```bash
   npx wrangler secret delete SETUP_TOKEN
   ```

**Plan:** Workers **Paid ($5/month)** is recommended. Durable Objects plus password hashing can exceed the free plan's CPU limits. R2 is free up to 10 GB and Access is free up to 50 users. *(Verify current pricing on Cloudflare before subscribing.)*

**Rollback:** `npx wrangler delete` removes the Worker. Export the data first (dashboard → each client → Export) if you want to keep it.

## Needed from you
- Cloudflare account access to run the runbook above, and confirmation that melanie-diaz.com's DNS is on that account (for `os.melanie-diaz.com`).
- Google Cloud OAuth client (Calendar API enabled): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, redirect `https://os.melanie-diaz.com/api/admin/oauth/google/callback`. Set them with `npx wrangler secret put …`.
- Melanie's review of the intake questions, the Spanish wording and the consent text (`config/forms/intake.v1.json`). After approval: set `PUBLIC_INTAKE = "on"` and open `/book/` + `/api/public/*` in the Access policy.
- Catalog truth (booking audit): the website's 7 services vs Goldie's 8; Wash & Go 15 min; Olaplex description; holidays; buffer/notice; deposit and policy.
- Retention period for intake data and photos.

## Open issues / risks
- The public site still shows outdated hard-coded prices. Fix them with the catalog once it's confirmed.
- `salon-os/` lives in the site repo. If Cloudflare Pages builds the repo root, its *source* (not data) could be public. Exclude the folder from the Pages output, or split the repo.
- Intake isn't linked to Goldie bookings (no API); Melanie matches them in Intakes.
- `docs/` holds earlier research, superseded by this file. Candidates to delete or merge on approval.
- Login/intake rate limits live in the Durable Object's memory (reset if it restarts). Acceptable for one owner.

## Next (recommended order)
1. Run the deploy runbook; connect Google Calendar.
2. After Melanie approves the form: turn on public intake, point the site's Book buttons to `os.melanie-diaz.com/book/`, fix the catalog.
3. Manual appointment entry in the dashboard (unlocks verified history, repeat-booking and LTV).
4. Transactions UI (deposits, balances, tips, refunds, expenses; collected vs booked).
5. Retail and ad-spend tables → cost per acquisition.
6. Only then consider native booking + **Square** payments (Square is the chosen provider; needs the migration plan).
