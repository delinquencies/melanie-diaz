// Private owner dashboard. Shows only real data; sandbox data is always labelled.
const view = document.getElementById("view");
const nav = document.getElementById("nav");
const TZ = "America/Chicago";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (c) => (c == null ? "—" : `$${(c / 100).toFixed(2)}`);
const fmt = (iso, o = { dateStyle: "medium", timeStyle: "short" }) => new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...o }).format(new Date(iso));
const time = (iso) => fmt(iso, { hour: "numeric", minute: "2-digit" });
const dayKey = (iso) => fmt(iso, { weekday: "short", month: "short", day: "numeric" });
const localDate = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // YYYY-MM-DD

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts, credentials: "same-origin",
    headers: { ...(opts.body ? { "content-type": "application/json" } : {}), ...(opts.method && opts.method !== "GET" ? { "x-salon-os": "1" } : {}), ...opts.headers },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401) { location.hash = "#/login"; throw new Error("unauthorized"); }
  const body = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
  if (!res.ok) throw Object.assign(new Error(body?.error || res.status), { detail: body?.detail });
  return body;
}
const errBox = (e) => `<p class="note warn" role="alert">${esc(e.message)}${e.detail ? ` — ${esc(JSON.stringify(e.detail))}` : ""}</p>`;

// ───────── Views ─────────
async function login() {
  nav.hidden = true;
  view.innerHTML = `<h1>Sign in</h1><form id="f" class="grid2 narrow">
    <label>Email<input name="email" type="email" autocomplete="username" required></label>
    <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
    <button class="btn">Sign in</button><div id="m"></div></form>
    <details class="narrow"><summary>First-time setup (create the owner account)</summary>
      <p class="muted">Only works once, and only with the setup token set during deployment.</p>
      <form id="setup" class="grid2 narrow">
        <label>Setup token<input name="token" type="password" autocomplete="off" required></label>
        <label>Owner email<input name="email" type="email" autocomplete="username" required></label>
        <label>Password (12+ characters)<input name="password" type="password" autocomplete="new-password" minlength="12" required></label>
        <button class="btn ghost">Create owner</button><div id="sm"></div></form></details>`;
  view.querySelector("#setup").addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const res = await fetch("/api/setup/owner", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${d.token}` }, body: JSON.stringify({ email: d.email, password: d.password }) });
    const b = await res.json().catch(() => ({}));
    view.querySelector("#sm").innerHTML = res.ok ? `<p class="note">Owner created. Sign in above, then remove the SETUP_TOKEN secret.</p>`
      : errBox(new Error({ forbidden: "Setup token not accepted", owner_exists: "An owner already exists", invalid_owner: b.detail || "Invalid email or password" }[b.error] || b.error || "Setup failed"));
  });
  view.querySelector("#f").addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    try { await api("/api/admin/login", { method: "POST", body: d }); location.hash = "#/"; }
    catch (err) { view.querySelector("#m").innerHTML = errBox(err.message === "invalid_credentials" ? new Error("Wrong email or password") : err); }
  });
}

function items(list) {
  if (!list.length) return `<p class="muted">Nothing scheduled.</p>`;
  const byDay = {};
  for (const i of list) (byDay[dayKey(i.start)] ||= []).push(i);
  return Object.entries(byDay).map(([d, arr]) => `<div class="day"><h3>${esc(d)}</h3>${arr.map((i) => `
    <div class="item ${i.type === "busy" && i.layer === "personal" ? "personal" : ""} ${i.type === "block" ? "block" : ""} ${i.sandbox ? "sandbox" : ""}">
      <div>${esc(time(i.start))}–${esc(time(i.end))}</div>
      <div>${i.sandbox ? '<span class="pill sand">sandbox</span>' : ""}${i.type === "block" ? `<span class="pill warn">${esc(i.kind)}</span>` : ""}
        <strong>${esc(i.title)}</strong>${i.services ? ` <span class="muted">${esc(i.services)}</span>` : ""}
        ${i.conflicts?.length ? '<span class="pill err">conflict</span>' : ""}
        ${i.type === "block" ? ` <button class="btn ghost" data-del="${esc(i.id)}">Remove</button>` : ""}
        ${i.type === "appointment" && i.sandbox && i.status === "booked" ? `
          <button class="btn ghost" data-st="${esc(i.id)}" data-v="completed">Complete</button>
          <button class="btn ghost" data-st="${esc(i.id)}" data-v="cancelled">Cancel</button>
          <button class="btn ghost" data-st="${esc(i.id)}" data-v="no_show">No-show</button>` : ""}
      </div></div>`).join("")}</div>`).join("");
}

function wireItems(root, reload) {
  root.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => { await api(`/api/admin/time-blocks/${b.dataset.del}`, { method: "DELETE" }); reload(); }));
  root.querySelectorAll("[data-st]").forEach((b) => b.addEventListener("click", async () => {
    try { await api(`/api/admin/sandbox/appointments/${b.dataset.st}/status`, { method: "POST", body: { status: b.dataset.v } }); reload(); } catch (e) { alert(e.message); }
  }));
}

async function today() {
  const o = await api("/api/admin/overview");
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 86400000);
  const cal = await api(`/api/admin/calendar?from=${start.toISOString()}&to=${end.toISOString()}`);
  view.innerHTML = `<h1>Today · ${esc(fmt(new Date(), { weekday: "long", month: "long", day: "numeric" }))}</h1>
    <div class="cards">
      <a class="card" href="#/intakes"><b>${o.newIntakes}</b>new intake forms</a>
      <a class="card" href="#/clients?review=1"><b>${o.needsReview}</b>clients to review</a>
      <div class="card"><b>${o.clients}</b>client profiles</div>
      <div class="card"><b>${o.upcomingRealAppointments}</b>upcoming real appointments in Salon OS</div>
    </div>
    <p class="note">Live bookings are in <strong>Goldie</strong> — ${esc(o.dataSources.bookings)}. Payments: ${esc(o.dataSources.payments)}. Calendar: ${esc(o.dataSources.calendar)}.</p>
    <h2>Schedule</h2><div id="sched">${items(cal)}</div>`;
  wireItems(view, today);
}

async function calendar() {
  const q = new URLSearchParams(location.hash.split("?")[1] || "");
  const mode = q.get("v") || "week";
  const base = q.get("d") ? new Date(q.get("d") + "T12:00:00") : new Date();
  const start = new Date(base); start.setHours(0, 0, 0, 0);
  if (mode === "week") start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (mode === "month") start.setDate(1);
  const end = new Date(start);
  if (mode === "day") end.setDate(end.getDate() + 1);
  if (mode === "week") end.setDate(end.getDate() + 7);
  if (mode === "month") end.setMonth(end.getMonth() + 1);
  const list = await api(`/api/admin/calendar?from=${start.toISOString()}&to=${end.toISOString()}`);
  const shift = (n) => { const d = new Date(start); if (mode === "month") d.setMonth(d.getMonth() + n); else d.setDate(d.getDate() + n * (mode === "week" ? 7 : 1)); return localDate(d); };
  view.innerHTML = `<h1>Calendar</h1>
    <p>${["day", "week", "month"].map((m) => `<a class="btn ${m === mode ? "" : "ghost"}" href="#/calendar?v=${m}&d=${localDate(start)}">${m}</a>`).join(" ")}
      <a class="btn ghost" href="#/calendar?v=${mode}&d=${shift(-1)}">‹ Prev</a> <a class="btn ghost" href="#/calendar?v=${mode}&d=${shift(1)}">Next ›</a></p>
    <p class="muted">${esc(fmt(start, { dateStyle: "medium" }))} – ${esc(fmt(new Date(end - 1), { dateStyle: "medium" }))} · Business items in dark, personal busy time in grey (no details stored), blocks in amber, sandbox in purple.</p>
    <h2>Block time / vacation / extra opening</h2>
    <form id="blk" class="inline">
      <label>Type<select name="kind"><option value="blocked">Blocked</option><option value="break">Break</option><option value="vacation">Vacation</option><option value="extra_open">Extra opening</option></select></label>
      <label>From<input type="datetime-local" name="start" required></label>
      <label>To<input type="datetime-local" name="end" required></label>
      <label>Private label<input name="label" maxlength="120"></label>
      <button class="btn">Add</button></form><div id="m"></div>
    <h2>Schedule</h2>${items(list)}`;
  wireItems(view, calendar);
  view.querySelector("#blk").addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    try { await api("/api/admin/time-blocks", { method: "POST", body: { ...d, start: new Date(d.start).toISOString(), end: new Date(d.end).toISOString() } }); calendar(); }
    catch (err) { view.querySelector("#m").innerHTML = errBox(err); }
  });
}

async function intakes() {
  const list = await api("/api/admin/intakes");
  view.innerHTML = `<h1>Intake forms</h1>${list.length ? `<table><thead><tr><th>Submitted</th><th>Client</th><th>Service</th><th>Flags</th><th>Status</th></tr></thead><tbody>
    ${list.map((s) => `<tr><td>${esc(fmt(s.submitted_at))}</td><td><a href="#/clients/${esc(s.client_id)}">${esc(s.first_name)} ${esc(s.last_name || "")}</a></td>
      <td>${esc(s.service_id || "—")}</td>
      <td>${s.client_type_reported ? `<span class="pill">${esc(s.client_type_reported)}</span>` : ""}${s.needs_review ? '<span class="pill warn">review</span>' : ""}${s.has_sensitive ? '<span class="pill err">sensitivity</span>' : ""}${s.photo_count ? `<span class="pill">${s.photo_count} photos</span>` : ""}</td>
      <td>${esc(s.status)} ${s.status === "new" ? `<button class="btn ghost" data-rev="${esc(s.id)}">Mark reviewed</button>` : ""}</td></tr>`).join("")}
    </tbody></table>` : `<p class="muted">No intake forms yet. They appear when clients use the booking form at <a href="/book/">/book/</a>.</p>`}`;
  view.querySelectorAll("[data-rev]").forEach((b) => b.addEventListener("click", async () => { await api(`/api/admin/intakes/${b.dataset.rev}/status`, { method: "POST", body: { status: "reviewed" } }); intakes(); }));
}

async function clients() {
  const q = new URLSearchParams(location.hash.split("?")[1] || "");
  const list = await api(`/api/admin/clients?${new URLSearchParams({ q: q.get("q") || "", review: q.get("review") || "" })}`);
  view.innerHTML = `<h1>Clients</h1><form id="s" class="inline"><label>Search<input name="q" value="${esc(q.get("q") || "")}" placeholder="name, email, phone"></label><button class="btn ghost">Search</button>
    <a class="btn ghost" href="#/clients?review=1">Needs review</a></form>
    ${list.length ? `<table><thead><tr><th>Name</th><th>Contact</th><th>Type</th><th>Source</th><th>Since</th></tr></thead><tbody>
    ${list.map((c) => `<tr><td><a href="#/clients/${esc(c.id)}">${esc(c.first_name)} ${esc(c.last_name || "")}</a></td><td>${esc(c.email || "")}<br>${esc(c.phone || "")}</td>
      <td>${esc(c.client_type_reported || "—")} ${c.history_verified ? '<span class="pill">verified</span>' : '<span class="pill warn">unverified</span>'} ${c.needs_review ? '<span class="pill warn">review</span>' : ""}</td>
      <td>${esc(c.reported_source || "not reported")}</td><td>${esc(fmt(c.created_at, { dateStyle: "medium" }))}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">No clients match.</p>`}`;
  view.querySelector("#s").addEventListener("submit", (e) => { e.preventDefault(); location.hash = `#/clients?q=${encodeURIComponent(new FormData(e.target).get("q"))}`; });
}

function answerValue(v) { return Array.isArray(v) ? v.join(", ") : v === true ? "Yes" : v; }

async function client(id) {
  const p = await api(`/api/admin/clients/${encodeURIComponent(id)}`);
  const c = p.client;
  view.innerHTML = `<h1>${esc(c.first_name)} ${esc(c.last_name || "")}</h1>
    <p>${c.history_verified ? '<span class="pill">history verified</span>' : '<span class="pill warn">history not verified</span>'}
      ${c.client_type_reported ? `<span class="pill">says ${esc(c.client_type_reported)}</span>` : ""}${c.needs_review ? '<span class="pill warn">needs review</span>' : ""}</p>
    ${p.sensitivities.length ? `<div class="note warn"><strong>Sensitivities</strong><ul>${p.sensitivities.map((s) => `<li>${esc(answerValue(s.value))} <span class="muted">(${s.from === "client" ? "client said" : "your note"}, ${esc(fmt(s.submittedAt, { dateStyle: "medium" }))})</span></li>`).join("")}</ul></div>` : ""}
    <div class="grid2">
      <section><h2>Contact</h2><dl class="kv"><dt>Email</dt><dd>${esc(c.email || "—")}</dd><dt>Phone</dt><dd>${esc(c.phone || "—")}</dd>
        <dt>Prefers</dt><dd>${esc(c.preferred_contact || "—")}</dd><dt>Language</dt><dd>${esc(c.preferred_language || "—")}</dd>
        <dt>Collected so far</dt><dd>${money(p.lifetimeCollectedCents)} <span class="muted">(recorded payments only)</span></dd></dl></section>
      <section><h2>Original acquisition</h2>${p.acquisition ? `<dl class="kv">
        <dt>Client said</dt><dd>${esc(p.acquisition.reported || "not reported")}${p.acquisition.referrerName ? ` — referred by ${esc(p.acquisition.referrerName)}` : ""}${p.acquisition.reportedOther ? ` — ${esc(p.acquisition.reportedOther)}` : ""}</dd>
        <dt>Captured</dt><dd>${p.acquisition.captured ? esc(Object.entries(p.acquisition.captured).map(([k, v]) => `${k}: ${v}`).join("\n")) : "nothing captured"}</dd>
        <dt>First seen</dt><dd>${esc(fmt(p.acquisition.firstSeenAt))}</dd></dl>` : `<p class="muted">No acquisition data.</p>`}</section>
    </div>
    <h2>Upcoming appointments</h2>${p.appointments.upcoming.length ? `<ul class="list">${p.appointments.upcoming.map((a) => `<li>${esc(fmt(a.starts_at))} · ${esc(a.services)} ${a.source === "sandbox" ? '<span class="pill sand">sandbox</span>' : ""}</li>`).join("")}</ul>` : `<p class="muted">None in Salon OS. Check Goldie for live bookings.</p>`}
    <h2>Client-submitted · intake forms</h2>${p.submitted.intakes.map((s) => `<details open><summary>${esc(fmt(s.submittedAt))} · ${esc(s.serviceId || "")} · form v${s.formVersion}</summary>
      <dl class="kv">${s.answers.map((a) => `<dt>${esc(a.label)}${a.sensitive ? ' <span class="pill err">sensitive</span>' : ""}</dt><dd>${esc(answerValue(a.value))}</dd>`).join("")}</dl></details>`).join("") || `<p class="muted">None.</p>`}
    <h2>Client-submitted · photos</h2>${p.submitted.photos.length ? `<div class="photos">${p.submitted.photos.map((ph) => `<a href="/api/admin/photos/${esc(ph.id)}" target="_blank" rel="noopener"><img src="/api/admin/photos/${esc(ph.id)}" alt="${esc(ph.kind)} photo"></a>`).join("")}</div>` : `<p class="muted">None.</p>`}
    <h2>Your professional notes</h2>
    <form id="note" class="grid2"><label>Kind<select name="kind"><option value="consultation">Consultation</option><option value="general">General</option><option value="preference">Preference</option><option value="sensitivity">Sensitivity</option></select></label>
      <label>Note<textarea name="body" maxlength="5000" required></textarea></label><button class="btn">Add note</button></form>
    <ul class="list">${p.professional.notes.map((n) => `<li><span class="pill">${esc(n.kind)}</span> ${esc(fmt(n.createdAt))}<br>${esc(n.body)}</li>`).join("")}</ul>
    <h2>Treatment records & formulas</h2>
    <form id="tr" class="grid2"><label>Date<input type="date" name="performedOn" required value="${localDate()}"></label><label>Services<input name="services" maxlength="500"></label>
      <label>Formula<textarea name="formula"></textarea></label><label>Products used<input name="productsUsed" maxlength="1000"></label><label>Notes<textarea name="notes"></textarea></label>
      <button class="btn">Add record</button></form>
    <ul class="list">${p.professional.treatments.map((t) => `<li><strong>${esc(t.performedOn)}</strong> ${esc(t.services || "")}${t.supersedes ? ' <span class="pill">correction</span>' : ""}
      ${t.formula ? `<br>Formula: ${esc(t.formula)}` : ""}${t.productsUsed ? `<br>Products: ${esc(t.productsUsed)}` : ""}${t.notes ? `<br>${esc(t.notes)}` : ""}</li>`).join("")}</ul>
    <h2>Privacy</h2><p class="muted">Consents: ${p.submitted.consents.map((x) => `${esc(x.kind)} v${esc(x.version)} (${esc(fmt(x.recorded_at, { dateStyle: "medium" }))})`).join(", ") || "none"}</p>
    <p><a class="btn ghost" href="/api/admin/clients/${esc(c.id)}/export">Export data (JSON)</a> <button class="btn danger" id="del">Delete client…</button></p><div id="m"></div>`;
  view.querySelector("#note").addEventListener("submit", async (e) => { e.preventDefault(); try { await api(`/api/admin/clients/${c.id}/notes`, { method: "POST", body: Object.fromEntries(new FormData(e.target)) }); client(id); } catch (err) { view.querySelector("#m").innerHTML = errBox(err); } });
  view.querySelector("#tr").addEventListener("submit", async (e) => { e.preventDefault(); try { await api(`/api/admin/clients/${c.id}/treatments`, { method: "POST", body: Object.fromEntries(new FormData(e.target)) }); client(id); } catch (err) { view.querySelector("#m").innerHTML = errBox(err); } });
  view.querySelector("#del").addEventListener("click", async () => {
    const typed = prompt(`This permanently deletes ${c.first_name}'s profile, intake answers and photos. It cannot be undone.\nType the client id to confirm: ${c.id}`);
    if (typed !== c.id) return;
    try { await api(`/api/admin/clients/${c.id}`, { method: "DELETE", body: { confirm: typed } }); location.hash = "#/clients"; } catch (err) { view.querySelector("#m").innerHTML = errBox(err); }
  });
}

async function sandbox() {
  const cat = await api("/api/public/catalog");
  const d0 = localDate();
  view.innerHTML = `<h1>Booking sandbox</h1>
    <p class="note warn"><strong>Sandbox only.</strong> Nothing here touches Goldie or real clients' bookings. Appointments created here are marked "sandbox" and excluded from reports.</p>
    <form id="q" class="inline">
      <label>Services<select name="services" multiple size="4">${cat.services.map((s) => `<option value="${esc(s.id)}">${esc(s.name.en)} · ${money(s.priceCents)} · ${s.durationMin}m</option>`).join("")}</select></label>
      <label>Date<input type="date" name="date" value="${d0}" required></label><label>Days<input type="number" name="days" min="1" max="14" value="7"></label>
      <label>Client id (optional)<input name="clientId" placeholder="cl_…"></label>
      <label><span><input type="checkbox" name="override"> Override eligibility</span></label>
      <button class="btn">Find times</button></form><div id="m"></div><div id="out"></div>`;
  view.querySelector("#q").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const services = [...f.services.selectedOptions].map((o) => o.value);
    const out = view.querySelector("#out"), m = view.querySelector("#m");
    m.innerHTML = "";
    try {
      const r = await api(`/api/admin/sandbox/availability?services=${services.join(",")}&date=${f.date.value}&days=${f.days.value}`);
      out.innerHTML = `<p>${r.plan.serviceMin} min service · chair ${r.plan.chairMin} min · total ${money(r.plan.totalCents)} · deposit ${money(r.plan.depositCents)} · balance ${money(r.plan.balanceCents)}</p>` +
        r.days.map((d) => `<div class="day"><h3>${esc(d.date)}</h3>${d.slots.length ? `<div class="slots">${d.slots.map((s) => `<button class="btn ghost" data-start="${esc(s.start)}">${esc(time(s.start))}</button>`).join("")}</div>` : '<p class="muted">No times.</p>'}</div>`).join("");
      out.querySelectorAll("[data-start]").forEach((b) => b.addEventListener("click", async () => {
        try {
          const a = await api("/api/admin/sandbox/appointments", { method: "POST", body: { serviceIds: services, start: b.dataset.start, clientId: f.clientId.value.trim() || null, override: f.override.checked } });
          m.innerHTML = `<p class="note">Sandbox appointment ${esc(a.id)} booked for ${esc(fmt(a.start))}. It now blocks that time — search again to see.</p>`;
        } catch (err) { m.innerHTML = errBox(err); }
      }));
    } catch (err) { m.innerHTML = errBox(err); }
  });
}

