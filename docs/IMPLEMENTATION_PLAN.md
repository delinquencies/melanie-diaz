# Implementation Plan

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
