// Public booking journey: new/returning → service → dynamic intake → hand-off to Goldie (live authority).
// The intake never blocks booking: "Skip and book directly" is always available.
import { sectionsFor, isVisible, validateAnswers } from "/shared/intake-engine.js";

const FORM_ID = "client-intake";
const DRAFT_KEY = "md-intake-draft-v1";
const GOLDIE = "https://book.heygoldie.com/BRUJAS";
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

const T = {
  en: {
    q: "Have you been to Melanie before?", new: "I'm new", newSub: "First visit with Melanie", ret: "I've been before", retSub: "Returning client",
    pick: "Choose your service", back: "Back", next: "Continue", skip: "Skip the form and book directly",
    form: "A few questions", formLede: "This helps Melanie prepare. Only she can see your answers.",
    req: "Required", submit: "Save & choose a time", sending: "Saving…",
    consent: "Required to continue", photoConsent: "Needed because you added photos",
    draft: "Your answers are saved on this device only until you submit.",
    done: "Thank you!", doneLede: "Melanie has your answers. Last step: pick your time and secure it with the deposit on Goldie.",
    goBook: "Choose my time", cut: "Haircut included", noCut: "No haircut", deposit: "deposit", min: "min", hr: "hr",
    policy: (p) => `${p.depositPercent}% deposit at booking · free changes up to ${p.cancelWindowHours} h before`,
    errors: { required: "Please fill this in", invalid_email: "Check the email address", invalid_phone: "Check the phone number", too_long: "Too long", invalid_option: "Choose an option", too_many_files: "Too many photos", photo_type: "Use a JPEG, PNG or WebP photo", photo_too_large: "Photo is larger than 8 MB", generic: "Something went wrong. Your answers are still here — try again, or skip and book directly.", too_many_requests: "Too many attempts. Please wait a bit or book directly.", service_not_for_client_type: "That service isn't available for this client type." },
  },
  es: {
    q: "¿Ya has visitado a Melanie?", new: "Soy nueva/o", newSub: "Primera visita con Melanie", ret: "Ya he venido", retSub: "Clienta/e recurrente",
    pick: "Elige tu servicio", back: "Atrás", next: "Continuar", skip: "Saltar el formulario y reservar directamente",
    form: "Unas preguntas", formLede: "Esto ayuda a Melanie a prepararse. Solo ella ve tus respuestas.",
    req: "Obligatorio", submit: "Guardar y elegir horario", sending: "Guardando…",
    consent: "Necesario para continuar", photoConsent: "Necesario porque agregaste fotos",
    draft: "Tus respuestas se guardan solo en este dispositivo hasta que las envíes.",
    done: "¡Gracias!", doneLede: "Melanie tiene tus respuestas. Último paso: elige tu horario y apártalo con el depósito en Goldie.",
    goBook: "Elegir mi horario", cut: "Incluye corte", noCut: "Sin corte", deposit: "depósito", min: "min", hr: "h",
    policy: (p) => `Depósito del ${p.depositPercent}% al reservar · cambios sin costo hasta ${p.cancelWindowHours} h antes`,
    errors: { required: "Completa este campo", invalid_email: "Revisa el correo", invalid_phone: "Revisa el número", too_long: "Demasiado largo", invalid_option: "Elige una opción", too_many_files: "Demasiadas fotos", photo_type: "Usa una foto JPEG, PNG o WebP", photo_too_large: "La foto pesa más de 8 MB", generic: "Algo salió mal. Tus respuestas siguen aquí: inténtalo de nuevo o reserva directamente.", too_many_requests: "Demasiados intentos. Espera un poco o reserva directamente.", service_not_for_client_type: "Ese servicio no está disponible para este tipo de cliente." },
  },
};

const store = {
  get(k, s = localStorage) { try { return JSON.parse(s.getItem(k)); } catch { return null; } },
  set(k, v, s = localStorage) { try { s.setItem(k, JSON.stringify(v)); } catch {} },
  del(k, s = localStorage) { try { s.removeItem(k); } catch {} },
};

