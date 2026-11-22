/* Booking adapter — COMPONENT_INVENTORY §9a.
   Every Book CTA is a normal link (works with JS off):
     <a href="https://book.heygoldie.com/BRUJAS" data-book data-service="silk-press-trim" data-source="services">Book</a>
   This script decides what the link does, based on /data/booking.json:
     provider "goldie"  → link to Goldie (per-service deep link if configured)
     provider "custom"  → call window.MDBooking.open({ serviceId, source }) if a custom
                          booking flow is loaded; otherwise fall back to the Goldie link.
   Every tap also emits a "md:book" event for analytics. */

const CONFIG_URL = "/data/booking.json";
const DEFAULT_URL = "https://book.heygoldie.com/BRUJAS";

let config = { provider: "goldie", goldie: { url: DEFAULT_URL, serviceUrls: {} } };

const ready = fetch(CONFIG_URL, { cache: "no-cache" })
  .then((r) => (r.ok ? r.json() : null))
  .then((c) => { if (c && c.provider) config = c; })
  .catch(() => { /* keep defaults: links already point at Goldie */ })
  .then(() => applyAll());

function urlFor(serviceId) {
  if (config.provider === "goldie") {
    const g = config.goldie || {};
    return (serviceId && g.serviceUrls && g.serviceUrls[serviceId]) || g.url || DEFAULT_URL;
  }
  return (config.custom && config.custom.fallbackUrl) || (config.goldie && config.goldie.url) || DEFAULT_URL;
}

function apply(link) {
  // Same tab on purpose: on phones a new tab is easy to lose, and Back returns here.
  link.href = urlFor(link.dataset.service || "");
}

function applyAll(scope = document) {
  scope.querySelectorAll("a[data-book]").forEach(apply);
}

document.addEventListener("click", (e) => {
  const link = e.target.closest && e.target.closest("a[data-book]");
  if (!link) return;
  const detail = { serviceId: link.dataset.service || null, source: link.dataset.source || null, provider: config.provider };
  document.dispatchEvent(new CustomEvent("md:book", { detail }));

  if (config.provider === "custom" && window.MDBooking && typeof window.MDBooking.open === "function") {
    e.preventDefault();
    window.MDBooking.open(detail);
  }
  // otherwise: let the link navigate normally
});

// Public API for components that render Book links after load (e.g. services.js)
window.MDBookingAdapter = { ready, applyAll, urlFor };
