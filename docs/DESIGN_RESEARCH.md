# Design Research — melanie-diaz.com rebuild

**Phase:** first pass (research only — no redesign built)
**Inspected:** 2026-11-21, in a real browser (Claude desktop app built-in Chromium), at **1440×900** (desktop) and **375×812 / 390×844** (mobile emulation).
**Method:** rendered-page screenshots plus live DOM/CSS inspection (`getComputedStyle`, bounding boxes, stylesheet rules, loaded scripts, network resource list) and hands-on interaction (click, hover, keyboard, wheel, Back button).

## How to read this document

Every finding is tagged with one of these labels:

| Tag | Meaning |
|---|---|
| **[Observed]** | Seen on screen or read directly from the rendered DOM/CSS/network list. |
| **[Measured]** | A number taken from computed styles or bounding boxes at the stated viewport. |
| **[Confirmed impl.]** | The implementation is proven by source evidence (script URL, class names, stylesheet rule, config object). |
| **[Inferred]** | My interpretation of the evidence. Not proven. |
| **[Not observed]** | I tried but could not see it. The reason is given. |

Screenshots live in [`docs/research/screenshots/`](research/screenshots/). They are **internal reference only**. They contain other companies' photography and logos, which must never ship on Melanie's site (see "Open questions" at the end about whether `docs/` is publicly deployed).

---

## 0. Audit of the existing project

### 0.1 Stack and hosting
- **[Observed]** Plain static site: hand-written HTML + one CSS file + one vanilla JS file. No build step, no package.json, no framework.
  - `index.html` (EN, 20 KB), `es/index.html` (ES, 22 KB), `links/index.html` (link-in-bio page with its own `links/styles.css`), `404.html`.
  - `styles.css` (29 KB) is shared by EN and ES; `es/` uses root-absolute `/styles.css` and `/script.js` (per commit `ab174e2`).
  - `script.js` (7 KB): gallery swapper, mobile-menu toggle, header show/hide driven by an IntersectionObserver on the hero, a random "sparkle" timer, Formspree submit with a success modal, and ES/EN strings.
- **[Observed]** Live site is served through **Cloudflare** (`server: cloudflare`, `cf-cache-status`). The live homepage's service list matches the repo exactly. **[Inferred]** Cloudflare Pages deploying from this repo. The deploy config is not in the repo, so I can't confirm which folders are published.

### 0.2 Business facts to preserve (source of truth = current site)
| Item | Value in repo | Notes |
|---|---|---|
| Booking | `https://book.heygoldie.com/BRUJAS` (Goldie) | Used by every "Book" CTA. **Must keep.** |
| Contact form | Formspree `https://formspree.io/f/xgonljwj` | Includes a service dropdown and a success modal. |
| Phone / WhatsApp | +1 281-707-9653 (`tel:` and `wa.me`) | Only on `/links/`. |
| Email | bruja@melanie-diaz.com | Only on `/links/`. |
| Instagram / TikTok | @brujassb / @rizozs | |
| Google Business link | `https://share.google/HY7AAJdcHtk4BkOtU` | On `/links/`. Useful for a future reviews section. |
| Location | Baytown, TX 77521; "serving Greater Houston". Exact address shared on booking. | The brief says "Houston area"; the site says **Baytown**. Keep Baytown. |
| Languages | English + Spanish (`/es/`), with hreflang set up | Must survive the rebuild. |
| Facebook | `https://www.facebook.com` | **Placeholder on `/links/`** — points to facebook.com, not a profile. |

**Services ([Observed] in `index.html`, identical on live site):**

| Service | Price | Duration |
|---|---|---|
| Curly dry cut | $50+ | 1 hr |
| Haircut | $50+ | 40 min |
| Curly cut & define | $100+ | 2 hr |
| Silk press + trim | $100+ | 1 hr 30 min |
| Shampoo treatment | $25+ | 15 min |
| Relaxer | $150+ | 2 hr 15 min |
| Blow-dry with wash | $50+ | 1 hr |

**Discrepancies to resolve with Melanie (not fixed in this pass):**
1. `/links/` lists Silk Press & Trim as **"$100"**, while the homepage says **"$100+"**.
2. The brief lists **color** as a specialty, but **no color service** appears anywhere on the site. Pricing and services must come from Melanie or Goldie; they must not be invented.
3. `index.html` references `/og-image.jpg`, `/favicon.ico`, `/apple-touch-icon.png` and `/android-chrome-*.png`. **All four return HTTP 404 on the live site** ([Observed] via curl), so social share previews have no image today.

