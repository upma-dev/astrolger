import { Router } from 'express';
import { User, Astrologer, Session, Message, Review, Transaction, Report, Remedy, Purchase, Ticket, Setting, Plan, Subscription } from '../models/index.js';
import { getPricing, quoteRecharge, sessionRates, isActive, r2, onlineMethods } from '../services/pricing.js';
import { auth, wrap } from '../middleware/auth.js';
import { creditUser, debitUser } from '../services/wallet.js';
import { SIGNS, birthSummary } from '../services/astro.js';
import { isValidTz, isValidLocalDateTime } from '../services/time.js';
import { endSession, notifyQueueWaiters } from '../services/sessions.js';
import { respondCallConfig } from '../services/agora.js';
import { recomputeRating } from './adminPanel.js';
import { addMessage, createTicket, notifyAdmins, thread } from '../services/support.js';
import { saveToken, removeToken, pushAstrologer, alertAdmins } from '../services/push.js';

const r = Router();
r.use(auth('user'));

r.get('/me', (req, res) => res.json(req.user));

// Firebase push token of this browser / phone.
r.post('/push-token', wrap(async (req, res) => res.json({ ok: await saveToken('user', req.user._id, req.body.token) })));
r.post('/push-token/remove', wrap(async (req, res) => { await removeToken('user', req.body.token); res.json({ ok: true }); }));

const pushRequest = (a, s, u) => pushAstrologer(a._id, {
  title: `New ${(s.type === 'audio' ? 'audio call' : s.type === 'video' ? 'video call' : 'chat')} request`,
  body: `${u.name || 'A user'} wants to start a ${(s.type === 'audio' ? 'audio call' : s.type === 'video' ? 'video call' : 'chat')} with you`,
  link: '/vendor/requests', kind: 'request', tag: `request-${s._id}`, data: { sessionId: s._id },
});

r.put('/me', wrap(async (req, res) => {
  const { name, gender, dob, tob, pob, lat, lon, tz, email } = req.body;
  if (dob !== undefined && dob && (!isValidLocalDateTime(dob, '12:00') || new Date(`${String(dob).trim()}T00:00:00Z`) > new Date())) return res.status(400).json({ message: 'Enter a valid date of birth' });
  if (tob !== undefined && tob && !isValidLocalDateTime('2000-01-01', tob)) return res.status(400).json({ message: 'Enter a valid time of birth' });
  const patch = { name, gender, dob, tob, pob, email };
  if (lat !== undefined && lat !== '' && Number.isFinite(+lat) && Math.abs(+lat) <= 90) patch.lat = +lat;
  if (lon !== undefined && lon !== '' && Number.isFinite(+lon) && Math.abs(+lon) <= 180) patch.lon = +lon;
  if (tz !== undefined) patch.tz = isValidTz(tz) ? tz : undefined;
  Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);
  // Rashi etc. are always recomputed from the saved birth details, never taken from the client.
  const m = { ...req.user.toObject(), ...patch };
  let chart = null;
  if (m.dob) {
    chart = birthSummary({ dob: m.dob, tob: m.tob, lat: m.lat, lon: m.lon, tz: m.tz });
    Object.assign(patch, { zodiac: chart.rashi, nakshatra: chart.nakshatra, sunSign: chart.sunSign, lagna: chart.lagna || null, rashiCertain: chart.rashiCertain });
  }
  const u = await User.findByIdAndUpdate(req.user._id, patch, { new: true });
  res.json({ ...u.toObject(), chart });
}));

// ---- Wallet ----
r.get('/wallet', wrap(async (req, res) => {
  const txs = await Transaction.find({ ownerType: 'user', owner: req.user._id }).sort('-createdAt').limit(100);
  res.json({ balance: req.user.walletBalance, transactions: txs });
}));

// Price breakdown before paying: wallet credit + GST + gateway fee = total.
r.get('/wallet/quote', wrap(async (req, res) => {
  const p = await getPricing();
  const amount = Math.round(+req.query.amount);
  if (!(amount >= p.recharge.min && amount <= p.recharge.max)) return res.status(400).json({ message: `Amount must be between ₹${p.recharge.min} and ₹${p.recharge.max}` });
  res.json(quoteRecharge(amount, p));
}));

