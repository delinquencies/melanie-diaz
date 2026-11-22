// Pure availability calculation (no I/O) — DST-safe via wall-clock → UTC conversion per day.
import { zonedToUtc, utcToZoned, addDays, weekdayOf, overlaps } from "../lib/time.js";

/**
 * @param o.schedule      { timezone, hours:{tue:["11:00","17:00"],…}, slotIntervalMin, minNoticeHours, horizonDays }
 * @param o.dateFrom      local date "YYYY-MM-DD" (salon timezone)
 * @param o.days          number of days to compute
 * @param o.serviceMin    client-facing service minutes (must finish by closing)
 * @param o.chairMin      minutes the chair is occupied (service + processing + buffer); must not overlap busy time
 * @param o.busy          [{start: Date, end: Date}] appointments, calendar busy, vacations, breaks, blocks
 * @param o.extraOpen     [{start: Date, end: Date}] one-off extra availability windows
 * @param o.now           Date
 * @returns [{ date, slots: [{ start: ISO, end: ISO, chairEnd: ISO }] }]
 */
export function computeSlots(o) {
  const { schedule, serviceMin, chairMin = serviceMin, busy = [], extraOpen = [], now } = o;
  const tz = schedule.timezone;
  const step = (schedule.slotIntervalMin || 30) * 60000;
  const earliest = now.getTime() + (schedule.minNoticeHours || 0) * 3600000;
  const today = utcToZoned(now, tz).date;
  const lastDay = addDays(today, schedule.horizonDays ?? 365);
  const busyMs = busy.map((b) => [b.start.getTime(), b.end.getTime()]).sort((a, b) => a[0] - b[0]);
  const out = [];

  for (let i = 0; i < o.days; i++) {
    const date = addDays(o.dateFrom, i);
    if (date < today || date > lastDay) { out.push({ date, slots: [] }); continue; }
    const windows = [];
    const hrs = schedule.hours[weekdayOf(date)];
    if (hrs) windows.push([zonedToUtc(date, hrs[0], tz).getTime(), zonedToUtc(date, hrs[1], tz).getTime()]);
    const dayStart = zonedToUtc(date, "00:00", tz).getTime();
    const dayEnd = zonedToUtc(addDays(date, 1), "00:00", tz).getTime();
    for (const x of extraOpen) {
      const s = Math.max(x.start.getTime(), dayStart), e = Math.min(x.end.getTime(), dayEnd);
      if (s < e) windows.push([s, e]);
    }
    const seen = new Set();
    const slots = [];
    for (const [open, close] of windows) {
      for (let t = open; t + serviceMin * 60000 <= close; t += step) {
        if (t < earliest || seen.has(t)) continue;
        const chairEnd = t + chairMin * 60000;
        if (busyMs.some(([bs, be]) => overlaps(t, chairEnd, bs, be))) continue;
        seen.add(t);
        slots.push({ start: new Date(t).toISOString(), end: new Date(t + serviceMin * 60000).toISOString(), chairEnd: new Date(chairEnd).toISOString() });
      }
    }
    slots.sort((a, b) => a.start.localeCompare(b.start));
    out.push({ date, slots });
  }
  return out;
}