### 0.3 Assets available
| File | Dimensions | Notes |
|---|---|---|
| `melanie.jpg` | 1152×1179 | Portrait. Preloaded as the hero. |
| `Curls.jpg`, `Curls2.jpg` | 1200×1600 (3:4) | Curly results |
| `SilkPress2/3.jpg` | 1200×1600 | Silk press process |
| `SilkPress4.jpg` | 886×1600 | |
| `SilkPressFinal.jpg` | 1155×1600 | |
| `Before1.jpg` | 1214×1600 | Before shot. Not currently used on the page. |
| `Final.mp4` | 4.4 MB | Only video. Used in the gallery. |
| `links/Meneni.png` | 1024×1536, 2.4 MB | Used on links page. Heavy; should be compressed. |

- **[Observed]** No short vertical clips exist for a stories row. Only `Final.mp4` is available, so the stories prototype uses placeholders.
- **[Observed]** The working font, **Montserrat**, isn't used yet. The current CSS loads Libre Baskerville, Mea Culpa, League Spartan, Cormorant Garamond and Inter from Google Fonts, and all five will be replaced. Montserrat is free on Google Fonts and can be self-hosted.
- **Correction (from you):** "Ink and Bone" describes the **colour direction** (near-black ink on warm bone), not a typeface. See DESIGN_SYSTEM §1.

---

## 1. Duck & Dry — https://duckanddry.com/ (primary reference)

**Platform [Confirmed impl.]:** Shopify, custom theme named *"LIVE - VISIBLE WEBSITES 1.1.8"* (schema *Themekit template theme*). jQuery + **Owl Carousel** for sliders. Custom `vw-reveal` CSS/JS for entrance animation. Fonts: **brandon-grotesque** (Adobe Fonts), weights 300/400/500/700.

### 1.1 Page composition (desktop 1440, top → bottom) [Measured]
| # | Section | y-offset | Height | Background | Notes |
|---|---|---|---|---|---|
| 0 | Announcement bar + header | 0 | 88 (19 + 69) | bar `#00434F`, header white | Announcement text rotates ("Blow drys by London's expert stylists" / "Free shipping…") |
| 1 | Hero | 88 | 571 | photo | H1 37.8px/48 w500 uppercase, white, centred. Giant split wordmark straddles the bottom edge (§1.4) |
| 2 | Services (two staggered image tiles + price lists) | 659 | 1342 | soft vertical gradient (white→pale grey-green) | Each tile: portrait image, outlined square label box ("BLOW DRYS", "UPDOS AND BRAIDS"), then price rows and a dark button |
| 3 | Rewards banner | 2001 | 573 | `#FBE7D7` warm sand + photo | Eyebrow 14px w500, tracking 4.48px; title 38px w700, tracking 5.32px |
| 4 | Look book (sticky) | 2574 | 2872 | `#00434F` band | Sticky left text column + scrolling right column of 4 images (§1.5) |
| 5 | Best sellers carousel | 5526 | 690 | white | Owl, 3-up |
| 6 | Locations list | 6216 | 867 | white | 50/50: image left, list of 6 salons right, hairline dividers |
| 7 | Press quotes carousel | 7083 | 457 | white | Owl, 1-up, 23 slides, dots. Quote 29.4px w300 lh 1.43 |
| 8 | Get the look | 7540 | 716 | white | 50/50. **The image swaps between looks** (observed changing across screenshots) |
| 9 | Private parties / events | 8366 | 1315 | `#00434F` | 2-col grid, 534×803 tiles, 40px gap. Cream caption cards overlap the image bottoms. Second tile offset downward. Reveal stagger 0.09s |
| 10 | **Google reviews (Trustindex)** | 9781 | **0 — not rendered** | — | §1.7 |
| 11 | Founder | 9781 | 633 | gradient | 50/50 portrait + bio + outline button |
| 12 | Hair articles | 10475 | 592 | white | Owl, 3-up, square-ish cards with pill category tag |
| 13 | FAQ accordion | 11067 | 961 | white | 11 questions, 15.7px uppercase w500, chevron at right, hairline dividers, ~760px column |
| 14 | Instagram | 12028 | 726 | `#F6F5F1` | LightWidget embed, 80px padding |
| 15 | Footer | 12755 | 852 | `#00434F` | Newsletter, link columns |

Screenshots: `dd-desktop-*.jpg`, `dd-mobile-*.jpg`.

