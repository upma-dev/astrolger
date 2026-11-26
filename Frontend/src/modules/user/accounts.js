/* Saved logins for the customer app (Instagram-style: saved only when chosen at logout),
   and the check for whether a profile still misses sign-up details the admin made required. */

import { readSaved, refreshSaved, removeSaved } from '../../shared/savedLogins.js';

// Accounts saved on this device (only those the person chose to save when logging out).
export const readAccounts = () => readSaved('user');
export const forgetAccount = (phone) => removeSaved('user', phone);
// Keeps a saved account's name current after sign-up / profile edits (does nothing if it isn't saved).
export const rememberAccount = ({ phone, name }) => refreshSaved('user', { phone, name });

/* Sign-up fields that must be filled before the app can be used (Admin > Customer App > Sign-up details).
   Name is always required. Birth time is never forced: "I don't know my birth time" saves it empty. */
export function missingSignup(me, fields) {
  if (!me) return [];
  const f = fields || { name: { required: true }, dob: { required: true } };
  const out = [];
  if (!(me.name || '').trim()) out.push('name');
  for (const k of ['email', 'gender', 'dob', 'pob']) if (f[k]?.show !== false && f[k]?.required && !me[k]) out.push(k);
  return out;
}

/* Sign-up steps only follow a fresh OTP in this browser session. Anyone else with an unfinished profile
   (e.g. an old login saved in the browser) starts again at the mobile number + OTP screen. */
const SIGNUP_KEY = 'av-signup-after-otp';
export const markSignupStarted = (userId) => { try { sessionStorage.setItem(SIGNUP_KEY, String(userId)); } catch { /* storage unavailable */ } };
export const signupStarted = (userId) => { try { return !!userId && sessionStorage.getItem(SIGNUP_KEY) === String(userId); } catch { return false; } };
export const clearSignupStarted = () => { try { sessionStorage.removeItem(SIGNUP_KEY); } catch { /* storage unavailable */ } };
