# Design System — Melanie Diaz (proposal v0.1)

This is a proposal derived from [DESIGN_RESEARCH.md](DESIGN_RESEARCH.md). Every rule cites the observation it comes from. Values marked **TBD** are deliberately left open. **"Ink and Bone" is the colour direction**: near-black ink on warm bone, not a typeface. **Accent colours are still undecided**, and exact ink and bone hex values are proposals for you to confirm.

Guiding principles, taken from what the references actually do:
1. **Booking is never more than one tap away.** A persistent Book button sits in the header on every viewport (Duck & Dry mobile header).
2. **Few tokens, used strictly.** Ink + bone + one tonal step, and **one typeface (Montserrat) in fixed roles**. Duck & Dry uses one teal + one family in 3 roles; Hershesons uses one family at one weight.
3. **Photography and video carry colour; the UI stays neutral** (Hershesons).
4. **Contrast comes from blocking whole sections, not from decoration** (Bleach London).
5. **Motion is short, one-directional, and disappears under `prefers-reduced-motion`** (Duck & Dry and GDY both ship reduced-motion rules).

---

## 1. Colour — "Ink and Bone" foundation (accents open)

The base is a two-colour system: **ink** (near-black) and **bone** (warm, slightly yellowed off-white, like old paper or bone china, not pure white). Everything is built from those two plus one tonal step of each. This is a close cousin of Duck & Dry's one-ink discipline and Bleach London's black/cream blocks, but warmer.

| Token | Proposed value (confirm) | Role | Source |
|---|---|---|---|
| `--ink` | `#16130F` (warm near-black, TBD ±) | All text on bone, primary buttons, dark bands | D&D single ink; Bleach `#000/#1A1A1A` blocks |
| `--ink-2` | `#2A2520` (TBD) | Raised surfaces *on* ink bands (cards in a dark section) | |
| `--bone` | `#F1EBE0` (TBD ±) | **Default page background** | Bleach cream `#F8F5F2`, D&D `#F6F5F1`, pushed warmer |
| `--bone-2` | `#E6DDCE` (TBD) | Cards, review panels, alternating bands on bone | D&D cards sit one step off the page colour |
| `--line` | `color-mix(in srgb, var(--ink) 14%, transparent)` | Hairline dividers (lists, FAQ, price rows) | D&D locations/FAQ dividers |
| `--on-ink` | `= --bone` | Text on ink bands and over photos (bone, not pure white) | Keeps the pair consistent |
| `--scrim` | `color-mix(in srgb, var(--ink) 10–40%, transparent)` | Overlay on hero video/photo under text | Hershesons `--overlay-opacity:.1` |
| `--accent-1` | **TBD** | Story ring, focus ring, one band colour | Bleach lilac / D&D teal show a single accent is enough |
| `--accent-2` | **TBD (optional)** | Second stop of the story-ring gradient | Storista default ring is a two-stop gradient |

Proposed hex values check out: ink on bone is ≈ 15:1 contrast, which is well above AA.

Rules:
- **Section grounds:** use only `bone`, `bone-2`, `ink` and later `accent-1`. Run the same ground for 1–3 consecutive sections, then cut hard to the other (Bleach 4.1). No gradients between sections. Typical rhythm: bone → bone → **ink** → bone-2 → bone → **ink** (footer).
- **No pure white `#FFF` and no pure black `#000`** in UI, so the ink/bone character stays consistent. Photos are the only source of other colour.
- Each section declares its ground with **`data-ground="light|dark"`**. The nav-contrast component (see COMPONENT_INVENTORY) reads this attribute, so a later accent band needs no component changes.
- Text contrast must meet WCAG AA: 4.5:1 for body, 3:1 for ≥24px display. Any accent chosen later must pass on `bone` *or* be restricted to non-text use.

---

## 2. Typography

**Family:** *Montserrat* only (Google Fonts, variable, 300–800). One family in fixed roles, as Duck & Dry does with Brandon Grotesque. The hierarchy comes from **weight contrast** (300 light eyebrows/body vs 700–800 heavy display) and size, which also delivers the GDY "light eyebrow over heavy title" poster effect without a second face.

*Optional, TBD:* a second display face could be added later for headlines. Nothing in this system depends on one.

Load strategy: self-host Montserrat as a variable WOFF2 (one file covers all weights), `font-display: swap`, subset Latin + Latin-Ext (Spanish accents), and preload it.

### 2.1 Type scale (fluid, `clamp()`; min at 375px → max at 1440px)

