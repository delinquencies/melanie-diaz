import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateDefinition, sectionsFor, isVisible, validateAnswers } from "../src/shared/intake-engine.js";

const form = JSON.parse(readFileSync(new URL("../config/forms/intake.v1.json", import.meta.url)));

test("shipped intake form definition is valid", () => {
  assert.equal(validateDefinition(form), true);
});

test("malformed definitions are rejected", () => {
  assert.throws(() => validateDefinition({ id: "x", version: 1, sections: [{ id: "s", fields: [{ id: "a", type: "nope" }] }] }), /unknown type/);
  assert.throws(() => validateDefinition({ id: "x", version: 1, sections: [{ id: "s", fields: [{ id: "a", type: "text", showIf: { field: "zzz", equals: 1 } }] }] }), /unknown field/);
});

test("sections depend on service tags and client type", () => {
  const curlyNew = sectionsFor(form, { intakeTags: ["curly"], clientType: "new" }).map((s) => s.id);
  assert.ok(curlyNew.includes("curly") && curlyNew.includes("discovery") && !curlyNew.includes("silk") && !curlyNew.includes("returning"));
  const silkReturning = sectionsFor(form, { intakeTags: ["silk-press"], clientType: "returning" }).map((s) => s.id);
  assert.ok(silkReturning.includes("returning") && !silkReturning.includes("discovery") && !silkReturning.includes("silk"));
});

test("conditional fields: referral name only when referral chosen", () => {
  const f = form.sections.find((s) => s.id === "discovery").fields.find((x) => x.id === "referrer_name");
  assert.equal(isVisible(f, { heard_about: "referral" }), true);
  assert.equal(isVisible(f, { heard_about: "instagram" }), false);
});

test("hidden and unknown answers are dropped; required enforced; sensitive tracked", () => {
  const ctx = { intakeTags: ["curly"], clientType: "new" };
  const base = { first_name: "A", email: "a@b.co", phone: "2815550100", heard_about: "instagram", goals: "x", has_sensitivities: "no" };
  const r = validateAnswers(form, ctx, { ...base, referrer_name: "Should drop", injected: "nope", sensitivity_details: "hidden" });
  assert.equal(r.ok, true);
  assert.equal(r.clean.referrer_name, undefined);
  assert.equal(r.clean.injected, undefined);
  assert.equal(r.clean.sensitivity_details, undefined);

  const r2 = validateAnswers(form, ctx, { ...base, has_sensitivities: "yes" });
  assert.equal(r2.errors.sensitivity_details, "required");
  const r3 = validateAnswers(form, ctx, { ...base, has_sensitivities: "yes", sensitivity_details: "Coconut oil" });
  assert.deepEqual(r3.sensitiveFields, ["sensitivity_details"]);
});

test("invalid values rejected", () => {
  const ctx = { intakeTags: [], clientType: "new" };
  const r = validateAnswers(form, ctx, { first_name: "A", email: "bad", phone: "12", heard_about: "tiktok", goals: "x", has_sensitivities: "no" });
  assert.equal(r.errors.email, "invalid_email");
  assert.equal(r.errors.phone, "invalid_phone");
  assert.equal(r.errors.heard_about, "invalid_option");
});

test("photo counts limited by field config", () => {
  const ctx = { intakeTags: [], clientType: "new" };
  const ok = { first_name: "A", email: "a@b.co", phone: "2815550100", heard_about: "other", goals: "x", has_sensitivities: "no" };
  assert.equal(validateAnswers(form, ctx, ok, { photos_current: 4 }).errors.photos_current, "too_many_files");
});
