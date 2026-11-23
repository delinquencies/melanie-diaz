/* Client demo panel — try accent, dark ground, light ground, headline font and body font live.
   Exploration tool only: remove before launch. Choices persist in this browser (localStorage).
   Everything works by setting CSS custom properties on <html>; the site CSS derives the rest. */

const INK_DEFAULT = "#16130F", BONE_DEFAULT = "#F1EBE0";

/* ---------------- options ---------------- */
const ACCENTS = [
  { id: "none",       group: "Neutral",       name: "No accent",       a1: null,      a2: null },
  { id: "sage",       group: "Soft & earthy", name: "Sage",            a1: "#A3B18A", a2: "#56664A" },
  { id: "eucalyptus", group: "Soft & earthy", name: "Eucalyptus",      a1: "#8FB3A8", a2: "#3E6157" },
  { id: "rose",       group: "Soft & earthy", name: "Dusty rose",      a1: "#D9A6A0", a2: "#8C4F49" },
  { id: "terracotta", group: "Soft & earthy", name: "Terracotta",      a1: "#C4673F", a2: "#6E2E14" },
  { id: "ochre",      group: "Soft & earthy", name: "Ochre",           a1: "#CC9A2E", a2: "#6F5010" },
  { id: "lilac",      group: "Soft & earthy", name: "Lilac",           a1: "#B9A6D6", a2: "#5E4A86" },
  { id: "oxblood",    group: "Deep",          name: "Oxblood",         a1: "#6B1E2A", a2: "#C4673F" },
  { id: "forest",     group: "Deep",          name: "Forest",          a1: "#1F4D3A", a2: "#A3B18A" },
  { id: "cobalt",     group: "Deep",          name: "Cobalt",          a1: "#2446D8", a2: "#0E1F7A" },
  { id: "lime",       group: "Acid",          name: "Acid lime",       a1: "#C8F031", a2: "#16130F" },
  { id: "yellow",     group: "Acid",          name: "Acid yellow",     a1: "#F2FF3D", a2: "#16130F" },
  { id: "orange",     group: "Acid",          name: "Electric orange", a1: "#FF5A1F", a2: "#16130F" },
  { id: "pink",       group: "Acid",          name: "Hot pink",        a1: "#FF3EA5", a2: "#16130F" },
  { id: "violet",     group: "Acid",          name: "Ultraviolet",     a1: "#7B3FF2", a2: "#16130F" },
  { id: "aqua",       group: "Acid",          name: "Aqua",            a1: "#00E0C6", a2: "#16130F" },
];

const DARKS = [
  { id: "ink",       name: "Ink (warm black)",  hex: "#16130F" },
  { id: "black",     name: "True black",        hex: "#0B0B0B" },
  { id: "charcoal",  name: "Charcoal",          hex: "#2A2A2A" },
  { id: "espresso",  name: "Espresso",          hex: "#2B1D16" },
  { id: "chocolate", name: "Chocolate",         hex: "#3B2418" },
  { id: "navy",      name: "Midnight navy",     hex: "#121A2B" },
  { id: "forest",    name: "Forest night",      hex: "#14231B" },
  { id: "aubergine", name: "Aubergine",         hex: "#26152B" },
  { id: "oxblood",   name: "Oxblood night",     hex: "#2A0E14" },
];

const LIGHTS = [
  { id: "bone",   name: "Bone",          hex: "#F1EBE0" },
  { id: "white",  name: "Pure white",    hex: "#FFFFFF" },
  { id: "paper",  name: "Paper white",   hex: "#FAF8F4" },
  { id: "cream",  name: "Cream",         hex: "#F6EED9" },
  { id: "oat",    name: "Oat",           hex: "#EDE4D3" },
  { id: "sand",   name: "Sand",          hex: "#E7D9C3" },
  { id: "blush",  name: "Blush",         hex: "#F5E6E1" },
  { id: "mist",   name: "Sage mist",     hex: "#E9EDE4" },
  { id: "cloud",  name: "Cool cloud",    hex: "#EEF0F2" },
];

