import { Router } from 'express';
import { Astrologer, Banner, Category, Horoscope, Report, Remedy, Review, Session, Setting } from '../models/index.js';
import { DEFAULT_TZ, isValidTz, todayIn } from '../services/time.js';
import { searchPlaces } from '../services/places.js';
import { getAppConfig } from '../services/appConfig.js';
import { buildKundli, matchKundli, panchang, SIGNS } from '../services/astro.js';
import { wrap } from '../middleware/auth.js';
import { getPricing, isActive, onlineMethods, rateOf, durationOf, autoCutOf, publicServices, SERVICE_TYPES } from '../services/pricing.js';
import { getSystem } from '../services/system.js';
import rateLimit from 'express-rate-limit';
import { createTicket, notifyAdmins, SUBJECTS } from '../services/support.js';

const r = Router();

const PUBLIC_ASTRO = '-password -kyc -walletBalance -slots -fcmTokens';

const sponsoredNow = (o) => !!o.sponsored && (!o.sponsoredUntil || new Date(o.sponsoredUntil) > new Date());
// List order everywhere: online & free → online but busy → offline. Inside each group sponsored first, then featured.
// The chosen sort (rating / price / experience) only orders astrologers inside the same group.
const liveRank = (o) => (o.online ? (o.busy ? 1 : 2) : 0);
const promoRank = (o) => (o.sponsored ? 1_000_000 + (o.sponsorRank || 0) : 0) + (o.featured ? 1 : 0);
const orderAstro = (list) => list
  .map((o, i) => [o, i])
  .sort(([x, i], [y, j]) => liveRank(y) - liveRank(x) || promoRank(y) - promoRank(x) || i - j)
  .map(([o]) => o);

// Astrologers on a featured plan count as featured; plan internals (commission) never leave the server.
// Every astrologer carries a rate, duration and autoCut flag for each service.
const publicAstro = (list, p) => list.map((a) => {
  const o = a.toObject ? a.toObject() : { ...a };
  if (p) {
    o.rates = Object.fromEntries(SERVICE_TYPES.map((k) => [k, rateOf(o, k, p)]));
    o.durations = Object.fromEntries(SERVICE_TYPES.map((k) => [k, durationOf(o, k, p)]));
    o.autoCut = Object.fromEntries(SERVICE_TYPES.map((k) => [k, autoCutOf(o, k, p)]));
  }
  if (isActive(o.plan) && o.plan.featured) o.featured = true;
  o.sponsored = sponsoredNow(o);
  if (!o.sponsored) o.sponsorRank = 0;
  delete o.plan; delete o.commissionPct; delete o.commissionCustom; delete o.sponsoredUntil; delete o.fcmTokens;
  return o;
});

const publicPayments = (p) => ({ online: onlineMethods(p).length > 0, methods: onlineMethods(p), cod: p.payments.cod, codMax: p.payments.codMax, codFee: p.payments.codFee });
const publicSystem = (s) => ({ user: s.user, astrologer: s.astrologer, website: s.website, signups: s.signups });

// Lightweight status for the astrologer app and the website: on/off switches, announcement bar and rate limits.
r.get('/status', wrap(async (_q, res) => {
  const [config, p, system] = await Promise.all([getAppConfig(), getPricing(), getSystem()]);
  res.json({
    system: publicSystem(system),
    announcement: config.announcement,
    brand: config.brand,
    astroSignup: config.signup.astrologer, // astrologer login screen + sign-up form set by the admin
    services: publicServices(p),
    allowRateEdit: p.astrologerRate.allowEdit,
    payout: p.payout,
    payments: publicPayments(p),
  });
}));

// Support from the login screen (not logged in yet). Limited per IP so it cannot be spammed.
r.get('/support/subjects', (_q, res) => res.json(SUBJECTS));
r.post('/support', rateLimit({ windowMs: 60 * 60e3, limit: 8, message: { message: 'Too many requests. Please try again later.' } }), wrap(async (req, res) => {
  const { app, name, phone, subject, message } = req.body || {};
  if (!/^\d{10}$/.test(String(phone || '').replace(/\D/g, '').slice(-10))) return res.status(400).json({ message: 'Enter a valid 10-digit mobile number' });
  if (!String(name || '').trim()) return res.status(400).json({ message: 'Enter your name' });
  const t = await createTicket({ app: app === 'astrologer' ? 'astrologer' : 'user', guest: { name, phone }, source: 'login', subject, message });
  notifyAdmins(req, t);
  res.status(201).json({ ok: true, ticket: String(t._id).slice(-6).toUpperCase() });
}));

