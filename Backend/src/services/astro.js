// Vedic astrology engine (sidereal zodiac, Lahiri ayanamsa, whole-sign houses).
// Planet, Sun and Moon positions come from astronomy-engine (VSOP87 / ELP-based, accurate to well under an arcminute),
// birth times are converted with the birthplace's real timezone, and sunrise/sunset are computed for the location.
import * as A from 'astronomy-engine';
import { DEFAULT_TZ, hhmmIn, localToUtc } from './time.js';

export const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
export const NAKSHATRAS = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const SIGN_LORD = ['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
const DASHA_ORDER = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
const DASHA_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };

const rad = (d) => (d * Math.PI) / 180;
const norm = (d) => ((d % 360) + 360) % 360;
const DELHI = { lat: 28.6139, lon: 77.209, tz: DEFAULT_TZ };

// Lahiri (Chitrapaksha) ayanamsa: 23°15'00.658" at 1956-03-21 0h TT (Indian Calendar Reform Committee),
// carried forward with the IAU 2006 general precession in longitude.
const precessionArcsec = (T) => 5028.796195 * T + 1.1054348 * T * T + 0.00007964 * T * T * T;
const T0_LAHIRI = (2435553.5 - 2451545.0) / 36525;
export const ayanamsa = (time) => {
  const T = time.tt / 36525;
  return 23.250182778 + (precessionArcsec(T) - precessionArcsec(T0_LAHIRI)) / 3600;
};

const BODIES = { Mercury: A.Body.Mercury, Venus: A.Body.Venus, Mars: A.Body.Mars, Jupiter: A.Body.Jupiter, Saturn: A.Body.Saturn };

// Apparent geocentric longitudes on the true ecliptic of date (tropical).
function tropical(time) {
  const out = { Sun: A.SunPosition(time).elon, Moon: A.EclipticGeoMoon(time).lon };
  for (const [name, body] of Object.entries(BODIES)) out[name] = A.Ecliptic(A.GeoVector(body, time, true)).elon;
  // Mean lunar node (Meeus 47.7), the convention most Indian panchangs use for Rahu/Ketu.
  const T = time.tt / 36525;
  out.Rahu = norm(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441);
  out.Ketu = norm(out.Rahu + 180);
  return out;
}

export function planetPositions(date) {
  const time = A.MakeTime(date);
  const ay = ayanamsa(time);
  const trop = tropical(time);
  const res = {};
  for (const [k, v] of Object.entries(trop)) res[k] = norm(v - ay);
  return { positions: res, ayanamsa: ay, time };
}

// Tropical ascendant from local apparent sidereal time.
function ascendant(time, lat, lon) {
  const T = time.tt / 36525;
  const lst = norm(A.SiderealTime(time) * 15 + lon);
  const eps = rad(23.43929111 - (46.815 * T + 0.00059 * T * T - 0.001813 * T * T * T) / 3600);
  const phi = rad(lat);
  const asc = Math.atan2(Math.cos(rad(lst)), -(Math.sin(rad(lst)) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)));
  return norm((asc * 180) / Math.PI);
}

export const signOf = (lon) => Math.floor(lon / 30);
export const nakshatraOf = (lon) => Math.floor(lon / (360 / 27));

