/* ICE servers for WebRTC audio/video calls (used automatically when Agora is not configured).
   STUN (free, Google) always. TURN relays the call when the two phones can't connect directly
   (some mobile networks / office WiFi). Configure ONE of these in .env if needed:
     Cloudflare:  CLOUDFLARE_TURN_KEY_ID + CLOUDFLARE_TURN_API_TOKEN
     Metered:     METERED_TURN_APP + METERED_TURN_API_KEY
     Any TURN:    TURN_URLS (comma separated) + TURN_USERNAME + TURN_CREDENTIAL */

const STUN = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
let cache = { at: 0, servers: null };

async function fetchTurn() {
  const e = process.env;
  if (e.CLOUDFLARE_TURN_KEY_ID && e.CLOUDFLARE_TURN_API_TOKEN) {
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${e.CLOUDFLARE_TURN_KEY_ID}/credentials/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${e.CLOUDFLARE_TURN_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 6 * 3600 }),
    });
    if (!r.ok) throw new Error(`Cloudflare TURN ${r.status}`);
    const j = await r.json();
    return [].concat(j.iceServers || []);
  }
  if (e.METERED_TURN_APP && e.METERED_TURN_API_KEY) {
    const r = await fetch(`https://${e.METERED_TURN_APP}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(e.METERED_TURN_API_KEY)}`);
    if (!r.ok) throw new Error(`Metered TURN ${r.status}`);
    return [].concat(await r.json());
  }
  if (e.TURN_URLS) {
    return [{ urls: e.TURN_URLS.split(',').map((u) => u.trim()).filter(Boolean), username: e.TURN_USERNAME, credential: e.TURN_CREDENTIAL }];
  }
  return [];
}

export async function getIceServers() {
  if (cache.servers && Date.now() - cache.at < 3600e3) return cache.servers;
  let turn = [];
  try { turn = await fetchTurn(); } catch (err) { console.warn('[ice]', err.message); }
  cache = { at: Date.now(), servers: [...STUN, ...turn] };
  return cache.servers;
}