// Google Fonts specs. heavy/light = weights used for headline lockups.
const DISPLAY_FONTS = [
  { id: "montserrat", name: "Montserrat (current)",   family: "Montserrat", spec: "Montserrat:wght@300..800", heavy: 800, light: 300 },
  { id: "archivo",    name: "Archivo Expanded",       family: "Archivo", spec: "Archivo:wdth,wght@62..125,100..900", heavy: 800, light: 300, stretch: "125%" },
  { id: "unbounded",  name: "Unbounded",              family: "Unbounded", spec: "Unbounded:wght@200..900", heavy: 800, light: 300 },
  { id: "bricolage",  name: "Bricolage Grotesque",    family: "Bricolage Grotesque", spec: "Bricolage+Grotesque:opsz,wght@12..96,200..800", heavy: 800, light: 300 },
  { id: "syne",       name: "Syne",                   family: "Syne", spec: "Syne:wght@400..800", heavy: 800, light: 400 },
  { id: "space",      name: "Space Grotesk",          family: "Space Grotesk", spec: "Space+Grotesk:wght@300..700", heavy: 700, light: 300 },
  { id: "outfit",     name: "Outfit",                 family: "Outfit", spec: "Outfit:wght@100..900", heavy: 800, light: 200 },
  { id: "bigshoulders", name: "Big Shoulders (condensed)", family: "Big Shoulders Display", spec: "Big+Shoulders+Display:wght@100..900", heavy: 800, light: 300 },
  { id: "anton",      name: "Anton (condensed)",      family: "Anton", spec: "Anton", heavy: 400, light: 400 },
  { id: "bebas",      name: "Bebas Neue (condensed)", family: "Bebas Neue", spec: "Bebas+Neue", heavy: 400, light: 400 },
  { id: "fraunces",   name: "Fraunces (soft serif)",  family: "Fraunces", spec: "Fraunces:opsz,wght@9..144,300..900", heavy: 800, light: 300 },
  { id: "playfair",   name: "Playfair Display (serif)", family: "Playfair Display", spec: "Playfair+Display:wght@400..900", heavy: 800, light: 400 },
  { id: "dmserif",    name: "DM Serif Display",       family: "DM Serif Display", spec: "DM+Serif+Display", heavy: 400, light: 400 },
  { id: "instrument", name: "Instrument Serif",       family: "Instrument Serif", spec: "Instrument+Serif", heavy: 400, light: 400 },
  { id: "cormorant",  name: "Cormorant Garamond",     family: "Cormorant Garamond", spec: "Cormorant+Garamond:wght@300..700", heavy: 700, light: 300 },
];

const BODY_FONTS = [
  { id: "montserrat", name: "Montserrat (current)", family: "Montserrat", spec: "Montserrat:wght@300..800" },
  { id: "inter",      name: "Inter",                family: "Inter", spec: "Inter:opsz,wght@14..32,100..900" },
  { id: "dmsans",     name: "DM Sans",              family: "DM Sans", spec: "DM+Sans:opsz,wght@9..40,100..1000" },
  { id: "manrope",    name: "Manrope",              family: "Manrope", spec: "Manrope:wght@200..800" },
  { id: "worksans",   name: "Work Sans",            family: "Work Sans", spec: "Work+Sans:wght@100..900" },
  { id: "figtree",    name: "Figtree",              family: "Figtree", spec: "Figtree:wght@300..900" },
  { id: "karla",      name: "Karla",                family: "Karla", spec: "Karla:wght@200..800" },
  { id: "instrumentsans", name: "Instrument Sans",  family: "Instrument Sans", spec: "Instrument+Sans:wght@400..700" },
  { id: "plex",       name: "IBM Plex Sans",        family: "IBM Plex Sans", spec: "IBM+Plex+Sans:wght@300;400;500;600;700" },
  { id: "outfit",     name: "Outfit",               family: "Outfit", spec: "Outfit:wght@100..900" },
  { id: "librefranklin", name: "Libre Franklin",    family: "Libre Franklin", spec: "Libre+Franklin:wght@100..900" },
  { id: "sourceserif", name: "Source Serif 4 (serif)", family: "Source Serif 4", spec: "Source+Serif+4:opsz,wght@8..60,200..900" },
  { id: "lora",       name: "Lora (serif)",         family: "Lora", spec: "Lora:wght@400..700" },
];

