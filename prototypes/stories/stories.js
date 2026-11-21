/* Story circles + vertical viewer — isolated prototype.
   No dependencies. Behaviour spec: docs/COMPONENT_INVENTORY.md §7. */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const stories = JSON.parse(document.getElementById("storiesData").textContent);
const row = document.querySelector("[data-stories] .stories__row");
const viewer = document.getElementById("storyViewer");
const track = viewer.querySelector(".viewer__track");
const btnClose = viewer.querySelector(".viewer__close");
const btnMute = viewer.querySelector(".viewer__mute");
const btnPrev = viewer.querySelector(".viewer__prev");
const btnNext = viewer.querySelector(".viewer__next");
const status = viewer.querySelector(".viewer__status");

const state = {
  open: false,
  current: -1,
  muted: true,
  paused: false,
  pushedHistory: false,
  trigger: null,
  slides: [],
  // timing for image stories
  imgStart: 0,
  imgElapsed: 0,
  raf: 0,
};

/* ---------------------------------------------------------------- row */

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of [].concat(children)) if (c) node.append(c);
  return node;
}

function posterFor(story) {
  return story.poster || story.src;
}

stories.forEach((story, i) => {
  const media = el("span", { class: "story__media" }, [
    // eager: lazy-loading inside a horizontal rail leaves off-screen circles blank on phones.
    // Production should point this at small (~200px) thumbnails, not full photos.
    el("img", { src: posterFor(story), alt: "", decoding: "async" }),
  ]);
  if (story.type === "video") {
    media.append(el("video", { muted: true, loop: true, playsinline: true, preload: "none", "aria-hidden": "true" }));
  }
  const btn = el("button", {
    class: "story",
    type: "button",
    "aria-label": `Open story ${i + 1} of ${stories.length}: ${story.title}`,
    "data-index": i,
  }, [
    el("span", { class: "story__ring" }, el("span", { class: "story__gap" }, media)),
    el("span", { class: "story__label", "aria-hidden": "true", text: story.title }),
  ]);
  row.append(el("li", {}, btn));

  btn.addEventListener("click", () => {
    const pv = media.querySelector("video");
    if (pv) { pv.pause(); btn.classList.remove("is-previewing"); }
    openViewer(i, btn);
  });

  // Hover preview: play the muted clip inside the ring (Storista behaviour)
  if (story.type === "video" && finePointer && !reduceMotion) {
    const v = media.querySelector("video");
    v.muted = true;
    const start = () => {
      if (!v.src) v.src = story.src;
      v.play().then(() => btn.classList.add("is-previewing")).catch(() => {});
    };
    const stop = () => { v.pause(); btn.classList.remove("is-previewing"); };
    btn.addEventListener("pointerenter", start);
    btn.addEventListener("pointerleave", stop);
    btn.addEventListener("focus", start);
    btn.addEventListener("blur", stop);
  }
});

/* ------------------------------------------------------------- slides */

const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

function buildSlides() {
  if (state.slides.length) return;
  stories.forEach((story, i) => {
    const frame = el("div", { class: "slide__frame" });
    let media;
    if (story.type === "video") {
      media = el("video", { playsinline: true, muted: true, preload: "none", poster: story.poster || false });
      media.addEventListener("ended", () => { if (state.current === i) next(); });
      media.addEventListener("error", () => fallbackToImage(i), { once: true });
    } else {
      media = el("img", { alt: story.title, decoding: "async" });
    }
    frame.append(
      media,
      el("div", { class: "slide__progress", "aria-hidden": "true" }, el("span")),
    );
    const unmute = el("button", { class: "slide__unmute", type: "button" });
    unmute.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l4 6M21 9l-4 6"/></svg>Tap to unmute';
    unmute.addEventListener("click", (e) => { e.stopPropagation(); setMuted(false); });
    const paused = el("div", { class: "slide__paused" });
    paused.innerHTML = ICON_PLAY;

    const meta = el("div", { class: "slide__meta" }, [
      el("div", {}, [
        el("p", { class: "slide__title", text: story.title }),
        story.placeholder ? el("span", { class: "slide__tag", text: "Placeholder · awaiting clip" }) : null,
      ]),
      story.cta ? el("a", { class: "slide__cta", href: story.cta.href, text: story.cta.label }) : null,
    ]);
    frame.append(unmute, paused, meta);

    frame.addEventListener("click", (e) => {
      if (e.target.closest("a, button")) return;
      togglePause();
    });

    const slide = el("section", {
      class: `slide${story.type === "video" ? " is-video" : ""}`,
      "data-index": i,
      "aria-roledescription": "story",
      "aria-label": `${i + 1} of ${stories.length}: ${story.title}`,
    }, frame);
    track.append(slide);
    state.slides.push({ slide, media, bar: frame.querySelector(".slide__progress span"), story });
  });

  // Whichever slide is mostly on screen becomes the active one (covers swipe, wheel, keys)
  const io = new IntersectionObserver((entries) => {
    if (!state.open) return;
    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        activate(Number(entry.target.dataset.index));
      }
    }
  }, { root: track, threshold: [0.6] });
  state.slides.forEach(({ slide }) => io.observe(slide));
}