async function marketing() {
  const r = await api("/api/admin/reports/acquisition");
  const tbl = (o) => Object.keys(o).length ? `<table><tbody>${Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">No data yet.</p>`;
  view.innerHTML = `<h1>Marketing</h1><div class="cards"><div class="card"><b>${r.newClients}</b>client profiles</div><div class="card"><b>${r.referrals}</b>referrals</div>
    <div class="card"><b>${r.costPerAcquisition == null ? "—" : money(r.costPerAcquisition)}</b>cost per client (needs ad-spend records)</div></div>
    <div class="grid2"><section><h2>Self-reported source</h2>${tbl(r.byReportedSource)}</section><section><h2>Captured source (UTM / click id / referrer)</h2>${tbl(r.byCapturedSource)}</section></div>
    <h2>By campaign (captured utm_campaign)</h2>${tbl(r.bookingsByCampaign)}
    <h2>Collected revenue by self-reported source</h2>${Object.keys(r.collectedRevenueByReportedSource).length ? tbl(Object.fromEntries(Object.entries(r.collectedRevenueByReportedSource).map(([k, v]) => [k, money(v)]))) : `<p class="muted">No recorded payments yet.</p>`}
    <h2>Repeat booking</h2><p>${r.repeatBooking ? `${r.repeatBooking.repeaters} of ${r.repeatBooking.clientsWithCompleted} clients have 2+ completed appointments.` : `<span class="muted">Needs completed (non-sandbox) appointment records.</span>`}</p>
    <ul class="muted">${r.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>`;
}

