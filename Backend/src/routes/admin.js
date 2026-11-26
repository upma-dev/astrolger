import { Router } from 'express';
import { User, Astrologer, Session, Transaction, Withdrawal, Banner, Category, Horoscope, Report, Remedy, Ticket, Purchase, Setting, Notification, Plan, Subscription } from '../models/index.js';
import { getPricing, savePricing, ratesPatch } from '../services/pricing.js';
import { getAppConfig, saveAppConfig } from '../services/appConfig.js';
import { getSystem, saveSystem, broadcast } from '../services/system.js';
import { addMessage, thread } from '../services/support.js';
import { saveToken, removeToken, pushUser, pushAstrologer, pushRole } from '../services/push.js';
import { saveDataUrl } from '../services/uploads.js';
import { auth, wrap } from '../middleware/auth.js';
import { SIGNS, generateHoroscope } from '../services/astro.js';

const r = Router();
r.use(auth('admin'));
r.get('/me', (req, res) => res.json({ _id: req.admin._id, name: req.admin.name, email: req.admin.email }));
r.post('/push-token', wrap(async (req, res) => res.json({ ok: await saveToken('admin', req.admin._id, req.body.token) })));
r.post('/push-token/remove', wrap(async (req, res) => { await removeToken('admin', req.body.token); res.json({ ok: true }); }));

const sum = (match, field) => Transaction.aggregate([{ $match: match }, { $group: { _id: null, t: { $sum: `$${field}` } } }]).then((x) => x[0]?.t || 0);
const daysAgo = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return d; };

r.get('/dashboard', wrap(async (_q, res) => {
  const [users, astrologers, pendingAstro, live, sessions, platformRev, recharge, pendingWd] = await Promise.all([
    User.countDocuments(), Astrologer.countDocuments({ status: 'approved' }), Astrologer.countDocuments({ status: 'pending' }),
    Session.find({ status: 'active' }).populate('user', 'name').populate('astrologer', 'name'),
    Session.countDocuments({ status: 'completed' }),
    sum({ ownerType: 'platform' }, 'amount'), sum({ ownerType: 'user', kind: 'recharge' }, 'amount'),
    Withdrawal.countDocuments({ status: 'pending' }),
  ]);
  const since = daysAgo(13);
  const [rev, signups, consults] = await Promise.all([
    Transaction.aggregate([{ $match: { ownerType: 'platform', createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, v: { $sum: '$amount' } } }]),
    User.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, v: { $sum: 1 } } }]),
    Session.aggregate([{ $match: { status: 'completed', createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, v: { $sum: 1 } } }]),
  ]);
  const fill = (rows) => Array.from({ length: 14 }, (_, i) => { const d = daysAgo(13 - i).toISOString().slice(0, 10); return { date: d, value: rows.find((x) => x._id === d)?.v || 0 }; });
  res.json({
    totals: { users, astrologers, pendingAstro, completedSessions: sessions, platformRevenue: platformRev, totalRecharge: recharge, pendingWithdrawals: pendingWd },
    live: live.map((s) => ({ _id: s._id, user: s.user?.name || 'User', astrologer: s.astrologer?.name, type: s.type, startedAt: s.startedAt, minutes: s.minutes })),
    series: { revenue: fill(rev), signups: fill(signups), consultations: fill(consults) },
  });
}));