### 1.2 Visual consistency system [Measured / Observed]
What makes every section feel like one site:
- **One ink colour for everything:** `#00434F` (deep teal) is used for all text on light grounds, for buttons, and for the dark bands. White is the only other text colour. There's no black and no grey body text.
- **One typeface** (Brandon Grotesque) in 3 roles:
  - **Display / H2:** 37.8px (some 29.4px, 32px, 42px), **w500, UPPERCASE, letter-spacing 0.5px, line-height 1.0–1.27.**
  - **Eyebrow** ("OUR LOOK BOOK", "GOOD VIBES, GOOD HAIR"): **18px w300 UPPERCASE**, letter-spacing 0.5px, line-height 1.0. It is *lighter* than body text, not bolder.
  - **Body:** **18.9px w300**, line-height 29.4px (**≈1.56**). Light weight at a large size is the signature.
  - **Buttons / nav:** 13–13.65px **w700 UPPERCASE**, letter-spacing 0.5px.
- **Repeated layout unit:** a centred ~1107–1267px container. Inside it, **50/50 splits** (image | text) alternate with full-bleed colour bands. Portrait images are ~458×668 (≈2:3) and are used repeatedly.
- **Rhythm:** light section → teal band → light → teal. The dark bands (look book, events, footer) are spaced roughly evenly down the page.
- Square corners everywhere (border-radius 0–2px). No shadows on content.

### 1.3 Navigation
**Desktop [Observed/Measured]**
- Header `position: fixed`, height **88px** (announcement bar 19px + nav ~69px), white.
- Layout: SERVICES · LOCATIONS · SHOP on the left; logo centred; ABOUT · MY ACCOUNT · **BOOK NOW** (solid teal button) · bag icon on the right. Links 13px w700 uppercase, tracking 0.5px, teal.
- **Scroll behaviour [Observed]:** scrolling down past ~1000px adds class `nav-hidden`, which collapses the announcement bar while the main nav stays put. Scrolling up removes the class. CSS transition is `transform 0.4s ease-in-out`.
- Hovering "Services" showed **no visible mega-menu** in my test.

**Mobile 390px [Observed/Measured]**
- Header height **84px**: hamburger at left, logo centred, bag icon, and a **solid "BOOK" button always visible at top-right**. The booking action is one tap from anywhere.
- Hamburger (Bootstrap `navbar-toggler`, target `#navbarNav`) opens a **dropdown panel below the header**, not a full-screen overlay. The panel is 318px tall, full width, light warm-grey background with bottom-rounded corners. It has 5 rows (SERVICES / LOCATIONS / SHOP / ABOUT / MY ACCOUNT): 16px w700 uppercase, a chevron at the right, and 1px dividers. The hamburger icon morphs into an arrow (`dd-mobile-lookbook-swipe.jpg`, top-left).
- Mobile H1 is 32px. The hero shrinks to 400px tall.

### 1.4 Hero and split wordmark [Measured / Confirmed impl.]
- Hero: one `<picture>`, `object-fit: cover`, srcset 700→2560w, `sizes=100vw`. Height **571px at 1440 width (≈2.5:1)** and **400px at 390 width**. There's no video and no parallax (image transform stays `none` while scrolling).
- H1 is centred over the photo at about 40% of its height.
- **Split wordmark:** an 887×116 SVG logo sits centred on the hero's bottom edge. Two stacked copies make the effect:
  - `.logo-before`: logo paths filled `rgba(255,255,255,0.4)`. This is the part over the photo.
  - `.logo-after`: an SVG `<mask id="hero-mask">` built from a rect covering the **lower half** (`y=115`, height 116.25) plus the logo path. Below the hero edge, the letters show photo texture against the white page.
  - **[Inferred]** Effect: the wordmark appears to "pass through" the hero boundary, half translucent over the image and half solid below it. This is Duck & Dry's own branding device; we must not copy the logo. The *principle* (typography that bridges a section boundary) is reusable.

### 1.5 Scrolling and load-in animation [Confirmed impl.]
- **Entrance reveal**, from their CSS:
  ```css
  .vw-anim .vw-reveal { opacity:0; translate:0 28px;
    transition: opacity .9s, translate .9s cubic-bezier(.22,.61,.36,1); }
  .vw-anim .vw-reveal.is-in { opacity:1; translate:0; }
  @media (prefers-reduced-motion: reduce){ .vw-anim .vw-reveal{opacity:1;translate:none;transition:none} }
  ```
  Sibling items get stepped `transition-delay` (**0s, 0.09s**, …). **[Inferred]** An IntersectionObserver adds `.is-in`.
- `html { scroll-behavior: smooth }`. **No** smooth-scroll library (no Lenis, no GSAP or ScrollTrigger detected).
- **Sticky look book:** the left text column is `position: sticky; top: 84px` (exactly the header height) and is 401px wide. The right column (458px wide) scrolls past it with 4 stacked portrait items at **458×668**, each labelled with an H3 ("SIGNATURE WAVES", "FINE FEATHERED") at the top-left. A teal background slab 1425×778 sits behind. Each image shows a grey **loader overlay with three dots** until it loads.
- **Mobile look book:** the sticky layout becomes text-on-top plus a **horizontal row of cards about 310px wide with the next card peeking** (scrollWidth 1330 in a 390 viewport, `overflow:hidden`). **[Inferred]** It's JS/drag-driven, because there's no CSS scroll-snap.