// First-touch automatic attribution for this visit (kept separate from the self-reported answer).
const TRACK_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "gbraid", "wbraid", "fbclid", "msclkid", "ttclid"];
function captureAttribution() {
  const existing = store.get("md-attrib", sessionStorage);
  const q = new URLSearchParams(location.search);
  const hasTags = TRACK_KEYS.some((k) => q.get(k));
  const meaningful = (o) => o && (TRACK_KEYS.some((k) => o[k]) || o.referrer);
  // Keep the first touch that carried real attribution; an empty first visit doesn't block a tagged one.
  if (existing && (meaningful(existing) || !hasTags)) return existing;
  const out = {};
  for (const k of TRACK_KEYS) if (q.get(k)) out[k] = q.get(k);
  if (document.referrer && new URL(document.referrer).host !== location.host) out.referrer = document.referrer;
  out.landing_path = location.pathname;
  out.first_seen_at = new Date().toISOString();
  store.set("md-attrib", out, sessionStorage);
  return out;
}

const draft = store.get(DRAFT_KEY) || {};
const state = {
  lang: draft.lang || (navigator.language || "en").toLowerCase().startsWith("es") ? (draft.lang || "es") : "en",
  clientType: draft.clientType || null,
  serviceId: draft.serviceId || null,
  answers: draft.answers || {},
  files: {},
  consents: { storage: false, photos: false },
  step: draft.step || "type",
  catalog: null, form: null, errors: {}, captured: captureAttribution(),
};
const app = document.getElementById("app");
const t = () => T[state.lang];
const L = (o) => (o && (o[state.lang] || o.en)) || "";
// After a successful submit the draft is deleted and never re-saved (answers must not linger on shared devices).
const saveDraft = () => { if (state.step !== "done") store.set(DRAFT_KEY, { lang: state.lang, clientType: state.clientType, serviceId: state.serviceId, answers: state.answers, step: state.step }); };
const service = () => state.catalog?.services.find((s) => s.id === state.serviceId) || null;
const bookUrl = () => service()?.bookingUrl || GOLDIE;
const money = (c) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;
const dur = (m) => (m >= 60 ? `${Math.floor(m / 60)} ${t().hr}${m % 60 ? ` ${m % 60} ${t().min}` : ""}` : `${m} ${t().min}`);
const el = (html) => { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function actions(primary, { onBack, disabled } = {}) {
  document.querySelector(".actions")?.remove();
  const bar = el(`<div class="actions"><div class="inner">
    ${primary ? `<button type="button" class="btn" id="primary" ${disabled ? "disabled" : ""}>${esc(primary)}</button>` : ""}
    <a class="skip" href="${esc(bookUrl())}">${esc(t().skip)}</a></div></div>`);
  document.body.append(bar);
  if (onBack) {
    const b = el(`<button type="button" class="btn ghost">${esc(t().back)}</button>`);
    b.addEventListener("click", onBack);
    bar.querySelector(".inner").prepend(b);
  }
  return bar.querySelector("#primary");
}

function renderType() {
  app.innerHTML = "";
  app.append(el(`<section><h1>${esc(t().q)}</h1>
    <div class="choices">
      <button type="button" class="choice" data-v="new" aria-pressed="${state.clientType === "new"}"><strong>${esc(t().new)}</strong><span>${esc(t().newSub)}</span></button>
      <button type="button" class="choice" data-v="returning" aria-pressed="${state.clientType === "returning"}"><strong>${esc(t().ret)}</strong><span>${esc(t().retSub)}</span></button>
    </div></section>`));
  app.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
    state.clientType = b.dataset.v;
    if (service() && !service().clientTypes.includes(state.clientType)) state.serviceId = null;
    go("service");
  }));
  actions(null);
}

