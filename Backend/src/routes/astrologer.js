import { Router } from 'express';
import { Astrologer, Session, Message, Transaction, Withdrawal, Review, User, Plan, Subscription, Ticket } from '../models/index.js';
import { addMessage, createTicket, notifyAdmins, thread } from '../services/support.js';
import { getPricing, quoteWithdraw, isActive, r2, ratesPatch, sessionRates, SERVICE_TYPES, publicServices } from '../services/pricing.js';
import { auth, wrap } from '../middleware/auth.js';
import { startSession, endSession, notifyQueueWaiters } from '../services/sessions.js';
import { respondCallConfig } from '../services/agora.js';
import { broadcast } from '../services/system.js';
import { saveToken, removeToken, pushUser, pushAdmins } from '../services/push.js';

const r = Router();
r.use(auth('astrologer'));

r.get('/me', (req, res) => { const o = req.astrologer.toObject ? req.astrologer.toObject() : { ...req.astrologer }; delete o.fcmTokens; res.json(o); });

r.post('/push-token', wrap(async (req, res) => res.json({ ok: await saveToken('astrologer', req.astrologer._id, req.body.token) })));
r.post('/push-token/remove', wrap(async (req, res) => { await removeToken('astrologer', req.body.token); res.json({ ok: true }); }));

r.put('/me', wrap(async (req, res) => {
  const { name, bio, experience, expertise, languages, slots, email, avatar } = req.body;
  const patch = { name, bio, experience, expertise, languages, slots, email, avatar };
  Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);
  // Per-service rates / durations / auto-cut, only when the admin lets astrologers set them, and inside the limits.
  let rateChanged = false;
  if (req.body.rates !== undefined || req.body.pricePerMin !== undefined || req.body.durations !== undefined || req.body.autoCut !== undefined) {
    const p = await getPricing();
    if (p.astrologerRate.allowEdit) {
      const { patch: rp, error } = ratesPatch(req.body, req.astrologer, p, true);
      if (error) return res.status(400).json({ message: error });
      if (rp) {
        Object.assign(patch, rp);
        rateChanged = JSON.stringify([rp.rates, rp.durations, rp.autoCut]) !== JSON.stringify([req.astrologer.rates || {}, req.astrologer.durations || {}, req.astrologer.autoCut || {}]);
      }
    }
  }
  const a = await Astrologer.findByIdAndUpdate(req.astrologer._id, patch, { new: true });
  // New rate / time rule shows up in open customer apps and the admin price table right away.
  if (rateChanged) broadcast(req, 'astrologers');
  res.json(a);
}));

// My prices: for each service, my rate, duration, autoCut, what the customer pays and what I earn (after admin commission).
r.get('/pricing', wrap(async (req, res) => {
  const p = await getPricing();
  const svc = publicServices(p);
  res.json({
    allowRateEdit: p.astrologerRate.allowEdit,
    payout: p.payout,
    services: SERVICE_TYPES.map((k) => {
      const rt = sessionRates(req.astrologer, null, p, k);
      return { key: k, ...svc[k], block: rt.block, maxMinutes: rt.maxMinutes, autoCut: rt.autoCut, rate: rt.perMin, userPerBlock: rt.chargePerBlock, earnPerBlock: rt.astroBlock, earnPerMin: rt.astroPerMin, commissionType: rt.commissionType, commission: rt.commission, commissionPct: rt.commissionPct, sessionFee: rt.sessionFeeTotal };
    }),
  });
}));

// ---- Support (shows in Admin > Astrologers > Support queries) ----
r.get('/tickets', wrap(async (req, res) => {
  const list = await Ticket.find({ astrologer: req.astrologer._id, app: 'astrologer' }).sort('-updatedAt').limit(50);
  res.json(list.map(thread));
}));
r.post('/tickets', wrap(async (req, res) => {
  const t = await createTicket({ app: 'astrologer', ownerId: req.astrologer._id, subject: req.body.subject, message: req.body.message });
  notifyAdmins(req, t);
  res.status(201).json(thread(t));
}));
r.post('/tickets/:id/messages', wrap(async (req, res) => {
  const t = await Ticket.findOne({ _id: req.params.id, astrologer: req.astrologer._id, app: 'astrologer' });
  if (!t) return res.status(404).json({ message: 'Query not found' });
  await addMessage(t, 'customer', req.body.text);
  notifyAdmins(req, t);
  res.json(thread(t));
}));
r.post('/tickets/:id/read', wrap(async (req, res) => { await Ticket.updateOne({ _id: req.params.id, astrologer: req.astrologer._id }, { unreadOwner: false }); res.json({ ok: true }); }));

r.post('/online', wrap(async (req, res) => {
  if (req.astrologer.status !== 'approved') return res.status(403).json({ message: 'Your profile is pending admin approval' });
  const a = await Astrologer.findByIdAndUpdate(req.astrologer._id, { online: !!req.body.online }, { new: true });
  broadcast(req, 'astrologers');
  res.json(a);
}));