function fallbackToImage(i) {
  const s = state.slides[i];
  const img = el("img", { alt: s.story.title, src: s.story.poster || "" });
  s.media.replaceWith(img);
  s.media = img;
  s.story = { ...s.story, type: "image", duration: 5000 };
  s.slide.classList.remove("is-video");
  if (state.current === i) startPlayback();
}

function ensureLoaded(i) {
  const s = state.slides[i];
  if (!s) return;
  if (!s.media.getAttribute("src")) {
    s.media.setAttribute("src", s.story.src);
    if (s.media.tagName === "VIDEO") s.media.preload = "auto";
  }
}

/* ------------------------------------------------------------ playback */

function stopSlide(i) {
  const s = state.slides[i];
  if (!s) return;
  s.slide.classList.remove("is-active", "is-paused");
  s.slide.inert = true;
  s.bar.style.transform = "scaleX(0)";
  if (s.media.tagName === "VIDEO") { s.media.pause(); }
  else { s.media.classList.remove("is-kenburns"); }
}

function activate(i) {
  if (i === state.current || !state.slides[i]) return;
  if (state.current >= 0) stopSlide(state.current);
  state.current = i;
  state.paused = false;
  [i, i + 1, i - 1].forEach(ensureLoaded);

  const s = state.slides[i];
  s.slide.classList.add("is-active");
  s.slide.inert = false;
  btnPrev.disabled = i === 0;
  btnNext.disabled = false; // last story's "next" closes the viewer
  btnNext.setAttribute("aria-label", i === stories.length - 1 ? "Close stories" : "Next story");
  status.textContent = `Story ${i + 1} of ${stories.length}: ${s.story.title}`;
  if (state.pushedHistory) history.replaceState({ story: i }, "", `#story-${i + 1}`);
  startPlayback();
}

function startPlayback() {
  const s = state.slides[state.current];
  if (s.media.tagName === "VIDEO") {
    s.media.muted = state.muted;
    try { s.media.currentTime = 0; } catch {}
    s.media.play().catch(() => {
      // Autoplay with sound refused: fall back to muted
      setMuted(true);
      s.media.play().catch(() => {});
    });
  } else {
    state.imgStart = performance.now();
    state.imgElapsed = 0;
    s.media.style.setProperty("--dur", `${s.story.duration || 5000}ms`);
    s.media.classList.remove("is-kenburns");
    void s.media.offsetWidth;
    s.media.classList.add("is-kenburns");
    s.media.style.animationPlayState = "running";
  }
}

function togglePause() {
  const s = state.slides[state.current];
  if (!s) return;
  state.paused = !state.paused;
  s.slide.classList.toggle("is-paused", state.paused);
  if (s.media.tagName === "VIDEO") {
    state.paused ? s.media.pause() : s.media.play().catch(() => {});
  } else if (state.paused) {
    state.imgElapsed = performance.now() - state.imgStart;
    s.media.style.animationPlayState = "paused";
  } else {
    state.imgStart = performance.now() - state.imgElapsed;
    s.media.style.animationPlayState = "running";
  }
  status.textContent = state.paused ? "Paused" : "Playing";
}

function tick() {
  if (!state.open) return;
  const s = state.slides[state.current];
  if (s) {
    let p = 0;
    if (s.media.tagName === "VIDEO") {
      if (s.media.duration) p = s.media.currentTime / s.media.duration;
    } else {
      const dur = s.story.duration || 5000;
      const elapsed = state.paused ? state.imgElapsed : performance.now() - state.imgStart;
      p = elapsed / dur;
      if (p >= 1 && !state.paused) { next(); }
    }
    s.bar.style.transform = `scaleX(${Math.min(1, Math.max(0, p))})`;
  }
  state.raf = requestAnimationFrame(tick);
}

