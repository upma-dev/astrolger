import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { User, Astrologer, Admin } from '../models/index.js';

const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/* Firebase Cloud Messaging (push notifications to browser / phone even when the app is closed).
   Configure in .env with either:
     FIREBASE_SERVICE_ACCOUNT = the whole service-account JSON on one line (or base64 of it), or
     FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.
   Without these, every push call is a silent no-op, so the app keeps working on sockets alone. */

let messaging = null;
let tried = false;

function readCredentials() {
  // Path to the downloaded service-account JSON (relative to the Backend folder), kept out of git.
  const file = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
  if (file) {
    try {
      const sa = JSON.parse(readFileSync(path.resolve(BACKEND_DIR, file), 'utf8'));
      return { projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key };
    } catch (e) { console.warn(`[push] cannot read ${file}: ${e.message}`); }
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
      const sa = JSON.parse(json);
      return { projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key };
    } catch { console.warn('[push] FIREBASE_SERVICE_ACCOUNT is not valid JSON'); return null; }
  }
  const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY: key } = process.env;
  if (!projectId || !clientEmail || !key) return null;
  return { projectId, clientEmail, privateKey: key.replace(/\\n/g, '\n') };
}

async function getMessaging() {
  if (tried) return messaging;
  tried = true;
  const cred = readCredentials();
  if (!cred) { console.log('[push] Firebase not configured, push notifications disabled'); return null; }
  try {
    const { initializeApp, cert, getApps } = await import('firebase-admin/app');
    const { getMessaging: gm } = await import('firebase-admin/messaging');
    const app = getApps()[0] || initializeApp({ credential: cert(cred) });
    messaging = gm(app);
    console.log(`[push] Firebase ready (${cred.projectId})`);
  } catch (e) {
    console.warn('[push] Firebase init failed:', e.message);
  }
  return messaging;
}

const MODELS = { user: User, astrologer: Astrologer, admin: Admin };
const DEAD = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument']);

// Save a device token for the logged-in account (one account can have several devices/browsers).
export async function saveToken(role, id, token) {
  const t = String(token || '').trim();
  if (!t || t.length > 4096 || !MODELS[role]) return false;
  // A browser belongs to one account at a time: remove it from anyone else in the same role.
  await MODELS[role].updateMany({ fcmTokens: t, _id: { $ne: id } }, { $pull: { fcmTokens: t } });
  await MODELS[role].updateOne({ _id: id }, { $addToSet: { fcmTokens: t } });
  // Keep only the 10 newest devices.
  await MODELS[role].updateOne({ _id: id, 'fcmTokens.10': { $exists: true } }, { $push: { fcmTokens: { $each: [], $slice: -10 } } });
  return true;
}

export async function removeToken(role, token) {
  if (!MODELS[role] || !token) return;
  await MODELS[role].updateMany({ fcmTokens: token }, { $pull: { fcmTokens: token } });
}

/**
 * Send one notification to many device tokens.
 * kind: 'request' (3-second ring), 'chat' (chat sound), 'info' (normal).
 */
async function sendTo(role, tokens, { title, body, link = '/', kind = 'info', tag, data = {} }) {
  const list = [...new Set((tokens || []).filter(Boolean))];
  if (!list.length) return;
  const m = await getMessaging();
  if (!m) return;
  // Data-only for the web: the service worker / open page decides how to show it and which sound to play.
  const payload = { title: String(title).slice(0, 120), body: String(body || '').slice(0, 400), link, kind, tag: tag || kind, role, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) };
  for (let i = 0; i < list.length; i += 500) {
    const chunk = list.slice(i, i + 500);
    try {
      const r = await m.sendEachForMulticast({
        tokens: chunk,
        data: payload,
        webpush: { headers: { Urgency: 'high', TTL: kind === 'request' ? '120' : '86400' } },
        android: { priority: 'high', notification: { title: payload.title, body: payload.body, sound: kind === 'request' ? 'ring' : 'default', channelId: kind === 'request' ? 'requests' : 'default' } },
        apns: { headers: { 'apns-priority': '10' }, payload: { aps: { alert: { title: payload.title, body: payload.body }, sound: kind === 'request' ? 'ring.caf' : 'default' } } },
      });
      const dead = chunk.filter((_, j) => !r.responses[j].success && DEAD.has(r.responses[j].error?.code));
      if (dead.length) await MODELS[role].updateMany({ fcmTokens: { $in: dead } }, { $pull: { fcmTokens: { $in: dead } } });
    } catch (e) {
      console.warn('[push] send failed:', e.message);
    }
  }
}

const tokensOf = async (role, filter) => (await MODELS[role].find(filter).select('fcmTokens').lean()).flatMap((d) => d.fcmTokens || []);

// Fire-and-forget helpers: a push problem must never break the API request.
const safe = (p) => { p.catch((e) => console.warn('[push]', e.message)); };

export const pushUser = (id, msg) => id && safe((async () => sendTo('user', await tokensOf('user', { _id: id }), msg))());
export const pushAstrologer = (id, msg) => id && safe((async () => sendTo('astrologer', await tokensOf('astrologer', { _id: id }), msg))());
export const pushAdmins = (msg) => safe((async () => sendTo('admin', await tokensOf('admin', {}), msg))());
export const pushRole = (role, msg) => safe((async () => sendTo(role, await tokensOf(role, role === 'user' ? { blocked: { $ne: true } } : { status: 'approved' }), msg))());

export const pushEnabled = async () => !!(await getMessaging());

/** Admin-panel alert with the ring: live on open admin screens (socket) + Firebase push for closed ones. */
export function alertAdmins(io, { title, body, link = '/admin', tag }) {
  io?.to('admins').emit('admin:alert', { title, body, link, tag });
  pushAdmins({ title, body, link, kind: 'request', tag });
}
