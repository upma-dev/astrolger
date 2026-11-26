/* Notification sounds, made with the Web Audio API (no audio files needed).
   - request: 3-second ring (new consultation request, request accepted)
   - chat:    short double "pop" (new chat / support message)
   - info:    single soft ding
   Browsers only allow sound after the person has clicked/tapped the page once, so the audio engine
   unlocks itself on the first interaction. The same alert (same key) never plays twice within 4 seconds,
   so a socket event and a push for the same thing don't ring twice. */

let ctx = null;
const recent = new Map();

function audio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

if (typeof window !== 'undefined') {
  const unlock = () => { audio(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

function tone(c, freq, start, dur, vol = 0.12, type = 'sine') {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(vol, start + 0.02);
  gain.gain.setValueAtTime(vol, start + dur - 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

let stopRing = null;

// Phone-style ring for `ms` milliseconds (default 3 seconds).
export function playRing(ms = 3000) {
  const c = audio();
  if (!c) return () => {};
  stopRing?.();
  const gainAll = c.createGain();
  gainAll.gain.value = 0.9;
  gainAll.connect(c.destination);
  const t0 = c.currentTime + 0.03;
  const end = t0 + ms / 1000;
  // Soft marimba-style melody (E major arpeggio up and back), one phrase per second, repeated for `ms`.
  const phrase = [659.25, 830.61, 987.77, 1318.51, 987.77, 830.61]; // E5 G#5 B5 E6 B5 G#5
  const step = 0.14;
  const marimba = (freq, s) => {
    const len = Math.min(0.5, end - s);
    if (len <= 0.05) return;
    // Warm body (fundamental) + a quiet bright overtone that dies faster: sounds like a wooden bar.
    [[1, 0.22, len], [4, 0.04, len * 0.35]].forEach(([mult, vol, dur]) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * mult;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(vol, s + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
      osc.connect(g);
      g.connect(gainAll);
      osc.start(s);
      osc.stop(s + dur + 0.02);
    });
  };
  for (let t = t0; t < end - 0.2; t += 1) phrase.forEach((f, i) => { if (t + i * step < end - 0.1) marimba(f, t + i * step); });
  const timer = setTimeout(() => { try { gainAll.disconnect(); } catch { /* done */ } }, ms + 200);
  stopRing = () => { clearTimeout(timer); try { gainAll.disconnect(); } catch { /* done */ } stopRing = null; };
  try { navigator.vibrate?.([700, 300, 700, 300, 700]); } catch { /* unsupported */ }
  return stopRing;
}

export function playChat() {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.02;
  tone(c, 660, t, 0.12, 0.14);
  tone(c, 990, t + 0.13, 0.16, 0.14);
  try { navigator.vibrate?.(120); } catch { /* unsupported */ }
}

export function playInfo() {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.02;
  tone(c, 880, t, 0.35, 0.1);
  tone(c, 1318.5, t + 0.08, 0.4, 0.06);
}

/** Play the sound for a notification kind. `key` de-duplicates the same alert arriving twice. */
export function playAlert(kind = 'info', key = '') {
  if (key) {
    const now = Date.now();
    if (now - (recent.get(key) || 0) < 4000) return;
    recent.set(key, now);
    if (recent.size > 200) recent.clear();
  }
  if (kind === 'request') playRing(3000);
  else if (kind === 'chat') playChat();
  else playInfo();
}

export const stopAlert = () => stopRing?.();

/** Caller-side "tuu… tuu…" while waiting for the astrologer to pick up. Returns a stop function. */
export function playRingback() {
  const c = audio();
  if (!c) return () => {};
  const once = () => {
    const t = c.currentTime + 0.02;
    // Indian ringback: 400 Hz, 0.4 s on, 0.2 s off, 0.4 s on, then 2 s quiet.
    [0, 0.6].forEach((d) => tone(c, 400, t + d, 0.4, 0.05));
  };
  once();
  const i = setInterval(once, 3000);
  return () => clearInterval(i);
}
