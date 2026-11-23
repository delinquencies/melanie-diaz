# Design direction and UX audit

**2026-11-23 · documentation only · release direction recommended by Codex**

## 1. Executive assessment

**Yes, the design is heading in the right direction. Refine and complete the lead; do not restart design exploration.** Fraunces, Outfit, sage, ink, white, Melanie's monochrome portrait, and her real hair photography are a distinctive foundation. The current lead demonstrates a visual language rather than a complete customer experience. Its most important problems are repetitive service posters and booking prompts, delayed visual proof, and release-critical content/accessibility gaps.

Recommend a personal, editorial experience: meet Melanie, see the work, understand the right service, learn how she works, then plan a visit. The visitor should feel welcomed by a skilled bilingual stylist in Baytown, with booking available throughout. No new framework, booking engine, shop, or parallel prototype is needed.

### Repository orientation and authority

Audited local branch: `design/research-foundation`, initially clean, HEAD `8818335e3f0aa51051ace25a1dc73c72fb197ef6`. A fresh checkout was created in the workspace; an existing developer checkout's uncommitted work was not inspected or modified. No applicable AGENTS.md was found in the repository or its local ancestor directories.

`origin/main` at inspection: `a09e5c59367eda215431c8dd54a7880c1a417a8c`. Branches diverge: **main has 1 unique commit, design has 6**; common ancestor `d49b252`. Main's unique commit synchronizes `/links/` to the approved Goldie service names, prices and durations. The design branch does **not** contain it. The feature-side diff from the common ancestor is 121 files, 10,329 insertions and 1 deletion, largely additive research, prototypes, shared assets and Salon OS. It does not rebuild root EN/ES public pages. Do not equate a three-dot diff with the complete difference between branch tips.

Recent design commits, newest first: `8818335` approved visual direction/Square decision; `ae241b3` private Salon OS deployment/resume notes; `3dad1d7` deployment preparation; `1a4fbf2` shared components/prototypes/demo/booking audit; `ff95d3d` Salon OS foundation; `4717153` research/design system/story prototype. No merge, deployment or remote write was performed for this audit.

| Source | How to use it now |
| --- | --- |
| `SALON_OS.md`, decisions dated Nov 22 | Approved visual identity and business-system boundaries. Fraunces + Outfit; sage `#A3B18A`, deep sage `#56664A`, ink `#16130F`, pure white; monochrome hero. Goldie remains live authority; public intake remains off pending approval. |
| `assets/css/tokens.css`, lead and demo defaults | Current implementation of that visual approval. Token name `--bone` now means white; do not restore warm bone because of its name. |
| `docs/DESIGN_RESEARCH.md` + saved screenshots | Valuable historical observations of four references, not current owner decisions or fresh vendor verification. Earlier Montserrat/warm-bone statements are superseded. |
| `docs/DESIGN_SYSTEM.md` | Proposal v0.1. Its Montserrat-only, no-white and undecided-accent rules contradict the later approval and tokens. Layout, no-JS and accessibility principles remain useful; exact hero/header specs need implementation verification. |
| `docs/COMPONENT_INVENTORY.md` | Useful behavior contracts; status dots lag reality. Header, fit, hero, rails and service implementations exist. Story component is still prototype-owned. Its every-story CTA and optional booking-bar advice is revised below. |
| `docs/IMPLEMENTATION_PLAN.md` | Historical component-first sequence; use the dated override added with this audit for current work. Reopening fonts, accents or a GDY reference search is unnecessary. |
| `docs/booking/BOOKING_ARCHITECTURE.md` + service catalog | Preserve adapter/Goldie handoff. The catalog is a dated snapshot with explicit uncertainties, not permission to change business facts. Earlier architecture comparisons do not override later approved operating boundaries. |
| `README.md` | Repository navigation; “Not deployed” for Salon OS is stale against SALON_OS's Nov 22 private-deployment status. Outside this audit's edit scope. |

### Verification and evidence

Local EN homepage, ES page, links page, lead and component preview were rendered in installed **headless Chromium via Playwright** at **375×812, 768×900 and 1440×900**. Fraunces and Outfit font faces loaded in the lead. Screenshots and measurements are in [research/audit-2026-11-23/](research/audit-2026-11-23/), especially `lead-{375,768,1440}.png`, `components-375.png`, `lead-menu-375.png`, `lead-story-375.png` and `observations.json`. Captures were repeated after scrolling to trigger reveals and decoding images; full-page initial captures alone gave misleading blank content. The demo panel was left visible as part of the existing prototype.

