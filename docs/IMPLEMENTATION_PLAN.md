# Implementation Plan

## Current release plan — 2026-11-23 audit override

Read [DESIGN_DIRECTION_AUDIT.md](DESIGN_DIRECTION_AUDIT.md) first for evidence, component decisions and the next three tasks. The older sequence below is retained as project history; this section takes precedence where it conflicts.

- **Approved identity is settled:** Fraunces headlines, Outfit body, Sage `#A3B18A`, deep sage `#56664A`, Ink `#16130F`, pure white and a monochrome hero. `tokens.css` implements it. Montserrat, warm-bone selection, undecided accents and a new type-specimen/GDY-reference exploration are no longer blockers.
- **Refine `prototypes/lead/` in place.** Reuse the component preview's split, work rail and contact/footer structures. Do not create another concept or require every optional component to be finished before composing the page.
- **Protect the main-only catalog correction:** design HEAD `8818335` lacks main commit `a09e5c5` (approved eight-service links menu). The prototype JSON and public EN/ES retain the older seven-service catalog. Reconcile explicitly in implementation; no merge or price change was made by this audit.
- **Narrative:** introduction → selected color results → compact expertise/services → Melanie's story → verified trust content → optional editorial → visit/contact/final booking. Omit unavailable sections cleanly.
- **Conversion:** keep header, introductory, useful service-specific and closing actions. Remove routine About/story booking prompts; omit the duplicate mobile bottom bar while header Book stays fixed. Preserve `booking.js`, Goldie and plain-link fallback. Do not activate public Salon OS intake.
- **Release scope:** image-only hero and static selected work are sufficient. Stories, video, review cards and FAQ depend on real approved content; they do not block the core site. A plain Google-profile link can stand in for unavailable review data without inventing a rating.

| Priority | Sequence / dependency | Completion gate |
| --- | --- | --- |
| P0 | Task 1: refine lead typography, hierarchy and complete narrative | No clipped headings or hidden horizontal overflow at 375/768/1440 and zoom; real work appears before the long menu. |
| P0 | Task 2: reconcile catalog with main and owner-confirmed facts; consolidate existing service renderer | One reviewed source for EN/ES/links, static/no-JS service information, honest Goldie handoff. Business data changes require confirmation. Structural work can proceed while facts are pending. |
| P0 | Task 3: harden header/menu and integrate existing public EN/ES/links routes | Accessible navigation/focus/contrast, preserved Formspree/map/contact/hreflang, working fallback links, no missing referenced assets. Depends on Task 1 and confirmed Task 2 content for final integration. |
| P0 | Release verification and owner review | Real mobile/browser checks, keyboard/screen reader, no-JS/reduced-motion/fetch failures, output exclusions confirmed; no deployment without separate authorization. |
| P1 | Measured media/font/performance polish; real review cards; optional hardened/localized stories | Useful approved content and accessible controls; preserve the lightweight stack. |
| P2 | Education/editorial and broader beauty-brand extensions | Actual business need/content; no premature shop, account or new platform. |

Exact files, dependencies, acceptance criteria and testing instructions are in audit §8. The audit itself changes documentation and adds visual evidence only; historical research, SALON_OS and production code remain intact.

## Historical component-first plan (2026-11-21)

**Principle:** keep the current stack (static HTML, one stylesheet, vanilla JS, Cloudflare). Add no framework and no bundler. Build components in isolation first (`prototypes/`), then assemble the homepage only after the components are approved.

## Current state (from the audit)
- `index.html`, `es/index.html` and `links/index.html` each duplicate content (services appear 3 times, already drifting).
- `styles.css` (29 KB) mixes 5 font families. `script.js` handles everything in one `DOMContentLoaded` block.
- Booking via Goldie, contact via Formspree, map via OpenStreetMap. All must keep working.
- 404s on `/og-image.jpg`, `/favicon.ico`, `/apple-touch-icon.png` and `/android-chrome-*.png` on the live site.

## Target file structure (additive, no build step)
```
/index.html, /es/index.html, /links/index.html   (kept, rebuilt later)
/assets/css/
    tokens.css        ← colours, type scale, spacing (DESIGN_SYSTEM)
    base.css          ← reset, typography roles, grid
    components/*.css  ← one file per component (concatenated by hand or @import in dev)
/assets/js/
    reveal.js, nav-contrast.js, rail.js, stories.js, hero-video.js, reviews.js
    (ES modules, <script type="module">, each self-initialising on data-attributes)
/assets/fonts/        ← Montserrat variable WOFF2 (self-hosted)
/assets/media/        ← optimised images (AVIF/WebP/JPEG) + video
/data/services.json, /data/reviews.json, /data/stories.json
/prototypes/<component>/index.html   ← isolated demos
/docs/                ← these documents (exclude from deploy, see step 0)
```
`@import` chains are fine at this size. If request count matters later, a single hand-run `cat` into `site.css` is enough, so we never need a bundler.

## Ground rules (from the owner, 2026-11-21)
1. **Mobile first.** Each step is built and checked at **375×812 first**, then tablet and desktop. A component isn't done until it works one-handed on a phone.
2. **Swappable booking.** All Book CTAs go through the booking adapter (COMPONENT_INVENTORY §9a). Moving to custom booking later = a new provider + `data/booking.json` change, not a markup rewrite.

