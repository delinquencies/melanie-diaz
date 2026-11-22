// Timezone math without dependencies (Intl). Salon timezone: America/Chicago.
export const SALON_TZ = "America/Chicago";

const fmtCache = new Map();
function partsIn(tz, date) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short",
    });
    fmtCache.set(tz, f);
  }
  const o = {};
  for (const p of f.formatToParts(date)) o[p.type] = p.value;
  return o;
}

/** Offset (minutes) of tz from UTC at a given instant. Chicago: -360 (CST) or -300 (CDT). */
export function offsetMinutes(tz, date) {
  const p = partsIn(tz, date);
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}

/** Local wall time ("YYYY-MM-DD", "HH:MM") in tz → UTC Date. Nonexistent (spring-forward) times roll forward. */
export function zonedToUtc(dateStr, timeStr, tz = SALON_TZ) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let off = offsetMinutes(tz, new Date(guess));
  let utc = guess - off * 60000;
  const off2 = offsetMinutes(tz, new Date(utc));
  if (off2 !== off) utc = guess - off2 * 60000;
  return new Date(utc);
}

/** UTC Date → { date: "YYYY-MM-DD", time: "HH:MM", weekday: "tue" } in tz. */
export function utcToZoned(date, tz = SALON_TZ) {
  const p = partsIn(tz, date);
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, weekday: p.weekday.toLowerCase().slice(0, 3) };
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function weekdayOf(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export const iso = (d) => new Date(d).toISOString();
export const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;