r.get('/dashboard', wrap(async (req, res) => {
  const id = req.astrologer._id;
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const [today, total, pending] = await Promise.all([
    Session.aggregate([{ $match: { astrologer: id, status: 'completed', endedAt: { $gte: startOfDay } } }, { $group: { _id: null, e: { $sum: '$astrologerEarning' }, c: { $sum: 1 }, m: { $sum: '$minutes' } } }]),
    Session.aggregate([{ $match: { astrologer: id, status: 'completed' } }, { $group: { _id: null, e: { $sum: '$astrologerEarning' }, c: { $sum: 1 }, m: { $sum: '$minutes' } } }]),
    Session.countDocuments({ astrologer: id, status: 'requested' }),
  ]);
  res.json({
    balance: req.astrologer.walletBalance, rating: req.astrologer.rating, ratingCount: req.astrologer.ratingCount,
    today: { earnings: today[0]?.e || 0, sessions: today[0]?.c || 0, minutes: today[0]?.m || 0 },
    total: { earnings: total[0]?.e || 0, sessions: total[0]?.c || 0, minutes: total[0]?.m || 0 },
    pendingRequests: pending,
  });
}));

// ---- Requests / sessions ----
r.get('/requests', wrap(async (req, res) => {
  const list = await Session.find({ astrologer: req.astrologer._id, status: 'requested' }).populate('user', 'name dob tob pob zodiac gender').sort('createdAt');
  res.json(list);
}));
r.get('/active', wrap(async (req, res) => res.json(await Session.findOne({ astrologer: req.astrologer._id, status: 'active' }).populate('user', 'name'))));
r.get('/sessions', wrap(async (req, res) => res.json(await Session.find({ astrologer: req.astrologer._id, status: { $in: ['completed', 'rejected', 'cancelled'] } }).populate('user', 'name').sort('-createdAt').limit(100))));

r.get('/sessions/:id', wrap(async (req, res) => {
  const s = await Session.findOne({ _id: req.params.id, astrologer: req.astrologer._id }).populate('user', 'name dob tob pob zodiac gender');
  if (!s) return res.status(404).json({ message: 'Not found' });
  res.json({ ...s.toObject(), messages: await Message.find({ session: s._id }).sort('createdAt') });
}));

r.post('/sessions/:id/accept', wrap(async (req, res) => {
  if (!req.astrologer.online) return res.status(409).json({ message: 'Go online first' });
  const busy = await Session.exists({ astrologer: req.astrologer._id, status: 'active' });
  if (busy) return res.status(409).json({ message: 'Finish your current session first' });
  const s = await Session.findOneAndUpdate(
    { _id: req.params.id, astrologer: req.astrologer._id, status: 'requested' },
    { $set: { status: 'active', startedAt: new Date() } },
    { new: true },
  );
  if (!s) return res.status(404).json({ message: 'Request no longer available' });
  const started = await startSession(req.app.get('io'), s);
  const current = started || await Session.findById(s._id);
  if (current?.status === 'active') {
    pushUser(s.user, { title: `${req.astrologer.name} accepted your ${s.type === 'chat' ? 'chat' : 'call'} request`, body: 'Your consultation has started. Tap to join now.', link: `/user/session/${s._id}`, kind: 'request', tag: `session-${s._id}` });
  }
  res.json(current);
}));

r.post(['/sessions/:id/call-config', '/sessions/:id/agora-token'], wrap(async (req, res) => {
  const s = await Session.findOne({ _id: req.params.id, astrologer: req.astrologer._id }).select('type status');
  return respondCallConfig(res, s, 'astrologer');
}));

r.post('/sessions/:id/reject', wrap(async (req, res) => {
  const s = await Session.findOneAndUpdate({ _id: req.params.id, astrologer: req.astrologer._id, status: 'requested' }, { status: 'rejected' }, { new: true });
  if (s) {
    const io = req.app.get('io');
    io?.to(`user:${s.user}`).to(`session:${s._id}`).emit('session:rejected', { id: s._id });
    io?.to(`user:${s.user}`).to(`session:${s._id}`).emit('session:update', { id: s._id, status: 'rejected' });
    io?.to(`astro:${s.astrologer}`).emit('queue:refresh');
    notifyQueueWaiters(io, s.astrologer).catch(() => {});
    pushUser(s.user, { title: `${req.astrologer.name} is not available`, body: 'Your request was declined. Please try another astrologer.', link: '/user/astrologers', tag: `session-${s._id}` });
  }
  res.json(s || { message: 'Nothing to reject' });
}));

r.post('/sessions/:id/end', wrap(async (req, res) => {
  const own = await Session.exists({ _id: req.params.id, astrologer: req.astrologer._id });
  if (!own) return res.status(404).json({ message: 'Not found' });
  res.json((await endSession(req.app.get('io'), req.params.id, 'ended')) || { message: 'Already ended' });
}));