### 1.6 Carousels [Confirmed impl.] (Owl Carousel options read from `jQuery(el).data('owl.carousel').options`)
| Carousel | items | margin | loop | autoplay | speed | nav/dots | responsive |
|---|---|---|---|---|---|---|---|
| Best sellers | 3 | 3px | no | 4000ms | 250ms | both | 0:1, 768:2, 992:3 |
| Press quotes | 1 | 20px | yes | 6000ms | 500ms | both | — |
| Hair articles | 3 | 3px | no | 4000ms | 250ms | both | 0:1, 768:2, 992:3 |

Arrows are small square buttons with pale `#c5d5d3`-tinted backgrounds at the carousel edges. Dots are a short row of small circles; the active dot is darker.

### 1.7 Google Reviews section
- **[Confirmed impl.]** Third-party **Trustindex** widget (`cdn.trustindex.io/loader.js?cf0c0e1752d7408e6226eedee80`) placed in a Shopify *Custom Liquid* section with Duck & Dry's override CSS.
- On my visit the widget **did not render** (section height 0). The loader and `content.html` both downloaded, but no `.ti-widget` was inserted. I did not accept their cookie banner. **[Inferred]** The widget is consent-gated by their iubenda/Complianz setup and only appears after cookies are accepted.
- **[Observed — from a screenshot you supplied, desktop]** (`dd-desktop-google-reviews-user.webp`):
  - **Layout:** a summary block on the left, about 17% of the width, then a row of **4 full review cards plus a sliver of a 5th** peeking at the right edge (signals "more →"). Cards are equal width with about 20px gutters and sit on white.
  - **Summary block** (centred, no card behind it): **"GOOD"** in large uppercase teal (Brandon, medium), **4.5 gold stars** (last star half-filled), "Based on **593 reviews**" with the count underlined as a link, then a large full-colour **Google wordmark**.
  - **Card:** flat `#F6F5F1` panel, **square corners, no border, no shadow**, internal padding about 12px horizontally and 25px from the top. Top row: **round avatar (~52px)** using the reviewer's Google photo or a **coloured initial disc** (e.g. purple "E"), then the reviewer's name in teal medium weight, then a **colour Google "G"** pinned top-right. Second row: **5 gold stars + blue "verified" check**. No date is shown, despite the template supporting one. Review text is **Brandon light, ~18px, line-height ~1.6, teal**, clamped to about 4 lines with "…" and a grey **"Read more"** link that only appears when text is truncated. Cards keep a fixed height whatever the text length, leaving blank space under short reviews.
  - **Controls:** **square ~52px buttons in pale grey-green (`#c5d5d3`) with a dark chevron**, vertically centred on the card row. They sit *on top of* the first and last cards: **the left arrow covers the first card's text** ("I had an Up-do…" is partly hidden). That's an overlap bug we should avoid; keep arrows outside the card area or below it on desktop.
  - **Content note:** reviews name individual stylists ("Charlee", "Chanelle"). For Melanie, every review is about her, which makes the section a direct personal endorsement.
  - **What makes it feel native:** the widget is stripped down to the site's tokens (one neutral card colour, the site ink, the site typeface, square corners). The only "foreign" colours are Google's own: the G logo, gold stars and blue verified tick. Those work as trust signals precisely because they're recognisable.
- **Structure [Confirmed impl.]** from the downloaded widget template:
  - Layout id 5 = `data-layout-category="slider"`, `ti-col-4` (4 cards per row on desktop), card target width **275px**.
  - Left/lead block (`ti-footer`): rating word ("GOOD"), large rating stars, "Based on **593** reviews", Google logo.
  - Each card (`ti-review-item`): profile photo thumbnail, name, Google icon, "verified" tick with tooltip, review text truncated with **"Read more" that opens a popup** (`data-review-text-mode="popup"`), and relative dates ("2 weeks ago").
  - Prev/next controls plus a "controls line" pager. **Autoplay off** (`data-pager-autoplay-timeout=0`). 10 reviews are in the payload.
- **Duck & Dry's styling overrides [Confirmed impl.]:** card background `#F6F5F1` with **border-radius 0**, all text `#00434f`, review text weight 300, rating number 30px w500 Brandon. Prev/next are **40×40px, background `#c5d5d3`, radius 2px**, with 7px chevrons. Avatars are square. Container max-width 97%, 100px vertical margin.
- **Takeaway:** they made a generic widget look native by forcing it into their 3 tokens (ink colour, one neutral card colour, square corners).