| Role | Family / weight | Size | Line-height | Tracking | Case | Source pattern |
|---|---|---|---|---|---|---|
| `display-xl` (hero, poster) | Montserrat **800** | `clamp(3rem, 9vw, 7.5rem)` | 0.9–0.95 | −0.02em | UPPER | Bleach mobile ≈8.5vw; GDY 1.0 stacks |
| `display-l` (section title) | Montserrat **700** | `clamp(2rem, 4.2vw, 3.75rem)` | 1.0 | −0.01em | UPPER | GDY 48–60px, D&D 37.8–42px (w500 uppercase) |
| `title` (card / service name) | Montserrat 600 | `clamp(1.125rem, 1.4vw, 1.375rem)` | 1.25 | 0.02em | Sentence or UPPER | D&D H3 16px w500 uppercase |
| `eyebrow` | Montserrat **300** | `0.8125–1rem` | 1.0 | **0.12em** | UPPER | D&D eyebrow is *lighter* than body (18px w300); Hershesons 11–13px, 0.1em |
| `body-l` (intros) | Montserrat 300 | `clamp(1.0625rem, 1.3vw, 1.1875rem)` | **1.55** | 0 | Sentence | D&D body 18.9px w300 lh 1.56 |
| `body` | Montserrat 400 | `1rem` | 1.6 | 0 | Sentence | |
| `label` / button / nav | Montserrat **600** | `0.8125rem` | 1.2 | **0.06em** | UPPER | D&D buttons 13–13.6px w700 uppercase 0.5px |
| `price` | Montserrat 500, tabular-nums | `1rem` | 1.2 | 0 | — | D&D "BLOW DRYS from £44" |

Hierarchy rules:
- **One display moment per section**: at most one `display-l` plus one eyebrow. Everything else uses the text roles.
- **Poster lockup** (GDY 3.1): eyebrow (light, wide-tracked, small) immediately above a heavy display line with ≤ 0.5rem gap. For multi-size lockups fitted to a container, see the *Poster Lockup* component. Text stays live HTML, never an image.
- Line length for body: **45–70ch** (`max-width: 38rem`).

---

## 3. Layout grid

| Breakpoint | Columns | Gutter | Side margin | Container max |
|---|---|---|---|---|
| < 600px (phone) | 4 | 16px | **20px** | 100% |
| 600–1023px (tablet) | 8 | 20px | 32px | 100% |
| ≥ 1024px (desktop) | 12 | 24px | `max(40px, 5vw)` | **1200px** content / full-bleed bands |

Derived from: D&D container ~1107–1267px within 1425px; Hershesons 1120px story row; GDY 1243px rows.

Standard compositions (all from observed patterns):
- **Split 50/50:** image spans 6 cols, text 5 cols with 1 col gap. Alternate image left/right down the page (D&D services, locations, founder; GDY fifty-fifty). Stacks image-first on phones.
- **Sticky split:** text column `position: sticky; top: var(--header-h)` beside a scrolling column of portrait media (D&D look book). On phones it becomes text, then a horizontal swipe row.
- **Band:** a full-bleed coloured ground with contained content (D&D teal bands; Bleach blocks).
- **Editorial grid:** one tall feature + 2×N small cards (Hershesons blog). Use for the gallery.

---

## 4. Spacing and proportion