export function buildKundli({ dob, tob = '12:00', lat = DELHI.lat, lon = DELHI.lon, tz = DELHI.tz }) {
  if (!Number.isFinite(lat) || Math.abs(lat) > 90) lat = DELHI.lat;
  if (!Number.isFinite(lon) || Math.abs(lon) > 180) lon = DELHI.lon;
  const utc = localToUtc(dob, tob || '12:00', tz || DELHI.tz);
  const { positions, ayanamsa: ay, time } = planetPositions(utc);
  const ascLon = norm(ascendant(time, lat, lon) - ay);
  const lagna = signOf(ascLon);
  const planets = Object.entries(positions).map(([name, lonDeg]) => {
    const s = signOf(lonDeg);
    return {
      name, longitude: +lonDeg.toFixed(2), sign: SIGNS[s], signIndex: s, degree: +(lonDeg % 30).toFixed(2),
      house: ((s - lagna + 12) % 12) + 1, nakshatra: NAKSHATRAS[nakshatraOf(lonDeg)],
      pada: Math.floor(((lonDeg % (360 / 27)) / (360 / 27)) * 4) + 1,
    };
  });
  const houses = Array.from({ length: 12 }, (_, i) => {
    const s = (lagna + i) % 12;
    return { house: i + 1, sign: SIGNS[s], signIndex: s, lord: SIGN_LORD[s], planets: planets.filter((p) => p.signIndex === s).map((p) => p.name) };
  });
  const moon = positions.Moon;
  const kundli = {
    ascendant: { sign: SIGNS[lagna], signIndex: lagna, degree: +(ascLon % 30).toFixed(2) },
    rashi: SIGNS[signOf(moon)], rashiIndex: signOf(moon),
    nakshatra: NAKSHATRAS[nakshatraOf(moon)], nakshatraIndex: nakshatraOf(moon),
    sunSign: SIGNS[signOf(positions.Sun)],
    ayanamsa: +ay.toFixed(3), planets, houses,
    dasha: vimshottari(moon, utc),
    birthUtc: utc.toISOString(),
  };
  kundli.doshas = doshas(kundli);
  return kundli;
}

// Moon sign (rashi) and related facts for a person. When the birth time is unknown the Moon may change sign
// during that day, so we report every rashi it occupies between 00:00 and 23:59 local time.
export function birthSummary({ dob, tob, lat, lon, tz }) {
  const timeKnown = /^\d{1,2}:\d{2}$/.test(tob || '');
  const k = buildKundli({ dob, tob: timeKnown ? tob : '12:00', lat, lon, tz });
  const out = { rashi: k.rashi, rashiIndex: k.rashiIndex, nakshatra: k.nakshatra, sunSign: k.sunSign, timeKnown, rashiCertain: true, possibleRashis: [k.rashi] };
  if (timeKnown) out.lagna = k.ascendant.sign;
  else {
    const start = buildKundli({ dob, tob: '00:00', lat, lon, tz }).rashi;
    const end = buildKundli({ dob, tob: '23:59', lat, lon, tz }).rashi;
    out.possibleRashis = [...new Set([start, end])];
    out.rashiCertain = out.possibleRashis.length === 1;
    if (!out.rashiCertain) out.nakshatra = null;
  }
  return out;
}

function vimshottari(moonLon, birth) {
  const nak = nakshatraOf(moonLon);
  const frac = (moonLon % (360 / 27)) / (360 / 27);
  const idx = nak % 9;
  let start = new Date(birth);
  const out = [];
  for (let i = 0; i < 9; i++) {
    const lord = DASHA_ORDER[(idx + i) % 9];
    const yrs = DASHA_YEARS[lord] * (i === 0 ? 1 - frac : 1);
    const end = new Date(start.getTime() + yrs * 365.25 * 864e5);
    out.push({ lord, from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10), years: +yrs.toFixed(2) });
    start = end;
  }
  return out;
}

function doshas(k) {
  const mars = k.planets.find((p) => p.name === 'Mars');
  const mangal = [1, 2, 4, 7, 8, 12].includes(mars.house);
  const rahu = k.planets.find((p) => p.name === 'Rahu');
  const ketu = k.planets.find((p) => p.name === 'Ketu');
  const others = k.planets.filter((p) => !['Rahu', 'Ketu'].includes(p.name));
  const between = (lon) => (rahu.longitude < ketu.longitude ? lon > rahu.longitude && lon < ketu.longitude : lon > rahu.longitude || lon < ketu.longitude);
  const kaal = others.every((p) => between(p.longitude)) || others.every((p) => !between(p.longitude));
  const sat = k.planets.find((p) => p.name === 'Saturn');
  const sade = [11, 0, 1].includes((sat.signIndex - k.rashiIndex + 12) % 12);
  return [
    { name: 'Mangal Dosha', present: mangal, detail: mangal ? `Mars is placed in house ${mars.house} from the Lagna.` : 'Mars is not in a sensitive house.', remedy: 'Chant Hanuman Chalisa on Tuesdays; consider a Mangal shanti puja.' },
    { name: 'Kaal Sarp Dosha', present: kaal, detail: kaal ? 'All planets lie on one side of the Rahu-Ketu axis.' : 'Planets are spread across the Rahu-Ketu axis.', remedy: 'Nag Panchami puja and Maha Mrityunjaya japa are traditionally advised.' },
    { name: 'Sade Sati (Shani)', present: sade, detail: sade ? 'Saturn is in or adjacent to your Moon sign (per birth positions).' : 'Not indicated.', remedy: 'Donate sesame / black cloth on Saturdays; recite Shani stotra.' },
  ];
}