// Dev/mock gateway: credits instantly. For production replace with Razorpay order + webhook verification
// (charge `total`, credit `walletCredit` on the verified webhook).
r.post('/wallet/recharge', wrap(async (req, res) => {
  const p = await getPricing();
  const amount = Math.round(+req.body.amount);
  if (!(amount >= p.recharge.min && amount <= p.recharge.max)) return res.status(400).json({ message: `Amount must be between ₹${p.recharge.min} and ₹${p.recharge.max}` });
  // Payment methods switched on in Price management > Payments.
  const methods = onlineMethods(p);
  if (!methods.length) return res.status(403).json({ message: 'Online payments are paused right now. Please try again later.' });
  const method = methods.includes(req.body.method) ? req.body.method : null;
  if (!method) return res.status(400).json({ message: `Choose a payment method: ${methods.join(', ')}` });
  const q = quoteRecharge(amount, p);
  const ref = `mock_${Date.now()}`;
  const u = await creditUser(req.user._id, q.walletCredit, 'recharge', `Wallet recharge via ${method} (paid ₹${q.total} incl. GST)`, ref, q);
  // Platform ledger: GST collected (payable to government) and the gateway/convenience fee.
  if (q.gst > 0) await Transaction.create({ ownerType: 'platform', owner: u._id, kind: 'gst', direction: 'credit', amount: q.gst, note: `GST ${q.gstPct}% on recharge`, ref, meta: q });
  if (q.fee > 0) await Transaction.create({ ownerType: 'platform', owner: u._id, kind: 'fee', direction: 'credit', amount: q.fee, note: `Convenience fee ${q.feePct}% on recharge`, ref, meta: q });
  // Admin panel: ring + toast + push for every recharge.
  alertAdmins(req.app.get('io'), {
    title: `Wallet recharge ₹${q.walletCredit}`,
    body: `${u.name || u.phone || 'A user'} added ₹${q.walletCredit} (paid ₹${q.total} via ${method})`,
    link: '/admin/users/payments', tag: `recharge-${ref}`,
  });
  res.json({ balance: u.walletBalance, gateway: 'mock', quote: q });
}));

// ---- Consultation ----
const requestPayload = (s, u) => ({
  _id: s._id,
  type: s.type,
  createdAt: s.createdAt,
  user: { _id: u._id, name: u.name, gender: u.gender, zodiac: u.zodiac, dob: u.dob, tob: u.tob, pob: u.pob },
});

r.post('/sessions', wrap(async (req, res) => {
  const { astrologerId } = req.body;
  const type = ['chat', 'audio', 'video'].includes(req.body.type) ? req.body.type : 'chat';
  const a = await Astrologer.findOne({ _id: astrologerId, status: 'approved' });
  if (!a) return res.status(404).json({ message: 'Astrologer not found' });
  if (!a.online) return res.status(409).json({ message: 'Astrologer is offline right now' });
  const p = await getPricing();
  if (!p.services[type].enabled) return res.status(400).json({ message: `${p.services[type].label} is not available right now` });
  const rt = sessionRates(a, req.user, p, type);
  if (req.user.walletBalance < rt.minBalance) return res.status(402).json({ message: `Minimum balance of ₹${rt.minBalance} required (${rt.minMinutes} min${rt.sessionFee ? ' + platform fee' : ''}). Please recharge.` });

  const active = await Session.findOne({ user: req.user._id, status: 'active' });
  if (active) {
    if (String(active.astrologer) === String(a._id)) return res.json(active);
    return res.status(409).json({ message: 'You already have an active consultation. Please end it before starting a new one.', sessionId: active._id });
  }

  // Cancel any stale unaccepted requests for another astrologer/type so the new request always reaches the chosen astrologer.
  const io = req.app.get('io');
  const pending = await Session.find({ user: req.user._id, status: 'requested' }).sort('-createdAt');
  const same = pending.find((x) => String(x.astrologer) === String(a._id) && x.type === type);
  const stale = pending.filter((x) => !same || String(x._id) !== String(same._id));
  if (stale.length) {
    await Session.updateMany({ _id: { $in: stale.map((x) => x._id) } }, { status: 'cancelled' });
    [...new Set(stale.map((x) => String(x.astrologer)))].forEach((aid) => {
      io?.to(`astro:${aid}`).emit('queue:refresh');
      notifyQueueWaiters(io, aid).catch(() => {});
    });
  }
  if (same) {
    const position = await Session.countDocuments({ astrologer: a._id, status: 'requested', createdAt: { $lte: same.createdAt } });
    io?.to(`astro:${a._id}`).emit('queue:refresh');
    io?.to(`astro:${a._id}`).emit('session:request', requestPayload(same, req.user));
    pushRequest(a, same, req.user);
    return res.json({ ...same.toObject(), queuePosition: position, astrologerBusy: a.busy });
  }

  const s = await Session.create({
    user: req.user._id, astrologer: a._id, type, pricePerMin: rt.pricePerMin, userPricePerMin: rt.userPricePerMin, discountPct: rt.discountPct, commissionPct: rt.commissionPct,
    sessionFee: rt.sessionFee, sessionFeeTotal: rt.sessionFeeTotal, block: rt.block, maxMinutes: rt.maxMinutes, listedBlock: rt.listedBlock, userBlock: rt.userBlock, astroBlock: rt.astroBlock,
    chargePerBlock: rt.chargePerBlock, feePct: rt.feePct, gstPct: rt.gstPct, commissionType: rt.commissionType, commission: rt.commission,
  });
  const position = await Session.countDocuments({ astrologer: a._id, status: 'requested', createdAt: { $lte: s.createdAt } });
  io?.to(`astro:${a._id}`).emit('queue:refresh');
  io?.to(`astro:${a._id}`).emit('session:request', requestPayload(s, req.user));
  pushRequest(a, s, req.user);
  res.status(201).json({ ...s.toObject(), queuePosition: position, astrologerBusy: a.busy });
}));