The actual public [homepage](https://melanie-diaz.com/), [Spanish page](https://melanie-diaz.com/es/) and [links page](https://melanie-diaz.com/links/) returned HTTP 200 and were captured at 375px. The public links menu contains eight newer service names; public EN/ES still list seven older services. The links menu is a dialog, so its closed screenshot alone does not establish its contents; names were read from its DOM. No appointment, form or payment was submitted.

Read the required documents and source for all four prototype areas, shared CSS/JS, services and booking configuration, plus public page source. Reused the existing reference research and inspected saved Duck & Dry mobile hero, GDY split composition, Bleach section treatment and Hershesons editorial-grid screenshots. No new competitor research was necessary.

**Limits:** this is Chromium visual review and bounded interaction checking, not real iOS/Android touch QA, screen-reader certification, Lighthouse scoring, a full contrast audit or verification of current Goldie policies. Source-derived risks are explicitly labeled below. Existing research's external prices/plan limits were not revalidated and are not used to recommend purchases.

## 2. What Claude got right

- The lightweight static architecture, small modules, shared tokens and progressive-enhancement intent fit this business.
- The approved type pairing and monochrome portrait give Melanie a recognizable identity; color result photography can then carry the hair story.
- A persistent Book link, bilingual routes and visible Baytown/Greater Houston context answer practical questions quickly.
- Native swipe rails, reduced-motion reveal rules and a poster-first video architecture are sound foundations. The story viewer already has history handling, focus restoration, muted playback and bounded initial media loading.
- The adapter (`assets/js/booking.js`, `data/booking.json`) preserves working Goldie links when configuration fails and supports future replacement without rebuilding every CTA.
- The research records measured behavior and uncertainty rather than inventing reviews or pretending absent clips exist. The later booking audit correctly identified the old website catalog as unreliable.

## 3. Where the implementation falls short

### Hierarchy, typography and mobile length — visually verified

At 375px the lead is approximately **3,380px high before About, reviews, location or a real footer exist**. Services occupy most of the middle, with no result photography between the portrait and story circles. Four poster categories make routine information feel equally monumental. A one-item treatment category receives the same structural emphasis as the core expertise.

The fitted “& smoothing” and “Treatments” lines visibly exceed their mobile space; document scroll width measured **387px at 375**, **772px at 768**, and **1440px at 1440**. `overflow-x:clip` conceals rather than resolves the problem. `fit.js` measures at 100px then assigns a different size; Fraunces optical sizing and actual rendered line bounds warrant checking. This is a suspected mechanism, not a proven sole cause. Test actual glyph bounds after fonts load and under zoom/Spanish expansion.

Keep the split-name hero as the main expressive moment. Use an ordinary, readable Fraunces section heading for most sections and Outfit for body/service information. On phones, let long names wrap naturally. Start body copy at 16px, normal weight; avoid repeated 300-weight fine text for essential instructions. The tablet/desktop lead reserves a large blank interval below the split name and pushes introductory copy/CTA down; tune the in-flow heading height, transform and margin together rather than adding another hero variant.

### Color and references — visually verified plus source risks

Ink on sage and white on ink give the page clear structure. The current accent → ink → white → accent service sequence changes ground for every category; it borrows Bleach's technique without its longer runs of related content. Use white for introduction/work/services, a single sage emphasis around expertise or a selected feature, and ink for Melanie's story/final footer as composition requires. Do not turn every section into a campaign poster.

Duck & Dry contributes portrait-led identity and orderly service presentation; Hershesons contributes inviting visual exploration; Bleach contributes deliberate section contrast; GDY contributes one compact, expressive type lockup. The lead currently translates the split wordmark and poster treatment most strongly, while omitting the image/content balance that makes those references readable. Adopt their hierarchy and restraint rather than their entire navigation or commerce machinery.

Source risk: header contrast copies are sensibly inert/aria-hidden, but the real header becomes transparent when copies exist. Every final page surface, including gaps/end content, needs a safe visible header fallback. Keep one accessible header; simplify to a single ground-aware header if decorative copies fail browser testing. The story ring's `--focus` is ink even on the ink story band: supply a contrasting focus indicator. Do not use sage text on white for small essential labels without measuring it.

### Photography, video and stories

The 375px portrait reads as a person; the 1440px crop greatly enlarges the face and loses more hair context. Preserve the mobile composition and adjust desktop focal point/height, using the existing portrait. Keep results in color, generally at their native 3:4 proportion. Put three carefully selected results near the beginning; label process versus finish, and use Before1 only with a verified matching after image. A before/after pairing cannot be inferred from filenames.

Available material includes `melanie.jpg`, the Curls/SilkPress/Before JPEGs, `Final.mp4`, and `links/Meneni.png`. No new shoot, hero loop or set of vertical story clips is assumed. Full-size photos are currently reused as tiny story posters, and the lead labels the silk-press poster “Natural curls”; validate titles against actual media. Optimize thumbnails separately and reserve image dimensions to stabilize layout.

Recommend an image-only release hero and a static selected-work rail/grid. Stories are **P1, conditional on useful approved content**, not a release dependency. A single existing clip does not justify seven timed, placeholder-heavy stories. If retained, share tokens, remove prototype page chrome, use accurate captions and user-controlled progression. No seen-state storage is necessary for launch.

### Motion and interaction

Menu open/Escape, story opening, browser Back closing the viewer after its transition, and focus return to the originating circle passed the 375px local checks. Native rails and reduced-motion reveal CSS deserve preservation. Do not add scroll hijacking, loaders or animation to every heading. The fixed demo panel visibly overlays the story's lower controls in the development preview; exclude it from release rather than redesigning the viewer around it.

Source-derived release risks: the mobile menu moves focus but lacks a complete focus-containment/background-inert model, scroll lock and Back-close behavior described in older specs. Without JS, its toggle does not reveal the mobile navigation; provide a usable fallback. Story UI strings remain English, story CTA anchors bypass `data-book`, and tap-to-pause is not exposed as a clearly labeled play/pause button. Reduced motion removes image animation and smooth navigation, but `startPlayback()` still plays video and the image timer still advances. A reduced-motion image story was observed unpaused with animation `none`; disabled animation must not be mistaken for disabled timed progression. Decide on manual progression and a persistent pause control before shipping the viewer.

`ensureLoaded()` loads the current and adjacent story sources but never unloads visited ones. Thus “current ±1” describes initial loading, not a strict lifetime memory cap. The legacy public hero sparkle timer and multi-font styling add decoration without helping clients; do not carry them into the assembled page.

### Information architecture, trust and technical debt

The old public site reaches work only after services and a long About section. Its closing section says “Book online” but leads with a contact form, which can suggest messaging is necessary to reserve. The lead fixes identity but removes most of that useful content entirely. The component preview already offers About, work, direct contact and footer structures; extend these instead of building another concept.

The lead renders services with separate inline code while `assets/js/services.js` renders the other preview. These are parallel renderers with different localization/accessibility behavior. Consolidate into the existing services module; treat the poster as an optional presentation style. Core service information should be static HTML derived from one confirmed catalog, with JS enhancement. A generic noscript booking link preserves access but is not equivalent to an accessible service menu; a failed JSON request can leave an empty section even with JS enabled.

The public pages and prototypes do not yet share content, fonts or service truth. The links page has its own script wordmark, burgundy/gold controls and moving ticker; it feels like a different brand. Keep its fast booking/contact utility, replace its presentation with shared tokens during release integration. Remove the generic facebook.com placeholder unless a real profile is supplied.

Reviews are missing, not a reason to invent a rating or badge. Use a plain link to the existing Google profile until real permissioned quotations and a dated rating/count are available. FAQ content must come from verified client questions and Melanie's policies; an empty accordion is unnecessary. Education/products can later use the same editorial cards and navigation structure without adding commerce now.

## 4. Booking and conversion critique

Count **authored links, excluding decorative nav copies**: the lead contains header + mobile-menu + hero + **7 service-row** booking links, and **7 story CTA definitions** rendered on viewer creation. The component preview additionally has About, contact and a bottom booking bar. The lead itself does **not** include that bar. These are different prototypes, not all simultaneous production controls.

The public EN/ES source has hero, services and About booking links; its header uses Contact rather than the proposed persistent Book action. This distinction matters: the excessive every-service/every-story model is chiefly the redevelopment direction, not an accurate description of every current public section.

| Placement | Decision | Reason |
| --- | --- | --- |
| Global header | Keep one clear Book link | Reliable entry at any scroll position; plain Goldie href works without JS. |
| Hero/introduction | Keep one primary booking action; secondary text link to selected work/services | Useful after the first explanation; avoid a row of equally loud actions. |
| Mobile menu | Keep Book as a utility, visually subordinate to the header action | Helpful when the menu is open; does not need another promotional banner. |
| Services | Keep contextual selection; reduce every-row filled-button treatment | A service-specific action is useful when it actually preserves that choice. Use restrained named links or a selection + one “Continue to booking” action, never require selection to reach global booking. |
| About and ordinary editorial | Remove routine Book prompts | Let identity/expertise build trust without interrupting each reading task. |
| Stories/work | No default booking CTA | View/next/close are the primary tasks. A genuinely service-specific editorial link can be an exception. |
| Sticky mobile bottom bar | Omit for initial release while header Book remains fixed | Duplicate persistent controls reduce viewing space and compete with the viewer/menu. Revisit only with evidence of missed booking access. |
| Closing location/contact | Add/keep one clear booking action beside questions/contact options | Separates reserving from sending a question and gives a useful final action. |

`data/booking.json` currently has an empty `serviceUrls` map, so seven differently labeled service buttons still go to the same generic destination. Preserve the adapter and fallback; connect confirmed IDs/deep links only in separately authorized implementation. Do not imply preselection until it has been tested. Do not redirect the public header into unapproved Salon OS intake, add new/returning gates, change prices/policies, or expose availability/payments in this audit.

## 5. One recommended direction

**Melanie first, results next, calm guidance throughout.** A contemporary personal beauty brand with a warm human portrait, expressive but selective Fraunces, clear Outfit information, white breathing space, a restrained sage accent, and a few confident ink sections. Warmth comes from Melanie, bilingual language and real hair—not beige UI, slogans or decorative effects.

Recommended homepage narrative:

1. **Introduction:** monochrome portrait, split name, bilingual welcome, Baytown/Greater Houston and concise specialty statement; one Book action.
2. **Selected work:** three color results with useful captions, native phone rail and desktop editorial grid. Proof before the long menu.
3. **Expertise and services:** one expressive section introduction, compact grouped services with clear first-time/returning guidance where confirmed. Exact service content must reconcile with main/Goldie.
4. **Melanie's story:** short, specific bilingual account of her Puerto Rican roots and approach, using the existing split structure; no automatic booking pitch.
5. **Trust:** real client quotations if approved; otherwise a modest Google-profile link, no fabricated rating or empty section.
6. **Optional editorial:** a small story/education feature only when useful content exists. Omit cleanly at release rather than filling with placeholders.
7. **Visit/contact:** Baytown service area, address-disclosure practice unchanged, phone/WhatsApp, questions form, concise verified preparation/policy guidance and final Book action; ink footer with language/social links.

Prefer a compact services section over four huge posters. Preserve one strong lockup rather than distributing the same intensity everywhere. This sacrifices some campaign-like spectacle for better mobile reading and a stronger relationship between the portrait and the results. EN and ES use the same hierarchy/components, with natural line breaks per language, not forced identical typography geometry.

## 6. Component decisions

| Component / files | Decision | Work |
| --- | --- | --- |
| `tokens.css`, `base.css` | Keep/modify | Preserve approved identity; adjust reading weights/roles and accessible focus colors. No palette exploration. |
| `header.css`, `header.js` | Keep/harden | Persistent entry, language, one accessible header; no-JS nav, menu focus/scroll behavior and section-boundary contrast testing. Simplify decorative copies if fragile. |
| Lead split hero, `poster.css`, `fit.js` | Keep hero; simplify posters | Fix clipping, line-height and desktop spacing; cap expressive typography and verify real post-font bounds/zoom. |
| `services.js`, `services.css`, lead inline renderer | Consolidate | Extend existing module/style; replace duplicate lead rendering, improve static/error fallback and contextual selection. |
| `booking.js`, `data/booking.json` | Preserve | Goldie fallback and service IDs/source hooks; no provider change. |
| `motion-rail.css/js` | Keep | Native scroll, keyboard reachability, no autoplay; verify reduced-motion and visible content without JS. |
| `hero-bookbar.css/js` | Reuse selectively | Retain image-first hero support; omit bottom bar and defer video. No second hero implementation. |
| `prototypes/stories/*` | Defer/harden | Preserve prototype; ship only with appropriate media, localization, accessible pause/focus and reduced-motion behavior. Remove routine CTAs. |
| Component-preview split, work rail, contact/footer | Extend | Bring into the lead's narrative, preserve real Formspree/map/contact utility from public pages. Preview's direct links do not replace the working form. |
| Reviews/FAQ | Minimal, content-dependent | Plain Google link first; approved static quotes and native details only when content is ready. |
| `/es/`, `/links/` | Preserve function; restyle at integration | Shared content/tokens, complete translations, correct menu values from main. |
| `prototypes/directions/{a,b,c}.html`, lead demo | Archive as reference; exclude from release | A contributes hero, C contributes typographic emphasis. B's app-like tabs and video-first approach add unnecessary controls. No new direction D. Remove demo import from the eventual shipped page, preserve exploration files. |

## 7. Prioritized, dependency-aware roadmap

| Priority | Outcome | Dependencies / exit gate |
| --- | --- | --- |
| P0.1 | Establish release content and protect main's catalog correction | Compare main-only commit and booking snapshot; owner confirms actual unresolved service inclusions, durations and color offering. Never infer that old names map one-to-one. |
| P0.2 | Refine the existing lead into a complete EN page | Can start structural work with existing copy/media while catalog confirmation is pending. Fix fitted text, add selected work/About/visit, consolidate services, implement CTA policy. No new prototype. |
| P0.3 | Harden core accessibility and resilience | Complete menu/focus/no-JS/error states, static service content, image sizing, header coverage and contrast. Core page must work without stories/reveals. |
| P0.4 | Integrate EN/ES/links consistently in a reviewable release change | Depends on P0.1–3. Preserve Formspree, maps, language routing, booking fallback and main-only corrections; confirm metadata/icons and all referenced assets. Verify hosting output excludes research/prototypes/private source before any separately approved deployment. |
| P0.5 | Release QA and owner review | 375 first, then 768/1440; zoom/keyboard/no-JS/reduced-motion/fetch failure; real mobile/browser checks; Goldie handoff without completing a booking; no production submission. Deployment still requires separate authorization. |
| P1 | Better crops/responsive encodings, self-hosted approved fonts, verified review cards and subtle motion polish | Measure actual image/font cost and mobile performance first; no unsupported performance score claims. Retain prior budgets as targets: hero ≤200KB, CSS+JS ≤150KB uncompressed, mobile Lighthouse ≥90. |
| P1 | Optional stories | Approved purposeful clips/captions, accessible pause/manual progression, localized controls and real-phone testing. Not on the core release critical path. |
| P2 | Small educational/editorial collection; future products or broader brand navigation | Only after there is real content/business need. Reuse cards and section primitives; no shop, newsletter, account or CMS dependency now. |

## 8. Next three implementation tasks

These are implementation instructions for the **next session**, not changes made by this audit.

### Task 1 — Make the existing lead readable and complete

- **Files:** `prototypes/lead/index.html`, `assets/css/components/poster.css`, `assets/js/fit.js`, existing split/rail/base styles as needed. Leave historical direction demos intact.
- **Change:** fix mobile fitted-line clipping and tablet/desktop hero whitespace; use one service section heading with quieter groups; add early selected work, existing About structure and closing visit/contact/footer content. Omit bottom bar, story CTAs and placeholder editorial from release composition. Keep demo tooling only on development preview, outside the intended release markup.
- **Why:** establishes a complete, reviewable narrative using work already built and resolves the most visible mobile defects before integration.
- **Dependencies:** approved tokens and existing assets are available; exact service content remains gated by Task 2. Preserve provisional values without presenting them as confirmed.
- **Acceptance:** all text including “Treatments,” “& smoothing” and Spanish long strings fits its container at 375/768/1440 and 200% zoom; no concealed horizontal overflow. No body text behind fixed controls. Intro → selected results → services → Melanie → visit is present; exactly one main H1, logical headings, real image captions, no invented reviews/media. Header, intro, service context and closing action follow §4.
- **Test:** wait for fonts; inspect element/glyph bounds and page width, save viewport/full-page screenshots after scrolling reveals; check portrait crops and last rail item. Disable JS and slow/block fonts to verify readable fallback; keyboard through core content.

### Task 2 — Unify service presentation without losing main's correction

- **Files:** `data/services.json`, `assets/js/services.js`, `assets/css/components/services.css`, lead's inline service script, future static markup in `index.html`, `es/index.html`, `links/index.html`; adapter/config only if confirmed deep links require it.
- **Change:** explicitly reconcile `a09e5c5` and `docs/booking/SERVICE_CATALOG.md` before modifying catalog content. Extend the existing services renderer to support the chosen compact layout and both languages; remove duplicate inline rendering. Generate/check in static core service markup from one reviewed catalog, enhance with JS, and provide a visible retry/Goldie fallback on failure. Use service-specific named actions only where selection is preserved; otherwise label the destination honestly.
- **Why:** accurate services and clear expectations matter more than button quantity. Prevents a redesign from reverting live corrections or promising a trim that Signature Silk Press excludes.
- **Dependencies:** owner resolution of flagged business facts; explicit confirmation before any catalog/price/inclusion change. Can consolidate renderer mechanics with unchanged fixture data while waiting. No live provider changes or appointment creation.
- **Acceptance:** EN/ES/links/prototype reflect the same confirmed service IDs, names, prices, durations and inclusions. Main's eight-service correction survives; unconfirmed values are not silently guessed. Plain links always reach Goldie; configured deep links preserve intended service; core information remains with JS off or JSON fetch blocked.
- **Test:** compare each rendered record against the approved catalog and main correction in both languages; block configuration and catalog fetches independently; inspect adapter hrefs and source/service attributes, then manually confirm handoff without reserving or paying.

### Task 3 — Harden navigation and prepare one coherent bilingual release

- **Files:** `assets/js/header.js`, `assets/css/components/header.css`, `assets/css/base.css`, `assets/js/motion-rail.js`, `index.html`, `es/index.html`, `links/index.html`, `links/styles.css`, legacy `styles.css`/`script.js` only as needed to retire replaced presentation. Update deployment packaging configuration only after inspecting the actual hosting setup.
- **Change:** carry the approved lead composition into the existing public routes; retain Formspree behavior and map/contact facts. Add no-JS mobile navigation, deliberate menu focus containment/return, scroll handling and visible focus on every ground. Cover section boundaries and footer with a safe header. Remove obsolete font loads, sparkle, demo references and links-page theme drift. Preserve hreflang, metadata and meaningful image alternatives. Stories stay absent unless their P1 gates pass.
- **Why:** makes the site usable across language, device and failure states while preserving working business utilities.
- **Dependencies:** Task 1 composition; Task 2 confirmed content for final integration. Review actual Pages output separately; no merging/publishing during the implementation review.
- **Acceptance:** EN/ES content and navigation parity; no dead anchors, placeholder social links or asset 404s; one accessible header; 44px primary targets; WCAG AA text/focus contrast; menu Escape/return behavior and declared Back behavior tested. All booking remains Goldie. Contact success/error UI is accessible. No docs/research/prototypes/Salon OS source in release output.
- **Test:** 375/768/1440 screenshots; 200% zoom; keyboard and screen reader; JS off; reduced-motion; slow media/config failure; iPhone Safari and Android Chrome menu/rail checks. Test Formspree success/error with mocked responses, not production submissions. Check output manifest/links and mobile performance once, then address measured failures.

## 9. Consequential owner decisions

1. **Service truth:** reconcile the main-approved menu with remaining flagged Wash & Go duration, Olaplex inclusions/description, first-time/returning restrictions, obsolete website-only services and any color offering. Main's correction resolves more than the older “$100 vs $100+” question; do not reopen confirmed values without evidence of change.
2. **Public wording/content permission:** confirm unfamiliar service/preparation/policy claims, review quotations and any new client photos/video before publishing. Existing approved material supports a useful image-led release without waiting for a shoot.
3. **Release approval:** review the final EN/ES composition and deploy scope before publishing. Public-intake activation or booking-provider changes are separate business decisions and not prerequisites for this design release.

No approval is needed to recommend the existing palette/type, retain square content corners, omit the duplicate bottom bar, simplify poster repetition or defer placeholder stories. Those are the recommended design choices, not unresolved owner homework.

**Resume next:** start Task 1 on this branch; read this report's repository note before touching services. Then reconcile Task 2 and perform Task 3. Preserve Goldie and the static stack, and finish the chosen experience before adding features.