// ---- Users ----
r.get('/users', wrap(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json(await User.find({}).sort('-createdAt').limit(200));
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const digits = q.replace(/[^\d+]/g, '');
  const or = [{ name: new RegExp(esc(q), 'i') }];
  if (digits) or.push({ phone: new RegExp(esc(digits)) });
  res.json(await User.find({ $or: or }).sort('-createdAt').limit(200));
}));
r.post('/users/:id/block', wrap(async (req, res) => res.json(await User.findByIdAndUpdate(req.params.id, { blocked: !!req.body.blocked }, { new: true }))));
// Support: ?app=user (Users > Queries & support) or ?app=astrologer (Astrologers > Support queries).
r.get('/tickets', wrap(async (req, res) => {
  const f = req.query.app === 'astrologer' ? { app: 'astrologer' } : req.query.app === 'user' ? { app: { $ne: 'astrologer' } } : {};
  const list = await Ticket.find(f).populate('user', 'name phone').populate('astrologer', 'name phone avatar').sort('-updatedAt').limit(300);
  res.json(list.map(thread));
}));
r.post('/tickets/:id/reply', wrap(async (req, res) => {
  const t = await Ticket.findById(req.params.id);
  if (!t) return res.status(404).json({ message: 'Ticket not found' });
  await addMessage(t, 'admin', req.body.reply);
  if (req.body.resolve !== false) t.status = 'resolved';
  await t.save();
  // Live in the customer / astrologer app if it is open.
  const io = req.app.get('io');
  if (io && t.user) io.to(`user:${t.user}`).emit('support:reply', { id: String(t._id) });
  if (io && t.astrologer) io.to(`astro:${t.astrologer}`).emit('support:reply', { id: String(t._id) });
  io?.to('admins').emit('pending:refresh');
  const replyMsg = { title: 'Support replied to your query', body: String(req.body.reply || '').slice(0, 200), kind: 'chat', tag: `ticket-${t._id}` };
  if (t.app === 'astrologer') pushAstrologer(t.astrologer, { ...replyMsg, link: '/vendor/profile' });
  else pushUser(t.user, { ...replyMsg, link: '/user/profile' });
  res.json(thread(await t.populate([{ path: 'user', select: 'name phone' }, { path: 'astrologer', select: 'name phone avatar' }])));
}));
r.post('/tickets/:id/status', wrap(async (req, res) => {
  const status = req.body.status === 'resolved' ? 'resolved' : 'open';
  const doc = await Ticket.findByIdAndUpdate(req.params.id, { status, unreadAdmin: false }, { new: true });
  if (!doc) return res.status(404).json({ message: 'Ticket not found' });
  req.app.get('io')?.to('admins').emit('pending:refresh');
  res.json(thread(doc));
}));
r.post('/tickets/:id/read', wrap(async (req, res) => { await Ticket.updateOne({ _id: req.params.id }, { unreadAdmin: false }); res.json({ ok: true }); }));

// ---- Astrologers ----
r.get('/astrologers', wrap(async (req, res) => res.json(await Astrologer.find(req.query.status ? { status: req.query.status } : {}).select('-password -fcmTokens').sort('-createdAt'))));
r.put('/astrologers/:id', wrap(async (req, res) => {
  const { status, commissionPct, commissionCustom, featured, kycStatus, sponsored, sponsorDays, sponsorRank } = req.body;
  const patch = {};
  if (req.body.rates !== undefined || req.body.pricePerMin !== undefined || req.body.durations !== undefined || req.body.autoCut !== undefined) {
    const cur = await Astrologer.findById(req.params.id);
    if (!cur) return res.status(404).json({ message: 'Astrologer not found' });
    const { patch: rp, error } = ratesPatch(req.body, cur, await getPricing(), false);
    if (error) return res.status(400).json({ message: error });
    if (rp) Object.assign(patch, rp);
  }
  if (status) patch.status = status;
  // A % entered here replaces the service rule's commission for this astrologer; commissionCustom:false goes back to the rule.
  if (commissionPct !== undefined) { patch.commissionPct = Math.min(90, Math.max(0, +commissionPct)); patch.commissionCustom = true; }
  if (commissionCustom === false) patch.commissionCustom = false;
  if (featured !== undefined) patch.featured = !!featured;
  // Sponsored: on for N days (0 / empty = until switched off), shown first in astrologer lists.
  if (sponsored !== undefined) {
    patch.sponsored = !!sponsored;
    const days = Math.max(0, Math.min(3650, Math.round(+sponsorDays) || 0));
    patch.sponsoredUntil = sponsored && days ? new Date(Date.now() + days * 86400e3) : null;
  }
  if (sponsorRank !== undefined) patch.sponsorRank = Math.max(0, Math.min(999, Math.round(+sponsorRank) || 0));
  if (kycStatus) patch['kyc.status'] = kycStatus;
  if (patch.status && patch.status !== 'approved') patch.online = false;
  const before = patch.status ? await Astrologer.findById(req.params.id).select('status').lean() : null;
  const a = await Astrologer.findByIdAndUpdate(req.params.id, patch, { new: true }).select('-password -fcmTokens');
  if (patch.rates || patch.durations || patch.autoCut || patch.featured !== undefined || patch.sponsored !== undefined || patch.sponsorRank !== undefined || patch.status || patch.commissionCustom !== undefined) broadcast(req, 'astrologers');
  if (a && before && before.status !== patch.status) {
    req.app.get('io')?.to('admins').emit('pending:refresh');
    const msg = { approved: ['Your profile is approved 🎉', 'You can now go online and start taking consultations.'], rejected: ['Application not approved', 'Please contact support for details.'], blocked: ['Account blocked', 'Please contact support for details.'] }[patch.status];
    if (msg) pushAstrologer(a._id, { title: msg[0], body: msg[1], link: '/vendor' });
  }
  if (a && patch.sponsored) pushAstrologer(a._id, { title: 'You are now a sponsored astrologer', body: patch.sponsoredUntil ? `Your profile is shown at the top until ${patch.sponsoredUntil.toLocaleDateString('en-IN')}.` : 'Your profile is shown at the top of the list.', link: '/vendor' });
  res.json(a);
}));
r.get('/astrologers/:id/performance', wrap(async (req, res) => {
  const a = await Astrologer.findById(req.params.id).select('-password -fcmTokens');
  if (!a) return res.status(404).json({ message: 'Astrologer not found' });
  const agg = await Session.aggregate([{ $match: { astrologer: a._id, status: 'completed' } }, { $group: { _id: null, sessions: { $sum: 1 }, minutes: { $sum: '$minutes' }, gross: { $sum: '$amount' }, earned: { $sum: '$astrologerEarning' }, platform: { $sum: '$platformEarning' } } }]);
  res.json({ astrologer: a, ...(agg[0] || { sessions: 0, minutes: 0, gross: 0, earned: 0, platform: 0 }) });
}));

