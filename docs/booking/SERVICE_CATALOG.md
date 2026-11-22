# Service Catalog — Melanie Diaz (BRUJAS)

**Status: proposal + snapshot. No prices were changed.**
- **Source of truth today: Goldie.** The website must *mirror* Goldie, never override it (requirements 9, 107).
- Snapshot of Goldie's public booking data taken 2026-11-22. Values marked ⚠ need Melanie's confirmation.

---

## 1. Record format (requirement 3)

The proposed format for `data/services.json`. Fields that Goldie can't store are marked *website-only*, and are used only to *explain* services, never to price them.

| Field | Type | Example | Notes |
|---|---|---|---|
| `id` | slug, permanent | `signature-silk-press` | Website ID. Never reused (req 2). |
| `sourceSystem` | string | `goldie` | |
| `sourceId` | string | `4156d413-29f6-4e82-bc29-488bf30506cc` | Goldie service ID → deep link (req 151). |
| `label` | {en, es} | "Signature Silk Press" | Customer-friendly (req 10). |
| `internalName` | string | "Signature Silk Press" | Exactly as in Goldie, used for matching. |
| `category` | enum | `first-time-curly`, `returning-curly`, `treatments`, `smoothing` | Proposed grouping. |
| `description` | {en, es} | | ES needs Melanie's approval. |
| `includes` | [string] | ["clarifying wash", "steam condition", …] | Req 3, 25. |
| `excludes` | [string] | ["trim / haircut"] | Makes "haircut included?" unmistakable (req 25). |
| `pricing.type` | `fixed` \| `starting-at` \| `quoted` | `fixed` | Req 108. |
| `pricing.amount` | integer cents | 11000 | **Copied from Goldie, never typed by hand.** |
| `durationMin` | int | 80 | From Goldie. |
| `processingMin` | int | 0 | From Goldie. |
| `bufferMin` | int | 0 ⚠ | Goldie has no buffer today. Proposed. |
| `eligibility` | object | `{ "clientType": "returning", "windowMonths": 6, "requiresPrior": ["first-time-curly-experience","first-time-curly-reset"] }` | *Website-only*: guidance shown before booking. Goldie doesn't enforce it. |
| `prep` | {en, es} | "Arrive with hair 100% dry, clean, detangled…" | Req 26, 120. |
| `consultation` | `none` \| `included` \| `required-before` | `included` | Req 19, 31, 104. |
| `deposit` | `{ "type": "percent", "value": 25 }` | | Mirrors Goldie's global setting (req 69). ⚠ |
| `addOns` | [id] | [] | None exist in Goldie (req 4–5). |
| `visible` | bool | true | Req 3. |
| `onlineBooking` | bool | true | If false, the website shows "Contact to book" instead of Book. |
| `updatedAt` | ISO date | `2026-11-22` | Req 3. |
| `verifiedAgainstSource` | ISO date | `2026-11-22` | When this record was last checked against Goldie. |

**Rules for using the catalog:**
- **Prices and durations come only from Goldie.** A check script (see BOOKING_ARCHITECTURE §4.3) flags any difference. A person decides which side is right.
- **Bundles and packages** (req 7): Goldie has none today. Model them as their own Goldie service when Melanie creates one.
- **Historical prices** (req 8) live in Goldie's appointment records, not in this file.

---

## 2. Current bookable services (Goldie snapshot)

Deep link format: `https://book.heygoldie.com/BRUJAS/checkout?serviceIds=<sourceId>`
I checked that this opens step 1 with the service preselected [Observed]. Combining several IDs in one link is **unverified**.

### First-time curly clients
| id (proposed) | Goldie name | Price | Duration | Includes | Excludes / notes | Deep link ID |
|---|---|---|---|---|---|---|
| `first-time-curly-experience` | First-Time Curly Experience (Full Wash, Cut & Style) | $160 fixed | 2 h 25 m | In-depth curl consultation; scalp & buildup detox cleanse; deep hydration treatment; custom dry/wet curly cut; full curl definition + diffuser drying; product education | Prep: clean, dry, detangled, worn down (no ponytails or clips) | `fb8b8594-cf6f-4b2e-9728-6793b4f76edd` |
| `first-time-curly-reset` | First-Time Curly Reset (Consultation, Detox, Hydration & Cut – No Styling) | $135 fixed | 1 h 45 m | Curl consultation; detox cleanse; deep hydration treatment; custom curly cut | **No diffuse styling or curl definition** (req 97). Same prep. | `e6e8f5a9-37fe-4fc7-a3f6-56f27abc1035` |
| `first-time-vip-curly-transformation` | First-Time VIP Curly Transformation (Full Olaplex Restoration + Cut) | $215 fixed | 2 h 45 m | In-depth curl & scalp consultation; Olaplex Broad Spectrum Chelating Treatment; targeted scalp ampoule; Olaplex No. 1 & No. 2 bond reconstruction; Olaplex 4-in-1 Moisture Mask; customized curly cut + Signature Wash & Go with diffuser drying (req 98) | — | `e4a6ec6f-d8a3-48bc-8c21-ad7556c6ecfc` |

