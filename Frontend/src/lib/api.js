import { io } from 'socket.io-client';

export const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

const tokenKey = (role) => `astro_${role}_token`;
export const getToken = (role) => { try { return localStorage.getItem(tokenKey(role)); } catch { return null; } };
export const setToken = (role, t) => { try { t ? localStorage.setItem(tokenKey(role), t) : localStorage.removeItem(tokenKey(role)); } catch { /* storage unavailable */ } };

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

const inFlightGets = new Map();

async function sendFetch(role, path, qs, token, method, body) {
  const res = await fetch(`${API_ORIGIN}/api${path}${qs}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && role) { setToken(role, null); window.dispatchEvent(new CustomEvent('astro:logout', { detail: role })); }
    // An app switched off by the admin: let the open screens show the maintenance page right away.
    if (res.status === 503 && data.maintenance) window.dispatchEvent(new CustomEvent('astro:maintenance', { detail: data }));
    throw new ApiError(data.message || 'Request failed', res.status);
  }
  return data;
}

function request(role, path, { method = 'GET', body, params } = {}) {
  const qs = params ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))) : '';
  const token = role ? getToken(role) : null;
  if (method !== 'GET') {
    inFlightGets.clear();
    return sendFetch(role, path, qs, token, method, body);
  }
  const key = `${role || 'guest'}:${token || ''}:${path}${qs}`;
  const existing = inFlightGets.get(key);
  if (existing) return existing;
  const p = sendFetch(role, path, qs, token, method, undefined).finally(() => {
    if (inFlightGets.get(key) === p) inFlightGets.delete(key);
  });
  inFlightGets.set(key, p);
  return p;
}

const make = (role) => ({
  get: (p, params) => request(role, p, { params }),
  post: (p, body = {}) => request(role, p, { method: 'POST', body }),
  put: (p, body = {}) => request(role, p, { method: 'PUT', body }),
  del: (p) => request(role, p, { method: 'DELETE' }),
});

export const api = { public: make(null), user: make('user'), vendor: make('astrologer'), admin: make('admin') };
export const authApi = make(null);

export function connectSocket(role) {
  return io(API_ORIGIN || '/', { auth: { token: role ? getToken(role) : null }, transports: ['websocket', 'polling'] });
}

export const inr = (n = 0) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-');
export const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
export const SIGN_SYMBOL = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'].map((s) => s + '︎');
export const LANGUAGES = ['Hindi', 'English', 'Tamil', 'Telugu', 'Marathi', 'Malayalam', 'Punjabi', 'Bengali', 'Gujarati', 'Sanskrit'];
export const EXPERTISE = ['Vedic', 'KP', 'Tarot', 'Numerology', 'Vastu', 'Palmistry', 'Marriage', 'Career', 'Love', 'Health', 'Finance', 'Remedies'];
