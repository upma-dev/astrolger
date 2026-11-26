import { API_ORIGIN, api } from './api.js';

/* Firebase push notifications for the web apps.
   enablePush(role) registers /push-sw.js, asks for notification permission (on the first tap if the
   browser needs a click), gets the FCM token and saves it on the server for the logged-in account.
   Config comes from the backend (/api/public/push-config), so all Firebase keys live in Backend/.env. */

const API_ROLE = { user: 'user', astrologer: 'vendor', admin: 'admin' };
const PATH = { user: '/user', astrologer: '/astrologer', admin: '/admin' };
const tokenKey = (role) => `astro_${role}_fcm`;

let cfgPromise = null;
const getConfig = () => (cfgPromise ||= fetch(`${API_ORIGIN}/api/public/push-config`).then((r) => r.json()).catch(() => ({ enabled: false })));

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window && 'PushManager' in window && window.isSecureContext;

async function register(role) {
  const cfg = await getConfig();
  if (!cfg.enabled) return null;
  const reg = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  const [{ initializeApp, getApps }, { getMessaging, getToken, isSupported }] = await Promise.all([import('firebase/app'), import('firebase/messaging')]);
  if (!(await isSupported())) return null;
  const app = getApps()[0] || initializeApp(cfg.config);
  const token = await getToken(getMessaging(app), { vapidKey: cfg.vapidKey, serviceWorkerRegistration: reg });
  if (!token) return null;
  await api[API_ROLE[role]].post(`${PATH[role]}/push-token`, { token });
  try { localStorage.setItem(tokenKey(role), token); } catch { /* storage unavailable */ }
  return token;
}

/** Turn on push for a logged-in role. Safe to call on every app load. */
export function enablePush(role) {
  if (!pushSupported()) return () => {};
  if (Notification.permission === 'granted') { register(role).catch((e) => console.warn('[push]', e.message)); return () => {}; }
  if (Notification.permission === 'denied') return () => {};
  // Most browsers need a user gesture before showing the permission prompt.
  const ask = async () => {
    off();
    try {
      if ((await Notification.requestPermission()) === 'granted') await register(role);
    } catch (e) { console.warn('[push]', e.message); }
  };
  const off = () => { window.removeEventListener('pointerdown', ask); window.removeEventListener('keydown', ask); };
  getConfig().then((c) => { if (c.enabled) { window.addEventListener('pointerdown', ask, { once: true }); window.addEventListener('keydown', ask, { once: true }); } });
  return off;
}

/** On logout: stop sending this browser notifications for that account. */
export async function disablePush(role) {
  let token = null;
  try { token = localStorage.getItem(tokenKey(role)); localStorage.removeItem(tokenKey(role)); } catch { /* storage unavailable */ }
  if (token) await api[API_ROLE[role]].post(`${PATH[role]}/push-token/remove`, { token }).catch(() => {});
}

/** Listen for pushes the service worker forwards to this open page. */
export function onPushMessage(cb) {
  if (!('serviceWorker' in navigator)) return () => {};
  const h = (e) => { if (e.data?.type === 'astro:push' || e.data?.type === 'astro:navigate') cb(e.data); };
  navigator.serviceWorker.addEventListener('message', h);
  return () => navigator.serviceWorker.removeEventListener('message', h);
}
