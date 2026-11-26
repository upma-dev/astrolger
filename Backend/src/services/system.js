import { Setting } from '../models/index.js';

/* Global switches (Admin > Global > System settings, Setting key "system").
   Turning an app off blocks its API (login included) with a 503 and shows the message in that app.
   The admin panel is never affected. */

export const APPS = ['user', 'astrologer', 'website'];

export const DEFAULT_SYSTEM = {
  user: { enabled: true, title: 'We will be back soon', message: 'The app is under maintenance. Please try again in a little while.', eta: '' },
  astrologer: { enabled: true, title: 'Partner app under maintenance', message: 'The astrologer app is paused for an update. You will be able to go online again shortly.', eta: '' },
  website: { enabled: true, title: 'We will be back soon', message: 'Our website is under maintenance. Please check back shortly.', eta: '' },
  signups: { user: true, astrologer: true },
};

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function normalizeSystem(v = {}) {
  const d = DEFAULT_SYSTEM;
  const app = (k) => ({
    enabled: v[k]?.enabled !== false,
    title: str(v[k]?.title ?? d[k].title, 60) || d[k].title,
    message: str(v[k]?.message ?? d[k].message, 300),
    eta: str(v[k]?.eta, 40),
  });
  return {
    user: app('user'),
    astrologer: app('astrologer'),
    website: app('website'),
    signups: { user: v.signups?.user !== false, astrologer: v.signups?.astrologer !== false },
  };
}

// Small in-process cache: this is read on every user/astrologer API call.
let cache = null;
export async function getSystem() {
  if (cache) return cache;
  const row = await Setting.findOne({ key: 'system' });
  cache = normalizeSystem(row?.value || {});
  return cache;
}

export async function saveSystem(input) {
  const value = normalizeSystem(input);
  await Setting.findOneAndUpdate({ key: 'system' }, { value }, { upsert: true });
  cache = value;
  return value;
}

// Express middleware: 503 while the given app is switched off.
export const appGate = (app) => async (_req, res, next) => {
  try {
    const s = await getSystem();
    if (s[app].enabled) return next();
    res.status(503).json({ message: s[app].message || 'Under maintenance', maintenance: true, app, title: s[app].title, eta: s[app].eta });
  } catch (e) { next(e); }
};

// Tell every open app (customers, astrologers, website visitors, admins) that settings changed.
export function broadcast(req, what) {
  const io = req.app.get('io');
  if (io) io.emit('platform:updated', { what, at: Date.now() });
}
