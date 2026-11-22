# Booking Rules — Melanie Diaz (BRUJAS)

Every rule is tagged with its **status** and **where it's enforced**:

| Status | Meaning |
|---|---|
| **EXISTING** | Live today in Goldie [observed or read from its public config]. |
| **REQUIRED** | From the functional brief; not yet in place. |
| **PROPOSED** | My recommendation. Needs approval. |
| **UNVERIFIED** | Can't be confirmed without Melanie or Goldie admin access. |
| **CONFLICT** | Sources disagree. Melanie must decide. |

Enforcement: **Goldie** (the booking engine) · **Site** (website guidance only, which can't stop a booking) · **Melanie** (manual, operational).

> Principle: while Goldie is the booking engine, any rule Goldie can't enforce becomes **guidance on the website plus Melanie's manual review**. We don't build a second system to enforce it (req 165).

---

## 1. Time & calendar
| # | Rule | Status | Enforced by |
|---|---|---|---|
| T1 | All times are America/Chicago; Goldie handles daylight-saving changes. | EXISTING | Goldie |
| T2 | Hours: Tue–Thu 11:00–17:00, Fri 11:00–**17:05**, Sat 10:00–17:00; Sun and Mon closed. | EXISTING · **UNVERIFIED** whether 17:05 is a typo | Goldie |
| T3 | Start times on a 30-minute grid. | EXISTING | Goldie |
| T4 | A service must finish by closing time. | EXISTING | Goldie |
| T5 | No overlapping appointments (single provider). | EXISTING | Goldie |
| T6 | A slot is held for 10 minutes while the client fills in details. | EXISTING | Goldie |
| T7 | Booking horizon: **CONFLICT**. Config says 12 months; the calendar showed ~39 days (through Dec 31). The brief's earlier concept said 30 days. | CONFLICT | Goldie |
| T8 | Minimum advance notice. None today. **Proposed: 12–24 h** so Melanie isn't surprised by same-morning bookings. | PROPOSED | Goldie |
| T9 | Holiday and vacation closures configured ahead of time (US holidays; Melanie's vacations). | REQUIRED · UNVERIFIED (Thanksgiving and Christmas currently open) | Goldie |
| T10 | Buffer between clients for cleanup and turnover. None today. **Proposed: 15 min**, if Goldie supports buffers; otherwise add 15 min to each service's duration. | PROPOSED | Goldie |
| T11 | Every service duration matches reality. **Wash and Go = 15 min must be fixed.** | REQUIRED | Goldie |
| T12 | Processing time is not treated as free time for another client (req 45). All processing times are 0 today, so nothing is double-booked. Keep it that way unless Melanie decides otherwise. | EXISTING | Goldie |

## 2. Eligibility
| # | Rule | Status | Enforced by |
|---|---|---|---|
| E1 | A new curly client starts with one of: First-Time Curly Experience, First-Time Curly Reset, First-Time VIP Curly Transformation. | EXISTING (text) / REQUIRED (enforcement) | Site guidance + Melanie |
| E2 | Dry Curly Cut: only for clients who had a First-Time Experience **or** Reset in the **last 6 months**. | EXISTING (text) | Melanie (manual review) |
| E3 | Curly Cut + Wash & Go and Wash & Go with Definition: returning clients only. The time window is **UNVERIFIED** (no window is stated). | EXISTING (text) · UNVERIFIED window | Melanie |
| E4 | When eligibility is unclear, offer a first-time service instead of turning the client away (req 16). | PROPOSED | Site ("Not sure? Start here") |
| E5 | Never assume a client is returning from their name alone (req 17). | REQUIRED | Melanie / site copy |
| E6 | If someone books a returning-only service without history: **PROPOSED process.** Melanie contacts them within 24 h and offers to switch to the right first-time service, with the deposit transferred. She does not cancel silently. | PROPOSED · needs Melanie | Melanie |
| E7 | Melanie can override any eligibility rule (req 18). | EXISTING (she books manually) · UNVERIFIED | Melanie |
| E8 | Chemical or corrective services need a consultation first (req 19, 104). No chemical service is bookable today. If a relaxer or color is added, it needs a consult step. | REQUIRED (future) | Goldie service setup |
| E9 | Screening questions (allergies, prior chemical treatments) are asked without giving medical advice (req 105). Goldie's custom intake field is limited (one text field, currently off). | PROPOSED | Goldie intake / Melanie |

## 3. Selection & pricing
| # | Rule | Status | Enforced by |
|---|---|---|---|
| P1 | Prices come only from Goldie; the website mirrors them (req 9, 107). | REQUIRED (violated today) | Site build check |
| P2 | All current services are fixed-price. | EXISTING | Goldie |
| P3 | Cards say clearly whether a haircut is included: First-Time Experience, Reset and VIP **include** a cut; Dry Curly Cut **is** a cut; Curly Cut + Wash & Go **includes** a cut; Wash & Go and Signature Silk Press **exclude** a cut. Olaplex: **UNVERIFIED**. | REQUIRED | Site + Goldie descriptions |
| P4 | Signature Silk Press is never shown as "Silk press + trim" (req 102). | REQUIRED | Site |
| P5 | No automatic upgrades or surcharges without a quote and the client's approval (req 103, 111). The Dry Curly Cut "upgrade at corresponding rate" text should name the service and price, and say Melanie will ask first. | REQUIRED · needs Melanie's wording | Goldie description + Melanie |
| P6 | Several services can go in one appointment, with combined duration and price. | EXISTING | Goldie |
| P7 | Incompatible combinations are prevented, for example First-Time Experience + Dry Curly Cut (duplicate cut, req 5 and 29). Goldie doesn't block this. | REQUIRED · gap | Site guidance + Melanie |
| P8 | Sales tax off; a client-paid processing fee is shown at checkout. | EXISTING · UNVERIFIED that the fee is intended | Goldie |

## 4. Deposits & payments
| # | Rule | Status | Enforced by |
|---|---|---|---|
| D1 | A deposit of **25% of the service total** is paid at booking through Goldie/Stripe. | EXISTING | Goldie |
| D2 | **CONFLICT:** the earlier concept said a "$25 non-refundable deposit credited toward the service". Live is 25%. | CONFLICT | — |
| D3 | The deposit is credited toward the service total; the remaining balance is paid at the appointment. The balance isn't shown separately at checkout. **PROPOSED:** show it on the website service cards (e.g. "$27.50 deposit · $82.50 at appointment"). | EXISTING (implied) · PROPOSED display | Site |
| D4 | Deposit is forfeited on cancellation inside 24 h or a no-show. | EXISTING (checkout text) | Goldie |
| D5 | Deposit transfers automatically when rescheduled ≥24 h ahead with the provided link. | EXISTING | Goldie |
| D6 | **Melanie cancels:** the deposit is refunded in full or transferred, at the client's choice (req 77). | PROPOSED · needs Melanie | Melanie |
| D7 | The $50 default cancellation fee in config is **not shown to clients**. It must not be charged unless it's disclosed and agreed (req 81–82). | UNVERIFIED | Goldie / Melanie |
| D8 | `depositRefundable` config vs "non-refundable" text. The text the client agreed to governs. Melanie should align the setting. | CONFLICT | Goldie |
| D9 | Raw card data is never stored by the website. All payment goes through Goldie's Stripe checkout. | EXISTING | Goldie |
| D10 | Buy-now-pay-later is enabled in config. **UNVERIFIED** whether Melanie wants it. | UNVERIFIED | Goldie |

## 5. Cancellation, rescheduling, no-shows
| # | Rule | Status | Enforced by |
|---|---|---|---|
| C1 | Cancel or reschedule allowed up to **24 hours** before the start. | EXISTING | Goldie |
| C2 | **CONFLICT:** the earlier concept used 48 hours. Do not switch without Melanie's approval (req 85–86). | CONFLICT | — |
| C3 | The self-service reschedule/cancel link is delivered in the confirmation. | EXISTING (stated) · UNVERIFIED delivery | Goldie |
| C4 | Cancelled slots are released automatically. | EXISTING (assumed standard) · UNVERIFIED | Goldie |
| C5 | Reschedule limit (e.g. once per deposit). None stated. | PROPOSED · optional | Goldie / Melanie |
| C6 | Late arrival: **PROPOSED.** Past 15 min late, Melanie may shorten the service or reschedule, with the deposit applied. Wording is Melanie's to set. | PROPOSED | Melanie |
| C7 | Goodwill exceptions are at Melanie's discretion (req 93). | EXISTING | Melanie |

## 6. Communication
| # | Rule | Status | Enforced by |
|---|---|---|---|
| N1 | SMS appointment reminders are transactional; the client agrees by booking, with STOP to opt out. | EXISTING | Goldie |
| N2 | Marketing texts are a separate, unchecked opt-in. | EXISTING | Goldie |
| N3 | Only Goldie sends booking notifications. The website never sends booking emails, to avoid duplicates (req 125). | EXISTING · keep | — |
| N4 | Prep instructions are sent with the confirmation or reminder. | UNVERIFIED (Goldie template content) | Goldie |
| N5 | Spanish templates. | UNVERIFIED | Goldie |
| N6 | The website contact form is clearly labelled "Questions, not booking", with a Book button beside it (req 159). | PROPOSED | Site |

## 7. Website integration
| # | Rule | Status | Enforced by |
|---|---|---|---|
| W1 | Every Book button leads to a working Goldie path. | EXISTING | Site |
| W2 | A service-specific Book button deep-links with `?serviceIds=<GoldieID>`. | PROPOSED (supported, unused) | Site (`data/booking.json` → `serviceUrls`) |
| W3 | Services not bookable in Goldie are hidden, or shown as "Contact to book". | REQUIRED | Site |
| W4 | No calendar or availability is shown on the website; Goldie is the only availability source (req 52–53, 165). | EXISTING · keep | Site |
| W5 | Spanish pages link to the same Goldie services. Service explanations on the website are translated; Goldie UI language is UNVERIFIED. | PROPOSED | Site |