// ---- App management (home screen) ----
r.post('/upload', wrap(async (req, res) => res.status(201).json({ url: await saveDataUrl(req.body.dataUrl) })));
r.get('/app-config', wrap(async (_q, res) => res.json(await getAppConfig())));
r.put('/app-config', wrap(async (req, res) => { const c = await saveAppConfig(req.body); broadcast(req, 'app'); res.json(c); }));

// ---- System settings: switch apps on/off, pause sign-ups ----
r.get('/system', wrap(async (_q, res) => res.json(await getSystem())));
r.put('/system', wrap(async (req, res) => {
  const before = await getSystem();
  const s = await saveSystem(req.body);
  // Astrologer app switched off: nobody can stay online for new chats.
  if (before.astrologer.enabled && !s.astrologer.enabled) await Astrologer.updateMany({ online: true }, { online: false });
  broadcast(req, 'system');
  res.json(s);
}));

// ---- Cash-on-delivery orders (remedies / puja) ----
r.get('/orders', wrap(async (req, res) => {
  const f = req.query.payment ? { payment: req.query.payment } : {};
  res.json(await Purchase.find(f).populate('user', 'name phone').sort('-createdAt').limit(300));
}));
r.put('/orders/:id', wrap(async (req, res) => {
  const o = await Purchase.findById(req.params.id);
  if (!o || o.payment !== 'cod') return res.status(404).json({ message: 'COD order not found' });
  const next = req.body.status;
  if (!['cod_collected', 'cancelled'].includes(next) || o.status !== 'cod_pending') return res.status(400).json({ message: 'Only pending COD orders can be marked collected or cancelled' });
  o.status = next;
  await o.save();
  if (next === 'cod_collected') await Transaction.create({ ownerType: 'platform', owner: o._id, kind: o.itemType, direction: 'credit', amount: o.price + (o.codFee || 0), note: `COD collected: ${o.title}`, ref: String(o._id) });
  res.json(await o.populate('user', 'name phone'));
}));