---

## 2. Hershesons — https://www.hershesons.com/

**Platform [Confirmed impl.]:** Shopify, theme **Palo Alto** (customised, *"Blk FRI Updates…"*). Font **CentraNo2-Book** (one family for everything). Uses **AOS** (Animate On Scroll) with 88 `data-aos` elements.

### 2.1 Editorial layout and white background [Observed/Measured]
- Pure white page. The only content colour is near-black `#0b0b0b`. Colour comes entirely from photography and video.
- Section order (desktop): rounded-pill black announcement bar → header (109px) → **video hero (550px)** → centred intro text → "Our Spaces" image banner (650px, **rounded corners**, text overlaid left) → **Google rating pill** → press logos → "Our Heroes" product tabs → awards → "The Wavemaker" video banner → customer quotes slider → **Great Hair Stories** (circles) → blog editorial grid (2980px) → "Meet the Experts" → image accordions → newsletter → footer.
- Type scale (single family, **weight 400 throughout**; hierarchy comes from size alone):
  - H2 headings **40.8px / 1.2**; "Meet the Experts" **56.1px / 1.0**.
  - Body **15.2–18px / ~1.45–1.56**.
  - Nav links **11.2px**, buttons **12px uppercase**.
  - Eyebrow / label **11–13px uppercase, letter-spacing 1.04–1.54px (~0.1em)**.
- Cards and banners have rounded corners (`body--rounded-corners` class).
- Blog editorial grid: one tall feature card on the left and a 2×N grid of smaller cards on the right, with captions under the images (`hs-desktop-editorial-blog.jpg`).

### 2.2 Fast-loading video hero [Confirmed impl.]
Their hero technique (Palo Alto `snippets/video.liquid`):
1. The server renders a **poster `<img>` immediately**: the video's frame-0 thumbnail as a responsive srcset (180w→1280w+), `object-fit: cover`.
2. The `<video>` is shipped **inside a `<template data-video-template>`**, so the browser does not download it with the HTML. Theme JS clones it in afterwards.
3. Video attributes: `playsinline autoplay loop muted`, `preload="metadata"`, **no `controls`**.
4. Source is Shopify's **SD 480p, 1.5 Mbps MP4 rendition** (`…SD-480p-1.5Mbps…mp4`). It's deliberately low-resolution because it's a moody background behind text, and a 10% dark overlay (`--overlay-opacity: 0.1`) hides the softness.
5. Overlaid text is bottom-left: H2 40.8px plus a white pill "SHOP NOW" button. A "Play background video" accessible control is present.
- **[Observed]** On one load the video was instantiated within ~2.5s. On a second load it was still in the `<template>` 2.5s after load, so instantiation is deferred or conditional. **[Not observed]** I didn't pin down the exact trigger (idle, in-view, or connection checks).
- **Counter-example on the same page [Measured]:** "The Wavemaker" banner uses a **1920×1080, 21.2 MB** MP4 with `preload=metadata`, which downloaded fully in ~2.5s on a fast connection. The hero is the optimised one.
- **[Observed]** A **full-screen white preloader** with the script logo shows on first load and fades out (opacity animation). Screenshot `hs-preloader.jpg`.

### 2.3 Smooth scrolling and transitions [Confirmed impl.]
- **AOS** attributes: `data-aos="fade"` / `"fade-up"` with **stepped delays 150 / 300 / 450ms** inside a section. All elements in a section share `data-aos-anchor="#SectionId"`, so they trigger together when the section enters, cascading by delay. No smooth-scroll library (Lenis not detected).

### 2.4 Google reviews summary [Observed / Confirmed impl.]
- A **custom theme section** (`google_reviews_rating`), *not* a widget. It's a compact centred rounded pill: Google "G" icon, "GOOGLE REVIEWS" eyebrow (11px uppercase, tracking 1.54px), **"4.8" out of 5**, "based on **1,684** Google reviews", and 5 stars in Google yellow `#fbbc04`.
- CSS variables: `--gr-star:#fbbc04; --gr-text:#0b0b0b; --gr-panel:#f0f0f0; --gr-border:#d3d3d3`.
- **[Inferred]** The numbers are entered in theme settings rather than fetched live, because I found no reviews API request for this section. Unconfirmed.
- Takeaway: it's a lightweight trust signal (one line, ~110px tall) that sits directly under a booking CTA.

### 2.5 Great Hair Stories — circular video stories → vertical player

