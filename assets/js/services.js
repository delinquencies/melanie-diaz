/* Services list rendered from /data/services.json (single source of truth for
   EN, ES and /links/). COMPONENT_INVENTORY §9. Book links go through booking.js.
   Container: <div data-services data-lang="en|es"> (falls back to <html lang>). */

const containers = document.querySelectorAll("[data-services]");
if (containers.length) {
  fetch("/data/services.json", { cache: "no-cache" })
    .then((r) => r.json())
    .then((data) => containers.forEach((c) => render(c, data)))
    .catch(() => containers.forEach((c) => c.setAttribute("data-services-error", "")));
}

const T = {
  en: { from: "from", book: "Book", bookAria: (n) => `Book ${n}`, hr: "hr", min: "min", jump: "Jump to category" },
  es: { from: "desde", book: "Reservar", bookAria: (n) => `Reservar ${n}`, hr: "h", min: "min", jump: "Ir a categoría" },
};

function duration(min, t) {
  const h = Math.floor(min / 60), m = min % 60;
  if (!h) return `${m} ${t.min}`;
  return m ? `${h} ${t.hr} ${m} ${t.min}` : `${h} ${t.hr}`;
}
function price(s, t) {
  return `${s.priceIsFrom ? t.from + " " : ""}$${s.priceFrom}`;
}
function esc(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function render(container, data) {
  const lang = (container.dataset.lang || document.documentElement.lang || "en").slice(0, 2);
  const t = T[lang] || T.en;
  const pick = (o) => o[lang] || o.en;
  const groups = data.categories
    .map((cat) => ({ cat, items: data.services.filter((s) => s.category === cat.id) }))
    .filter((g) => g.items.length);

  const chips = `
    <nav class="svc-chips" aria-label="${t.jump}">
      <ul role="list">
        ${groups.map(({ cat }) => `<li><a href="#svc-${cat.id}">${esc(pick(cat.name))}</a></li>`).join("")}
      </ul>
    </nav>`;

  const body = groups.map(({ cat, items }) => `
    <section class="svc-group" id="svc-${cat.id}" aria-labelledby="svc-${cat.id}-h">
      <h3 class="svc-group__title eyebrow" id="svc-${cat.id}-h">${esc(pick(cat.name))}</h3>
      <ul class="svc-list" role="list">
        ${items.map((s) => `
          <li class="svc">
            <div class="svc__main">
              <div class="svc__head">
                <h4 class="svc__name">${esc(pick(s.name))}</h4>
                <p class="svc__price">${esc(price(s, t))}</p>
              </div>
              <p class="svc__meta">${esc(duration(s.durationMin, t))}</p>
              <p class="svc__desc">${esc(pick(s.description))}</p>
            </div>
            <a class="btn svc__book" href="https://book.heygoldie.com/BRUJAS"
               data-book data-service="${esc(s.id)}" data-source="services"
               aria-label="${esc(t.bookAria(pick(s.name)))}">${t.book}</a>
          </li>`).join("")}
      </ul>
    </section>`).join("");

  container.innerHTML = chips + `<div class="svc-groups">${body}</div>`;
  window.MDBookingAdapter?.ready.then(() => window.MDBookingAdapter.applyAll(container));
}