### Returning curly clients
| id (proposed) | Goldie name | Price | Duration | Includes | Excludes / notes | Deep link ID |
|---|---|---|---|---|---|---|
| `dry-curly-cut` | Dry Curly Cut (Returning Clients Only) | $80 fixed | 1 h | Curl-by-curl dry cut | **Eligibility:** had a First-Time Experience or Reset **within 6 months** (req 14). **Prep:** 100% dry, clean, detangled, natural pattern (no buns, ponytails, braids, heavy gels or oils). ⚠ The automatic "upgrade to Full Wash & Style" refers to a service that doesn't exist (req 103). | `93e862a9-1e11-4aa0-ba0a-7aa1e9913918` |
| `curly-cut-wash-go` | Curly Cut + Wash & Go (Returning Clients Only) | $125 fixed | 1 h 45 m | Dry cut; gentle cleanse; hydrating conditioning; curl definition; diffused drying | **Includes a cut**. That's how it differs from Wash & Go (req 100). Prep: dry, detangled, worn down. | `e5a994fb-530c-42bf-9e3e-58b1fb83feb0` |
| `wash-go-definition` | Wash and Go with Definition (Returning Clients Only) | $85 fixed | ⚠ **15 min** | Moisturizing cleanse; thorough detangling; section-by-section styling; diffuser finish | **Haircut not included.** ⚠ The duration is almost certainly wrong and causes an overbooking risk. | `4c69327f-3ca6-4105-9ab2-04dc3ff24b62` |

### Treatments
| id (proposed) | Goldie name | Price | Duration | Includes | Excludes / notes | Deep link ID |
|---|---|---|---|---|---|---|
| `olaplex-scalp-bond-restoration` | Olaplex Ultimate Scalp & Bond Restoration (Includes Wash & Go) | $170 fixed | 2 h 10 m | ⚠ **Unknown.** The Goldie description is unrelated relaxer text in Spanish. | Includes a Wash & Go (per its name). Cut included? ⚠ | `84d7706b-8892-4283-891a-0144ccc73185` |

### Smoothing
| id (proposed) | Goldie name | Price | Duration | Includes | Excludes / notes | Deep link ID |
|---|---|---|---|---|---|---|
| `signature-silk-press` | Signature Silk Press | $110 fixed | 1 h 20 m | Clarifying & moisturizing wash; hydrating steam condition; blow-dry; thermal protection; precision flat-ironing | **Trim/haircut not included** (req 101–102). | `4156d413-29f6-4e82-bc29-488bf30506cc` |

**Global (Goldie):** 25% deposit + client-paid fee; 24-hour cancel/reschedule; deposit non-refundable on cancel or no-show and transferred on reschedule. ⚠ Confirm with Melanie.

---

## 3. Website-only services (advertised, not bookable)

These come from `index.html`, `es/index.html`, `links/index.html` and `data/services.json`. **Each needs a decision: add it to Goldie, or remove it from the website.**

| Website service | Website price · duration | Status | Recommendation |
|---|---|---|---|
| Curly dry cut | $50+ · 1 hr | Superseded by Dry Curly Cut $80 (returning only) | Remove; show the Goldie service instead. |
| Haircut | $50+ · 40 min | ❌ Not in Goldie | Ask Melanie whether it's still offered. |
| Curly cut & define | $100+ · 2 hr | Nearest: Curly Cut + Wash & Go $125 | Remove; show the Goldie service instead. |
| Silk press + trim | $100+ (/links/: $100) · 1 h 30 | Nearest: Signature Silk Press $110, **trim excluded** | Don't present them as equivalent (req 102). If Melanie offers a trim, create "Silk Press + Trim" in Goldie, or allow adding a trim. |
| Shampoo treatment | $25+ · 15 min | ❌ Not in Goldie | Ask Melanie. |
| Relaxer | $150+ · 2 h 15 | ❌ Not in Goldie | Ask Melanie. If offered, it needs consultation/screening rules (req 19, 104–105). |
| Blow-dry with wash | $50+ · 1 hr | ❌ Not in Goldie | Ask Melanie. |

---

## 4. Proposed website grouping (requires approval)

The website would open with one question: **"Have you been to Melanie before?"** (req 11–12, 20)
- **New client:** show the 3 first-time curly services side by side (what's included, what's excluded, price, duration), plus Signature Silk Press and Olaplex.
- **Returning:** show Dry Curly Cut, Curly Cut + Wash & Go and Wash & Go, each with its eligibility line ("Had a First-Time Experience or Reset in the last 6 months"). There's also a "Not sure? Book a First-Time service" fallback (req 16).
- **Every card's Book button deep-links** straight to that Goldie service.

This is guidance, not enforcement: Goldie still lets anyone book anything. See BOOKING_RULES.md for the enforcement gap.