/* ---------------- helpers ---------------- */
const root = document.documentElement.style;
const store = {
  get(k, d) { try { return localStorage.getItem("md-demo-" + k) || d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("md-demo-" + k, v); } catch {} },
};
const loaded = new Set(); // page preloads Fraunces + Outfit; anything else loads on demand
function loadFont(spec) {
  if (!spec || loaded.has(spec)) return Promise.resolve();
  loaded.add(spec);
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
  document.head.append(l);
  return new Promise((r) => { l.onload = r; l.onerror = r; });
}
const lum = (hex) => {
  const c = hex.replace("#", "").match(/\w\w/g).map((x) => parseInt(x, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const grade = (r) => (r >= 7 ? "AAA" : r >= 4.5 ? "AA" : r >= 3 ? "large text only" : "fails");
const mixHex = (a, b, t) => { // a→b by t (sRGB, good enough for a readout)
  const pa = a.replace("#", "").match(/\w\w/g).map((x) => parseInt(x, 16));
  const pb = b.replace("#", "").match(/\w\w/g).map((x) => parseInt(x, 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
};

const state = {
  accent: store.get("accent", "sage"),
  dark: store.get("dark", "ink"),
  light: store.get("light", "white"),
  display: store.get("display", "fraunces"),
  body: store.get("body", "outfit"),
};

/* ---------------- apply ---------------- */
async function apply() {
  const dark = DARKS.find((d) => d.id === state.dark) || DARKS[0];
  const light = LIGHTS.find((l) => l.id === state.light) || LIGHTS[0];
  const ink = dark.hex, bone = light.hex;
  root.setProperty("--ink", ink);
  root.setProperty("--bone", bone);

  const acc = ACCENTS.find((a) => a.id === state.accent) || ACCENTS[0];
  const a1 = acc.a1 || mixHex(bone, ink, 0.09);       // "none" = one tonal step of the light ground
  const a2 = acc.a2 ? (acc.a2.toUpperCase() === INK_DEFAULT ? ink : acc.a2) : ink;
  const onAccent = ratio(a1, ink) >= ratio(a1, bone) ? ink : bone;
  root.setProperty("--accent-1", a1);
  root.setProperty("--accent-2", a2);
  root.setProperty("--on-accent", onAccent);

  const df = DISPLAY_FONTS.find((f) => f.id === state.display) || DISPLAY_FONTS[0];
  const bf = BODY_FONTS.find((f) => f.id === state.body) || BODY_FONTS[0];
  await Promise.all([loadFont(df.spec), loadFont(bf.spec)]);
  root.setProperty("--font", `"${bf.family}", system-ui, -apple-system, "Segoe UI", sans-serif`);
  root.setProperty("--font-display", `"${df.family}", var(--font)`);
  root.setProperty("--display-stretch", df.stretch || "normal");
  root.setProperty("--display-heavy", df.heavy);
  root.setProperty("--display-light", df.light);

  Object.entries(state).forEach(([k, v]) => store.set(k, v));
  report({ ink, bone, a1, onAccent, acc, dark, light, df, bf });
  await window.mdFit?.();
}

function report({ ink, bone, a1, onAccent, acc, dark, light, df, bf }) {
  const body = ratio(ink, bone);
  const accR = ratio(a1, onAccent);
  panel.querySelector("[data-out=contrast]").innerHTML =
    `Ink on light: <b>${body.toFixed(1)}:1</b> ${grade(body)}<br>` +
    `Text on accent (${onAccent === ink ? "dark" : "light"}): <b>${accR.toFixed(1)}:1</b> ${grade(accR)}`;
  panel.querySelector("[data-out=summary]").textContent =
    `Accent ${acc.name}${acc.a1 ? " " + acc.a1 : ""} · Dark ${dark.name} ${dark.hex} · Light ${light.name} ${light.hex} · Headline ${df.name.replace(/ \(.*\)/, "")} · Body ${bf.name.replace(/ \(.*\)/, "")}`;
  panel.querySelector(".mdd__chip").style.background = a1;
  panel.querySelectorAll("[data-pick]").forEach((b) => {
    b.setAttribute("aria-pressed", String(state[b.dataset.kind] === b.dataset.pick));
  });
  panel.querySelectorAll("select[data-kind]").forEach((s) => { s.value = state[s.dataset.kind]; });
}

/* ---------------- panel UI (fixed neutral styling, unaffected by the theme) ---------------- */
const css = `
.mdd{position:fixed;right:10px;bottom:10px;z-index:2147483000;max-width:calc(100vw - 20px);
  background:#111;color:#f4f4f4;border:1px solid #444;font:500 12px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif;
  box-shadow:0 8px 30px rgba(0,0,0,.35)}
.mdd summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;
  letter-spacing:.08em;text-transform:uppercase;font-weight:600}
.mdd summary::-webkit-details-marker{display:none}
.mdd__chip{width:18px;height:18px;border-radius:50%;border:1px solid #f4f4f4}
.mdd__body{display:grid;gap:14px;padding:4px 14px 14px;width:min(340px,calc(100vw - 22px));max-height:min(70vh,640px);overflow:auto;overscroll-behavior:contain}
.mdd h4{margin:0 0 6px;font:600 11px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#aaa}
.mdd select{width:100%;min-height:40px;font:500 14px system-ui,sans-serif;background:#f4f4f4;color:#111;border:0;padding:0 8px}
.mdd__sw{display:grid;grid-template-columns:repeat(8,1fr);gap:6px;margin-top:8px}
.mdd__sw button{aspect-ratio:1;min-height:30px;border-radius:50%;border:1px solid #555;cursor:pointer;padding:0}
.mdd__sw button[aria-pressed=true]{outline:2px solid #fff;outline-offset:2px}
.mdd__out{font-size:12px;color:#ddd}
.mdd__out b{color:#fff}
.mdd__row{display:flex;gap:8px}
.mdd__row button{flex:1;min-height:40px;background:#2a2a2a;color:#fff;border:1px solid #555;cursor:pointer;font:600 11px system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase}
.mdd__summary{font-size:11px;color:#aaa;word-break:break-word}
`;
const style = document.createElement("style");
style.textContent = css;
document.head.append(style);

const opt = (list, grouped) => {
  if (!grouped) return list.map((o) => `<option value="${o.id}">${o.name}</option>`).join("");
  const groups = [...new Set(list.map((o) => o.group))];
  return groups.map((g) => `<optgroup label="${g}">${list.filter((o) => o.group === g).map((o) => `<option value="${o.id}">${o.name}</option>`).join("")}</optgroup>`).join("");
};
const sw = (list, kind, colorOf) =>
  `<div class="mdd__sw" role="group" aria-label="${kind} swatches">${list.map((o) =>
    `<button type="button" data-kind="${kind}" data-pick="${o.id}" aria-label="${o.name}" aria-pressed="false" style="background:${colorOf(o)}"></button>`).join("")}</div>`;

const panel = document.createElement("details");
panel.className = "mdd";
panel.innerHTML = `
  <summary><span class="mdd__chip" aria-hidden="true"></span>Demo · fonts &amp; colours</summary>
  <div class="mdd__body">
    <div><h4>Accent</h4><select data-kind="accent" aria-label="Accent">${opt(ACCENTS, true)}</select>
      ${sw(ACCENTS.filter((a) => a.a1), "accent", (o) => o.a1)}</div>
    <div><h4>Dark sections</h4><select data-kind="dark" aria-label="Dark sections">${opt(DARKS)}</select>
      ${sw(DARKS, "dark", (o) => o.hex)}</div>
    <div><h4>Light sections</h4><select data-kind="light" aria-label="Light sections">${opt(LIGHTS)}</select>
      ${sw(LIGHTS, "light", (o) => o.hex)}</div>
    <div><h4>Headline font</h4><select data-kind="display" aria-label="Headline font">${opt(DISPLAY_FONTS)}</select></div>
    <div><h4>Body font</h4><select data-kind="body" aria-label="Body font">${opt(BODY_FONTS)}</select></div>
    <p class="mdd__out" data-out="contrast" aria-live="polite"></p>
    <div class="mdd__row">
      <button type="button" data-act="shuffle">Shuffle</button>
      <button type="button" data-act="copy">Copy choice</button>
      <button type="button" data-act="reset">Reset</button>
    </div>
    <p class="mdd__summary" data-out="summary"></p>
  </div>`;
document.body.append(panel);

panel.addEventListener("change", (e) => {
  const s = e.target.closest("select[data-kind]");
  if (!s) return;
  state[s.dataset.kind] = s.value;
  apply();
});
panel.addEventListener("click", async (e) => {
  const pick = e.target.closest("[data-pick]");
  if (pick) { state[pick.dataset.kind] = pick.dataset.pick; apply(); return; }
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (act === "reset") Object.assign(state, { accent: "sage", dark: "ink", light: "white", display: "fraunces", body: "outfit" });
  if (act === "shuffle") {
    const r = (l) => l[Math.floor(Math.random() * l.length)].id;
    Object.assign(state, { accent: r(ACCENTS), dark: r(DARKS), light: r(LIGHTS), display: r(DISPLAY_FONTS), body: r(BODY_FONTS) });
  }
  if (act === "copy") {
    const text = panel.querySelector("[data-out=summary]").textContent;
    try { await navigator.clipboard.writeText(text); e.target.textContent = "Copied"; } catch { e.target.textContent = "See text below"; }
    setTimeout(() => { e.target.textContent = "Copy choice"; }, 1500);
    return;
  }
  if (act) apply();
});

apply();