// Firebase web config for push notifications (these values are public by design; the server key stays private).
r.get('/push-config', (_q, res) => {
  const e = process.env;
  const projectId = e.FIREBASE_PROJECT_ID || (() => { try { return JSON.parse(e.FIREBASE_SERVICE_ACCOUNT || '{}').project_id; } catch { return undefined; } })();
  const cfg = { apiKey: e.FIREBASE_WEB_API_KEY, authDomain: e.FIREBASE_AUTH_DOMAIN || (projectId && `${projectId}.firebaseapp.com`), projectId, messagingSenderId: e.FIREBASE_MESSAGING_SENDER_ID, appId: e.FIREBASE_APP_ID };
  const enabled = !!(cfg.apiKey && cfg.projectId && cfg.messagingSenderId && cfg.appId && e.FIREBASE_VAPID_KEY);
  res.set('Cache-Control', 'public, max-age=300').json(enabled ? { enabled, config: cfg, vapidKey: e.FIREBASE_VAPID_KEY } : { enabled: false });
});

r.get('/banners', wrap(async (_q, res) => res.json(await Banner.find({ active: true }).sort('order -createdAt'))));

// Everything the user-app home screen needs, as configured in Admin -> Settings -> App Management.
r.get('/app', wrap(async (_q, res) => {
  const config = await getAppConfig();
  const sec = (k) => config.sections.find((s) => s.key === k);
  const astro = sec('astrologers');
  const base = { status: 'approved' };
  let astrologers;
  if (astro.source === 'manual' && astro.astrologerIds.length) {
    const rows = await Astrologer.find({ ...base, _id: { $in: astro.astrologerIds } }).select(PUBLIC_ASTRO);
    astrologers = astro.astrologerIds.map((id) => rows.find((a) => String(a._id) === id)).filter(Boolean);
  } else {
    const q = astro.source === 'online' ? { ...base, online: true } : astro.source === 'featured' ? { ...base, featured: true } : base;
    // Online and sponsored astrologers always make the cut first, then the best rated.
    const now = new Date();
    const sponsoredQ = { sponsored: true, $or: [{ sponsoredUntil: null }, { sponsoredUntil: { $gt: now } }] };
    const pick = async (extra, n, skip = []) => (n > 0 ? Astrologer.find({ ...q, ...extra, _id: { $nin: skip } }).select(PUBLIC_ASTRO).sort({ online: -1, rating: -1 }).limit(n) : []);
    astrologers = await pick({ online: true }, astro.limit);
    astrologers = [...astrologers, ...(await pick(sponsoredQ, astro.limit - astrologers.length, astrologers.map((a) => a._id)))];
    astrologers = [...astrologers, ...(await pick({}, astro.limit - astrologers.length, astrologers.map((a) => a._id)))];
    // A featured/online list that comes up short is topped up with the best-rated astrologers.
    if (astrologers.length < astro.limit && astro.source !== 'rating') {
      const more = await Astrologer.find({ ...base, _id: { $nin: astrologers.map((a) => a._id) } }).select(PUBLIC_ASTRO).sort({ online: -1, rating: -1 }).limit(astro.limit - astrologers.length);
      astrologers = [...astrologers, ...more];
    }
  }
  const [banners, categories, reports, remedies] = await Promise.all([
    Banner.find({ active: true }).sort('order -createdAt'),
    Category.find({ active: true }).sort('order -createdAt'),
    Report.find({ active: true }).sort('-createdAt').limit(sec('reports').limit),
    Remedy.find({ active: true }).sort('-createdAt').limit(sec('remedies').limit),
  ]);
  const settings = Object.fromEntries((await Setting.find({ key: { $in: ['rechargePacks', 'popularPack'] } })).map((x) => [x.key, x.value]));
  const packs = Array.isArray(settings.rechargePacks) && settings.rechargePacks.length ? settings.rechargePacks : [100, 200, 500];
  const [p, system] = await Promise.all([getPricing(), getSystem()]);
  res.json({
    config, banners, categories, astrologers: astro.source === 'manual' && astro.astrologerIds.length ? publicAstro(astrologers, p) : orderAstro(publicAstro(astrologers, p)), reports, remedies,
    wallet: { packs, popular: settings.popularPack ?? packs[1] ?? packs[0], minRecharge: p.recharge.min, maxRecharge: p.recharge.max, gstPct: p.recharge.gstPct, feePct: p.recharge.feePct, minMinutes: p.consultation.minMinutes, sessionFee: p.consultation.sessionFee },
    payments: publicPayments(p),
    services: publicServices(p),
    system: publicSystem(system),
  });
}));

// Horoscope content is managed entirely from the admin panel.
r.get('/horoscopes', wrap(async (req, res) => {
  const period = ['daily', 'weekly', 'monthly'].includes(req.query.period) ? req.query.period : 'daily';
  const rows = await Horoscope.find({ period }).select('-_id sign period text lucky scores updatedAt');
  res.json(SIGNS.map((s) => rows.find((x) => x.sign === s)).filter(Boolean));
}));