function renderService() {
  const list = state.catalog.services.filter((s) => s.clientTypes.includes(state.clientType));
  app.innerHTML = "";
  const sec = el(`<section><h1>${esc(t().pick)}</h1><p class="lede">${esc(t().policy(state.catalog.policy))}</p><div class="choices"></div></section>`);
  for (const s of list) {
    const b = el(`<button type="button" class="choice svc" aria-pressed="${state.serviceId === s.id}">
      <strong>${esc(L(s.name))}</strong><strong>${money(s.priceCents)}</strong>
      <span class="meta">${s.includesCut === true ? `<span class="tag">${esc(t().cut)}</span>` : s.includesCut === false ? `<span class="tag">${esc(t().noCut)}</span>` : ""}${esc(dur(s.durationMin))} · ${money(s.depositCents)} ${esc(t().deposit)}</span></button>`);
    b.addEventListener("click", () => { state.serviceId = s.id; go("form"); });
    sec.querySelector(".choices").append(b);
  }
  app.append(sec);
  actions(null, { onBack: () => go("type") });
}

function fieldHtml(f) {
  const id = `f_${f.id}`;
  const req = f.required ? ` <span class="req" aria-hidden="true">*</span>` : "";
  const a = state.answers[f.id];
  const err = state.errors[f.id] ? `<p class="err" id="${id}_err">${esc(t().errors[state.errors[f.id]] || t().errors.generic)}</p>` : "";
  const desc = state.errors[f.id] ? ` aria-describedby="${id}_err" aria-invalid="true"` : "";
  switch (f.type) {
    case "text": case "email": case "tel":
      return `<div class="field" data-f="${f.id}"><label for="${id}">${esc(L(f.label))}${req}</label>
        <input id="${id}" name="${f.id}" type="${f.type}" ${f.required ? "required" : ""} maxlength="${f.maxLength || 200}"
          autocomplete="${{ first_name: "given-name", last_name: "family-name", email: "email", phone: "tel" }[f.id] || "off"}"
          ${f.type === "tel" ? 'inputmode="tel"' : ""} value="${esc(a || "")}"${desc}>${err}</div>`;
    case "textarea":
      return `<div class="field" data-f="${f.id}"><label for="${id}">${esc(L(f.label))}${req}</label>
        <textarea id="${id}" name="${f.id}" maxlength="${f.maxLength || 2000}" ${f.required ? "required" : ""}${desc}>${esc(a || "")}</textarea>${err}</div>`;
    case "radio": case "multiselect": {
      const type = f.type === "radio" ? "radio" : "checkbox";
      const vals = Array.isArray(a) ? a : a ? [a] : [];
      return `<fieldset class="field" data-f="${f.id}"${desc}><legend>${esc(L(f.label))}${req}</legend>
        ${f.options.map((o) => `<label class="opt"><input type="${type}" name="${f.id}" value="${esc(o.value)}" ${vals.includes(o.value) ? "checked" : ""}> ${esc(L(o.label))}</label>`).join("")}${err}</fieldset>`;
    }
    case "checkbox":
      return `<div class="field" data-f="${f.id}"><label class="opt"><input type="checkbox" name="${f.id}" ${a ? "checked" : ""}${desc}> ${esc(L(f.label))}${req}</label>${err}</div>`;
    case "photo":
      return `<div class="field" data-f="${f.id}"><label for="${id}">${esc(L(f.label))}</label>
        <input id="${id}" name="${f.id}" type="file" accept="image/jpeg,image/png,image/webp" multiple${desc}>
        <p class="hint">Max ${f.maxFiles || 3} · JPEG/PNG/WebP · 8 MB</p><div class="thumbs"></div>${err}</div>`;
  }
  return "";
}

function readField(f, root) {
  if (f.type === "radio") return root.querySelector(`input[name="${f.id}"]:checked`)?.value || null;
  if (f.type === "multiselect") return [...root.querySelectorAll(`input[name="${f.id}"]:checked`)].map((i) => i.value);
  if (f.type === "checkbox") return root.querySelector(`input[name="${f.id}"]`).checked;
  if (f.type === "photo") return undefined;
  return root.querySelector(`[name="${f.id}"]`)?.value ?? null;
}