const pick = (body, keys) => Object.fromEntries(keys.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
const BANNER_KEYS = ['title', 'subtitle', 'eyebrow', 'cta', 'link', 'imageUrl', 'color', 'order', 'active'];
const CATEGORY_KEYS = ['label', 'icon', 'imageUrl', 'link', 'tag', 'order', 'active'];
// Posters, services row and store items: any saved change is pushed to open apps.
r.use(['/banners', '/categories', '/reports', '/remedies'], (req, res, next) => {
  if (req.method !== 'GET') res.on('finish', () => res.statusCode < 400 && broadcast(req, 'app'));
  next();
});
for (const [path, Model, keys] of [['banners', Banner, BANNER_KEYS], ['categories', Category, CATEGORY_KEYS]]) {
  r.get(`/${path}`, wrap(async (_q, res) => res.json(await Model.find().sort('order -createdAt'))));
  r.post(`/${path}`, wrap(async (req, res) => {
    const last = await Model.findOne().sort('-order');
    res.status(201).json(await Model.create({ order: (last?.order ?? -1) + 1, ...pick(req.body, keys) }));
  }));
  // Body: { ids: [...] } in the new display order. Declared before /:id so "reorder" is never read as an id.
  r.post(`/${path}/reorder`, wrap(async (req, res) => {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    await Promise.all(ids.map((id, i) => Model.updateOne({ _id: id }, { order: i })));
    res.json({ ok: true });
  }));
  r.put(`/${path}/:id`, wrap(async (req, res) => res.json(await Model.findByIdAndUpdate(req.params.id, pick(req.body, keys), { new: true, runValidators: true }))));
  r.delete(`/${path}/:id`, wrap(async (req, res) => { await Model.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));
}

// ---- Content ----

r.get('/horoscopes', wrap(async (_q, res) => res.json(await Horoscope.find())));
r.put('/horoscopes', wrap(async (req, res) => {
  const { sign, period, text, lucky, scores } = req.body;
  if (!SIGNS.includes(sign) || !['daily', 'weekly', 'monthly'].includes(period)) return res.status(400).json({ message: 'Invalid sign/period' });
  res.json(await Horoscope.findOneAndUpdate({ sign, period }, { text, lucky, scores }, { upsert: true, new: true }));
}));
r.post('/horoscopes/generate', wrap(async (req, res) => {
  // Creates draft text for any missing sign/period (or all, if overwrite=true). Admin can then edit each one.
  const key = new Date().toISOString().slice(0, 10);
  let created = 0;
  for (const sign of SIGNS) for (const period of ['daily', 'weekly', 'monthly']) {
    const exists = await Horoscope.exists({ sign, period });
    if (exists && !req.body.overwrite) continue;
    await Horoscope.findOneAndUpdate({ sign, period }, generateHoroscope(sign, period, key), { upsert: true });
    created++;
  }
  res.json({ created });
}));
r.delete('/horoscopes/:id', wrap(async (req, res) => { await Horoscope.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

for (const [path, Model] of [['reports', Report], ['remedies', Remedy]]) {
  r.get(`/${path}`, wrap(async (_q, res) => res.json(await Model.find().sort('-createdAt'))));
  r.post(`/${path}`, wrap(async (req, res) => res.status(201).json(await Model.create(req.body))));
  r.put(`/${path}/:id`, wrap(async (req, res) => res.json(await Model.findByIdAndUpdate(req.params.id, req.body, { new: true }))));
  r.delete(`/${path}/:id`, wrap(async (req, res) => { await Model.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));
}

// ---- Finance ----
r.get('/transactions', wrap(async (req, res) => {
  const f = {};
  if (req.query.ownerType) f.ownerType = req.query.ownerType;
  if (req.query.kind) f.kind = req.query.kind;
  res.json(await Transaction.find(f).sort('-createdAt').limit(300));
}));
r.get('/withdrawals', wrap(async (_q, res) => res.json(await Withdrawal.find().populate('astrologer', 'name phone kyc').sort('-createdAt').limit(200))));
r.post('/withdrawals/:id', wrap(async (req, res) => {
  const w = await Withdrawal.findOne({ _id: req.params.id, status: 'pending' });
  if (!w) return res.status(404).json({ message: 'Request not pending' });
  const approve = req.body.action === 'pay';
  w.status = approve ? 'paid' : 'rejected';
  w.note = req.body.note;
  await w.save();
  if (approve) {
    if (w.tds > 0) await Transaction.create({ ownerType: 'platform', owner: w._id, kind: 'tds', direction: 'credit', amount: w.tds, note: 'TDS withheld on astrologer payout', ref: String(w._id) });
    if (w.fee > 0) await Transaction.create({ ownerType: 'platform', owner: w._id, kind: 'fee', direction: 'credit', amount: w.fee, note: 'Payout processing fee', ref: String(w._id) });
  }
  if (!approve) {
    const a = await Astrologer.findByIdAndUpdate(w.astrologer, { $inc: { walletBalance: w.amount } }, { new: true });
    if (a) await Transaction.create({ ownerType: 'astrologer', owner: a._id, kind: 'refund', direction: 'credit', amount: w.amount, balanceAfter: a.walletBalance, note: 'Withdrawal rejected', ref: String(w._id) });
  }
  req.app.get('io')?.to('admins').emit('pending:refresh');
  res.json(w);
}));

// ---- Pricing & fees ----
r.get('/pricing', wrap(async (_q, res) => res.json(await getPricing())));
r.put('/pricing', wrap(async (req, res) => { const p = await savePricing(req.body); broadcast(req, 'pricing'); res.json(p); }));

// Money summary from the platform ledger: what the platform earned and what it holds for taxes.
r.get('/finance-summary', wrap(async (_q, res) => {
  const [byKind, payouts, subs] = await Promise.all([
    Transaction.aggregate([{ $match: { ownerType: 'platform' } }, { $group: { _id: { kind: '$kind', dir: '$direction' }, total: { $sum: '$amount' } } }]),
    Withdrawal.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, gross: { $sum: '$amount' }, tds: { $sum: '$tds' }, fee: { $sum: '$fee' }, net: { $sum: { $ifNull: ['$net', '$amount'] } } } }]),
    Subscription.aggregate([{ $group: { _id: '$ownerType', count: { $sum: 1 }, revenue: { $sum: '$price' } } }]),
  ]);
  const k = (kind) => byKind.filter((x) => x._id.kind === kind).reduce((s, x) => s + (x._id.dir === 'credit' ? x.total : -x.total), 0);
  const recharges = await Transaction.aggregate([{ $match: { ownerType: 'user', kind: 'recharge' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
  const r2 = (n) => Math.round(n * 100) / 100;
  res.json({
    walletRecharged: r2(recharges[0]?.total || 0),
    commission: r2(k('consultation')), platformFees: r2(k('platform_fee')), convenienceFees: r2(k('fee')),
    reports: r2(k('report')), remedies: r2(k('remedy')), subscriptions: r2(k('subscription')),
    gstCollected: r2(k('gst')), tdsDeducted: r2(payouts[0]?.tds || 0), payoutFees: r2(payouts[0]?.fee || 0),
    paidToAstrologers: r2(payouts[0]?.net || 0),
    subscribers: Object.fromEntries(subs.map((x) => [x._id, { count: x.count, revenue: r2(x.revenue) }])),
  });
}));

// ---- Subscription plans ----
const PLAN_KEYS = ['audience', 'name', 'description', 'price', 'durationDays', 'discountPct', 'commissionCut', 'featured', 'perks', 'active', 'order'];
const cleanPlan = (b) => {
  const p = Object.fromEntries(Object.entries(b || {}).filter(([k]) => PLAN_KEYS.includes(k)));
  if (p.price !== undefined) p.price = Math.max(0, Math.round(+p.price || 0));
  if (p.durationDays !== undefined) p.durationDays = Math.min(3650, Math.max(1, Math.round(+p.durationDays || 30)));
  if (p.discountPct !== undefined) p.discountPct = Math.min(90, Math.max(0, +p.discountPct || 0));
  if (p.commissionCut !== undefined) p.commissionCut = Math.min(90, Math.max(0, +p.commissionCut || 0));
  if (p.perks !== undefined) p.perks = [].concat(p.perks || []).map((x) => String(x).trim().slice(0, 80)).filter(Boolean).slice(0, 8);
  return p;
};
// Each plan comes with how many people hold it right now and what it has earned.
r.get('/plans', wrap(async (req, res) => {
  const plans = await Plan.find(req.query.audience ? { audience: req.query.audience } : {}).sort('audience order price').lean();
  const stats = await Subscription.aggregate([
    { $match: { plan: { $in: plans.map((p) => p._id) } } },
    { $group: { _id: '$plan', sold: { $sum: 1 }, revenue: { $sum: '$price' }, active: { $sum: { $cond: [{ $gt: ['$endsAt', new Date()] }, 1, 0] } } } },
  ]);
  res.json(plans.map((p) => { const x = stats.find((s) => String(s._id) === String(p._id)); return { ...p, sold: x?.sold || 0, activeSubscribers: x?.active || 0, revenue: x?.revenue || 0 }; }));
}));
r.use('/plans', (req, res, next) => { if (req.method !== 'GET') res.on('finish', () => res.statusCode < 400 && broadcast(req, 'plans')); next(); });
r.post('/plans', wrap(async (req, res) => {
  const p = cleanPlan(req.body);
  if (!['user', 'astrologer'].includes(p.audience) || !p.name || !(p.price >= 0)) return res.status(400).json({ message: 'Audience, name and price are required' });
  res.status(201).json(await Plan.create(p));
}));
r.put('/plans/:id', wrap(async (req, res) => res.json(await Plan.findByIdAndUpdate(req.params.id, cleanPlan(req.body), { new: true, runValidators: true }))));
r.delete('/plans/:id', wrap(async (req, res) => { await Plan.findByIdAndUpdate(req.params.id, { active: false }); res.json({ ok: true }); }));
r.get('/subscriptions', wrap(async (req, res) => {
  const f = req.query.ownerType ? { ownerType: req.query.ownerType } : {};
  const subs = await Subscription.find(f).sort('-createdAt').limit(200).lean();
  const [users, astros] = await Promise.all([
    User.find({ _id: { $in: subs.filter((s) => s.ownerType === 'user').map((s) => s.owner) } }).select('name phone'),
    Astrologer.find({ _id: { $in: subs.filter((s) => s.ownerType === 'astrologer').map((s) => s.owner) } }).select('name phone'),
  ]);
  const who = (s) => (s.ownerType === 'user' ? users : astros).find((x) => String(x._id) === String(s.owner));
  res.json(subs.map((s) => ({ ...s, who: who(s) || null, active: new Date(s.endsAt) > new Date() })));
}));

r.get('/commission', wrap(async (_q, res) => {
  const rows = await Session.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: '$astrologer', gross: { $sum: '$amount' }, platform: { $sum: '$platformEarning' }, earned: { $sum: '$astrologerEarning' }, sessions: { $sum: 1 } } }, { $sort: { platform: -1 } }]);
  const names = await Astrologer.find({ _id: { $in: rows.map((x) => x._id) } }).select('name commissionPct');
  res.json(rows.map((x) => ({ ...x, astrologer: names.find((n) => String(n._id) === String(x._id)) })));
}));

// ---- Reports ----
r.get('/analytics', wrap(async (_q, res) => {
  const [byType, byHour, topAstro, purchases] = await Promise.all([
    Session.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: '$type', count: { $sum: 1 }, revenue: { $sum: '$amount' } } }]),
    Session.aggregate([{ $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Session.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: '$astrologer', revenue: { $sum: '$amount' }, sessions: { $sum: 1 } } }, { $sort: { revenue: -1 } }, { $limit: 5 }]),
    Purchase.aggregate([{ $group: { _id: '$itemType', count: { $sum: 1 }, revenue: { $sum: '$price' } } }]),
  ]);
  const names = await Astrologer.find({ _id: { $in: topAstro.map((x) => x._id) } }).select('name');
  res.json({ byType, byHour, purchases, topAstrologers: topAstro.map((x) => ({ ...x, name: names.find((n) => String(n._id) === String(x._id))?.name })) });
}));