// ---- Earnings / withdrawals ----
r.get('/earnings', wrap(async (req, res) => {
  const [txs, withdrawals] = await Promise.all([
    Transaction.find({ ownerType: 'astrologer', owner: req.astrologer._id }).sort('-createdAt').limit(100),
    Withdrawal.find({ astrologer: req.astrologer._id }).sort('-createdAt'),
  ]);
  const p = await getPricing();
  const plan = isActive(req.astrologer.plan) ? req.astrologer.plan : null;
  res.json({
    balance: req.astrologer.walletBalance, commissionPct: req.astrologer.commissionPct,
    effectiveCommissionPct: r2(Math.max(0, req.astrologer.commissionPct - (plan?.commissionCut || 0))), plan,
    minWithdraw: p.payout.minWithdraw, tdsPct: p.payout.tdsPct, payoutFee: p.payout.feeFlat, transactions: txs, withdrawals,
  });
}));

r.get('/withdraw/quote', wrap(async (req, res) => res.json(quoteWithdraw(Math.round(+req.query.amount) || 0, await getPricing()))));

r.post('/withdraw', wrap(async (req, res) => {
  const p = await getPricing();
  const amount = Math.round(+req.body.amount);
  if (amount < p.payout.minWithdraw) return res.status(400).json({ message: `Minimum withdrawal is ₹${p.payout.minWithdraw}` });
  const q = quoteWithdraw(amount, p);
  if (req.astrologer.kyc?.status !== 'verified') return res.status(403).json({ message: 'Complete KYC verification before withdrawing' });
  // Atomic hold: deduct now, refund if admin rejects.
  const a = await Astrologer.findOneAndUpdate({ _id: req.astrologer._id, walletBalance: { $gte: amount } }, { $inc: { walletBalance: -amount } }, { new: true });
  if (!a) return res.status(402).json({ message: 'Insufficient balance' });
  const w = await Withdrawal.create({ astrologer: a._id, amount, tds: q.tds, fee: q.fee, net: q.net });
  await Transaction.create({ ownerType: 'astrologer', owner: a._id, kind: 'withdrawal', direction: 'debit', amount, balanceAfter: a.walletBalance, ref: String(w._id), note: `Withdrawal requested (₹${q.net} to bank after TDS ₹${q.tds}${q.fee ? ` and fee ₹${q.fee}` : ''})`, meta: q });
  pushAdmins({ title: 'New payout request', body: `${a.name} requested a withdrawal of ₹${amount}`, link: '/admin/astro/payouts', tag: `withdraw-${w._id}` });
  req.app.get('io')?.to('admins').emit('support:update', { kind: 'withdrawal' });
  res.status(201).json(w);
}));

// ---- Plans (lower commission / featured listing), paid from earnings + GST ----
r.get('/plans', wrap(async (req, res) => {
  const p = await getPricing();
  const [plans, history] = await Promise.all([
    Plan.find({ audience: 'astrologer', active: true }).sort('order price'),
    Subscription.find({ ownerType: 'astrologer', owner: req.astrologer._id }).sort('-createdAt').limit(20),
  ]);
  res.json({ plans, gstPct: p.plans.astrologerGstPct, active: isActive(req.astrologer.plan) ? req.astrologer.plan : null, history });
}));

r.post('/plans/:id/buy', wrap(async (req, res) => {
  const plan = await Plan.findOne({ _id: req.params.id, audience: 'astrologer', active: true });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  const p = await getPricing();
  const gst = r2(plan.price * p.plans.astrologerGstPct / 100);
  const total = r2(plan.price + gst);
  const a = await Astrologer.findOneAndUpdate({ _id: req.astrologer._id, walletBalance: { $gte: total } }, { $inc: { walletBalance: -total } }, { new: true });
  if (!a) return res.status(402).json({ message: `You need ₹${total} (incl. GST) in your earnings balance` });
  const cur = req.astrologer.plan;
  const from = isActive(cur) && String(cur.plan) === String(plan._id) ? new Date(cur.until) : new Date();
  const until = new Date(from.getTime() + plan.durationDays * 86400e3);
  a.plan = { plan: plan._id, name: plan.name, commissionCut: plan.commissionCut, featured: plan.featured, until };
  await a.save();
  const sub = await Subscription.create({ ownerType: 'astrologer', owner: a._id, plan: plan._id, name: plan.name, price: plan.price, gst, total, startsAt: from, endsAt: until });
  await Transaction.create({ ownerType: 'astrologer', owner: a._id, kind: 'subscription', direction: 'debit', amount: total, balanceAfter: a.walletBalance, note: `${plan.name} plan (incl. GST ₹${gst})`, ref: String(sub._id), meta: { price: plan.price, gst, total } });
  await Transaction.create({ ownerType: 'platform', owner: sub._id, kind: 'subscription', direction: 'credit', amount: plan.price, note: `Astrologer plan: ${plan.name}`, ref: String(sub._id) });
  if (gst > 0) await Transaction.create({ ownerType: 'platform', owner: sub._id, kind: 'gst', direction: 'credit', amount: gst, note: `GST ${p.plans.astrologerGstPct}% on astrologer plan`, ref: String(sub._id) });
  res.status(201).json({ plan: a.plan, balance: a.walletBalance, subscription: sub });
}));

r.get('/reviews', wrap(async (req, res) => {
  const rs = await Review.find({ astrologer: req.astrologer._id }).populate('user', 'name').sort('-createdAt').limit(50);
  res.json(rs);
}));

export default r;
