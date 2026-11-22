# Booking Audit — Melanie Diaz (BRUJAS)

**Phase 1 — audit only. Nothing was changed in Goldie, on the live site, or in prices/policies.**
Audited 2026-11-22 (America/Chicago).

## Legend
| Tag | Meaning |
|---|---|
| **[Observed]** | Seen on the live Goldie booking page or the live website/repo. |
| **[Config]** | Read from the JSON that Goldie's public booking page itself loads (`api.heygoldie.com/live/rest/book/*`). This is an **undocumented internal endpoint**: fine for an audit, **not** something to build on. |
| **[Doc]** | Goldie help-center / third-party listing. Not verified inside Melanie's account. |
| **[Unverified]** | Needs Melanie (or her Goldie admin login) to confirm. |
| **[Conflict]** | Two sources disagree. |

## How the audit was done
1. **Repository.** I searched the repo and its full git history (including the remote branches) for booking links, prices, durations and policy text.
2. **Live site.** I compared melanie-diaz.com with the repo. The service list is identical.
3. **Goldie booking page.** I walked `https://book.heygoldie.com/BRUJAS` through step 3 of 4 (client details) **without submitting anything**. Reaching that step made Goldie hold a real slot (Tue Nov 24, 11:00 AM) for 10 minutes. I backed out immediately, and the hold expires on its own.
4. **Goldie's public config.** I read the JSON that the booking page loads, read-only.
5. **Goldie and competitors.** I read Goldie's help center and third-party pricing listings.

Not accessible: Goldie's **admin** side (Melanie's dashboard, reports, client records, notification settings, existing appointments). Everything in that area is marked **[Unverified]**.

---

## 1. Executive summary

| # | Finding | Severity |
|---|---|---|
| 1 | **The website and Goldie list completely different services.** The website shows 7 services and Goldie shows 8, with **no service matching by name, price and duration**. Four website services (Haircut, Relaxer, Shampoo treatment, Blow-dry with wash) **cannot be booked on Goldie at all**. | **Critical** (requirements 9, 107, 150, 154, 159) |
| 2 | **Website prices are lower than Goldie's.** For example: website "Curly dry cut $50+" vs Goldie "Dry Curly Cut $80 (returning only)"; website "Silk press + trim $100+" vs Goldie "Signature Silk Press $110, trim not included". | **Critical** (9, 102, 107) |
| 3 | **The website never mentions first-time vs returning clients, the deposit or the cancellation policy.** Clients only learn these inside Goldie. | High (20, 26, 58–61) |
| 4 | **Goldie lists "Wash and Go with Definition" at 15 minutes** (for $85). If that's wrong, Goldie will book the next client 15 minutes later, which is a real overbooking risk. | **High** (42, 47) — **[Unverified]** |
| 5 | **The Olaplex Ultimate Scalp & Bond Restoration description is the wrong text.** It's a Spanish paragraph describing a relaxer (*"El alisado es un tratamiento…"*). | High (24, 154) |
| 6 | **"Returning clients only" is just text in the service name.** Anyone can select those services; nothing in the public flow checks client history. | High (13–17) |
| 7 | **No holiday closures appear to be configured.** Thanksgiving (Nov 26), Christmas Eve and Christmas Day are all bookable. | Medium (36) — **[Unverified]**: may be intentional |
| 8 | **Goldie supports per-service deep links** (`/BRUJAS/checkout?serviceIds=<id>`), which preselect the service. The website doesn't use them: every Book button goes to the generic page. | Opportunity (151) |
| 9 | **Goldie already does the hard parts well:** a 10-minute slot hold, a deposit through Stripe, a policy checkbox, separate SMS-reminder and marketing consent, a waitlist, photo upload, and the America/Chicago timezone. | Positive |
| 10 | **The "earlier concept" values in the brief appear nowhere in this repo or its git history:** the $25 deposit, the 48-hour policy, the 30-day window, and the service names "First-Time Curly Experience" and "Signature Silk Press" outside Goldie. Goldie's live values are a **25% deposit** and a **24-hour** policy. | **Conflict** to resolve |