r.get('/settings', wrap(async (_q, res) => { const rows = await Setting.find(); res.json(Object.fromEntries(rows.map((x) => [x.key, x.value]))); }));
r.put('/settings', wrap(async (req, res) => {
  const allowed = { minRecharge: [1, 100000], welcomeBonus: [0, 10000], defaultCommission: [0, 90] };
  if (req.body.rechargePacks !== undefined) {
    const packs = [...new Set((Array.isArray(req.body.rechargePacks) ? req.body.rechargePacks : []).map((v) => Math.round(+v)).filter((v) => v >= 10 && v <= 50000))].sort((a, b) => a - b).slice(0, 6);
    if (packs.length) await Setting.findOneAndUpdate({ key: 'rechargePacks' }, { value: packs }, { upsert: true });
  }
  if (req.body.popularPack !== undefined) await Setting.findOneAndUpdate({ key: 'popularPack' }, { value: Math.round(+req.body.popularPack) || 0 }, { upsert: true });
  for (const [key, value] of Object.entries(req.body)) {
    if (!allowed[key]) continue;
    const [lo, hi] = allowed[key];
    await Setting.findOneAndUpdate({ key }, { value: Math.min(hi, Math.max(lo, Math.round(+value) || 0)) }, { upsert: true });
  }
  broadcast(req, 'pricing');
  res.json({ ok: true });
}));

