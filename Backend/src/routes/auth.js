import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Astrologer, Admin, Otp, Setting } from '../models/index.js';
import { creditUser } from '../services/wallet.js';
import { sign, wrap } from '../middleware/auth.js';
import { config } from '../config/index.js';
import { getAppConfig } from '../services/appConfig.js';
import { getPricing, initialRates } from '../services/pricing.js';
import { appGate, getSystem } from '../services/system.js';
import { pushAdmins } from '../services/push.js';

const r = Router();
// Apps switched off in Global > System settings cannot log in either.
r.use('/user', appGate('user'));
r.use('/astrologer', appGate('astrologer'));
const clean = (s = '') => String(s).trim().toLowerCase();

async function sendOtp(key) {
  // Dev: fixed OTP. In production plug an SMS provider (MSG91 / Twilio) here and use a random code.
  const code = config.env === 'production' ? String(Math.floor(100000 + Math.random() * 900000)) : config.devOtp;
  await Otp.deleteMany({ key });
  await Otp.create({ key, code, expiresAt: new Date(Date.now() + 5 * 60e3) });
  if (config.env !== 'production') console.log(`[otp] ${key} -> ${code}`);
}

async function checkOtp(key, code) {
  const o = await Otp.findOne({ key });
  if (!o || o.expiresAt < new Date() || o.code !== String(code)) return false;
  await o.deleteOne();
  return true;
}

// ---- User (OTP) ----
r.post('/user/send-otp', wrap(async (req, res) => {
  const key = clean(req.body.phone || req.body.email);
  if (!key) return res.status(400).json({ message: 'Phone or email required' });
  await sendOtp(key);
  res.json({ message: 'OTP sent', ...(config.env !== 'production' && { devHint: `Dev OTP is ${config.devOtp}` }) });
}));

r.post('/user/verify-otp', wrap(async (req, res) => {
  const key = clean(req.body.phone || req.body.email);
  if (!(await checkOtp(key, req.body.otp))) return res.status(400).json({ message: 'Invalid or expired OTP' });
  const isEmail = key.includes('@');
  let user = await User.findOne(isEmail ? { email: key } : { phone: key });
  const isNew = !user;
  if (!user) {
    if (!(await getSystem()).signups.user) return res.status(403).json({ message: 'New sign-ups are paused right now. Please try again later.' });
    user = await User.create(isEmail ? { email: key } : { phone: key });
    // Sign-up offer set by the admin (Settings > Platform). 0 means no offer.
    const bonus = Math.max(0, Math.round(+(await Setting.findOne({ key: 'welcomeBonus' }))?.value || 0));
    if (bonus) user = await creditUser(user._id, bonus, 'bonus', 'Welcome bonus', 'signup');
  }
  if (user.blocked) return res.status(403).json({ message: 'Account blocked' });
  res.json({ token: sign('user', user._id), user, isNew });
}));

// ---- Astrologer ----
r.post('/astrologer/send-otp', wrap(async (req, res) => {
  const phone = clean(req.body.phone);
  if (!phone) return res.status(400).json({ message: 'Phone required' });
  await sendOtp(phone);
  res.json({ message: 'OTP sent', ...(config.env !== 'production' && { devHint: `Dev OTP is ${config.devOtp}` }) });
}));

r.post('/astrologer/login', wrap(async (req, res) => {
  const phone = clean(req.body.phone);
  if (!(await checkOtp(phone, req.body.otp))) return res.status(400).json({ message: 'Invalid or expired OTP' });
  const a = await Astrologer.findOne({ phone });
  // No account yet: the number is verified, so hand out a short-lived sign-up token instead of asking for the OTP again.
  if (!a) return res.json({ isNew: true, phone, signupToken: jwt.sign({ role: 'astro-signup', phone }, config.jwtSecret, { expiresIn: '30m' }) });
  if (a.status === 'blocked') return res.status(403).json({ message: 'Account blocked' });
  res.json({ token: sign('astrologer', a._id), astrologer: a });
}));

r.post('/astrologer/register', wrap(async (req, res) => {
  const { name, phone, email, experience, expertise, languages, bio, pricePerMin, kyc, otp, signupToken } = req.body;
  const trimmedName = String(name || '').trim();
  if (!trimmedName || !clean(phone)) return res.status(400).json({ message: 'Name and phone are required' });
  if (!(await getSystem()).signups.astrologer) return res.status(403).json({ message: 'New astrologer registrations are paused right now.' });
  // The number is proven either by the sign-up token from login, or by an OTP.
  let verified = false;
  if (signupToken) { try { const t = jwt.verify(signupToken, config.jwtSecret); verified = t.role === 'astro-signup' && t.phone === clean(phone); } catch { verified = false; } }
  if (!verified && !(await checkOtp(clean(phone), otp))) return res.status(400).json({ message: signupToken ? 'Your verification expired. Please verify your number again.' : 'Invalid or expired OTP' });
  if (await Astrologer.findOne({ phone: clean(phone) })) return res.status(409).json({ message: 'Already registered, please login' });
  // Fields the admin marked required (App Management > Astrologer App > Sign-up details).
  const req_ = (await getAppConfig()).signup.astrologer.fields;
  const has = {
    email: !!String(email || '').trim(),
    experience: experience !== undefined && experience !== '' && +experience >= 0,
    expertise: [].concat(expertise || []).length > 0,
    languages: [].concat(languages || []).length > 0,
    bio: !!String(bio || '').trim(),
    pricePerMin: +pricePerMin > 0,
    kyc: !!(kyc?.panNumber && kyc?.aadhaarLast4 && kyc?.bankAccount && kyc?.ifsc),
  };
  const LABEL = { email: 'Email', experience: 'Experience', expertise: 'Expertise', languages: 'Languages', bio: 'About you', pricePerMin: 'Price per minute', kyc: 'KYC details' };
  const missing = Object.keys(has).filter((k) => req_[k]?.required && !has[k]);
  if (missing.length) return res.status(400).json({ message: `Please fill: ${missing.map((k) => LABEL[k]).join(', ')}` });
  const pricing = await getPricing();
  const a = await Astrologer.create({
    name: trimmedName, phone: clean(phone), email, bio, experience: +experience || 0,
    expertise: [].concat(expertise || []), languages: [].concat(languages || []),
    // Rate is kept inside the limits from Price management > Astrologer side.
    ...(() => { const rates = initialRates(pricePerMin, pricing); return { rates, pricePerMin: rates.chat }; })(),
    kyc: { ...kyc, status: 'pending' },
    commissionPct: pricing.consultation.defaultCommission,
  });
  pushAdmins({ title: 'New astrologer application', body: `${a.name} (+91 ${a.phone}) is waiting for approval`, link: '/admin/astro/approvals', tag: `approval-${a._id}` });
  req.app.get('io')?.to('admins').emit('support:update', { kind: 'approval' });
  res.status(201).json({ token: sign('astrologer', a._id), astrologer: a });
}));

// ---- Admin ----
r.post('/admin/login', wrap(async (req, res) => {
  const a = await Admin.findOne({ email: clean(req.body.email) });
  if (!a || !(await bcrypt.compare(req.body.password || '', a.password))) return res.status(401).json({ message: 'Invalid credentials' });
  res.json({ token: sign('admin', a._id), admin: { _id: a._id, name: a.name, email: a.email } });
}));

export default r;