---

## 2. Current architecture (existing behaviour)

```
melanie-diaz.com (static HTML on Cloudflare)
 ├─ "Book now" buttons (3 per page: EN + ES) ──► https://book.heygoldie.com/BRUJAS   (generic, no service preselected)
 ├─ /links/  "Book" ─────────────────────────────► same generic URL
 ├─ Contact form ──► Formspree (xgonljwj) ──► email (no booking created)
 └─ Services list: HARD-CODED in index.html, es/index.html, links/index.html (3 copies)

Goldie (book.heygoldie.com/BRUJAS)  ← single source of truth for availability, bookings, deposits
 1/4 Select services (multi-select) → 2/4 Date & time → 3/4 Details + policy + deposit → 4/4 Pay (Stripe)
```

**In-progress redesign (branch `design/research-foundation`, not deployed):**
- `data/services.json`: one catalog file for the website. It still holds the **website** prices (wrong vs Goldie).
- `assets/js/booking.js` + `data/booking.json`: a booking adapter. `provider: "goldie"` and an empty `serviceUrls` map, so it's ready for deep links.
- Prototypes (`prototypes/*`) carry their own copies of Book links. These are for design only.

---

## 3. Goldie configuration (as published)

| Setting | Value | Source |
|---|---|---|
| Business / staff | BRUJAS; one staff member, Melanie Diaz | [Config] |
| Timezone | `America/Chicago`; times shown as "CST" | [Config] [Observed] |
| Hours | Sun & Mon closed · Tue–Thu 11:00–17:00 · **Fri 11:00–17:05** · Sat 10:00–17:00 | [Config] [Observed] |
| Slot interval | 30 min (11:00, 11:30, …) | [Observed] |
| Last offered slot | Signature Silk Press (80 min): **3:30 PM** on a day closing at 17:00. Services can't run past closing. | [Observed] |
| Booking horizon | Config: latest **12 months**. Calendar: bookable only through **Thu Dec 31, 2026** (~39 days ahead), with January greyed out. | [Config] [Observed] **[Conflict]**. Likely a schedule or calendar-view limit. Ask Melanie. |
| Minimum notice | None configured (`earliest: null`). The next open day (Tue) was bookable from Sunday. | [Config] [Observed] |
| Buffers / processing time | `processingTime: 0` on every service; no buffer setting visible | [Config] |
| Categories / add-ons / packages / products | None (all empty) | [Config] |
| Cancellation / reschedule | "Clients can cancel or reschedule appointments up to 24 hours before start time." Checkout: "Deposits are non-refundable in case of cancellation or no-show… If you reschedule within the above timeframe… your deposit will be automatically transferred." | [Observed] [Config] |
| Deposit | **25% of the service total** (Signature Silk Press $110 → **$27.50**), plus **$1.20 fees** paid by the client → $28.70 at checkout. Charged through Stripe. | [Observed] [Config] |
| Deposit refundability | Config `depositRefundable: 1` vs checkout text "non-refundable" | **[Conflict]**. The text shown to clients is what they agree to. |
| Default cancellation fee | `defaultCancellationFeeAmount: 5000` ($50). Not shown to clients in checkout. | [Config] **[Unverified]** whether it's ever applied |
| Buy now, pay later | Enabled (`bnpl.enabled: true`, minimum $50) | [Config] **[Unverified]** whether clients see it |
| Tips | Enabled | [Config] |
| Sales tax | Disabled | [Config] |
| Slot hold | "We'll hold the slot occupied for 9:59" | [Observed] |
| Intake fields | Full name, phone, email, optional photo; free-text message **disabled** | [Observed] [Config] |
| Consent | SMS reminders agreed by creating the appointment (transactional). Marketing texts are a **separate, unticked** checkbox. Policy checkbox is required. | [Observed] |
| Bot protection | reCAPTCHA | [Observed] |
| Waitlist | "Join waitlist" shown | [Observed] |
| Client sign-in | "Sign in" available; booking doesn't require an account | [Observed] |
| Google reviews / Reserve with Google | `googleConnections: null`, `reviews: []` | [Config]. Not connected. |
| Website field in Goldie profile | Empty | [Config] |
| Plan tier | Unknown. **Free Starter is capped at 20 appointments/month** [Doc]. | **[Unverified]**. Must confirm. |

