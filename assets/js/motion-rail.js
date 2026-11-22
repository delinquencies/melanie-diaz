/* Scroll reveal + swipe rails. COMPONENT_INVENTORY §4–6. No dependencies. */

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Reveal ---------- */
(function initReveal() {
  const targets = document.querySelectorAll("[data-reveal], .rise");
  if (!targets.length || !("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("js-reveal");

  // stagger children of [data-reveal-group]
  document.querySelectorAll("[data-reveal-group]").forEach((group) => {
    [...group.querySelectorAll("[data-reveal]")].forEach((el, i) => el.style.setProperty("--i", i));
  });
  document.querySelectorAll(".rise").forEach((h) => {
    h.querySelectorAll(".line").forEach((l, i) => l.style.setProperty("--i", i));
  });

  if (reduce) { targets.forEach((t) => t.classList.add("is-in")); return; }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
  targets.forEach((t) => io.observe(t));
})();

/* ---------- Rails ---------- */
document.querySelectorAll("[data-rail]").forEach((rail) => {
  const track = rail.querySelector(".rail__track");
  if (!track) return;
  const items = () => [...track.children];
  const prev = rail.querySelector("[data-rail-prev]");
  const next = rail.querySelector("[data-rail-next]");
  const dots = rail.querySelector(".rail__dots");

  const step = () => {
    const first = items()[0];
    if (!first) return track.clientWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return first.getBoundingClientRect().width + gap;
  };
  const go = (dir) => track.scrollBy({ left: dir * step(), behavior: reduce ? "auto" : "smooth" });
  prev?.addEventListener("click", () => go(-1));
  next?.addEventListener("click", () => go(1));

  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
  });

  if (dots) {
    dots.innerHTML = items().map(() => "<span></span>").join("");
  }
  const update = () => {
    const max = track.scrollWidth - track.clientWidth - 2;
    if (prev) prev.disabled = track.scrollLeft <= 2;
    if (next) next.disabled = track.scrollLeft >= max;
    if (dots) {
      const idx = Math.round(track.scrollLeft / Math.max(1, step()));
      [...dots.children].forEach((d, i) => d.classList.toggle("is-on", i === Math.min(idx, dots.children.length - 1)));
    }
  };
  let raf = 0;
  track.addEventListener("scroll", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
  window.addEventListener("resize", update);
  // re-run when items are rendered later (e.g. services from JSON)
  new MutationObserver(() => {
    if (dots) dots.innerHTML = items().map(() => "<span></span>").join("");
    update();
  }).observe(track, { childList: true });
  update();
});