// ---- Pending Tasks & Notifications (Eqosy topbar panel) ----
r.get('/pending-tasks', wrap(async (_q, res) => {
  const [approvals, withdrawals, support] = await Promise.all([
    Astrologer.find({ status: 'pending' }).sort('-createdAt').limit(20).select('name phone experience expertise createdAt kyc'),
    Withdrawal.find({ status: 'pending' }).populate('astrologer', 'name phone kyc').sort('-createdAt').limit(20),
    Ticket.find({ status: 'open' }).populate('user', 'name phone').populate('astrologer', 'name phone').sort('-updatedAt').limit(40),
  ]);
  // Open queries per app: customer ones badge Users > Queries & support, astrologer ones badge Astrologers > Support queries.
  const supportAstro = support.filter((t) => t.app === 'astrologer').length;
  const counts = {
    approvals: approvals.length,
    withdrawals: withdrawals.length,
    support: support.length - supportAstro,
    supportAstro,
    total: approvals.length + withdrawals.length + support.length,
  };
  res.json({ approvals, withdrawals, support, counts });
}));

// ---- Policies (Terms of Service, Privacy Policy, Refund Policy) ----
const POLICY_KEYS = ['terms_of_service', 'privacy_policy', 'refund_policy'];
r.get('/policies', wrap(async (_q, res) => {
  const settings = await Setting.find({ key: { $in: POLICY_KEYS } });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  res.json({
    terms_of_service: map.terms_of_service || { title: 'Terms of Service', content: '', lastUpdated: new Date().toISOString().slice(0, 10) },
    privacy_policy: map.privacy_policy || { title: 'Privacy Policy', content: '', lastUpdated: new Date().toISOString().slice(0, 10) },
    refund_policy: map.refund_policy || { title: 'Refund & Cancellation Policy', content: '', lastUpdated: new Date().toISOString().slice(0, 10) },
  });
}));

