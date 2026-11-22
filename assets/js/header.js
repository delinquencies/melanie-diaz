/* Site header: mobile menu + background-aware contrast copies.
   COMPONENT_INVENTORY §1–2. No dependencies. */

const root = document.documentElement;
const header = document.querySelector("[data-site-header]");

if (header) {
  initMenu();
  initContrastCopies();
}

function initMenu() {
  const toggle = header.querySelector(".nav-toggle");
  const menu = document.getElementById(toggle?.getAttribute("aria-controls") || "");
  const scrim = document.querySelector(".menu-scrim");
  if (!toggle || !menu) return;

  const isEs = (root.lang || "").toLowerCase().startsWith("es");
  const labels = isEs ? ["Abrir menú", "Cerrar menú"] : ["Open menu", "Close menu"];

  const setOpen = (open, { focusToggle = false } = {}) => {
    root.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? labels[1] : labels[0]);
    menu.inert = !open;
    if (open) menu.querySelector("a, button")?.focus({ preventScroll: true });
    else if (focusToggle) toggle.focus({ preventScroll: true });
    document.dispatchEvent(new CustomEvent("md:menu", { detail: { open } }));
  };

  menu.inert = true;
  toggle.setAttribute("aria-label", labels[0]);
  toggle.addEventListener("click", () => setOpen(!root.classList.contains("menu-open")));
  scrim?.addEventListener("click", () => setOpen(false));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root.classList.contains("menu-open")) setOpen(false, { focusToggle: true });
  });
  // Closing when the layout switches to desktop
  matchMedia("(min-width:1024px)").addEventListener("change", (e) => { if (e.matches) setOpen(false); });
}

function initContrastCopies() {
  const bar = header.querySelector(".site-header__bar");
  const sections = document.querySelectorAll("[data-nav-ground]");
  if (!bar || !sections.length || !("clipPath" in document.body.style)) return;

  sections.forEach((section) => {
    if (section.classList.contains("has-nav-copy")) return; // idempotent: safe to re-run
    const copy = document.createElement("div");
    copy.className = "nav-copy";
    copy.setAttribute("aria-hidden", "true");
    copy.inert = true;
    const clone = bar.cloneNode(true);
    clone.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    clone.querySelectorAll("a, button").forEach((n) => n.setAttribute("tabindex", "-1"));
    copy.append(clone);
    section.prepend(copy);
    section.classList.add("has-nav-copy");
  });
  root.classList.add("has-nav-copies");
}

// For sections rendered after load (e.g. services from JSON): call window.mdNavCopies()
window.mdNavCopies = () => header && initContrastCopies();