---

## 4. Service catalogs compared

### 4.1 Goldie (bookable, authoritative today)
| Goldie service ID | Name | Duration | Price |
|---|---|---|---|
| `fb8b8594-cf6f-4b2e-9728-6793b4f76edd` | First-Time Curly Experience (Full Wash, Cut & Style) | 2 h 25 min | $160 |
| `e6e8f5a9-37fe-4fc7-a3f6-56f27abc1035` | First-Time Curly Reset (Consultation, Detox, Hydration & Cut – No Styling) | 1 h 45 min | $135 |
| `e4a6ec6f-d8a3-48bc-8c21-ad7556c6ecfc` | First-Time VIP Curly Transformation (Full Olaplex Restoration + Cut) | 2 h 45 min | $215 |
| `93e862a9-1e11-4aa0-ba0a-7aa1e9913918` | Dry Curly Cut (Returning Clients Only) | 1 h | $80 |
| `e5a994fb-530c-42bf-9e3e-58b1fb83feb0` | Curly Cut + Wash & Go (Returning Clients Only) | 1 h 45 min | $125 |
| `4c69327f-3ca6-4105-9ab2-04dc3ff24b62` | Wash and Go with Definition (Returning Clients Only) | **15 min** ⚠ | $85 |
| `84d7706b-8892-4283-891a-0144ccc73185` | Olaplex Ultimate Scalp & Bond Restoration (Includes Wash & Go) | 2 h 10 min | $170 |
| `4156d413-29f6-4e82-bc29-488bf30506cc` | Signature Silk Press (Trim/haircut not included) | 1 h 20 min | $110 |

All are fixed prices (`variablePrice: false`). None have add-ons or processing time.