r.get('/sessions', wrap(async (req, res) => res.json(await Session.find({ user: req.user._id }).populate('astrologer', 'name avatar').sort('-createdAt').limit(50))));

r.get('/sessions/:id', wrap(async (req, res) => {
  const s = await Session.findOne({ _id: req.params.id, user: req.user._id }).populate('astrologer', 'name avatar pricePerMin online');
  if (!s) return res.status(404).json({ message: 'Not found' });
  const position = s.status === 'requested' && s.astrologer?._id ? await Session.countDocuments({ astrologer: s.astrologer._id, status: 'requested', createdAt: { $lte: s.createdAt } }) : 0;
  res.json({ ...s.toObject(), queuePosition: position, messages: await Message.find({ session: s._id }).sort('createdAt') });
}));

r.post('/sessions/:id/cancel', wrap(async (req, res) => {
  const s = await Session.findOneAndUpdate({ _id: req.params.id, user: req.user._id, status: 'requested' }, { status: 'cancelled' }, { new: true });
  if (s) {
    const io = req.app.get('io');
    io?.to(`astro:${s.astrologer}`).emit('queue:refresh');
    notifyQueueWaiters(io, s.astrologer).catch(() => {});
    return res.json(s);
  }
  const existing = await Session.findOne({ _id: req.params.id, user: req.user._id }).select('status');
  res.json(existing || { message: 'Nothing to cancel' });
}));

r.post('/sessions/:id/end', wrap(async (req, res) => {
  const own = await Session.exists({ _id: req.params.id, user: req.user._id });
  if (!own) return res.status(404).json({ message: 'Not found' });
  const s = await endSession(req.app.get('io'), req.params.id, 'ended');
  res.json(s || { message: 'Already ended' });
}));

r.post(['/sessions/:id/call-config', '/sessions/:id/agora-token'], wrap(async (req, res) => {
  const s = await Session.findOne({ _id: req.params.id, user: req.user._id }).select('type status');
  return respondCallConfig(res, s, 'user');
}));

r.post('/sessions/:id/review', wrap(async (req, res) => {
  const s = await Session.findOne({ _id: req.params.id, user: req.user._id, status: 'completed' });
  if (!s) return res.status(404).json({ message: 'Session not found' });
  if (s.rated) return res.status(409).json({ message: 'Already reviewed' });
  const raw = req.body.rating;
  const parsed = raw === '' || raw === null || raw === undefined ? NaN : Number(raw);
  if (!Number.isFinite(parsed)) return res.status(400).json({ message: 'Valid rating (1-5) is required' });
  const rating = Math.min(5, Math.max(1, Math.round(parsed)));
  await Review.create({ user: req.user._id, astrologer: s.astrologer, session: s._id, rating, comment: req.body.comment });
  await recomputeRating(s.astrologer);
  s.rated = true;
  await s.save();
  res.json({ ok: true });
}));