function renderForm() {
  const svc = service();
  const sections = sectionsFor(state.form, { intakeTags: svc?.intakeTags || [], clientType: state.clientType });
  const fields = sections.flatMap((s) => s.fields);
  app.innerHTML = "";
  const formEl = el(`<form novalidate><h1>${esc(t().form)}</h1><p class="lede">${esc(L(svc?.name))} · ${esc(t().formLede)}</p></form>`);
  for (const s of sections) {
    const sec = el(`<section data-section="${s.id}"><h2>${esc(L(s.title))}</h2></section>`);
    for (const f of s.fields) sec.append(el(fieldHtml(f)));
    formEl.append(sec);
  }
  formEl.append(el(`<div class="consent">
    <label class="opt"><input type="checkbox" id="c_storage" ${state.consents.storage ? "checked" : ""}> ${esc(L(state.form.consent.storage))}</label>
    <label class="opt" id="photoConsentRow" hidden><input type="checkbox" id="c_photos" ${state.consents.photos ? "checked" : ""}> ${esc(L(state.form.consent.photos))}</label>
    <p class="err" id="consentErr" hidden></p>
    <p class="hint">${esc(t().draft)}</p></div>`));
  app.append(formEl);

  const sync = () => {
    for (const f of fields) { const v = readField(f, formEl); if (v !== undefined) state.answers[f.id] = v; }
    for (const f of fields) {
      const wrap = formEl.querySelector(`[data-f="${f.id}"]`);
      const vis = isVisible(f, state.answers);
      wrap.hidden = !vis;
      wrap.querySelectorAll("input,textarea,select").forEach((i) => { i.disabled = !vis; });
    }
    const anyPhotos = Object.values(state.files).some((a) => a.length);
    formEl.querySelector("#photoConsentRow").hidden = !anyPhotos;
    state.consents.storage = formEl.querySelector("#c_storage").checked;
    state.consents.photos = formEl.querySelector("#c_photos").checked;
    saveDraft();
  };
  formEl.addEventListener("input", sync);
  formEl.addEventListener("change", sync);

  for (const f of fields.filter((x) => x.type === "photo")) {
    const input = formEl.querySelector(`#f_${f.id}`);
    const thumbs = formEl.querySelector(`[data-f="${f.id}"] .thumbs`);
    input.addEventListener("change", () => {
      const files = [...input.files];
      const bad = files.find((x) => !TYPES.includes(x.type)) ? "photo_type" : files.find((x) => x.size > MAX_BYTES) ? "photo_too_large" : files.length > (f.maxFiles || 3) ? "too_many_files" : null;
      state.errors[f.id] = bad;
      state.files[f.id] = bad ? [] : files;
      thumbs.innerHTML = "";
      for (const file of state.files[f.id]) { const img = document.createElement("img"); img.alt = ""; img.src = URL.createObjectURL(file); thumbs.append(img); }
      const errEl = formEl.querySelector(`[data-f="${f.id}"] .err`) || el(`<p class="err"></p>`);
      errEl.textContent = bad ? t().errors[bad] : "";
      thumbs.after(errEl);
      sync();
    });
  }
  sync();

  const btn = actions(t().submit, { onBack: () => go("service") });
  btn.addEventListener("click", () => submit(formEl, btn));
}