// ---------- Ashtakoota (Kundli Milan, 36 points) - simplified tables ----------
const VARNA = [1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0];
const VASHYA = [0, 0, 1, 2, 3, 1, 1, 4, 1, 2, 1, 2];
const GANA = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0];
const NADI = [0, 1, 2, 2, 1, 0, 0, 1, 2, 0, 1, 2, 2, 1, 0, 0, 1, 2, 0, 1, 2, 2, 1, 0, 0, 1, 2];
const YONI = [0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1];
const FRIENDS = { Sun: ['Moon', 'Mars', 'Jupiter'], Moon: ['Sun', 'Mercury'], Mars: ['Sun', 'Moon', 'Jupiter'], Mercury: ['Sun', 'Venus'], Jupiter: ['Sun', 'Moon', 'Mars'], Venus: ['Mercury', 'Saturn'], Saturn: ['Mercury', 'Venus'] };

export function matchKundli(boy, girl) {
  const b = { sign: boy.rashiIndex, nak: boy.nakshatraIndex };
  const g = { sign: girl.rashiIndex, nak: girl.nakshatraIndex };
  const varna = VARNA[b.sign] <= VARNA[g.sign] ? 1 : 0;
  const vashya = VASHYA[b.sign] === VASHYA[g.sign] ? 2 : 1;
  const tara = ((g.nak - b.nak + 27) % 27) % 9 % 2 === 0 ? 3 : 1.5;
  const yoni = YONI[b.nak] === YONI[g.nak] ? 4 : Math.abs(YONI[b.nak] - YONI[g.nak]) <= 2 ? 3 : 2;
  const lb = SIGN_LORD[b.sign], lg = SIGN_LORD[g.sign];
  const f1 = FRIENDS[lb]?.includes(lg), f2 = FRIENDS[lg]?.includes(lb);
  const maitri = lb === lg || (f1 && f2) ? 5 : f1 || f2 ? 3 : 0.5;
  const gb = GANA[b.nak], gg = GANA[g.nak];
  const gana = gb === gg ? 6 : gb + gg === 1 ? 5 : gb === 2 || gg === 2 ? 0 : 3;
  const rel = (g.sign - b.sign + 12) % 12;
  const bhakoot = [1, 4, 5, 6, 7, 8, 11].includes(rel) && rel !== 0 ? (rel === 6 || rel === 7 || rel === 1 || rel === 11 || rel === 4 || rel === 8 ? 0 : 7) : 7;
  const nadi = NADI[b.nak] === NADI[g.nak] ? 0 : 8;
  const parts = [
    { name: 'Varna', max: 1, score: varna }, { name: 'Vashya', max: 2, score: vashya }, { name: 'Tara', max: 3, score: tara },
    { name: 'Yoni', max: 4, score: yoni }, { name: 'Graha Maitri', max: 5, score: maitri }, { name: 'Gana', max: 6, score: gana },
    { name: 'Bhakoot', max: 7, score: bhakoot }, { name: 'Nadi', max: 8, score: nadi },
  ];
  const total = +parts.reduce((s, p) => s + p.score, 0).toFixed(1);
  const verdict = total >= 28 ? 'Excellent match' : total >= 21 ? 'Good match' : total >= 18 ? 'Average match - acceptable with remedies' : 'Below the recommended 18 points';
  return { parts, total, max: 36, verdict };
}

