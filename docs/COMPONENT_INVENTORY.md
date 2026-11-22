# Component Inventory

These are the reusable components the rebuild needs. Each entry gives its purpose, the reference behaviour it's based on (see [DESIGN_RESEARCH.md](DESIGN_RESEARCH.md)), the proposed markup contract, behaviour, accessibility notes, and whether it exists today.

Stack assumption: **static HTML + one CSS file + small vanilla JS modules**, matching the current repo. No framework or build step is required for any component below.

Legend: 🟢 exists today (may need rework) · 🟡 partially exists · ⚪ new

---

## 1. Site Header with background-aware contrast ⚪ (current header 🟡)

**Purpose:** persistent navigation with a **Book** button always visible. Its text colour adapts to whatever section is behind it.

**Reference:** Bleach London per-section nav copies clipped with `clip-path: inset(-1px 0)` (Research 4.3). Duck & Dry always-visible BOOK button on mobile and collapsing utility bar (1.3).

**Approach (recommended), no scroll listeners:**
- Header markup is authored **once** in a `<template id="site-header">`.
- On load, a tiny script clones it into every `<section data-ground>` as `<div class="nav-copy" aria-hidden="true" inert>`. Each copy is `position: fixed; top:0`, inheriting colours from its section's `data-ground`.
- Each section gets `position: relative; clip-path: inset(0); overflow: clip;`, so each copy shows only over its own section.
- The **one real, accessible header** (a `<header>` with links) stays on top with transparent text. Alternatively, only the topmost real header is interactive and copies are decorative. **Decision for build:** the real header receives focus and clicks, and the copies are `inert` + `aria-hidden`. This avoids 15 duplicate link sets in the accessibility tree, which Bleach does not avoid.
- No-JS fallback: a single solid header (bone ground, ink text).

