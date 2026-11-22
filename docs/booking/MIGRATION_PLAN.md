# Migration & Implementation Plan

Recommended path: **keep Goldie and integrate it properly** (BOOKING_ARCHITECTURE.md). Under this path **no booking data migrates**. Goldie remains authoritative throughout, and every step below is reversible.

Each phase lists its **approval gate**. Nothing that touches live prices, policies, payments or Goldie settings happens without Melanie's explicit approval.

---

## Phase 0 — Decisions (Melanie), ~1 hour
Answer the blocking questions in BOOKING_AUDIT.md §7:
- [ ] Which services are real (Goldie 8 vs website 7)? Are relaxers, haircuts, shampoo and blow-dry still offered?
- [ ] Wash and Go with Definition: the real duration.
- [ ] Olaplex Ultimate: the correct description; is a cut included?
- [ ] Policy: confirm 24 h + 25% deposit + non-refundable on cancel/no-show + client-paid fee. Drop the 48 h / $25 concept?
- [ ] Holiday closures; booking horizon (12 months vs ~39 days seen).
- [ ] Goldie plan tier (Starter's 20-appointments/month cap?).
- [ ] Dry Curly Cut "upgrade" wording and price.
- [ ] Minimum notice and buffer between clients (proposed 12–24 h and 15 min).
- [ ] Spanish descriptions: who writes and approves them?

**Gate:** written answers from Melanie.

## Phase 1 — Fix Goldie configuration (Melanie, in the Goldie app), ~30–60 min
Only what she approved in Phase 0:
- [ ] Correct the Wash & Go duration.
- [ ] Replace the Olaplex description.
- [ ] Fix the Friday 17:05 close if it's a typo.
- [ ] Add holiday and vacation closures.
- [ ] Set minimum notice and buffer, if wanted.
- [ ] Align the deposit-refundable setting with the published text.
- [ ] Add or remove services to match the decided catalog (e.g. a "Silk Press + Trim" if she offers it).
- [ ] Add the website URL to her Goldie profile.
- [ ] Optional: connect Google Business Profile's "Book" button [Doc].

**Gate:** Melanie confirms the changes. Re-read the Goldie snapshot and update SERVICE_CATALOG.md.
**Rollback:** each setting can be reverted in Goldie. Write down the old values before changing anything (the BOOKING_AUDIT §3–4 snapshot already records them).

## Phase 2 — Website catalog & deep links (developer), ~1–2 days
- [ ] Rebuild `data/services.json` from the confirmed Goldie catalog, including Goldie IDs, includes/excludes, prep and eligibility, in EN and ES.
- [ ] Fill `data/booking.json` → `goldie.serviceUrls` with deep links.
- [ ] Remove all hard-coded service lists from `index.html`, `es/index.html` and `links/index.html`; render from the catalog. Fix the JSON-LD and meta description (no "relaxers" unless offered).
- [ ] Add a "Last checked against Goldie" date.
- [ ] Optional: the developer-only comparison script (BOOKING_ARCHITECTURE §4.3).

**Gate:** Melanie reviews the preview: every service, price and Book button.
**Rollback:** revert the commit; the site falls back to the generic Goldie link (still works).

## Phase 3 — Guided selection (developer), ~1–2 days
- [ ] "Been to Melanie before?" chooser; eligibility lines; "Not sure? Start here".
- [ ] Policy summary block; deposit + balance on cards.
- [ ] Contact form relabelled as questions only.

**Gate:** Melanie approves the copy, in both languages.

## Phase 4 — Launch & watch (2 weeks)
- [ ] Deploy to production.
- [ ] For two weeks, Melanie checks new bookings for wrong service choices (e.g. returning-only services booked by new clients) and notes how often it happens.
- [ ] Track `md:book` events once an analytics tool is chosen (optional; needs a privacy and consent decision).

**Gate:** if mis-bookings are frequent, reconsider stronger guidance, or Path 2.

---

## Keeping things in sync afterwards (checklist for any service change)
1. Change the service in Goldie first.
2. Update `data/services.json`: price, duration, description (EN and ES), updatedAt.
3. If it's a new service: copy its Goldie ID (from the Book link URL) into `sourceId` and `serviceUrls`.
4. Run the comparison script (if installed) and check the preview.
5. Deploy.

---

## Appendix — if Melanie later moves to another platform (Path 2)
Only after explicit approval. Order matters to avoid lost or double bookings (req 165–170):
1. **Freeze the catalog.** Recreate services, durations, deposit and policies in the new platform, unpublished.
2. **Export from Goldie.** Its help center says clients, appointments and services can be exported by email, with the link valid for 7 days [Doc]. Verify inside the account.
3. **Inventory obligations.** List every future appointment, held deposit and outstanding balance. Reconcile with Stripe payouts.
4. **Import and validate.** Spot-check 100% of future appointments and a sample of client records.
5. **Parallel period.** Point the website's Book buttons to the new platform (one change in `data/booking.json`). Turn off new online bookings in Goldie but **keep existing Goldie appointments there until they happen**, and honour their deposits in Goldie.
6. **Cutover.** After the last Goldie appointment, archive the export. Only then close the Goldie account.
7. **Rollback.** Until step 6, switching `data/booking.json` back to Goldie and re-enabling online booking restores the old flow in minutes.