### 4.2 Website (repo `index.html`, `es/index.html`, `links/index.html`; identical on the live site)
| Website service | Website price · duration | Closest Goldie service | Match? |
|---|---|---|---|
| Curly dry cut | $50+ · 1 hr | Dry Curly Cut (returning only) $80 · 1 h | ❌ price; returning-only restriction missing |
| Haircut | $50+ · 40 min | — | ❌ **not bookable** |
| Curly cut & define | $100+ · 2 hr | Curly Cut + Wash & Go (returning) $125 · 1 h 45 | ❌ name, price, duration |
| Silk press + trim | $100+ · 1 h 30 (/links/ says **$100**) | Signature Silk Press $110 · 1 h 20, **trim not included** | ❌ requirement 102: the trim is unaccounted for |
| Shampoo treatment | $25+ · 15 min | — | ❌ **not bookable** |
| Relaxer | $150+ · 2 h 15 | — (Olaplex description mentions *alisado*, but the service isn't a relaxer) | ❌ **not bookable** |
| Blow-dry with wash | $50+ · 1 hr | — | ❌ **not bookable** |
| — | — | First-Time Curly Experience / Reset / VIP | ❌ **not shown on website** |
| — | — | Wash and Go with Definition; Olaplex Ultimate | ❌ **not shown on website** |

**Hard-coded price/duration locations (all must change together today):**
- `index.html`: 7 `.service-card` blocks (lines ~192–232) + contact-form `<select>` (7 options)
- `es/index.html`: 7 cards + `<select>`
- `links/index.html`: 7 entries (lines ~163–250, EN/ES `data-*` attributes)
- `data/services.json` (redesign branch): 7 records, copied from the website, **not** from Goldie
- Structured data: `index.html` JSON-LD describes "Curly cuts, silk press, relaxers…". Relaxers aren't bookable.

---

## 5. Inconsistencies (descriptions, policies, links)

| Area | Inconsistency |
|---|---|
| Service names | The website uses generic names. Goldie uses first-time/returning names with explicit inclusions. |
| Relaxer | Advertised on the website and in SEO meta/JSON-LD; not offered on Goldie. |
| Silk press | Website "Silk press + trim" includes a trim; Goldie's Signature Silk Press explicitly excludes it. |
| Silk press price | $100+ (home) vs $100 (/links/) vs $110 (Goldie). |
| Olaplex Ultimate | Goldie description is unrelated Spanish relaxer text. |
| Wash and Go duration | 15 min in Goldie vs the described full cleanse, detangle, style and diffuse. Almost certainly wrong. |
| Dry Curly Cut | Goldie says wet or stretched hair is "upgraded to a Full Wash & Style service at the corresponding rate", **but no service with that name exists**. Requirement 103 (no automatic upgrades without a quote). |
| Policies | Website: none. Goldie: 24 h. Brief's earlier concept: 48 h, $25 deposit. |
| Deposit wording | "Non-refundable" in checkout vs `depositRefundable` flag in config. |
| Booking links | All generic; no service preselected; ES pages link to the same English-first flow. |
| Language | Goldie's "About" is bilingual; service names and descriptions are English only (except the wrong Olaplex text). Whether Goldie's booking UI can be shown in Spanish is **[Unverified]**. |
| Contact form | Lists 7 website services that don't map to Goldie. Submitting it creates **no booking**. |
| Hours | Not shown on the website. Goldie's Friday close of 17:05 looks like a typo. |

---

## 6. Requirements status (A–O)

✅ = met today (Goldie or site) · 🟡 = partially met · ❌ = missing · ❓ = unverified (Goldie admin side) · ➖ = not applicable while Goldie is authoritative

### A. Service catalog (1–10)
| Req | Status | Notes |
|---|---|---|
| 1 One authoritative catalog | ❌ | Goldie and the website disagree; the website has 3 hard-coded copies. |
| 2 Unique persistent IDs | 🟡 | Goldie has UUIDs; the website has none (the redesign branch has slugs). |
| 3 Full record fields | 🟡 | Goldie: name, description, duration, price, variable-price flag, processing time, add-ons. Missing: ES descriptions, buffer, eligibility, deposit per service, consult flag, timestamps. |
| 4–5 Add-ons / duplicate inclusions | ➖/❌ | No add-ons exist. |
| 6 Admin overrides | ❓ | |
| 7 Bundles / packages | ❌ | Packages empty in Goldie. |
| 8 Historical prices on bookings | ❓ | Likely, since Goldie stores per-appointment totals. |
| 9 Website copy must not override prices | ❌ | It currently contradicts them. |
| 10 Internal vs customer labels | ❌ | Goldie names are long and double as internal names. |

### B. Eligibility (11–20)
| Req | Status | Notes |
|---|---|---|
| 11–12 First-time vs returning | 🟡 | Only through service names; there's no question asked. |
| 13 First-timers must pick an intro service | ❌ | Not enforced. |
| 14 Six-month Dry Curly Cut window | ❌ | Stated in text, not enforced. |
| 15–17 Restrict unconfirmed returners, offer alternatives, no assumptions | ❌ | |
| 18 Owner override | 🟡 | Melanie can presumably book anything manually ❓ |
| 19 Consultations for chemical/complex work | ❌ | No consult service. |
| 20 Restrictions shown before the calendar | 🟡 | In service names and descriptions (step 1), yes; on the website, no. |

### C. Discovery & selection (21–32)
| Req | Status | Notes |
|---|---|---|
| 21 Book Now starts booking | ✅ | Generic page. |
| 22 Searchable / grouped | 🟡 | 8 services, no categories. |
| 23 Feature common & first-time | 🟡 | First-time services are listed first. |
| 24 Price, duration, inclusions before selection | ✅ | On Goldie; ❌ on the website (wrong values). |
| 25 Haircut included vs excluded | 🟡 | Goldie text says so; the website contradicts it. |
| 26 Prep instructions before payment | ✅ | In Goldie descriptions. |
| 27 Change service without restarting | ✅ | Goldie's Back button. |
| 28 Multiple services | ✅ | Multi-select in step 1 [Observed]. |
| 29 Block incompatible combinations | ❌ | Not observed. |
| 30 Dynamic totals | ✅ | "Total: $110" updates. |
| 31 Flag approval/consult services | ❌ | |
| 32 No account required | ✅ | |

### D. Availability (33–52)
| Req | Status | Notes |
|---|---|---|
| 33 America/Chicago | ✅ | |
| 34 Import Goldie schedule | ➖ | Goldie *is* the schedule. |
| 35 Per-day hours | ✅ | |
| 36 Closures / holidays | ❓ | None visible for upcoming holidays. |
| 37, 50 Private blocks, admin appointments | ❓ | Standard Goldie features [Doc]. |
| 38 Configurable horizon | 🟡 | 12 months configured vs 39 days observed **[Conflict]**. |
| 39 Minimum notice | ❌ | Not set. |
| 40, 47 Only real, complete slots | ✅ | The last slot respects closing time. |
| 41, 49 No overlaps, no races | ✅ | 10-minute hold observed; final revalidation **[Unverified]**. |
| 42 Full duration incl. buffers | 🟡 | No buffers set; one duration likely wrong (Wash & Go). |
| 43 No running past hours | ✅ | |
| 44 Slot interval ≠ duration | ✅ | 30-minute grid. |
| 45 Processing periods | 🟡 | Supported field, set to 0. |
| 46 Breaks between clients | ❌ | |
| 48 Revalidate on submit | ❓ | |
| 51 Extra availability | ❓ | |
| 52 No stale availability | ✅ | Live from Goldie; the website shows no calendar. |

### E. Workflow (53–68)
| Req | Status | Notes |
|---|---|---|
| 53–55 Service → time → details | ✅ | |
| 56 Minimal data | ✅ | Name, phone, email. |
| 57 Notes & photos | 🟡 | Photo yes; free-text note disabled. |
| 58–61 Summary, deposit and balance separately, terms, explicit acceptance | 🟡 | Deposit and fees shown; **remaining balance not shown separately** [Observed]; policy checkbox required ✅. |
| 62 Secure via payment | ✅ | Stripe deposit. |
| 63–65 Confirmation & reference | ❓ | Not submitted (would create a real booking and charge). |
| 66–67 Payment failure, duplicates | ❓ | |
| 68 Mobile | ✅ | Responsive [Observed in earlier research]. |

### F. Deposits & payments (69–82)
| Req | Status | Notes |
|---|---|---|
| 69 Configurable deposit | 🟡 | Global 25%; per-service ❓. |
| 70 Verify the $25 deposit | ✅ verified **not current**: live is 25% (= $27.50 on $110) **[Conflict]**. |
| 71–72 Correct base, remaining balance | 🟡 | Base correct; balance not shown. |
| 73–74 Compliant processor, no raw card data | ✅ | Stripe Elements. |
| 75–80 Receipts, refunds, audit | ❓ | |
| 77 Separate outcomes per scenario | 🟡 | Cancel/no-show: forfeit; reschedule: transfer. Stylist cancellation: undefined. |
| 81–82 No silent increases | 🟡 | The Dry Curly Cut "upgrade at corresponding rate" text conflicts. |

### G. Cancellation & rescheduling (83–95)
| Req | Status | Notes |
|---|---|---|
| 83 Configurable | ✅ | Goldie setting. |
| 84 24 h published | ✅ verified. |
| 85 48 h earlier concept | **[Conflict]**. Not found in this repo. |
| 86 Don't activate either policy in a replacement without approval | ➖ | Nothing replaced. |
| 87–88, 90–91 Self-reschedule link, deposit transfer, release slot | ✅ | Described in checkout; link delivery ❓. |
| 89 Reschedule limit | ❓ | |
| 92–95 Late / no-show statuses, exceptions, notices, history | ❓ | |

### H. Service-specific (96–106)
| Req | Status | Notes |
|---|---|---|
| 96 First-Time Experience components | ✅ | In the Goldie text. |
| 97 Reset excludes styling | ✅ | |
| 98 VIP lists treatments | ✅ | |
| 99 Dry Curly Cut restrictions & prep | 🟡 | Text only, not enforced. |
| 100 Cut + Wash & Go vs Wash & Go | 🟡 | Distinct services, but Wash & Go is 15 min ⚠. |
| 101 Silk press excludes trim | ✅ | In Goldie; ❌ on website. |
| 102 Silk Press + Trim ≠ Signature | ❌ | The website treats them as equivalent. |
| 103 No automatic upgrades | ❌ | The Dry Curly Cut text promises an automatic upgrade. |
| 104–105 Chemical screening | ❌ | No intake questions. |
| 106 Melanie can refuse or defer | ❓ | Operational. |

### I. Pricing (107–116)
107 ❌ (website diverges) · 108 🟡 (fixed only in Goldie) · 109–111 ✅ (no surcharges defined), except the Dry Curly Cut upgrade text · 112 🟡 (client fee shown; tax off) · 113 ➖ · 114 ➖ (no add-ons) · 115 ❓ · 116 ✅.

### J. Notifications (117–126)
117–122 ❓ (Goldie sends SMS reminders per the consent text; email ❓) · 123 ✅ (transactional vs marketing separated) · 124 ❓ (Spanish templates) · 125 ✅ (only Goldie sends today; the website sends no booking notices) · 126 ❓.

### K. Client records (127–135) · L. Admin (136–149)
All ❓. These live in Goldie's admin side. Goldie advertises a calendar, client records, reports and a full data export [Doc]. **Confirm with Melanie.** Requirement 135 ✅ on the public side: no client data appears in public URLs (the service ID only).

### M. Website integration (150–159)
| Req | Status | Notes |
|---|---|---|
| 150 Every Book Now works | ✅ | Generic link. |
| 151 Preselect service | ❌ | Goldie supports it; the site doesn't use it. |
| 152 Closest truthful path | ❌ | Website services without a Goldie equivalent lead to a page that can't book them. |
| 153 No fabricated availability | ✅ | |
| 154 Consistent price & duration | ❌ | |
| 155 Mobile-first | ✅ | Redesign branch. |
| 156 Accessibility | 🟡 | Redesign branch: focus, labels, 44px targets. Goldie's own accessibility not audited. |
| 157 Fast & understandable in EN/ES | 🟡 | Website bilingual; Goldie services English only. |
| 158 Preserve state on back/forward | ✅ | Goldie keeps `serviceIds` in the URL. |
| 159 No dead ends or fake forms | ❌ | Four advertised services are dead ends. The contact form looks like booking but isn't. |

### N. Goldie & migration (160–170)
160 🟡 (catalog, settings and policies audited; admin and export ❓) · 161 ✅ (deep links + preselection can satisfy most website-side needs) · 162 see BOOKING_ARCHITECTURE.md · 163 ✅ respected: no official API or webhooks found; the internal endpoint is not treated as an API · 164–165 ✅ (Goldie is the only inventory) · 166–170 ➖ (no migration proposed now).

### O. Testing (171–183)
None of these tests exist yet. See BOOKING_TEST_PLAN.md.

---

## 7. Decisions needed from Melanie (blocking)
1. **Which catalog is true?** Goldie's 8 services, or the website's 7? Does she still offer relaxers, plain haircuts, shampoo treatments and blow-dries?
2. **The Wash and Go duration.** Is 15 minutes a typo?
3. **The Olaplex Ultimate description.** It's wrong and needs her correct text.
4. **Policy.** Confirm 24 h, a 25% deposit, non-refundable on cancel/no-show, and the client-paid fee. Drop the 48 h / $25 concept?
5. **Holidays.** Are Thanksgiving, Dec 24 and Dec 25 really open?
6. **Booking horizon.** Why does the calendar stop at Dec 31 when the config says 12 months?
7. **Goldie plan tier.** If she's on the free Starter plan, the 20-appointments-a-month cap could block bookings.
8. **The "Full Wash & Style" upgrade.** What exactly does the client pay, and does she approve it beforehand?
9. **Spanish.** Does she want Spanish service descriptions inside Goldie? (Goldie's ES support is ❓.)