// Location-aware: pass lat/lon/tz of the user's place. Defaults to New Delhi.
const coords = (q) => {
  const lat = +q.lat, lon = +q.lon;
  const ok = q.lat !== undefined && q.lon !== undefined && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  return ok ? { lat, lon, tz: isValidTz(q.tz) ? q.tz : DEFAULT_TZ } : { lat: 28.6139, lon: 77.209, tz: DEFAULT_TZ };
};
r.get('/panchang', wrap(async (req, res) => {
  const loc = coords(req.query);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : todayIn(loc.tz);
  res.json(panchang(date, loc));
}));

// Birth-place search (real coordinates + IANA timezone), used for Kundli accuracy.
r.get('/places', wrap(async (req, res) => res.json(await searchPlaces(req.query.q))));

r.post('/kundli', wrap(async (req, res) => {
  const { dob, tob, lat, lon, tz } = req.body;
  if (!dob) return res.status(400).json({ message: 'Date of birth is required' });
  res.json(buildKundli({ dob, tob, lat: lat === '' || lat == null ? undefined : +lat, lon: lon === '' || lon == null ? undefined : +lon, tz: isValidTz(tz) ? tz : undefined }));
}));

r.post('/match', wrap(async (req, res) => {
  const { boy, girl } = req.body;
  if (!boy?.dob || !girl?.dob) return res.status(400).json({ message: 'Both birth dates are required' });
  const prep = (p) => ({ dob: p.dob, tob: p.tob, lat: p.lat === '' || p.lat == null ? undefined : +p.lat, lon: p.lon === '' || p.lon == null ? undefined : +p.lon, tz: isValidTz(p.tz) ? p.tz : undefined });
  const kb = buildKundli(prep(boy)), kg = buildKundli(prep(girl));
  res.json({ boy: { rashi: kb.rashi, nakshatra: kb.nakshatra }, girl: { rashi: kg.rashi, nakshatra: kg.nakshatra }, ...matchKundli(kb, kg) });
}));

r.get('/astrologers', wrap(async (req, res) => {
  const { language, expertise, q, sort = 'rating', online } = req.query;
  const f = { status: 'approved' };
  if (language) f.languages = language;
  if (expertise) f.expertise = expertise;
  if (online === '1') f.online = true;
  if (q) f.name = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const sorts = { rating: { rating: -1, ratingCount: -1 }, price: { pricePerMin: 1 }, experience: { experience: -1 } };
  const list = publicAstro(await Astrologer.find(f).select(PUBLIC_ASTRO).sort(sorts[sort] || sorts.rating), await getPricing());
  // Online astrologers first, sponsored / featured first inside each group.
  res.json(orderAstro(list));
}));

r.get('/astrologers/:id', wrap(async (req, res) => {
  const a = await Astrologer.findOne({ _id: req.params.id, status: 'approved' }).select('-password -kyc -walletBalance -fcmTokens');
  if (!a) return res.status(404).json({ message: 'Astrologer not found' });
  const reviews = await Review.find({ astrologer: a._id }).populate('user', 'name').sort('-createdAt').limit(20);
  res.json({ ...publicAstro([a], await getPricing())[0], reviews: reviews.map((x) => ({ _id: x._id, rating: x.rating, comment: x.comment, user: x.user?.name || 'User', createdAt: x.createdAt })) });
}));

r.get('/reports', wrap(async (_q, res) => res.json(await Report.find({ active: true }))));
r.get('/remedies', wrap(async (_q, res) => res.json(await Remedy.find({ active: true }))));

// Live platform numbers (shown on the landing page and the login trust strip). Nothing here is hard-coded.
r.get('/stats', wrap(async (_q, res) => {
  const [astrologers, online, consultations, reviewAgg, bonus] = await Promise.all([
    Astrologer.countDocuments({ status: 'approved' }),
    Astrologer.countDocuments({ status: 'approved', online: true }),
    Session.countDocuments({ status: 'completed' }),
    Review.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]),
    Setting.findOne({ key: 'welcomeBonus' }),
  ]);
  const rv = reviewAgg[0];
  res.json({ astrologers, online, consultations, rating: rv ? +rv.avg.toFixed(1) : null, reviews: rv?.n || 0, welcomeBonus: Math.max(0, +bonus?.value || 0) });
}));

// Public policies (Terms of Service, Privacy Policy, Refund Policy)
r.get('/policies/:key', wrap(async (req, res) => {
  const allowed = ['terms_of_service', 'privacy_policy', 'refund_policy'];
  const key = req.params.key;
  if (!allowed.includes(key)) return res.status(404).json({ message: 'Policy not found' });
  const row = await Setting.findOne({ key });
  res.json(row?.value || { title: key.replace(/_/g, ' '), content: '', lastUpdated: '' });
}));

export default r;
