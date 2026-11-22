# Booking Test Plan

There are two kinds of test:
- **Site tests:** our website code. These can be automated and are safe to run any time.
- **Goldie tests:** the live booking engine. **Never use a real client's payment data** (req 183).
  - Goldie has no test mode that I could confirm. Tests that need a real booking or payment must be done **by Melanie**, either:
    - a manual appointment created in her Goldie admin (no payment), or
    - one booking on her own card, cancelled and refunded right away.
  - Each such test is marked 🔒 below.
  - Reaching Goldie step 3 holds a real slot for 10 minutes, so run browse-only Goldie tests on far-future dates and back out promptly.

Status column: **New** = to be written · **Manual** = human check · **Auto** = scriptable.

---

## 1. Website integration (Site)
| ID | Test | Expected | Type |
|---|---|---|---|
| W-01 | Every element with `data-book` resolves to `https://book.heygoldie.com/BRUJAS…` | No dead or `#` links (req 150, 159) | Auto |
| W-02 | Each service card's Book link uses `?serviceIds=<sourceId>`, and opening it preselects that service in Goldie step 1 | Correct service shown, total = catalog price | Auto (URL) + Manual (preselect) |
| W-03 | `data/booking.json` unreachable | Links still go to the generic Goldie URL | Auto |
| W-04 | Provider set to `custom` without `window.MDBooking` | Falls back to Goldie (never a dead end) | Auto |
| W-05 | Catalog vs Goldie comparison script | Reports zero differences; any difference fails the check | Auto (dev-only) |
| W-06 | Prices and durations identical across card, detail text, `/links/`, the ES page and Goldie | Identical (req 154) | Auto + Manual |
| W-07 | No service with `onlineBooking:false` shows a Book button | Shows "Contact to book" | Auto |
| W-08 | New/returning chooser: "New" shows only first-time services + silk press + Olaplex; "Returning" shows eligibility lines; "Not sure" leads to first-time | As specified (req 11–16, 20) | Auto |
| W-09 | Haircut included/excluded label is present on every card | Matches BOOKING_RULES P3 (req 25) | Auto |
| W-10 | Spanish page: every service has ES text and the same Goldie link | Yes (req 157, 179) | Auto |
| W-11 | Keyboard only: reach and activate every Book button; visible focus | Yes (req 156) | Manual |
| W-12 | Screen reader (VoiceOver, iOS) reads service name, price, duration, eligibility and the Book label | Yes | Manual |
| W-13 | 375px phone: Book is reachable without horizontal scrolling; tap targets ≥ 44px | Yes (req 68, 155) | Auto (measure) + Manual |
| W-14 | Back button from Goldie returns to the same scroll position and chooser state | Yes (req 158) | Manual |
| W-15 | Contact form clearly says it doesn't book; a Book button is next to it | Yes (req 159) | Manual |
| W-16 | Website shows no availability or times | Yes (req 52–53) | Auto (content check) |

## 2. Goldie configuration (browse only, no submission)
| ID | Test | Expected | Type |
|---|---|---|---|
| G-01 | Each service's duration × slot grid: the last offered slot ends ≤ closing | Yes (req 43, 47) | Manual |
| G-02 | Wash & Go duration after the fix | Realistic duration; the next slot is pushed correctly (req 42) | Manual |
| G-03 | Holidays (Thanksgiving, Dec 24/25, Jan 1) and Melanie's vacations | Not bookable (req 36, 174) | Manual |
| G-04 | Booking horizon | Matches Melanie's chosen setting (req 38) | Manual |
| G-05 | Minimum notice (if set) | Same-day or too-soon slots hidden (req 39) | Manual |
| G-06 | DST: open days either side of the changes on **Sun Mar 14, 2027** and **Sun Nov 7, 2027** (e.g. Sat Mar 13 vs Tue Mar 16; Sat Nov 6 vs Tue Nov 9) show the same local hours | 11:00 stays 11:00 (req 33, 174) | Manual |
| G-07 | A fully booked day | No times shown; waitlist offered (req 175) | Manual |
| G-08 | Multi-service selection | Total price and duration add up; the last slot respects closing (req 28, 30) | Manual |
| G-09 | Checkout shows deposit %, fee, policy text and the required checkbox | Matches BOOKING_RULES D1–D5 (req 58–61) | Manual |

## 3. Goldie booking lifecycle 🔒 (Melanie, own card or admin-created)
| ID | Test | Expected | Type |
|---|---|---|---|
| L-01 | Complete one booking end to end | Confirmation screen with reference; SMS and/or email received; prep instructions included (req 63–64, 117–120) | 🔒 Manual |
| L-02 | Double-submit / refresh on the final step | One booking, one charge (req 67, 78) | 🔒 Manual |
| L-03 | Two devices trying to take the same slot | Second device can't complete (req 49) | 🔒 Manual |
| L-04 | Card declined (Stripe test cards don't apply to the live Goldie page; use a card with insufficient funds, or skip) | No booking created; clear error (req 65–66, 176) | 🔒 Manual / skip |
| L-05 | Abandon at step 3 | Slot released after ≤10 min (req 66) | Manual (browse-only) |
| L-06 | Reschedule ≥24 h ahead with the link | New time; deposit transferred; updated confirmation (req 87–88, 94) | 🔒 Manual |
| L-07 | Try to cancel/reschedule <24 h ahead | Blocked or deposit-forfeit warning shown (req 173) | 🔒 Manual |
| L-08 | Melanie cancels from admin | Client notified; deposit handled per D6 (req 77) | 🔒 Manual |
| L-09 | Refund issued | Receipt and refund recorded (req 79–80) | 🔒 Manual |
| L-10 | Cancelled slot reappears online | Yes (req 91) | 🔒 Manual |
| L-11 | Marketing opt-in left unticked | Only transactional SMS received (req 123) | 🔒 Manual |
| L-12 | Spanish-speaking client flow | Note what is and isn't Spanish (req 124, 179) | Manual |

## 4. Eligibility (guidance + operations)
| ID | Test | Expected | Type |
|---|---|---|---|
| E-01 | New client picks "Returning" by mistake and books Dry Curly Cut | Melanie's E6 process triggers within 24 h; client offered a first-time service with the deposit transferred (req 15–16) | Manual / process drill |
| E-02 | Returning client whose last First-Time was more than 6 months ago | Same as E-01 (req 14) | Process drill |
| E-03 | First-Time Experience + Dry Curly Cut in one booking | Site discourages it; Melanie corrects it (req 5, 29) | Manual |

## 5. Migration (only if Path 2 is ever approved)
| ID | Test | Expected |
|---|---|---|
| M-01 | Export counts (clients, future appointments) = import counts | Equal (req 168, 182) |
| M-02 | Every future appointment: same date, time, service and deposit status | 100% match |
| M-03 | Rollback drill: switch `data/booking.json` back to Goldie | Booking works again within 5 minutes |

## 6. Exit criteria for Phase 2–3 launch
- W-01 to W-16 pass. Auto tests run on every deploy.
- G-01 to G-09 pass after Melanie's Goldie fixes.
- L-01, L-06 and L-11 done once by Melanie.
- No open price or duration differences between the website and Goldie.
