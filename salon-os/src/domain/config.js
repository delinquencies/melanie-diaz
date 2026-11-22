// Builds and validates configuration (catalog, schedule, versioned intake forms).
// Runtime-neutral: callers pass parsed JSON (Node reads files; the Worker bundles JSON imports).
import { validateDefinition } from "../../public/shared/intake-engine.js";

export function buildConfig({ catalog, schedule, forms: formList }) {
  const forms = {};
  for (const def of formList) {
    validateDefinition(def);
    (forms[def.id] ||= {})[def.version] = def;
  }
  const ids = new Set();
  for (const s of catalog.services) {
    if (ids.has(s.id)) throw new Error(`Duplicate service id ${s.id}`);
    ids.add(s.id);
    if (!Number.isInteger(s.priceCents) || !Number.isInteger(s.durationMin)) throw new Error(`Service ${s.id}: price/duration must be integers`);
  }
  return {
    catalog,
    schedule,
    forms,
    service: (id) => catalog.services.find((s) => s.id === id) || null,
    latestForm(id) {
      const versions = forms[id];
      if (!versions) return null;
      return versions[Math.max(...Object.keys(versions).map(Number))];
    },
    form: (id, version) => forms[id]?.[version] || null,
    goldieUrl(service) {
      return service?.goldieId ? `${catalog.goldieBookingUrl}/checkout?serviceIds=${service.goldieId}` : catalog.goldieBookingUrl;
    },
  };
}
