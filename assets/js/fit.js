/* Poster lockup: fit text to its container width. COMPONENT_INVENTORY §12.
   <div data-fit="lines">   each child [data-line] sized on its own → poster effect (GDY)
   <div data-fit="uniform"> all lines share the widest line's size → clean block
   data-fit-max="160"        caps the size in px
   data-fit-twin=".sel"      copies the sizes onto other elements (e.g. split-name halves)
   Call window.mdFit() after rendering new [data-fit] content or changing fonts. */

function fitOne(el) {
  const mode = el.dataset.fit || "lines";
  const max = parseFloat(el.dataset.fitMax || "400");
  const lines = [...el.querySelectorAll("[data-line]")];
  if (!lines.length) return;
  const cs = getComputedStyle(el);
  const target = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  if (target <= 0) return;
  const sizes = lines.map((line) => {
    line.style.fontSize = "100px";
    line.style.display = "inline-block";
    line.style.whiteSpace = "nowrap";
    const w = line.getBoundingClientRect().width || 1;
    return Math.min(max, (100 * target) / w);
  });
  const uniform = Math.min(...sizes);
  lines.forEach((line, i) => {
    line.style.fontSize = `${(mode === "uniform" ? uniform : sizes[i]).toFixed(2)}px`;
    line.style.display = "block";
  });
  if (el.dataset.fitTwin) {
    document.querySelectorAll(el.dataset.fitTwin).forEach((t) => {
      if (t === el) return;
      [...t.querySelectorAll("[data-line]")].forEach((l, i) => {
        if (!lines[i]) return;
        l.style.fontSize = lines[i].style.fontSize;
        l.style.display = "block";
        l.style.whiteSpace = "nowrap";
      });
    });
  }
}

const fitAll = () => document.querySelectorAll("[data-fit]").forEach(fitOne);

// Only measure once the fonts actually in use are loaded: a fallback font is narrower.
async function refit() {
  const els = [...document.querySelectorAll("[data-fit]")];
  const loads = new Set();
  els.forEach((el) => {
    const fam = getComputedStyle(el).fontFamily;
    ["300", "400", "800"].forEach((w) => loads.add(`${w} 100px ${fam}`));
  });
  if (document.fonts) {
    await Promise.all([...loads].map((f) => document.fonts.load(f).catch(() => {})));
    await document.fonts.ready;
  }
  fitAll();
  observeNew();
}

// Re-fit when a container's width changes (rotation, scrollbars, desktop resize)
const observed = new WeakSet();
const ro = "ResizeObserver" in window ? new ResizeObserver(() => fitAll()) : null;
function observeNew() {
  if (!ro) return;
  document.querySelectorAll("[data-fit]").forEach((el) => {
    const target = el.parentElement || el;
    if (!observed.has(target)) { observed.add(target); ro.observe(target); }
  });
}

window.mdFit = refit;
refit();
addEventListener("load", () => refit());