Base unit **8px**. Scale tokens: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128`.

| Token | Value | Use |
|---|---|---|
| `--section-y` | `clamp(64px, 9vw, 128px)` | Vertical padding of each section (D&D bands ≈ 80–100px; Instagram block 80px) |
| `--stack-l` | 48px | Heading block → content |
| `--stack-m` | 24px | Eyebrow+title → body; body → button |
| `--stack-s` | 8px | Eyebrow → title |
| `--header-h` | **64px phone / 80px desktop** | D&D 84–88, Bleach 50/116, Hershesons 109. We keep ours lean because Book lives in it |

Proportions:
- **Hero:** desktop **≈ 2.4:1 to 2.6:1** (D&D 1425×571; Hershesons 1425×550). Phone: **≥ 4:5 portrait** or `min(85svh, 720px)`, never shorter than the content. This is a deliberate divergence from D&D's short 400px mobile hero, because Melanie's material is portrait.
- **Portrait media:** **2:3** for look-book/gallery tiles (D&D 458×668), **3:4** acceptable because the existing photos are 1200×1600.
- **Story video:** **9:16**.
- Corners: **0 radius** for images and cards (D&D square system), **999px** only for circles and pills. Pick one system and keep it everywhere. TBD if you prefer Hershesons-style soft corners.

---

## 5. Image and video treatment

- **Photography:** only Melanie's own work and portraits. No stock. Every portfolio image gets meaningful `alt` text describing the hair result.
- Serve responsive `srcset` (e.g. 480/768/1200/1600w) as **AVIF/WebP with JPEG fallback**. Current JPEGs are 150–530 KB at 1200×1600, and `links/Meneni.png` is 2.4 MB, so they need recompressing.
- `object-fit: cover` with a per-image `object-position` (faces and hairlines must not be cropped). Store focal points in markup (`style="--focus: 50% 30%"`).
- Text over photos always sits on a `--scrim` gradient anchored to the text edge.
- **Hero video** (Hershesons 2.2):
  1. Render the poster `<img>` immediately (it's the LCP element; `fetchpriority="high"`).
  2. Keep the `<video>` in a `<template>` and inject it after `load` **only if** `prefers-reduced-motion` is not `reduce` and `navigator.connection.saveData` is not true.
  3. `muted autoplay loop playsinline preload="none"`, no controls, but provide a visible **pause** button (WCAG 2.2.2 for >5s motion).
  4. Encode **≤ 720p, ~1–1.5 Mbps H.264 MP4, 6–12s loop, ≤ 2 MB**, no audio track.
- **Story clips:** 9:16, ≤ 720×1280, H.264, ≤ 15s, with a poster JPEG (frame chosen manually).
- **Loader placeholders:** use a flat `--bone-2` box with the image's intrinsic aspect ratio, never a spinner (D&D grey loader with dots looked broken on slow loads).

---

## 6. Interaction conventions

| Pattern | Spec | Source |
|---|---|---|
| Entrance reveal | `opacity 0→1`, `translateY 24px→0`, **700ms** `cubic-bezier(.22,.61,.36,1)`, siblings staggered **80ms**, once only, triggered at 15% visibility by IntersectionObserver | D&D `vw-reveal` (0.9s, 28px, 0.09s stagger), slightly quicker |
| Headline line rise | each line masked (`overflow:clip`), `translateY 110%→0`, **800ms** `cubic-bezier(.26,.54,.32,1)`, 300ms delay, hero only | GDY `rise-up` |
| Reduced motion | all of the above become instant; videos don't autoplay; carousels don't autoplay | D&D, GDY reduced-motion rules |
| Hover (pointer devices only) | images scale 1.00→1.03 over 600ms; links underline grows; buttons invert ink/bone | — |
| Carousels | **Native CSS scroll-snap**, swipe on touch, arrow buttons on desktop, no autoplay by default, partial peek of next item (≈12–15% of a card) | D&D mobile look book peek; Hershesons mobile circles peek |
| Sticky header | Always visible. Optional: hide the utility row on scroll down (D&D `nav-hidden`), never hide the Book button | D&D |
| Nav contrast | Per-section clip-path nav copies, driven by `data-ground` | Bleach 4.3 |
| Overlays (stories, menu) | Open into `#hash` with `history.pushState` so **Back closes**; `Esc` closes; focus trapped; scroll locked; focus returns to the trigger on close | Hershesons/Storista |
| Focus | 2px solid outline, offset 2px, accent or ink colour, visible on all interactive elements including story circles | Storista `:focus-visible` |
| Tap targets | ≥ 44×44px | |

---

## 7. Responsive behaviour summary

| Component | Phone | Desktop |
|---|---|---|
| Header | 64px: menu · wordmark · **Book** | 80px: links left · wordmark centre · Español + **Book** right |
| Menu | Dropdown panel under header (D&D) with large rows + chevrons, ES toggle, Book | Inline links |
| Hero | Portrait, text bottom-left over scrim, Book CTA full-width | Wide 2.4:1, text bottom-left |
| Stories row | 70px circles, horizontal swipe with peek | 96–100px circles, centred row |
| Story viewer | Full-screen cover video, overlaid controls | 9:16 column centred on black, controls in margins |
| Services | Stacked list rows with price + duration, Book per row | 2-col list or split with portrait image |
| Gallery | Swipe row | Editorial grid / sticky split |
| Reviews | Swipe cards | 3–4 cards + summary |
| Section grounds | Same sequence as desktop | |

---

## 8. Out of scope until decided
- Accent colour(s), possibly sampled from Melanie's own photography or existing brand material.
- Whether to keep square corners (D&D) or soft corners (Hershesons).
- Exact ink and bone values (proposed `#16130F` / `#F1EBE0`), ideally checked against Melanie's photos printed or viewed side by side.
- Whether to add a second display typeface later.