async function settings() {
  const s = await api("/api/admin/integrations");
  const g = s.google;
  view.innerHTML = `<h1>Settings</h1>
    <h2>Booking providers</h2><table><tbody>${s.booking.map((b) => `<tr><td>${esc(b.id)}</td><td>${b.live ? '<span class="pill">live</span>' : '<span class="pill sand">sandbox</span>'}</td><td class="muted">${esc(Object.entries(b.capabilities).filter(([, v]) => v).map(([k]) => k).join(", "))}</td></tr>`).join("")}</tbody></table>
    <p class="muted">${esc(s.goldie.note)}</p>
    <h2>Calendar link</h2>
    <p class="muted">Blocks salon time when you're busy. In Google Calendar on a computer: <b>Settings → your calendar → Integrate calendar → Secret address in iCal format</b>. Copy it and paste it here. Only start and end times are kept; event titles and details are never stored. You can reset the address in Google at any time.</p>
    ${s.feeds.map((f) => `<div class="feed">
      <p><b>${esc(f.name)}</b> <span class="muted">· ${esc(f.url_hint)}</span></p>
      <p>${f.last_error ? `<span class="note warn" style="display:block;margin:0">${esc(feedError(f.last_error))}</span>` : f.last_synced_at ? `Synced ${esc(new Date(f.last_synced_at).toLocaleString())} · ${f.last_count} busy times${f.skipped_rules ? ` · <span class="pill warn">${f.skipped_rules} repeating events couldn't be read</span>` : ""}` : "Not synced yet"}</p>
      <div class="feed__row">
        <label>Type <select data-feed="${esc(f.id)}" data-k="kind"><option ${f.kind === "personal" ? "selected" : ""}>personal</option><option ${f.kind === "business" ? "selected" : ""}>business</option></select></label>
        <label><input type="checkbox" data-feed="${esc(f.id)}" data-k="blocks" ${f.blocks_availability ? "checked" : ""}> Blocks salon time</label>
        <button class="btn ghost" type="button" data-remove-feed="${esc(f.id)}">Remove</button>
      </div></div>`).join("")}
    <form id="feedForm" class="stack">
      <label>Name<input name="name" maxlength="80" placeholder="Personal calendar" autocomplete="off"></label>
      <label>Secret address (iCal)<input name="url" type="url" required placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" autocomplete="off" spellcheck="false"></label>
      <p><button class="btn" type="submit">Connect calendar link</button> ${s.feeds.length || g.accounts.length ? '<button class="btn ghost" type="button" id="sync">Sync busy time now</button>' : ""}</p>
    </form>
    <div id="m"></div>
    <h2>Google Calendar (OAuth)</h2>
    ${g.configured ? `<p><a class="btn" href="/api/admin/oauth/google/start">Connect a Google account</a></p>` :
      `<p class="muted">Optional. Not needed if you use a calendar link above. Requires an OAuth client from Google Cloud Console.</p>`}
    ${g.calendars.length ? `<table><thead><tr><th>Calendar</th><th>Type</th><th>Blocks salon time</th></tr></thead><tbody>${g.calendars.map((c) => `<tr><td>${esc(c.name)}</td>
      <td><select data-cal="${esc(c.id)}" data-k="kind"><option ${c.kind === "personal" ? "selected" : ""}>personal</option><option ${c.kind === "business" ? "selected" : ""}>business</option></select></td>
      <td><input type="checkbox" data-cal="${esc(c.id)}" data-k="blocks" ${c.blocks_availability ? "checked" : ""}></td></tr>`).join("")}</tbody></table>` : ""}`;
  const msg = (html) => { view.querySelector("#m").innerHTML = html; };
  view.querySelectorAll("[data-cal]").forEach((i) => i.addEventListener("change", () => api(`/api/admin/calendars/${i.dataset.cal}`, { method: "POST", body: i.dataset.k === "kind" ? { kind: i.value } : { blocksAvailability: i.checked } })));
  view.querySelectorAll("[data-feed]").forEach((i) => i.addEventListener("change", () => api(`/api/admin/calendar-feeds/${i.dataset.feed}`, { method: "POST", body: i.dataset.k === "kind" ? { kind: i.value } : { blocksAvailability: i.checked } })));
  view.querySelectorAll("[data-remove-feed]").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm("Remove this calendar link? Its busy times will no longer block salon time.")) return;
    try { await api(`/api/admin/calendar-feeds/${b.dataset.removeFeed}`, { method: "DELETE" }); await settings(); } catch (e) { msg(errBox(e)); }
  }));
  view.querySelector("#feedForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const f = ev.currentTarget, btn = f.querySelector("[type=submit]");
    btn.disabled = true; msg(`<p class="note">Checking the link…</p>`);
    try {
      const r = await api("/api/admin/calendar-feeds", { method: "POST", body: { name: f.name.value, url: f.url.value } });
      await settings();
      msg(r.error ? `<p class="note warn">Saved, but the first sync failed: ${esc(feedError(r.error))}</p>` : `<p class="note">Connected. ${r.busyBlocks} busy times in the next 60 days.</p>`);
    } catch (e) { btn.disabled = false; msg(`<p class="note warn">${esc(feedError(e.message))}</p>`); }
  });
  view.querySelector("#sync")?.addEventListener("click", async () => {
    try { const r = await api("/api/admin/calendar/sync", { method: "POST" }); await settings(); msg(`<p class="note">Synced ${r.busyBlocks} busy times.</p>`); } catch (e) { msg(errBox(e)); }
  });
}

