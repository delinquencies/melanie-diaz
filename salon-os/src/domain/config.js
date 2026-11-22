// Loads and validates configuration (catalog, schedule, versioned intake forms).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { validateDefinition } from "../shared/intake-engine.js";

export function loadConfig(dir) {
  const catalog = JSON.parse(readFileSync(join(dir, "catalog.json"), "utf8"));
  const schedule = JSON.parse(readFileSync(join(dir, "schedule.json"), "utf8"));
  const forms = {};
  for (const file of readdirSync(join(dir, "forms")).filter((f) => f.endsWith(".json"))) {
    const def = JSON.parse(readFileSync(join(dir, "forms", file), "utf8"));
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
