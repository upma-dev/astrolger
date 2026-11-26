/* "Save login info" (like Instagram): an account is remembered on this device ONLY when the person chooses
   "Save" while logging out. Saved accounts appear on the login screen for one-tap login (OTP still required).
   One list per app: 'user' (customer app) and 'astrologer' (partner app). */

const key = (app) => `av-saved-logins:${app}`;
const MAX = 3;
const ok = (a) => a && /^\d{10}$/.test(a.phone);

// Older versions saved accounts automatically at every login; those are dropped so nothing shows without consent.
try { ['av-last-user', 'av-accounts', 'av-astro-accounts'].forEach((k) => localStorage.removeItem(k)); } catch { /* storage unavailable */ }

export function readSaved(app) {
  try { return JSON.parse(localStorage.getItem(key(app)) || '[]').filter(ok).slice(0, MAX); } catch { return []; }
}
const write = (app, list) => { try { localStorage.setItem(key(app), JSON.stringify(list.slice(0, MAX))); } catch { /* storage unavailable */ } };

export function saveLogin(app, { phone, name, avatar }) {
  if (!/^\d{10}$/.test(phone || '')) return;
  write(app, [{ phone, name: (name || '').trim(), avatar: avatar || '' }, ...readSaved(app).filter((a) => a.phone !== phone)]);
}
export const isSaved = (app, phone) => readSaved(app).some((a) => a.phone === phone);
export function removeSaved(app, phone) { write(app, readSaved(app).filter((a) => a.phone !== phone)); }
// Keeps the saved name/photo current (only for accounts that are already saved).
export function refreshSaved(app, { phone, name, avatar }) {
  const list = readSaved(app);
  if (!list.some((a) => a.phone === phone)) return;
  write(app, list.map((a) => (a.phone === phone ? { ...a, name: (name || a.name || '').trim(), avatar: avatar ?? a.avatar } : a)));
}

export const maskPhone = (d) => `+91 ${d.slice(0, 2)}••• ••${d.slice(7)}`;
export const firstName = (n) => (n || '').replace(/^(Pt\.|Dr\.|Acharya|Guru|Swami)\s+/i, '').trim().split(/\s+/)[0];