**Who builds it [Confirmed impl.]:** **Storista**, a third-party Shopify app ("Storista – Video Stories"). It is not custom-built. Evidence:
- The section is a Shopify **app block** `shopify-block-…__storista_stories_8YF6Ch`, with stylesheet `cdn.shopify.com/extensions/…/storista-65/assets/style.css`.
- Scripts come from `widget.storista.io` (`widget.js`, `stories.*.js`, `embla-carousel.esm.*.js`, `iframe_player.*.js`). The data API is `api.storista.io/worker/v3/widgets/?…widget_id=PvGDUMZD0s98dGw`.
- Videos load from `cdn.storista.io/stories/*.mp4` and posters from `images.storista.io`.
- The player is an **iframe** at `player.storista.io/?url=…&shop=hershesons-store.myshopify.com…`.
- The circle row uses **Embla Carousel** (Storista bundles it).

**The circle row (exact CSS from Storista's stylesheet) [Confirmed impl.]:**
```
.slide   flex: 0 0 var(--vc-circles-item-desktop-size)   /* 100px desktop */
         aspect-ratio 1/1; margin-inline-end: 8px; cursor:pointer
.outer   background-image: var(--vc-circles-item-background,
            linear-gradient(to top right, #eab308, #c026d3));   /* amber → magenta ring */
         border-radius: 9999px; padding: 2px                      /* ring thickness */
.inner   background-color: #fff; border-radius: 9999px; padding: 2px   /* white gap */
.poster/.video  object-fit: cover; border-radius: 9999px;
         width/height: calc(size - 4px)
.poster  position:absolute; transition: visibility .1s ease-out
@media (width <= 512px) { slide = --vc-circles-item-mobile-size }    /* 70px */
.slide:focus-visible { outline: 2px solid rgb(11,95,255); outline-offset: 2px }
```
- **[Measured]** Desktop: 10 circles, each **104px** (100 + 2px ring each side), **8px** gap, centred in a 1120px row.
- **[Measured]** Mobile 375px: each **74px** (70 + ring). The row overflows (812px content in 375px) and becomes a **horizontally swipeable carousel** with the 5th circle peeking at the edge (`hs-mobile-stories-row.jpg`).
- No captions under the circles on this install. All rings use the same gradient. **[Observed]** There is **no "seen" state**: rings stay coloured after a story has been watched.
- Each circle contains its own `<video muted loop playsinline preload="none">` plus a poster `<img loading="lazy">`. **[Observed]** **On hover, that circle's video starts playing inside the ring** (readyState 4, playing), while the other nine stay paused with readyState 0. This is the "animated thumbnail": a live, muted preview loaded only on demand.
- Each item has `role="button" tabindex="0" aria-label="Open story"`, so it's keyboard-focusable.

**Opening the player [Observed]:**
- Clicking a circle opens a **full-viewport player**: an `<iframe>` with `position: fixed; inset 0; 1440×900; z-index: 2147483647`. The page behind gets `body { overflow: hidden }` (scroll lock) and the URL changes to **`#player`**.
- **Desktop layout:** black background. The video is shown as a **9:16 column at full viewport height, centred** (about 280px wide in a 800px-wide screenshot of the 1440 viewport, i.e. ~506px). On the black margins:
  - **top-left:** circular **✕ close** button.
  - **top-right, stacked vertically:** **mute/unmute**, **share**, **shopping bag** (product link).
  - **right edge, vertically centred:** **▲ previous / ▼ next** circular buttons.
- **Mobile layout (375×812):** the video fills the **whole screen** (cover). The same controls float over the video as **dark translucent circular buttons**: ✕ top-left; mute, share, bag top-right; ▲▼ right-middle (`hs-mobile-player.jpg`).
- **Playback:** the selected story **autoplays muted**. A centred pill reads **"🔇 Tap to unmute"**. Captions are burned into the videos themselves. I could not see a progress bar.

**Navigation inside the player [Observed]:**
| Input | Result |
|---|---|
| Click ▼ | Next story (story 1 → 2) |
| `ArrowDown` key | Next story |
| Mouse **wheel down** | Next story |
| Click on the video | Toggled sound: the mute icon switched to a speaker icon. **[Not confirmed]** whether it also pauses, because I can't hear audio in the test browser. |
| Mouse drag upward (desktop emulation of swipe) | **Did not** change story. **[Not observed]** real touch-swipe behaviour; mouse drag isn't a touch event. Needs testing on a real phone. |

**Closing [Observed]:**
| Method | Result |
|---|---|
| `Escape` | Player hidden (iframe `display:none`), `#player` removed from the URL, **page scroll position preserved**, `body` overflow restored |
| **Browser Back** | **Closes the player and stays on the page** (URL returns to `/`). The `#player` hash is a pushed history entry. |
| ✕ button | Present. Presumed to close like Escape; not separately clicked. |

**Not observed / unknowns:**
- Whether a story auto-advances when it ends. I didn't wait for a full clip.
- Whether there's a horizontal "swipe to dismiss" or a pull-down-to-close gesture on mobile.
- What the in-iframe DOM looks like (cross-origin, so it can't be inspected).

**Implication for Melanie:** an app like Storista is Shopify-only. On a static site we'd build this ourselves (~a few hundred lines of vanilla JS + CSS), which is what the prototype in `prototypes/stories/` demonstrates.

---

## 3. Good Dye Young — https://gooddyeyoung.com/

**Platform [Confirmed impl.]:** Shopify. Fonts: **Integral CF** (regular and bold), an ultra-wide, heavy, geometric all-caps display face; **acumin-pro** 300/400/600 for body; Open Sans 300.

### 3.1 Typography observed [Measured]
- Section titles ("30% OFF PINK HAIR DYE", "GET TO KNOW US", "DECADE OF DYE", "10 YEARS IN COLOR", "THE ANNIVERSARY COLLECTION"): **Integral CF 48–60px, weight 400 (the face itself is heavy), UPPERCASE, line-height 1.0–1.2, letter-spacing normal / 1px, left-aligned.** They always sit on one line, flush-left with the content grid.
- Stacked panel titles ("HOW IT STARTED", "COLOR. CULTURE. COMMUNITY.", "THE GDY DIFFERENCE"): **48.04px with line-height exactly 1.0** (48.04px). They're set in a 475px-wide column so they wrap into a **solid 2–3-line block**: tight leading with no gaps between lines.
- **Lockup pattern:** a small, light, widely-tracked eyebrow sits directly above a heavy, wide title, e.g. "EARN REWARDS" (light, ~20px) over "**THE RIDE OR DYES**" (Integral). Also the hero: "THANKS GDY COMMUNITY!" (small, spaced) over "**GET 30% OFF**" (60px). The extreme contrast in **width and weight**, not just size, is the poster effect.
- **Packaging lockup [Observed in product photography]:** "GOOD DYE YOUNG" over "SEMI-PERMANENT HAIR COLOR". Two lines of very different point sizes are **justified to the same width**, filling a fixed box edge-to-edge (`gdy-desktop-fifty-fifty.jpg`, bottom-left).

### 3.2 What I could *not* find [Not observed]
On the homepage and `/pages/about`, I found no **live-text** composition where several sizes or weights are fitted together inside one defined container (a true typographic "poster"). The closest examples are the packaging and campaign imagery, which are **raster images**, not HTML text. **Please point me to the page or send a screenshot of the exact composition you liked**, so the system can reproduce the right thing.

### 3.3 Motion [Confirmed impl.]
Hero text uses a **masked line-rise reveal**:
```css
.animation-cropper  { overflow:hidden; display:inline-flex; }       /* the mask */
.animation-contents { transform: translateY(15px); opacity:0 }
.loaded … .hero__title .animation-contents {
   animation: rise-up .8s cubic-bezier(.26,.54,.32,1) .3s forwards; }
@keyframes rise-up { 0% { transform: translateY(120%) } 100% { transform: translateY(0) } }
```
Each line slides up from behind an invisible baseline. Subtitle and link follow with later delays.

### 3.4 Other layout notes [Observed]
- 4-up product grids with hard black "ADD TO CART" bars and square corners.
- 50/50 "fifty-fifty" blocks (712×560 image | text).
- A **horizontal two-column scroller** ("Get to know us"): 660×665 panels pairing a photo with a coloured text panel, plus a visible thin scrollbar.
- A gradient (pink → orange) announcement bar is the only brand gradient on the page.

---

## 4. Bleach London — https://bleachlondon.com/

**Platform [Confirmed impl.]:** a **custom Vue single-page app** (webpack `chunk-vendors-*.js` bundles; not Shopify). Fonts: **AntiqueOlive** (heavy display, often italic/compressed), **Termina** 300–700 (wide grotesk), Gotham 300/700. Cookie consent: Termly.

### 4.1 Contrasting section backgrounds [Measured]
Desktop homepage background sequence (section → background):
`#F0F0F0` hero → `#F0F0F0` twin banner → image banner (dark overlay `rgba(26,26,26,.5)`) → `#F0F0F0` product carousel → **`#C8A0CC` lilac** split → **`#000`** hero → `#000` Instagram → **`#F8F5F2` cream** hero → `#F8F5F2` carousel → `#000` split → `#C8A0CC` hero → `#C8A0CC` carousel → `#C8A0CC` reviews → `#F8F5F2` split → `#000` articles → `#1A1A1A` footer.
- **Pattern:** backgrounds come in **runs of 2–3 sections sharing one colour**, then a hard cut to a contrasting colour. There are no gradients between sections and no dividers. The colour change *is* the divider.
- Only 4 grounds are used: light grey, cream, black, plus one accent (lilac). Pink `#FAAAB5` appears in site chrome.

### 4.2 Oversized typography [Measured]
- Desktop 1440: AntiqueOlive **48px/48px (line-height 1.0) w700 uppercase**; Termina headings **40px/46px w700 uppercase**; labels Termina 14px tracking 0.42px.
- Mobile 375: AntiqueOlive **32px** (≈8.5vw) and Termina 24px. In proportion to the viewport, headings are *larger* on mobile: "15% OFF EVERYTHING!" fills the full content width in 2 lines.
- **[Observed]** The heavy italic display face is set tightly (line-height 1.0) in 2–3 line stacks, left-aligned, usually beside or over imagery.

### 4.3 Navigation contrast behaviour [Confirmed impl.] — the key finding
Bleach doesn't recolour one header with JavaScript. They **render a copy of the nav inside every section**:
- There are **16 `nav.bleach-nav--inset` elements** on the desktop homepage (17 on mobile), one per section. Each is `position: fixed` and sized like the real header (**116px desktop / 50px mobile**).
- Each section has **`position: relative; overflow: clip; clip-path: inset(-1px 0)`**. A `clip-path` on an ancestor clips its `position: fixed` descendants, so **each nav copy is only visible while its own section is behind the header**.
- Each copy is styled for its own section: dark text `rgb(26,26,26)` over light/cream/grey sections and white over black, lilac and photo sections (all 16 colours recorded).
- **Visual result [Observed]:** as you scroll, the header colour changes **exactly at the section edge**, even mid-header. At a boundary, the top half of the logo can be white while the bottom half is black. This needs no scroll listeners. Screenshots `bl-nav-over-*.png`, `bl-desktop-nav-over-*.jpg`.
- Desktop nav: globe (region) left, **"BLEACH" wordmark centred**, account/search/bag right, and a second row of 6 category links (Termina 14px uppercase). Mobile: hamburger, account, centred logo, search, bag, all in **50px**.
- **[Observed]** A full-screen black preloader with logo and an animated colour "splat" (different colour per load: pink, then green) runs until consent/app boot finishes.

---

## 5. Cross-reference: what to take from where

| Need | Best reference | Why |
|---|---|---|
| Overall structure, section rhythm, restraint | **Duck & Dry** | One ink colour, one family in 3 roles, 50/50 splits alternating with colour bands, sticky look book, a "Book" button always in the header |
| Booking-first mobile header | **Duck & Dry** | Solid BOOK button visible at all times on mobile |
| Video hero performance | **Hershesons** | Poster-first, `<template>`-deferred 480p muted loop |
| Stories | **Hershesons / Storista** | Spec measured above. Rebuild in vanilla JS |
| Reviews presentation | Duck & Dry (full slider) + Hershesons (compact pill) | Pill near CTAs, slider lower on the page |
| Entrance motion | Duck & Dry (`opacity` + 28px, 0.9s) and GDY (masked line rise for headlines) | Both are simple CSS that respects reduced motion |
| Poster type | **Good Dye Young** | Light eyebrow over heavy wide title; 1.0-leading stacked blocks |
| Section colour blocking + nav contrast | **Bleach London** | Runs of same-colour sections; clip-path nav copies |

---

## 6. Open questions / things I need from you

1. ~~Duck & Dry Google Reviews screenshot~~: received and documented in §1.7.
2. **Good Dye Young poster typography:** which page or element? I couldn't find a live-text multi-size fitted composition, only packaging imagery.
3. **Ink & bone values:** confirm or adjust the proposed `#16130F` ink / `#F1EBE0` bone (DESIGN_SYSTEM §1). Typography is now Montserrat only, so no font files are needed.
4. **Story clips:** vertical 9:16 phone videos of Melanie's work (ideally 5–15s each, plus one poster frame) for the real stories row.
5. **Google reviews source:** should we show a static rating ("4.9 · N reviews", updated by hand, like Hershesons), or embed live reviews (widget/API, which costs consent, weight and a third-party dependency)? Only real reviews, with permission.
6. **Business data:** confirm Silk Press price (`$100` vs `$100+`) and the **color services** to list.
7. **Is `docs/` publicly deployed?** If Cloudflare Pages publishes the repo root, `docs/research/screenshots/` (other brands' imagery) would be reachable at melanie-diaz.com/docs/…. Either exclude `docs/` from the deploy or keep the screenshots out of the repo.
