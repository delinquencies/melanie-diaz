# Booking Architecture — options & recommendation

Goal (from the brief): **"a dependable, low-maintenance booking experience, not a complicated new software business."**

Costs below are from public listings checked 2026-11-22. They are **unverified**: confirm on each vendor's pricing page and inside Melanie's account before deciding.

---

## 1. The three paths

### Path 1 — Keep Goldie, integrate it properly with the website
The website becomes a fast, bilingual "storefront" that explains services and eligibility. Every Book button **deep-links into the exact Goldie service** (`/BRUJAS/checkout?serviceIds=<id>`, verified working). Goldie stays the only place where availability, bookings, deposits and reminders exist.

### Path 2 — Replace Goldie with another established platform
For example Square Appointments, GlossGenius, Vagaro or Acuity. Same storefront idea, different engine. It means migrating clients, future appointments and deposits.

### Path 3 — Build an independent booking engine
Our own availability engine, database, Square payments, email/SMS, admin calendar and client records, for example on Cloudflare Workers + Square + Resend/Twilio. (Payments provider decided 2026-11-22: Square, not Stripe.)

## 2. Comparison

| | **1. Keep Goldie** | **2. Switch platform** | **3. Build our own** |
|---|---|---|---|
| Meets the brief's must-haves (catalog, real availability, deposits, policies, reminders, mobile, no double booking) | **Yes.** Most already work today [Observed]. | Yes, depending on the vendor. | Yes, but only after a lot of work. |
| Eligibility enforcement (first-time vs returning, 6-month window) | **Guidance only** on the site + Melanie's review. Goldie has no rule engine [Observed]. | Varies. Some platforms support "new client only" services or intake forms. **Unverified per vendor.** | Full enforcement possible. |
| Spanish booking flow | Website: yes. Goldie UI: **unverified**. | Varies (unverified). | Full control. |
| Double-booking safety | Goldie's 10-minute hold + single inventory [Observed]. | Vendor-provided. | **Ours to get right** (races, DST, holds). High risk. |
| Payments / PCI | Goldie + Stripe | Vendor | Square hosted checkout / Web Payments SDK keeps us out of PCI scope; refunds, disputes and receipts are on us. |
| Migration effort | **None** | Medium: export, re-enter services, move future bookings and deposits, retrain Melanie, new links | High: all of Path 2 plus building and testing everything |
| Build effort (my estimate) | **~2–4 days of website work** | ~1–2 weeks incl. migration & parallel run | **~6–12 weeks** for a solid version, plus an admin app |
| Ongoing maintenance | Near zero (keep catalog in sync) | Near zero | **Continuous**: security, payments, SMS compliance (10DLC), backups, bugs, on-call when booking breaks |
| Monthly software cost | Goldie: Starter free (**20 appointments/month cap**), Pro $19.99, Pro Plus $39.99 [Doc] + Stripe fees (client currently pays a fee) | Square Appointments: free for solo (per vendor claims); GlossGenius ~$24–28; Vagaro ~$24–30; Acuity ~$16–20 [Doc], plus processing fees | Hosting ~$0–10; Square processing fees per charge (check Square's current rates); SMS a few cents per message plus carrier registration; email ~$0–20 |
| Risk to Melanie's income if it breaks | Low | Low–medium during migration | **High.** Bugs mean lost or double bookings. |
| Reversibility | Fully reversible | Reversible with effort | Hard to unwind |

**Gaps that remain under Path 1:**
- Returning-only services can still be booked by anyone, so Melanie reviews them (BOOKING_RULES E6).
- Incompatible combinations aren't blocked (P7).
- Spanish inside Goldie is unverified.
- No public API or webhooks, so no automated catalog or booking sync (req 163 respected).

**None of these gaps justifies Path 3.** If eligibility enforcement turns out to really matter, Path 2 is the next step, not Path 3.

## 3. Recommendation: **Path 1, done properly**

It's the smallest reliable architecture that meets the brief. Melanie keeps the system that already handles the risky parts: availability, slot holds, deposits, Stripe, reminders and the 24-hour policy. The website's job becomes guiding the client to the **right** service and handing them to Goldie at **step 2 (pick a time)** with one tap.

Before starting, confirm Melanie's **Goldie plan**. On the free Starter plan (20 appointments/month), a better website could push bookings into the cap. Pro ($19.99/mo) removes it [Doc].

## 4. Target design (Path 1)

```
Client (phone)
  │
  ▼
melanie-diaz.com  (static, Cloudflare)                         Goldie (authoritative)
  ┌─────────────────────────────────────────────┐               ┌──────────────────────────────┐
  │ "Been to Melanie before?"  New │ Returning  │               │ 1 service (preselected)       │
  │   ↓                                         │  deep link    │ 2 date & time (live)          │
  │ Service cards from data/services.json       │ ───────────▶  │ 3 details + policy + deposit  │
  │  · includes / excludes / prep / eligibility │ ?serviceIds=  │ 4 pay (Stripe)                │
  │  · price, duration, deposit, balance        │               │ confirmation, SMS reminders,  │
  │  · Book → booking.js adapter                │               │ reschedule link, waitlist     │
  └─────────────────────────────────────────────┘               └──────────────────────────────┘
        ▲                                                         │
        │ monthly / on-change check (§4.3)                        │ data export (email, Goldie)
        └──────────── compare prices & durations ◀────────────────┘
```

### 4.1 Website pieces (most already exist on branch `design/research-foundation`)
| Piece | State | Change needed |
|---|---|---|
| `data/services.json` | Exists, but holds **website** prices | Replace with Goldie-mirrored records (SERVICE_CATALOG §1–2) **after Melanie confirms the catalog**. |
| `data/booking.json` → `goldie.serviceUrls` | Exists, empty | Fill each service ID → `https://book.heygoldie.com/BRUJAS/checkout?serviceIds=<GoldieID>`. |
| `assets/js/booking.js` | Exists; adds the deep link if configured, otherwise the generic URL; fires a `md:book` event | None. Already supports a future `custom` provider. |
| New/returning chooser | Not built | A small component: two buttons that filter the service cards; the choice is remembered for the session. Guidance only. |
| Service card | Poster/list components exist | Add includes/excludes, prep, eligibility line, and deposit + balance. |
| Policy summary | Not built | Short block near the services: 24 h, deposit %, reschedule transfers the deposit. Text copied from Goldie once Melanie confirms. |
| Contact form | Exists | Relabel as questions only; put a Book button beside it. |

### 4.2 What the website will **not** do (req 52–53, 165)
- Show times or availability.
- Take payments.
- Create, store or modify bookings.
- Send booking emails or SMS.

### 4.3 Keeping the website in step with Goldie
- **Primary (manual, reliable):** whenever Melanie changes a price, duration or service in Goldie, she (or whoever maintains the site) updates `data/services.json`. A one-page checklist lives in MIGRATION_PLAN.md.
- **Safety net (optional, developer-only):** a small script compares `data/services.json` with the data Goldie's own booking page loads, and prints any differences. It's run by hand or on a schedule.
  - Because that endpoint is **undocumented**, the script only *warns*. It never changes the site, and the site never calls Goldie at runtime.
  - If the endpoint changes, the script fails loudly and nothing on the live site breaks.

## 5. When to revisit
Re-evaluate Path 2 if any of these become true:
- Melanie needs **enforced** first-time vs returning rules, or intake/consent forms, that Goldie can't do.
- She needs a fully Spanish booking UI and Goldie can't provide it.
- Goldie's fees or plan limits stop being worth it.
- She hires staff with complex scheduling.

Path 3 stays off the table unless the business itself becomes a software product.