// ---------- Horoscope text (deterministic by sign/period/date) ----------
const THEMES = {
  love: ['Warm conversations deepen a bond today.', 'Patience with a loved one pays off.', 'A pleasant surprise comes from someone close.', 'Avoid assumptions; ask openly.'],
  career: ['A postponed task finally clicks into place.', 'Collaboration brings recognition.', 'Stay focused - distractions are costly today.', 'A new opportunity may quietly appear.'],
  health: ['Light exercise lifts your energy.', 'Hydrate and rest; do not overcommit.', 'Good day to start a healthy habit.', 'Mind your posture and sleep.'],
  money: ['Spend wisely; a bargain is not always a saving.', 'Unexpected income is possible.', 'Review subscriptions and small leaks.', 'A good time for long-term planning.'],
};
const COLORS = ['Red', 'Blue', 'Green', 'Yellow', 'White', 'Orange', 'Violet', 'Pink'];
function rng(s) {
  let h = 2166136261;
  for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h ^= h >>> 13; return (h >>> 0) / 4294967296; };
}

export function generateHoroscope(sign, period, dateKey) {
  const r = rng(`${sign}-${period}-${dateKey}`);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const text = [pick(THEMES.love), pick(THEMES.career), pick(THEMES.health), pick(THEMES.money)].join(' ');
  const sc = () => 55 + Math.floor(r() * 45);
  return { sign, period, text, lucky: { color: pick(COLORS), number: 1 + Math.floor(r() * 9) }, scores: { love: sc(), career: sc(), health: sc(), money: sc() } };
}

// ---------- Panchang ----------
const TITHIS = ['Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi'];
const YOGAS = ['Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma', 'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti'];
const VARAS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function panchang(dateStr, { lat = DELHI.lat, lon = DELHI.lon, tz = DELHI.tz } = {}) {
  const observer = new A.Observer(lat, lon, 0);
  const dayStart = localToUtc(dateStr, '00:00', tz);
  const rise = A.SearchRiseSet(A.Body.Sun, observer, +1, dayStart, 1);
  const set = rise && A.SearchRiseSet(A.Body.Sun, observer, -1, rise, 1);
  // Panchang elements are taken at local sunrise (the Hindu day starts at sunrise).
  const at = rise ? rise.date : localToUtc(dateStr, '06:00', tz);
  const { positions } = planetPositions(at);
  const diff = norm(positions.Moon - positions.Sun);
  const tithiNum = Math.floor(diff / 12);
  const paksha = tithiNum < 15 ? 'Shukla' : 'Krishna';
  const t = tithiNum % 15;
  const tithi = t === 14 ? (tithiNum < 15 ? 'Purnima' : 'Amavasya') : TITHIS[t];
  const yogaIdx = Math.floor(norm(positions.Sun + positions.Moon) / (360 / 27));
  const dow = new Date(dateStr + 'T12:00:00Z').getUTCDay();
  let rahuKaal = null;
  if (rise && set) {
    // Daytime split into 8 equal parts; Rahu Kaal is a fixed part for each weekday (Sun=8th, Mon=2nd ... Sat=3rd).
    const part = (set.date - rise.date) / 8;
    const slot = [7, 1, 6, 4, 5, 3, 2][dow];
    const from = new Date(rise.date.getTime() + slot * part), to = new Date(from.getTime() + part);
    rahuKaal = `${hhmmIn(tz, from)} - ${hhmmIn(tz, to)}`;
  }
  return {
    date: dateStr, vara: VARAS[dow], tithi: `${paksha} ${tithi}`, nakshatra: NAKSHATRAS[nakshatraOf(positions.Moon)], yoga: YOGAS[yogaIdx],
    moonSign: SIGNS[signOf(positions.Moon)], sunSign: SIGNS[signOf(positions.Sun)],
    rahuKaal, sunrise: rise ? hhmmIn(tz, rise.date) : null, sunset: set ? hhmmIn(tz, set.date) : null,
    location: { lat, lon, tz },
  };
}
