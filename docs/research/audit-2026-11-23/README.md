# Audit evidence — 2026-11-23

Read [the design audit](../../DESIGN_DIRECTION_AUDIT.md) for interpretation and release recommendations.

## Capture provenance

- Local source: feature branch `design/research-foundation`, `8818335`.
- Runner: Playwright 1.65.1, installed Chromium headless shell build directory `chromium_headless_shell-1255`, Windows.
- Local static HTTP server bound to `127.0.0.1:8766`; no backend, secrets or Salon OS files served.
- Viewports: 375×812, 768×900 and 1440×900 CSS pixels. Headless desktop context resized to these widths; this is not touch-device or iOS emulation.
- Loaded real fonts, scrolled local pages to trigger reveals, awaited image decoding, returned to the top and captured full pages. Menu/viewer screenshots waited for their opening transition.
- Public URLs: `https://melanie-diaz.com/`, `/es/`, `/links/`, read-only at 375×812. All returned 200. Public captures do not establish cross-browser compatibility or deployment provenance.
- No forms, appointments or payments submitted. Goldie policies/availability were not tested.

## Files

- `lead-{375,768,1440}.png`: chosen lead, including existing demo panel.
- `components-{375,768,1440}.png`: shared component preview after reveal/image loading.
- `homepage-*`, `spanish-*`, `links-*`: local public-route implementations at each width. The feature branch's links menu predates main's correction.
- `lead-menu-375.png`, `lead-story-375.png`: settled local interaction states.
- `live-*-375.png`: actual public routes. The links menu is closed in its screenshot; current service names were recorded separately from the DOM.
- `observations.json`: document dimensions, loaded font-face states, heading geometry, authored booking links (decorative copies excluded), errors/failed requests, menu/story checks and public service headings.

The lead measured 387px document width at a 375px viewport and 772px at 768px; visibly clipped poster text supports the overflow finding. There were no page JavaScript exceptions in the local captures. One aborted `Final.mp4` request was recorded; it is not proof of a missing video. Font subsets marked `unloaded` are not necessarily failures; used Fraunces/Outfit faces are also recorded as loaded.

At 375px: menu expanded then collapsed with Escape; story opened, Back closed after transition, and focus returned. Reduced-motion image animation computed to `none` while playback state remained unpaused. Browser Back must be checked after the viewer's closing transition; immediate visibility sampling produced a misleading result in the first capture pass and was corrected before retaining these observations.

Original capture harness is outside the repository at the workspace's `.audit-tools/melanie-preview.cjs`, reusing an already installed Playwright dependency. To repeat elsewhere, serve this checkout as a static site, capture the listed paths/viewports with the same settle sequence, and exercise the described controls without following booking links or submitting contact forms. Do not publish this evidence directory as site output.