function feedError(code) {
  return ({
    invalid_calendar_url: "That doesn't look like a calendar link.",
    calendar_url_must_be_https: "The link must start with https:// (or webcal://).",
    calendar_link_not_found_or_reset: "The link no longer works. It may have been reset in Google. Paste the new secret address.",
    calendar_fetch_failed: "Couldn't reach the calendar. Try again in a minute.",
    calendar_too_large: "That calendar is too large to read.",
    not_an_ical_calendar: "That link isn't an iCal calendar. Use the \"Secret address in iCal format\".",
  })[code] || code;
}

// ───────── Router ─────────
async function route() {
  const h = location.hash.replace(/^#/, "") || "/";
  const path = h.split("?")[0];
  if (path === "/login") return login();
  try {
    await api("/api/admin/me");
  } catch { return; }
  nav.hidden = false;
  nav.querySelectorAll("a").forEach((a) => a.setAttribute("aria-current", a.getAttribute("href") === `#${path}` || (path.startsWith("/clients/") && a.getAttribute("href") === "#/clients") ? "page" : "false"));
  try {
    if (path === "/") await today();
    else if (path === "/calendar") await calendar();
    else if (path === "/intakes") await intakes();
    else if (path === "/clients") await clients();
    else if (path.startsWith("/clients/")) await client(decodeURIComponent(path.slice(9)));
    else if (path === "/sandbox") await sandbox();
    else if (path === "/marketing") await marketing();
    else if (path === "/settings") await settings();
    else view.innerHTML = "<h1>Not found</h1>";
  } catch (e) { if (e.message !== "unauthorized") view.innerHTML = errBox(e); }
  view.focus({ preventScroll: true });
}
document.getElementById("logout").addEventListener("click", async () => { await api("/api/admin/logout", { method: "POST" }).catch(() => {}); location.hash = "#/login"; });
addEventListener("hashchange", route);
route();