**Alternative considered:** a single header plus IntersectionObserver swapping a class at section boundaries. Simpler DOM, but the colour flips all at once rather than splitting across a boundary. Keep this as the fallback for sections where clip-path causes issues (e.g. sections containing `position: sticky` children, because clip-path doesn't break sticky but `overflow: clip` must be tested with it).

**Contents:** wordmark (live text in Montserrat, not an image), Services, Gallery, About, Contact, `Español` link (preserves hreflang), **Book** (→ Goldie URL).
**Mobile:** `[menu] [wordmark] [Book]` at 64px; the menu opens a dropdown panel (component 2).

## 2. Mobile Menu Panel 🟡

**Reference:** D&D dropdown panel below header: 5 rows, 16px bold uppercase, chevrons, dividers, rounded bottom (Research 1.3).

- `button[aria-expanded][aria-controls]` toggles; Esc closes; focus moves to the first link; clicking outside closes (already in `script.js`).
- Contains: nav links, language switch, large Book button, phone/WhatsApp quick links (moved from `/links/`).

## 3. Editorial Hero with video support ⚪ (current hero 🟡, image-only)

**Reference:** Hershesons poster → template-deferred 480p video (Research 2.2). D&D hero proportions and centred H1 (1.4). GDY masked headline rise (3.3).

```html
<section class="hero" data-ground="dark">
  <img class="hero__poster" src="…" srcset="…" sizes="100vw" alt="" fetchpriority="high">
  <template class="hero__video-tpl">
    <video muted loop playsinline preload="none" src="hero.mp4"></video>
  </template>
  <div class="hero__scrim"></div>
  <div class="hero__copy">
    <p class="eyebrow">…</p>
    <h1 class="display-xl"><span class="line">…</span></h1>
    <a class="btn btn--primary" href="https://book.heygoldie.com/BRUJAS">Book</a>
  </div>
  <button class="hero__pause" aria-pressed="false">Pause background video</button>
</section>
```
Behaviour: the video is injected after `window.load` unless the user has reduced motion or Save-Data on. It fades in over the poster once `canplay` fires, and the pause button persists the choice in `localStorage`.
Works with an image only (no video) as the default state, which is today's case.

## 4. Scroll Reveal (entrance animation) ⚪

**Reference:** D&D `vw-reveal` (Research 1.5), Hershesons AOS stagger (2.3).
- Markup: `data-reveal` on elements, and `data-reveal-group` on a parent to stagger its children.
- One IntersectionObserver, `threshold: 0.15`, `rootMargin: 0 0 -10% 0`; unobserves after firing.
- CSS only drives the motion (opacity + translate, 700ms; stagger via `--i` custom property × 80ms).
- `html:not(.js) [data-reveal]` stays visible; `prefers-reduced-motion` gives no transform.

## 5. Masked Line Rise (headline) ⚪
GDY `rise-up` (Research 3.3). Wrap each line in `.line > span`, with the parent clipping. Used **only** in the hero and at most one statement section.

## 6. Swipe Rail (generic horizontal carousel) 🟡 (`services-rail` exists)

**Reference:** D&D Owl carousels (1.6) and mobile look book peek (1.5); Hershesons circle row (2.5).
- **CSS scroll-snap** (`overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding-inline: var(--margin)`), items `scroll-snap-align: start`, next-item peek via width `calc(85% - gap)` on phones.
- Optional prev/next buttons (desktop) that call `scrollBy({left: ±itemWidth})` and are disabled at the ends.
- Optional dot pager driven by IntersectionObserver. No autoplay.
- Keyboard: the rail is focusable (`tabindex="0"`, `role="region"`, `aria-label`), and arrow keys scroll it.
- Reused by: services, gallery (mobile), reviews (mobile), story circles (mobile).

## 7. Story Circles + Reels-style Viewer ⚪ — prototype built: [`prototypes/stories/`](../prototypes/stories/)

**Reference:** Hershesons / Storista (Research 2.5), measured in detail.

**Circle row**
- Ring: `padding: 2px` on a gradient background (`--ring: linear-gradient(to top right, var(--accent-1), var(--accent-2))`), a 2px white inner gap, and media `object-fit: cover` in a circle.
- Size `--story-size`: **100px desktop / 70px ≤512px**, gap 8px. Centred row on desktop; Swipe Rail (6) on phones.
- Each circle holds a poster `<img loading="lazy">` and a `<video muted loop playsinline preload="none">`. **On hover/focus (pointer devices) the preview plays inside the circle**; it pauses on leave.
- Optional caption under each circle (12px, max 2 lines). Optional **seen** state (Storista does not have one; we add it with `localStorage` and a grey ring). TBD.
- Each circle is a `<button aria-label="Open story: {title}">`.

**Viewer**
- Opens as a `<dialog>`-like full-viewport layer (we use a `div role="dialog" aria-modal="true"` for animation control) and pushes `#story-{n}` to history, so **Back closes**.
- Desktop: black background, 9:16 video at full height, centred. Close top-left; mute + Book top-right; ▲/▼ on the right edge.
- Phone: full-screen cover video with the same controls overlaid as translucent circular buttons.
- Plays **muted** with a "Tap to unmute" pill. After unmuting, sound stays on for the session.
- **Navigation:** ▲/▼ buttons, `ArrowUp`/`ArrowDown` (and `ArrowLeft/Right`), mouse wheel (throttled), vertical **touch swipe** (≥ 50px or fast flick). Each story fills the screen in a vertical scroll-snap track, so native momentum works on phones.
- **Auto-advance** to the next story on `ended` (Storista: unknown; we choose yes) and a thin progress bar at the top.
- **Close:** ✕, `Esc`, Back, and **swipe down from the first story** (optional).
- Tap on video toggles pause/play. The mute button is separate (Storista used tap for sound; we found that ambiguous).
- Focus is trapped inside and returns to the originating circle on close; body scroll is locked.
- Each story may carry a CTA ("Book this service" → Goldie, optionally with a service anchor).
- Only the current ±1 videos get `src` (others `preload="none"`), so the viewer never downloads the whole set.

## 8. Google Reviews ⚪

Two parts, both styled with our tokens (D&D shows how to tame a widget, Research 1.7; Hershesons shows the compact pill, 2.4):
- **8a Rating Pill:** "★ 4.x · N Google reviews", linking to Melanie's Google profile (`share.google/HY7AAJdcHtk4BkOtU`). Placed under the hero CTA and near Book in the services section. ~48px tall.
- **8b Review Section** (modelled on the D&D layout in Research §1.7):
  - **Desktop:** a summary block on the left (rating word or number, stars, "Based on N reviews" linking to Melanie's Google profile, Google logo), then a rail of 4 cards with the 5th peeking.
  - **Phone:** the summary stacks on top, then a Swipe Rail of cards at ~85% width.
  - **Card:** round avatar (reviewer photo or initial disc), name, Google "G" top-right, 5 stars + verified tick, text clamped to 4 lines with "Read more" (expands inline, not a popup). **Square, `--bone-2` ground, ink text, no border or shadow.**
  - **Keep Google's own colours** (G, gold stars) as the only non-brand colours, because they're the trust signal.
  - **Prev/next buttons sit outside the card area** (or below the rail), never over card text. D&D's left arrow hides the first review's text.
  - Cards share a fixed height; short reviews top-align.
- **Data source: TBD** (see open questions):
  - *Static (recommended to start):* real reviews copied with permission into a JSON file in the repo and updated by hand. No third-party script, no consent banner needed.
  - *Live:* Google Places API via a tiny serverless function (Cloudflare Worker) or a widget (Trustindex/Elfsight). This adds a dependency and likely a consent requirement (D&D's didn't render without consent).
- **Never** placeholder or invented reviews, even in prototypes. Use an empty-state frame instead.

## 9a. Booking Adapter ⚪ — built: `assets/js/booking.js` + `data/booking.json`

**Why:** today every Book button goes to Goldie. We want to be able to switch to a **custom booking flow later** without hunting down every button.
- Every booking CTA is a plain link that works without JS: `<a href="https://book.heygoldie.com/BRUJAS" data-book data-service="silk-press-trim">Book</a>`.
- `data/booking.json` names the active provider:
  ```json
  { "provider": "goldie", "goldie": { "url": "https://book.heygoldie.com/BRUJAS", "serviceUrls": {} } }
  ```
- `booking.js` loads the config once and decides what each `[data-book]` does:
  - **`goldie`:** rewrites `href` to a per-service deep link if one is configured, otherwise the main Goldie URL.
  - **`custom`** (future): intercepts the click and calls `window.MDBooking.open({ serviceId })`, a hook the future in-house flow implements. If that hook isn't present, the link falls back to Goldie, so booking never breaks.
- **Service data is booking-ready:** `data/services.json` stores a stable `id`, `durationMin`, `priceFrom`, `priceIsFrom` and `category` for each service. A custom flow needs exactly these.
- An analytics hook (`md:book` CustomEvent with `serviceId` and `source`) fires on every Book tap, so conversion can be measured once analytics is chosen.

## 9. Services & Booking ⚪ (current `service-card` rail 🟡)

**Reference:** D&D service tiles: portrait image + outlined label box + price rows + Book button (Research 1.1 #2); D&D price-row typography (`BLOW DRYS from £44`).
- **Service Group:** category title (e.g. *Curls*, *Silk press*, *Color* (pending data), *Cuts*, *Treatments*), a portrait image from Melanie's portfolio, then a list of **Service Rows**.
- **Service Row:** name (`title`), one-line description, duration, price (`from $50` style, tabular figures), and a **Book** link. Rows are separated by hairlines (`--line`).
- Book links go to `https://book.heygoldie.com/BRUJAS`. **Open question:** does Goldie support deep links to a specific service? If yes, rows deep-link; if not, all go to the same page. Needs checking in Goldie.
- Data lives once (e.g. `data/services.json` or a single HTML partial) and feeds EN, ES and `/links/`, removing today's $100 vs $100+ drift.
- **Booking Bar (mobile):** optional sticky bottom bar "Book an appointment" that appears after the hero leaves the viewport and hides over the footer.

## 10. Split Feature (50/50) ⚪
Image | text, alternating sides; image first on phones. Used for About, a services intro, and Location. (D&D 1.2; GDY 3.4.)

## 11. Sticky Look Book (gallery) ⚪ (current gallery 🟡)
D&D 1.5: sticky text column (`top: var(--header-h)`) + scrolling column of 2:3 portraits with small labels ("Silk press", "Curly cut & define"). On phones it becomes a Swipe Rail. Uses the existing images (Curls, SilkPress*, Before1).

## 12. Poster Lockup ⚪
GDY 3.1: eyebrow + heavy display, optionally multi-size lines **fitted to the container width**. Implementation: each line is a `<span class="fit">`. A small script measures `scrollWidth` vs container and sets `font-size` per line (or CSS `font-size: calc(var(--w) / var(--chars) * k)` using the font's average width). Re-fits on resize via ResizeObserver. Text stays live and selectable. **Blocked on the GDY reference clarification.**

## 13. FAQ Accordion ⚪
D&D 1.1 #13: `<details>/<summary>` rows, uppercase `label` style, chevron rotates, hairline dividers. Useful for prep questions (e.g. "Come with clean, dry hair?" — content from Melanie only).

## 14. Contact & Location 🟢
Keep the Formspree form, the success modal and the Baytown map. Restyle only. Add phone and WhatsApp from `/links/`.

## 15. Footer 🟢
Restyle on an `ink` band; keep social, links hub, Spanish link, ©.

## 16. Language Switch 🟢
Keep the `/es/` mirror and hreflang. Components must accept ES strings (no text baked into JS except via a strings map, as `script.js` already does).
