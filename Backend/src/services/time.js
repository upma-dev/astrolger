// Timezone helpers built on the ICU timezone database bundled with Node, so historical offsets are respected
// (for example India used +06:30 during 1942-45, and many countries change offsets for daylight saving).

export const DEFAULT_TZ = 'Asia/Kolkata';

export function isValidTz(tz) {
  if (typeof tz !== 'string' || !tz) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

const fmtCache = new Map();
function partsIn(tz, date) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    fmtCache.set(tz, f);
  }
  const o = {};
  for (const p of f.formatToParts(date)) if (p.type !== 'literal') o[p.type] = +p.value;
  return o;
}

// Offset of `tz` from UTC, in minutes, at the given instant.
export function tzOffsetMinutes(tz, date) {
  const p = partsIn(tz, date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

export function isValidLocalDateTime(dateStr, timeStr = '12:00') {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || '').trim());
  const tm = /^(\d{1,2}):(\d{2})$/.exec(String(timeStr ?? '12:00').trim() || '12:00');
  if (!dm || !tm) return false;
  const y = Number(dm[1]), m = Number(dm[2]), d = Number(dm[3]);
  const hh = Number(tm[1]), mm = Number(tm[2]);
  if (y < 100 || m < 1 || m > 12 || d < 1 || d > 31 || hh < 0 || hh > 23 || mm < 0 || mm > 59) return false;
  const check = new Date(Date.UTC(y, m - 1, d));
  return check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d;
}

// Wall-clock date + time at a place -> exact UTC instant. `tz` is an IANA name or a fixed offset in hours.
export function localToUtc(dateStr, timeStr = '12:00', tz = DEFAULT_TZ) {
  if (!isValidLocalDateTime(dateStr, timeStr)) throw Object.assign(new Error('Invalid date or time'), { status: 400 });
  const [y, m, d] = String(dateStr).trim().split('-').map(Number);
  const [hh = 12, mm = 0] = String(timeStr || '12:00').trim().split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  if (typeof tz === 'number') return new Date(wall - tz * 3600e3);
  const zone = isValidTz(tz) ? tz : DEFAULT_TZ;
  // Two passes settle the offset correctly around DST transitions.
  let guess = wall - tzOffsetMinutes(zone, new Date(wall)) * 60e3;
  guess = wall - tzOffsetMinutes(zone, new Date(guess)) * 60e3;
  return new Date(guess);
}

// UTC instant -> "HH:MM" wall clock at a place.
export function hhmmIn(tz, date) {
  const p = partsIn(isValidTz(tz) ? tz : DEFAULT_TZ, date);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

// Today's calendar date ("YYYY-MM-DD") at a place.
export function todayIn(tz) {
  const p = partsIn(isValidTz(tz) ? tz : DEFAULT_TZ, new Date());
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}