function setMuted(m) {
  state.muted = m;
  viewer.classList.toggle("is-muted", m);
  btnMute.setAttribute("aria-pressed", String(m));
  btnMute.setAttribute("aria-label", m ? "Unmute" : "Mute");
  const s = state.slides[state.current];
  if (s && s.media.tagName === "VIDEO") s.media.muted = m;
}

/* ---------------------------------------------------------- navigation */

function goTo(i) {
  if (i < 0) return;
  if (i >= stories.length) { closeViewer(); return; }
  track.scrollTo({ top: i * track.clientHeight, behavior: reduceMotion ? "auto" : "smooth" });
  activate(i);
}
const next = () => goTo(state.current + 1);
const prev = () => goTo(state.current - 1);

btnNext.addEventListener("click", next);
btnPrev.addEventListener("click", prev);
btnClose.addEventListener("click", () => closeViewer());
btnMute.addEventListener("click", () => setMuted(!state.muted));

function onKey(e) {
  if (!state.open) return;
  const inControl = e.target.closest && e.target.closest("a, button");
  switch (e.key) {
    case "Escape": e.preventDefault(); closeViewer(); break;
    case "ArrowDown": case "ArrowRight": case "PageDown": e.preventDefault(); next(); break;
    case "ArrowUp": case "ArrowLeft": case "PageUp": e.preventDefault(); prev(); break;
    case " ": case "k": if (!inControl) { e.preventDefault(); togglePause(); } break;
    case "m": setMuted(!state.muted); break;
    case "Tab": trapFocus(e); break;
  }
}

function trapFocus(e) {
  const focusables = [...viewer.querySelectorAll("a[href], button:not([disabled])")]
    .filter((n) => !n.closest("[inert]") && n.offsetParent !== null);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

// Mouse wheel / trackpad: one story per gesture (native snap alone can snap back on short wheels).
// Touch is left to native scroll-snap so phones keep real momentum.
let wheelLock = 0;
let wheelAccum = 0;
track.addEventListener("wheel", (e) => {
  if (!state.open) return;
  e.preventDefault();
  const now = performance.now();
  if (now < wheelLock) return;
  wheelAccum += e.deltaY;
  if (Math.abs(wheelAccum) < 40) return;
  wheelAccum > 0 ? next() : prev();
  wheelAccum = 0;
  wheelLock = now + 650;
}, { passive: false });

let resizeTimer;
window.addEventListener("resize", () => {
  if (!state.open) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { track.scrollTop = state.current * track.clientHeight; }, 100);
});

/* ---------------------------------------------------------- open/close */

function openViewer(i, trigger) {
  buildSlides();
  state.trigger = trigger;
  state.open = true;
  state.current = -1;
  state.slides.forEach((_, n) => stopSlide(n));
  viewer.hidden = false;
  document.documentElement.classList.add("is-viewer-open");
  setMuted(state.muted);
  track.scrollTop = i * track.clientHeight;
  activate(i);

  history.pushState({ story: i }, "", `#story-${i + 1}`);
  state.pushedHistory = true;

  requestAnimationFrame(() => viewer.classList.add("is-open"));
  document.addEventListener("keydown", onKey);
  cancelAnimationFrame(state.raf);
  state.raf = requestAnimationFrame(tick);
  btnClose.focus({ preventScroll: true });
}

function closeViewer(fromHistory = false) {
  if (!state.open) return;
  const last = state.current;
  state.open = false;
  cancelAnimationFrame(state.raf);
  state.slides.forEach((_, n) => stopSlide(n));
  state.current = -1;
  document.removeEventListener("keydown", onKey);
  viewer.classList.remove("is-open");
  document.documentElement.classList.remove("is-viewer-open");
  const hide = () => { if (!state.open) viewer.hidden = true; };
  reduceMotion ? hide() : setTimeout(hide, 250);

  // Mark the circle as seen (optional state; Storista has none)
  const seen = row.querySelector(`.story[data-index="${last}"]`);
  if (seen) seen.classList.add("is-seen");

  if (!fromHistory && state.pushedHistory) history.back();
  state.pushedHistory = false;
  if (state.trigger) state.trigger.focus({ preventScroll: true });
}

// Browser Back closes the viewer and keeps the page where it was
window.addEventListener("popstate", () => {
  if (state.open) { state.pushedHistory = false; closeViewer(true); }
});
