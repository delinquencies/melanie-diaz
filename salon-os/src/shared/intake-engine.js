// Configurable intake engine. Pure JS (no Node APIs) — used by the server AND the browser form,
// so conditional logic and validation can never disagree.

export const FIELD_TYPES = new Set(["text", "textarea", "email", "tel", "select", "radio", "checkbox", "multiselect", "photo"]);

/** Throws if a form definition is malformed. Run at startup and in tests. */
export function validateDefinition(def) {
  const problems = [];
  if (!def || typeof def.id !== "string") problems.push("form id missing");
  if (!Number.isInteger(def?.version) || def.version < 1) problems.push("version must be a positive integer");
  const ids = new Set();
  for (const s of def?.sections || []) {
    if (!s.id) problems.push("section without id");
    for (const f of s.fields || []) {
      if (!f.id || ids.has(f.id)) problems.push(`duplicate/missing field id: ${f.id}`);
      ids.add(f.id);
      if (!FIELD_TYPES.has(f.type)) problems.push(`field ${f.id}: unknown type ${f.type}`);
      if (["select", "radio", "multiselect"].includes(f.type) && !(f.options || []).length) problems.push(`field ${f.id}: options required`);
    }
  }
  for (const s of def?.sections || []) for (const f of s.fields || []) {
    if (f.showIf && !ids.has(f.showIf.field)) problems.push(`field ${f.id}: showIf refers to unknown field ${f.showIf.field}`);
  }
  if (problems.length) throw new Error("Invalid form definition: " + problems.join("; "));
  return true;
}

/** Sections that apply to the selected service (by intake tags), and to the client type. */
export function sectionsFor(def, { intakeTags = [], clientType = "new" } = {}) {
  return def.sections.filter((s) => {
    if (s.clientTypes && !s.clientTypes.includes(clientType)) return false;
    if (!s.appliesTo || s.appliesTo === "all") return true;
    return s.appliesTo.some((t) => intakeTags.includes(t));
  });
}

export function isVisible(field, answers) {
  const c = field.showIf;
  if (!c) return true;
  const v = answers[c.field];
  if ("equals" in c) return v === c.equals;
  if ("in" in c) return Array.isArray(v) ? v.some((x) => c.in.includes(x)) : c.in.includes(v);
  if ("includes" in c) return Array.isArray(v) && v.includes(c.includes);
  if (c.notEmpty) return v != null && v !== "" && !(Array.isArray(v) && !v.length);
  return true;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[\d\s().-]{10,20}$/;

/**
 * Validate answers against the applicable sections.
 * Returns { ok, errors: {fieldId: code}, clean: {fieldId: value}, sensitiveFields: [] }.
 * Hidden and unknown fields are DROPPED (only collect what the service needs).
 * Photo fields are validated by count here; bytes are checked server-side.
 */
export function validateAnswers(def, ctx, answers = {}, photoCounts = {}) {
  const errors = {};
  const clean = {};
  const sensitiveFields = [];
  for (const section of sectionsFor(def, ctx)) {
    for (const f of section.fields) {
      if (!isVisible(f, { ...answers, ...clean })) continue;
      if (f.type === "photo") {
        const n = photoCounts[f.id] || 0;
        if (f.required && n === 0) errors[f.id] = "required";
        if (n > (f.maxFiles || 3)) errors[f.id] = "too_many_files";
        continue;
      }
      let v = answers[f.id];
      if (typeof v === "string") v = v.trim();
      const empty = v == null || v === "" || v === false || (Array.isArray(v) && v.length === 0);
      if (empty) {
        if (f.required) errors[f.id] = "required";
        continue;
      }
      const opts = (f.options || []).map((o) => o.value);
      switch (f.type) {
        case "text": case "textarea":
          if (typeof v !== "string") { errors[f.id] = "invalid"; break; }
          if (v.length > (f.maxLength || (f.type === "text" ? 200 : 2000))) { errors[f.id] = "too_long"; break; }
          clean[f.id] = v; break;
        case "email":
          if (typeof v !== "string" || !EMAIL.test(v) || v.length > 254) { errors[f.id] = "invalid_email"; break; }
          clean[f.id] = v.toLowerCase(); break;
        case "tel":
          if (typeof v !== "string" || !PHONE.test(v)) { errors[f.id] = "invalid_phone"; break; }
          clean[f.id] = v; break;
        case "select": case "radio":
          if (!opts.includes(v)) { errors[f.id] = "invalid_option"; break; }
          clean[f.id] = v; break;
        case "multiselect": {
          const arr = Array.isArray(v) ? v : [v];
          if (!arr.every((x) => opts.includes(x))) { errors[f.id] = "invalid_option"; break; }
          clean[f.id] = [...new Set(arr)]; break;
        }
        case "checkbox":
          if (v !== true && v !== "true" && v !== "on") { errors[f.id] = "invalid"; break; }
          clean[f.id] = true; break;
      }
      if (f.id in clean && f.sensitive) sensitiveFields.push(f.id);
    }
  }
  // Fields that depend on a field which ended up hidden are already skipped above.
  return { ok: Object.keys(errors).length === 0, errors, clean, sensitiveFields };
}

/** All field definitions by id (for rendering answers in the dashboard). */
export function fieldIndex(def) {
  const out = {};
  for (const s of def.sections) for (const f of s.fields) out[f.id] = { ...f, section: s.id };
  return out;
}
