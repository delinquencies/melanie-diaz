import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSlots } from "../src/domain/availability.js";

const schedule = {
  timezone: "America/Chicago",
  hours: { sun: null, mon: null, tue: ["11:00", "17:00"], wed: ["11:00", "17:00"], thu: ["11:00", "17:00"], fri: ["11:00", "17:05"], sat: ["10:00", "17:00"] },
  slotIntervalMin: 30, minNoticeHours: 0, horizonDays: 365,
};
const now = new Date("2026-11-22T16:00:00Z"); // Sun 10:00 CST
const local = (iso) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

test("closed days have no slots; Tuesday matches Goldie (80-min silk press → last 3:30 PM)", () => {
  const days = computeSlots({ schedule, dateFrom: "2026-11-23", days: 2, serviceMin: 80, now });
  assert.equal(days[0].slots.length, 0); // Monday closed
  const tue = days[1].slots.map((s) => local(s.start));
  assert.equal(tue[0], "11:00");
  assert.equal(tue.at(-1), "15:30");
  assert.equal(tue.length, 10);
});

test("busy time and buffer (chair time) remove overlapping starts", () => {
  const busy = [{ start: new Date("2026-11-24T19:00:00Z"), end: new Date("2026-11-24T20:00:00Z") }]; // 13:00–14:00 CST
  const tue = computeSlots({ schedule, dateFrom: "2026-11-24", days: 1, serviceMin: 60, chairMin: 75, busy, now })[0].slots.map((s) => local(s.start));
  assert.ok(!tue.includes("13:00") && !tue.includes("12:00") && !tue.includes("13:30"));
  assert.ok(tue.includes("11:30") && tue.includes("14:00"));
});

test("minimum notice and horizon", () => {
  const s = { ...schedule, minNoticeHours: 50, horizonDays: 3 };
  const days = computeSlots({ schedule: s, dateFrom: "2026-11-24", days: 3, serviceMin: 60, now });
  assert.equal(local(days[0].slots[0].start), "12:00"); // Sun 10:00 + 50 h = Tue 12:00
  assert.equal(days[2].slots.length, 0);                // Thu beyond 3-day horizon
});

test("extra opening on a closed day", () => {
  const extraOpen = [{ start: new Date("2026-11-23T16:00:00Z"), end: new Date("2026-11-23T18:00:00Z") }]; // Mon 10–12 CST
  const mon = computeSlots({ schedule, dateFrom: "2026-11-23", days: 1, serviceMin: 60, extraOpen, now })[0].slots.map((s) => local(s.start));
  assert.deepEqual(mon, ["10:00", "10:30", "11:00"]);
});

test("DST: Tuesday after spring-forward still starts at 11:00 local", () => {
  const n = new Date("2027-03-10T12:00:00Z");
  const before = computeSlots({ schedule, dateFrom: "2027-03-13", days: 1, serviceMin: 60, now: n })[0].slots;
  const after = computeSlots({ schedule, dateFrom: "2027-03-16", days: 1, serviceMin: 60, now: n })[0].slots;
  assert.equal(local(before[0].start), "10:00"); // Saturday hours
  assert.equal(before[0].start, "2027-03-13T16:00:00.000Z"); // CST
  assert.equal(local(after[0].start), "11:00");
  assert.equal(after[0].start, "2027-03-16T16:00:00.000Z"); // CDT
});