## Status (2026-11-21)
Built as shared, mobile-first components, previewed on `prototypes/components/` (not the homepage):
- `assets/css/tokens.css`, `base.css`: ink & bone tokens, Montserrat roles, grid, buttons, split.
- Header + mobile menu + per-section contrast copies (`header.css`, `header.js`).
- Scroll reveal, masked line rise, swipe rail (`motion-rail.css/js`).
- Services from `data/services.json` (EN/ES verbatim from the current site) with a Book button on every row and sticky category chips (`services.css/js`).
- Booking adapter (`booking.js`, `data/booking.json`): Goldie today, custom-ready.
- Hero (stacked on phones so text never covers the portrait; overlay variant for wide media; video-ready) and mobile bottom Book bar (`hero-bookbar.css/js`).
- Stories viewer prototype (`prototypes/stories/`), not yet moved onto the shared tokens/files.
Not started: reviews (blocked on data), FAQ, editorial gallery, homepage assembly, ES page.

**Chosen direction (2026-11-21):** `prototypes/lead/` — A's split-name hero → C's poster service blocks (from `services.json`) → circle stories, under the sticky contrast header. New shared pieces: `assets/css/components/poster.css`, `assets/js/fit.js`, an `accent` section ground, and `--font-display` tokens. The page carries a **demo panel** (`prototypes/lead/demo.js`, client tool, remove before launch): 16 accents (neutral, soft/earthy, deep, acid), 9 dark-section colours, 9 light-section colours, 15 headline fonts and 13 body fonts, with automatic text-colour choice on accents, a WCAG contrast readout, Shuffle, Reset, and "Copy choice" to send back the exact combination. Only `--ink` and `--bone` are hand-set; lines, scrims and tonal steps derive from them via `color-mix()`.

## Build sequence

### Step 0 — Housekeeping (½ day)
- Confirm the Cloudflare Pages output directory, and exclude `docs/` and `prototypes/` from production (or move research screenshots out of the repo).
- Fix the missing icons and OG image (real assets from Melanie's photos).
- Resolve data questions: the Silk Press price and the color services list.
- **Exit:** no 404s for referenced assets; data source of truth agreed.

### Step 1 — Tokens and fonts (1 day)
- Add `tokens.css` + `base.css` per DESIGN_SYSTEM. Self-host Montserrat (variable WOFF2). Ink and bone colour tokens with placeholder accents.
- Build a **type specimen page** `prototypes/type/` that renders every role at 375/768/1440 in EN and ES, plus ink/bone swatches beside Melanie's photos, so we can fix the scale and confirm the two hex values.
- **Exit:** approved type scale; accent tokens still placeholder.

### Step 2 — Story Circles + Viewer (prototype done → harden, 1–2 days)
- The prototype `prototypes/stories/` exists (this pass).
- Hardening: test touch swipe on real iOS Safari and Android Chrome, real 9:16 clips from Melanie, `stories.json` data, ES labels, and seen-state decision.
- **Exit:** works on 2 real phones + desktop, with keyboard and screen reader checked (VoiceOver).

### Step 3 — Header with nav contrast + mobile menu (1–2 days)
- `nav-contrast.js` + header template. Build on a prototype page with 5 dummy sections of alternating `data-ground` (using placeholder grounds, not final accents).
- Persistent Book button; menu panel; Español link.
- **Exit:** colour split is correct at every boundary; only one header is in the accessibility tree; works without JS.

### Step 4 — Scroll Reveal + Masked Line Rise (½ day)
- `reveal.js` (one IntersectionObserver), CSS-only motion, reduced-motion verified.

### Step 5 — Swipe Rail (½–1 day)
- Generic scroll-snap rail with optional buttons and dots. Retrofit the current `services-rail` as the first consumer.

### Step 6 — Services & Booking (1–2 days)
- `data/services.json` → rendered rows (build-time copy-paste or a tiny client render with `<noscript>` HTML fallback; **prefer static HTML generated once per change** to keep SEO and no-JS behaviour).
- Check Goldie deep-link support per service.
- Optional sticky mobile Booking Bar.
- **Exit:** every Book link goes to Goldie; prices match Goldie.

### Step 7 — Editorial Hero with video (1 day)
- `hero-video.js`: poster-first, template-injected video, pause control, reduced-motion and Save-Data aware.
- Needs a 6–12s hero clip from Melanie (≤ 2 MB). Until then, image-only.
- **Exit:** LCP is the poster image; no video bytes before `load`; Lighthouse mobile performance ≥ 90.

### Step 8 — Google Reviews (1 day, after the data decision)
- Rating pill + cards from `data/reviews.json` (real reviews, with permission), or a live source if chosen.

### Step 9 — Gallery (Sticky Look Book) + Split Feature + FAQ (1–2 days)

### Step 10 — Assemble homepage (EN), then ES, then `/links/` (2–3 days)
- Only now compose sections in order. Proposed order (for later approval): Hero → Rating pill → Stories → Services & Booking → Look book → About (split) → Reviews → FAQ → Contact/Location → Footer.
- Port to `/es/` with the same components and translated strings.
- `/links/` reuses tokens, services data and the Book button.

### Step 11 — QA
- Devices: iPhone Safari, Android Chrome, desktop Chrome/Safari/Firefox.
- Accessibility: keyboard-only pass, VoiceOver, contrast check after accents are chosen.
- Performance budget: ≤ 150 KB CSS+JS total (uncompressed), hero poster ≤ 200 KB, no third-party JS on first load except what booking requires.
- Links: every Book link → Goldie; the form posts to Formspree; hreflang is valid.

## Dependencies on Melanie / you
| Needed | Blocks |
|---|---|
| Confirm ink & bone hex values | Step 1 finalisation |
| Accent colour decision | Final visual pass (components are built token-driven so they don't block) |
| Vertical story clips (9:16) | Step 2 real content |
| Hero loop clip | Step 7 video (image fallback otherwise) |
| Review source decision + real reviews | Step 8 |
| Color services + confirmed prices | Step 6 |
| GDY poster reference | Poster Lockup component |