// ---- Reports & remedies ----
async function buy(req, res, Model, itemType) {
  const item = await Model.findOne({ _id: req.params.id, active: true });
  if (!item) return res.status(404).json({ message: 'Item not found' });
  // Cash on delivery: physical remedy/puja orders only, when the admin has switched it on.
  if (req.body?.payment === 'cod') {
    const p = await getPricing();
    if (itemType !== 'remedy' || !p.payments.cod) return res.status(400).json({ message: 'Cash on delivery is not available for this item' });
    if (p.payments.codMax && item.price > p.payments.codMax) return res.status(400).json({ message: `Cash on delivery is available up to ₹${p.payments.codMax}` });
    const address = String(req.body.address || '').trim().slice(0, 300);
    const contactPhone = String(req.body.phone || req.user.phone || '').trim().slice(0, 20);
    if (address.length < 10) return res.status(400).json({ message: 'Enter the full delivery address' });
    const order = await Purchase.create({ user: req.user._id, itemType, item: item._id, title: item.title, price: item.price, payment: 'cod', codFee: p.payments.codFee, address, contactPhone, status: 'cod_pending' });
    return res.status(201).json({ purchase: order, balance: req.user.walletBalance });
  }
  const u = await debitUser(req.user._id, item.price, itemType, item.title, String(item._id));
  if (!u) return res.status(402).json({ message: 'Insufficient wallet balance' });
  const p = await Purchase.create({ user: req.user._id, itemType, item: item._id, title: item.title, price: item.price });
  await Transaction.create({ ownerType: 'platform', owner: p._id, kind: itemType, direction: 'credit', amount: item.price, note: item.title });
  res.status(201).json({ purchase: p, balance: u.walletBalance });
}
r.post('/reports/:id/buy', wrap((q, s) => buy(q, s, Report, 'report')));
r.post('/remedies/:id/buy', wrap((q, s) => buy(q, s, Remedy, 'remedy')));
r.get('/purchases', wrap(async (req, res) => res.json(await Purchase.find({ user: req.user._id }).sort('-createdAt'))));

// ---- Support ----
r.get('/tickets', wrap(async (req, res) => {
  const list = await Ticket.find({ user: req.user._id, app: { $ne: 'astrologer' } }).sort('-updatedAt').limit(50);
  res.json(list.map(thread));
}));
r.post('/tickets', wrap(async (req, res) => {
  const t = await createTicket({ app: 'user', ownerId: req.user._id, subject: req.body.subject, message: req.body.message });
  notifyAdmins(req, t);
  res.status(201).json(thread(t));
}));
r.post('/tickets/:id/messages', wrap(async (req, res) => {
  const t = await Ticket.findOne({ _id: req.params.id, user: req.user._id, app: { $ne: 'astrologer' } });
  if (!t) return res.status(404).json({ message: 'Query not found' });
  await addMessage(t, 'customer', req.body.text);
  notifyAdmins(req, t);
  res.json(thread(t));
}));
r.post('/tickets/:id/read', wrap(async (req, res) => { await Ticket.updateOne({ _id: req.params.id, user: req.user._id }, { unreadOwner: false }); res.json({ ok: true }); }));

// ---- Premium subscription ----
// Rates the user would pay with an astrologer (shows the premium discount before starting).
r.get('/rates/:astrologerId', wrap(async (req, res) => {
  const a = await Astrologer.findOne({ _id: req.params.astrologerId, status: 'approved' });
  if (!a) return res.status(404).json({ message: 'Astrologer not found' });
  res.json(sessionRates(a, req.user, await getPricing()));
}));

r.get('/plans', wrap(async (req, res) => {
  const [plans, history] = await Promise.all([
    Plan.find({ audience: 'user', active: true }).sort('order price'),
    Subscription.find({ ownerType: 'user', owner: req.user._id }).sort('-createdAt').limit(20),
  ]);
  res.json({ plans, active: isActive(req.user.premium) ? req.user.premium : null, history });
}));

// Paid from the wallet (GST was already charged on the recharge). Buying again extends the validity.
r.post('/plans/:id/buy', wrap(async (req, res) => {
  const plan = await Plan.findOne({ _id: req.params.id, audience: 'user', active: true });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  const u = await debitUser(req.user._id, plan.price, 'subscription', `${plan.name} (${plan.durationDays} days)`, String(plan._id));
  if (!u) return res.status(402).json({ message: 'Insufficient wallet balance. Please recharge.' });
  const from = isActive(req.user.premium) && String(req.user.premium.plan) === String(plan._id) ? new Date(req.user.premium.until) : new Date();
  const until = new Date(from.getTime() + plan.durationDays * 86400e3);
  const premium = { plan: plan._id, name: plan.name, discountPct: plan.discountPct, until };
  const user = await User.findByIdAndUpdate(req.user._id, { premium, isPremium: true }, { new: true });
  const sub = await Subscription.create({ ownerType: 'user', owner: req.user._id, plan: plan._id, name: plan.name, price: plan.price, gst: 0, total: plan.price, startsAt: from, endsAt: until });
  await Transaction.create({ ownerType: 'platform', owner: sub._id, kind: 'subscription', direction: 'credit', amount: plan.price, note: `User plan: ${plan.name}`, ref: String(sub._id) });
  res.status(201).json({ premium: user.premium, balance: user.walletBalance, subscription: sub });
}));

r.get('/signs', (_q, res) => res.json(SIGNS));
export default r;
