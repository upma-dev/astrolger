// Birth-place lookup via the Open-Meteo geocoding API (free, no key, GeoNames data).
// Returns real latitude/longitude and the IANA timezone so birth times convert correctly.
const CACHE = new Map();
const TTL = 24 * 3600e3;

export async function searchPlaces(q) {
  const query = String(q || '').trim().slice(0, 80);
  if (query.length < 2) return [];
  const key = query.toLowerCase();
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.rows;
  const url = `https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: query, count: '8', language: 'en', format: 'json' })}`;
  let data;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    data = await r.json();
  } catch {
    throw Object.assign(new Error('Place search is unavailable right now. Please try again.'), { status: 502 });
  }
  const rows = (data.results || []).filter((x) => x.timezone).map((x) => ({
    name: x.name,
    region: [x.admin2 !== x.name ? x.admin2 : null, x.admin1].filter(Boolean).join(', '),
    country: x.country || '',
    label: [x.name, x.admin1, x.country].filter(Boolean).join(', '),
    lat: +x.latitude.toFixed(4), lon: +x.longitude.toFixed(4), tz: x.timezone,
  }));
  if (CACHE.size > 500) CACHE.clear();
  CACHE.set(key, { at: Date.now(), rows });
  return rows;
}