r.put('/policies/:key', wrap(async (req, res) => {
  const { key } = req.params;
  if (!POLICY_KEYS.includes(key)) return res.status(400).json({ message: 'Invalid policy key' });
  const { title, content } = req.body;
  const updated = {
    title: String(title || '').trim() || key.replace(/_/g, ' ').toUpperCase(),
    content: String(content || '').trim(),
    lastUpdated: new Date().toISOString().slice(0, 10),
  };
  await Setting.findOneAndUpdate({ key }, { value: updated }, { upsert: true, new: true });
  res.json({ ok: true, policy: updated });
}));

// ---- Broadcast & In-App Notifications ----
r.get('/notifications', wrap(async (_q, res) => {
  const list = await Notification.find().sort('-createdAt').limit(100);
  res.json(list);
}));

r.post('/notifications', wrap(async (req, res) => {
  const { title, message, target = 'all', type = 'broadcast', link = '' } = req.body;
  if (!title || !message) return res.status(400).json({ message: 'Title and message are required' });
  const n = await Notification.create({
    title: title.trim(),
    message: message.trim(),
    target,
    type,
    link: link.trim(),
    sentBy: req.admin._id,
  });
  const io = req.app.get('io');
  if (io) {
    if (target === 'all' || target === 'user') io.to('role:user').emit('notification:new', n);
    if (target === 'all' || target === 'astrologer') io.to('role:astrologer').emit('notification:new', n);
  }
  // Same notification as a Firebase push (reaches phones / closed tabs).
  const pushMsg = { title: n.title, body: n.message, kind: n.type === 'alert' ? 'request' : 'info', tag: `broadcast-${n._id}` };
  if (target === 'all' || target === 'user') pushRole('user', { ...pushMsg, link: n.link || '/user' });
  if (target === 'all' || target === 'astrologer') pushRole('astrologer', { ...pushMsg, link: n.link || '/vendor' });
  res.status(201).json(n);
}));

r.delete('/notifications/:id', wrap(async (req, res) => {
  await Notification.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

export default r;