async function submit(formEl, btn) {
  const svc = service();
  const counts = Object.fromEntries(Object.entries(state.files).map(([k, v]) => [k, v.length]));
  const v = validateAnswers(state.form, { intakeTags: svc?.intakeTags || [], clientType: state.clientType }, state.answers, counts);
  const consentErr = formEl.querySelector("#consentErr");
  const anyPhotos = Object.values(state.files).some((a) => a.length);
  const consentProblem = !state.consents.storage ? t().consent : anyPhotos && !state.consents.photos ? t().photoConsent : null;
  if (!v.ok || consentProblem) {
    state.errors = { ...v.errors };
    renderForm();
    const c = app.querySelector("#consentErr");
    if (consentProblem) { c.hidden = false; c.textContent = consentProblem; }
    (app.querySelector('[aria-invalid="true"]') || c)?.focus?.();
    app.querySelector('[aria-invalid="true"]')?.scrollIntoView({ block: "center" });
    return;
  }
  btn.disabled = true; btn.textContent = t().sending;
  const fd = new FormData();
  fd.append("payload", JSON.stringify({
    formId: state.form.id, formVersion: state.form.version, serviceId: state.serviceId, clientType: state.clientType, lang: state.lang,
    answers: v.clean, consents: state.consents, captured: state.captured,
  }));
  for (const [fieldId, files] of Object.entries(state.files)) for (const f of files) fd.append(`photo:${fieldId}`, f, f.name);
  try {
    const res = await fetch("/api/public/intake", { method: "POST", body: fd });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (body.error === "validation" && body.detail) { state.errors = body.detail; renderForm(); return; }
      throw new Error(body.error || "generic");
    }
    state.next = body.next;
    go("done");
    store.del(DRAFT_KEY);
    state.answers = {};
  } catch (e) {
    btn.disabled = false; btn.textContent = t().submit;
    let n = app.querySelector(".notice.error");
    if (!n) { n = el(`<p class="notice error" role="alert"></p>`); app.prepend(n); }
    n.textContent = t().errors[e.message] || t().errors.generic;
    n.scrollIntoView({ block: "center" });
  }
}

function renderDone() {
  app.innerHTML = "";
  app.append(el(`<section><h1>${esc(t().done)}</h1><p class="lede">${esc(t().doneLede)}</p>
    <p class="notice">${esc(L(service()?.name))} · ${esc(t().policy(state.catalog.policy))}</p></section>`));
  document.querySelector(".actions")?.remove();
  const bar = el(`<div class="actions"><div class="inner"><a class="btn" href="${esc(state.next?.url || bookUrl())}">${esc(t().goBook)}</a></div></div>`);
  document.body.append(bar);
}

function go(step) {
  state.step = step;
  if (step !== "form") state.errors = {};
  saveDraft();
  ({ type: renderType, service: renderService, form: renderForm, done: renderDone })[step]();
  window.scrollTo(0, 0);
  app.querySelector("h1")?.setAttribute("tabindex", "-1");
  app.querySelector("h1")?.focus({ preventScroll: true });
}

document.getElementById("langToggle").addEventListener("click", () => {
  state.lang = state.lang === "en" ? "es" : "en";
  document.documentElement.lang = state.lang;
  document.getElementById("langToggle").textContent = state.lang === "en" ? "ES" : "EN";
  go(state.step);
});

(async function init() {
  document.documentElement.lang = state.lang;
  document.getElementById("langToggle").textContent = state.lang === "en" ? "ES" : "EN";
  try {
    const [catalog, form] = await Promise.all([
      fetch("/api/public/catalog").then((r) => { if (!r.ok) throw 0; return r.json(); }),
      fetch(`/api/public/forms/${FORM_ID}`).then((r) => { if (!r.ok) throw 0; return r.json(); }),
    ]);
    state.catalog = catalog; state.form = form;
    const fromUrl = new URLSearchParams(location.search).get("service");
    if (fromUrl && catalog.services.some((s) => s.id === fromUrl)) state.serviceId = fromUrl;
    let step = state.step;
    if (step !== "type" && !state.clientType) step = "type";
    if (step === "form" && !service()) step = "service";
    go(step === "done" ? "type" : step);
  } catch {
    // Backend unavailable → never block booking.
    app.innerHTML = `<p class="notice error" role="alert">${esc(t().errors.generic)}</p><p><a class="btn" href="${GOLDIE}">${esc(t().goBook)}</a></p>`;
  }
})();
