/* Hero video (poster first, deferred) + mobile Book bar.
   COMPONENT_INVENTORY §3, §9. */

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const saveData = !!(navigator.connection && navigator.connection.saveData);

/* ---------- Hero: inject <video> from <template> after load (Hershesons technique) ---------- */
document.querySelectorAll("[data-hero]").forEach((hero) => {
  const tpl = hero.querySelector("template.hero__video-tpl");
  if (!tpl || reduce || saveData) return;
  let pausedBefore = false;
  try { pausedBefore = localStorage.getItem("md-hero-paused") === "1"; } catch {}
  if (pausedBefore) return;

  const start = () => {
    const video = tpl.content.querySelector("video").cloneNode(true);
    video.muted = true; video.playsInline = true; video.loop = true;
    hero.querySelector(".hero__media").append(video);
    video.addEventListener("playing", () => video.classList.add("is-playing"), { once: true });
    video.play().catch(() => video.remove());
    hero.classList.add("has-video");

    const btn = hero.querySelector(".hero__pause");
    btn?.addEventListener("click", () => {
      const paused = !video.paused;
      paused ? video.pause() : video.play();
      btn.setAttribute("aria-pressed", String(paused));
      try { localStorage.setItem("md-hero-paused", paused ? "1" : "0"); } catch {}
    });
  };
  document.readyState === "complete" ? start() : addEventListener("load", start, { once: true });
});

/* ---------- Mobile Book bar ---------- */
(function bookbar() {
  const bar = document.querySelector("[data-bookbar]");
  if (!bar || !("IntersectionObserver" in window)) return;
  const hero = document.querySelector("[data-hero]");
  const hiders = document.querySelectorAll("[data-bookbar-hide]");

  let heroVisible = !!hero;
  let hiderVisible = 0;
  let menuOpen = false;

  const update = () => {
    const show = !heroVisible && hiderVisible === 0 && !menuOpen;
    bar.classList.toggle("is-shown", show);
    bar.inert = !show;
  };

  if (hero) {
    new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; update(); },
      { rootMargin: "0px 0px -40% 0px" }).observe(hero);
  } else {
    heroVisible = false;
  }
  const seen = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
    hiderVisible = seen.size;
    update();
  });
  hiders.forEach((h) => io.observe(h));
  document.addEventListener("md:menu", (e) => { menuOpen = e.detail.open; update(); });
  update();
})();
