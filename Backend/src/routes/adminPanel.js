// Admin endpoints for the Users / Astrologers / Global panels. Everything here is computed from the database.
import { Router } from 'express';
import { broadcast } from '../services/system.js';
import mongoose from 'mongoose';
import { User, Astrologer, Session, Message, Review, Transaction, Withdrawal, Purchase, Ticket } from '../models/index.js';
import { auth, wrap } from '../middleware/auth.js';
import { creditUser, debitUser } from '../services/wallet.js';

const r = Router();
r.use(auth('admin'));

const oid = (v) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null);
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const daysAgo = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return d; };
const sum = (match, field) => Transaction.aggregate([{ $match: match }, { $group: { _id: null, t: { $sum: `$${field}` } } }]).then((x) => x[0]?.t || 0);
const byDay = async (Model, match, valueExpr = 1, days = 14) => {
  const since = daysAgo(days - 1);
  const rows = await Model.aggregate([
    { $match: { ...match, createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, v: { $sum: valueExpr } } },
  ]);
  return Array.from({ length: days }, (_, i) => { const d = daysAgo(days - 1 - i).toISOString().slice(0, 10); return { date: d, value: rows.find((x) => x._id === d)?.v || 0 }; });
};
const FAILED = ['cancelled', 'rejected', 'missed'];

// Recomputes an astrologer's rating from the reviews that exist.
export async function recomputeRating(astrologerId) {
  const a = await Review.aggregate([{ $match: { astrologer: astrologerId } }, { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
  await Astrologer.updateOne({ _id: astrologerId }, { rating: a[0] ? +a[0].avg.toFixed(2) : 0, ratingCount: a[0]?.n || 0 });
}

/* ======================= USERS ======================= */
r.get('/users-overview', wrap(async (_q, res) => {
  const [users, newToday, new7d, blocked, activeIds, held, recharges, bonuses, refunds, consults, spendTop, zodiac] = await Promise.all([
    User.countDocuments(), User.countDocuments({ createdAt: { $gte: daysAgo(0) } }), User.countDocuments({ createdAt: { $gte: daysAgo(6) } }),
    User.countDocuments({ blocked: true }), Session.distinct('user', { createdAt: { $gte: daysAgo(29) } }),
    User.aggregate([{ $group: { _id: null, t: { $sum: '$walletBalance' } } }]).then((x) => x[0]?.t || 0),
    sum({ ownerType: 'user', kind: 'recharge' }, 'amount'), sum({ ownerType: 'user', kind: 'bonus' }, 'amount'), sum({ ownerType: 'user', kind: 'refund' }, 'amount'),
    Session.countDocuments({ status: 'completed' }),
    Session.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: '$user', spent: { $sum: '$amount' }, sessions: { $sum: 1 } } }, { $sort: { spent: -1 } }, { $limit: 5 }]),
    User.aggregate([{ $match: { zodiac: { $nin: [null, ''] } } }, { $group: { _id: '$zodiac', n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
  ]);
  const names = await User.find({ _id: { $in: spendTop.map((x) => x._id) } }).select('name phone');
  res.json({
    totals: { users, newToday, new7d, blocked, active30d: activeIds.length, walletHeld: held, recharges, bonuses, refunds, consultations: consults },
    series: { signups: await byDay(User, {}), recharges: await byDay(Transaction, { ownerType: 'user', kind: 'recharge' }, '$amount') },
    topSpenders: spendTop.map((x) => ({ ...x, user: names.find((n) => String(n._id) === String(x._id)) })),
    zodiac,
  });
}));

r.get('/users/:id/detail', wrap(async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ message: 'User not found' });
  const [sessions, transactions, purchases, tickets, reviews, agg] = await Promise.all([
    Session.find({ user: u._id }).populate('astrologer', 'name avatar').sort('-createdAt').limit(50),
    Transaction.find({ ownerType: 'user', owner: u._id }).sort('-createdAt').limit(100),
    Purchase.find({ user: u._id }).sort('-createdAt').limit(50),
    Ticket.find({ user: u._id }).sort('-createdAt').limit(50),
    Review.find({ user: u._id }).populate('astrologer', 'name').sort('-createdAt').limit(50),
    Session.aggregate([{ $match: { user: u._id } }, { $group: { _id: '$status', n: { $sum: 1 }, minutes: { $sum: '$minutes' }, spent: { $sum: '$amount' } } }]),
  ]);
  const st = (k) => agg.find((x) => x._id === k) || { n: 0, minutes: 0, spent: 0 };
  res.json({
    user: u, sessions, transactions, purchases, tickets, reviews,
    stats: {
      sessions: agg.reduce((s, x) => s + x.n, 0), completed: st('completed').n, cancelled: FAILED.reduce((s, k) => s + st(k).n, 0),
      minutes: st('completed').minutes, spent: st('completed').spent,
      recharged: transactions.filter((t) => t.kind === 'recharge').reduce((s, t) => s + t.amount, 0),
      purchases: purchases.reduce((s, p) => s + (p.price || 0), 0),
    },
  });
}));

// Manual wallet adjustment (goodwill credit, refund, correction). Always logged as a transaction.
r.post('/users/:id/wallet', wrap(async (req, res) => {
  const amount = Math.round(+req.body.amount);
  const note = String(req.body.note || '').trim().slice(0, 140) || 'Adjusted by admin';
  if (!(amount > 0 && amount <= 100000)) return res.status(400).json({ message: 'Enter an amount between 1 and 1,00,000' });
  if (req.body.direction === 'debit') {
    const u = await debitUser(req.params.id, amount, 'adjustment', note, `admin:${req.admin._id}`);
    if (!u) return res.status(400).json({ message: 'User balance is lower than this amount' });
    return res.json({ balance: u.walletBalance });
  }
  const u = await creditUser(req.params.id, amount, req.body.kind === 'refund' ? 'refund' : 'adjustment', note, `admin:${req.admin._id}`);
  if (!u) return res.status(404).json({ message: 'User not found' });
  res.json({ balance: u.walletBalance });
}));

/* ======================= SESSIONS (chat details) ======================= */
r.get('/sessions', wrap(async (req, res) => {
  const f = {};
  const { status, type, user, astrologer, q } = req.query;
  if (status === 'failed') f.status = { $in: FAILED };
  else if (status) f.status = status;
  if (type) f.type = type;
  if (oid(user)) f.user = oid(user);
  if (oid(astrologer)) f.astrologer = oid(astrologer);
  if (q) {
    const rx = new RegExp(esc(q), 'i');
    const [us, as] = await Promise.all([User.find({ $or: [{ name: rx }, { phone: rx }] }).select('_id'), Astrologer.find({ name: rx }).select('_id')]);
    f.$or = [{ user: { $in: us.map((x) => x._id) } }, { astrologer: { $in: as.map((x) => x._id) } }];
  }
  const rows = await Session.find(f).populate('user', 'name phone').populate('astrologer', 'name avatar').sort('-createdAt').limit(300);
  const counts = await Message.aggregate([{ $match: { session: { $in: rows.map((s) => s._id) } } }, { $group: { _id: '$session', n: { $sum: 1 } } }]);
  res.json(rows.map((s) => ({ ...s.toObject(), messageCount: counts.find((c) => String(c._id) === String(s._id))?.n || 0 })));
}));

r.get('/sessions/:id', wrap(async (req, res) => {
  const s = await Session.findById(req.params.id).populate('user', 'name phone zodiac').populate('astrologer', 'name avatar pricePerMin');
  if (!s) return res.status(404).json({ message: 'Session not found' });
  const [messages, review] = await Promise.all([Message.find({ session: s._id }).sort('createdAt'), Review.findOne({ session: s._id })]);
  res.json({ session: s, messages, review });
}));

/* ======================= CANCELLATIONS ======================= */
r.get('/cancellations', wrap(async (_q, res) => {
  const [byStatus, byType, byAstro] = await Promise.all([
    Session.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Session.aggregate([{ $match: { status: { $in: FAILED } } }, { $group: { _id: '$type', n: { $sum: 1 } } }]),
    Session.aggregate([{ $group: { _id: '$astrologer', total: { $sum: 1 }, failed: { $sum: { $cond: [{ $in: ['$status', FAILED] }, 1, 0] } }, rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }, missed: { $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] } }, cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } } } }, { $match: { failed: { $gt: 0 } } }, { $sort: { failed: -1 } }, { $limit: 15 }]),
  ]);
  const names = await Astrologer.find({ _id: { $in: byAstro.map((x) => x._id) } }).select('name');
  const total = byStatus.reduce((s, x) => s + x.n, 0);
  const failed = byStatus.filter((x) => FAILED.includes(x._id)).reduce((s, x) => s + x.n, 0);
  const recent = await Session.find({ status: { $in: FAILED } }).populate('user', 'name phone').populate('astrologer', 'name').sort('-createdAt').limit(50);
  res.json({
    total, failed, rate: total ? +((failed / total) * 100).toFixed(1) : 0, byStatus, byType,
    series: await byDay(Session, { status: { $in: FAILED } }),
    byAstrologer: byAstro.map((x) => ({ ...x, name: names.find((n) => String(n._id) === String(x._id))?.name || 'Deleted' })),
    recent,
  });
}));

/* ======================= ASTROLOGERS ======================= */
r.get('/astrologers-overview', wrap(async (_q, res) => {
  const [byStatus, online, busy, earned, pendingPayout, ratingAgg, top, applicants] = await Promise.all([
    Astrologer.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Astrologer.countDocuments({ status: 'approved', online: true }), Astrologer.countDocuments({ status: 'approved', busy: true }),
    sum({ ownerType: 'astrologer', kind: 'earning' }, 'amount'),
    Withdrawal.aggregate([{ $match: { status: 'pending' } }, { $group: { _id: null, t: { $sum: '$amount' }, n: { $sum: 1 } } }]),
    Review.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]),
    Session.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: '$astrologer', earned: { $sum: '$astrologerEarning' }, sessions: { $sum: 1 }, minutes: { $sum: '$minutes' } } }, { $sort: { earned: -1 } }, { $limit: 5 }]),
    Astrologer.find({ status: 'pending' }).sort('-createdAt').limit(5).select('name phone experience expertise createdAt'),
  ]);
  const names = await Astrologer.find({ _id: { $in: top.map((x) => x._id) } }).select('name avatar rating');
  const st = (k) => byStatus.find((x) => x._id === k)?.n || 0;
  res.json({
    totals: { approved: st('approved'), pending: st('pending'), rejected: st('rejected'), blocked: st('blocked'), online, busy, earned, pendingPayout: pendingPayout[0]?.t || 0, pendingPayoutCount: pendingPayout[0]?.n || 0, rating: ratingAgg[0] ? +ratingAgg[0].avg.toFixed(2) : null, reviews: ratingAgg[0]?.n || 0 },
    series: { earnings: await byDay(Transaction, { ownerType: 'astrologer', kind: 'earning' }, '$amount'), sessions: await byDay(Session, { status: 'completed' }) },
    top: top.map((x) => ({ ...x, astrologer: names.find((n) => String(n._id) === String(x._id)) })),
    applicants,
  });
}));

r.get('/astrologers-list', wrap(async (req, res) => {
  const f = {};
  if (req.query.status === 'sponsored') Object.assign(f, { sponsored: true });
  else if (req.query.status) f.status = req.query.status;
  if (req.query.online === '1') Object.assign(f, { status: 'approved', online: true });
  if (req.query.q) f.$or = [{ name: new RegExp(esc(req.query.q), 'i') }, { phone: new RegExp(esc(req.query.q)) }];
  const sorts = { rating: { rating: -1 }, recent: { createdAt: -1 }, price: { pricePerMin: -1 }, minutes: { totalMinutes: -1 } };
  res.json(await Astrologer.find(f).select('-password -fcmTokens').sort(req.query.status === 'sponsored' ? { sponsorRank: -1, ...(sorts[req.query.sort] || sorts.recent) } : sorts[req.query.sort] || sorts.recent).limit(500));
}));

r.get('/astrologers/:id/detail', wrap(async (req, res) => {
  const a = await Astrologer.findById(req.params.id).select('-password -fcmTokens');
  if (!a) return res.status(404).json({ message: 'Astrologer not found' });
  const [sessions, reviews, withdrawals, transactions, agg, live] = await Promise.all([
    Session.find({ astrologer: a._id }).populate('user', 'name phone').sort('-createdAt').limit(50),
    Review.find({ astrologer: a._id }).populate('user', 'name').sort('-createdAt').limit(50),
    Withdrawal.find({ astrologer: a._id }).sort('-createdAt').limit(50),
    Transaction.find({ ownerType: 'astrologer', owner: a._id }).sort('-createdAt').limit(100),
    Session.aggregate([{ $match: { astrologer: a._id } }, { $group: { _id: '$status', n: { $sum: 1 }, minutes: { $sum: '$minutes' }, gross: { $sum: '$amount' }, earned: { $sum: '$astrologerEarning' }, platform: { $sum: '$platformEarning' } } }]),
    Session.findOne({ astrologer: a._id, status: 'active' }).populate('user', 'name'),
  ]);
  const c = agg.find((x) => x._id === 'completed') || { n: 0, minutes: 0, gross: 0, earned: 0, platform: 0 };
  const total = agg.reduce((s, x) => s + x.n, 0);
  const failed = agg.filter((x) => FAILED.includes(x._id)).reduce((s, x) => s + x.n, 0);
  res.json({
    astrologer: a, sessions, reviews, withdrawals, transactions, live,
    stats: { sessions: total, completed: c.n, failed, acceptance: total ? +(((total - failed) / total) * 100).toFixed(0) : null, minutes: c.minutes, gross: c.gross, earned: c.earned, platform: c.platform, rewards: transactions.filter((t) => t.kind === 'bonus').reduce((s, t) => s + t.amount, 0) },
  });
}));

// Admin edits to an astrologer profile (status/commission/price are also handled by PUT /astrologers/:id).
r.put('/astrologers/:id/profile', wrap(async (req, res) => {
  const { bio, experience, expertise, languages, pricePerMin } = req.body;
  const patch = {};
  if (typeof bio === 'string') patch.bio = bio.slice(0, 600);
  if (experience !== undefined) patch.experience = Math.max(0, Math.min(80, Math.round(+experience) || 0));
  if (Array.isArray(expertise)) patch.expertise = expertise.map(String).slice(0, 12);
  if (Array.isArray(languages)) patch.languages = languages.map(String).slice(0, 12);
  if (pricePerMin !== undefined) { const v = Math.max(1, Math.min(10000, Math.round(+pricePerMin) || 1)); patch.pricePerMin = v; patch['rates.chat'] = v; }
  const a = await Astrologer.findByIdAndUpdate(req.params.id, patch, { new: true }).select('-password');
  broadcast(req, 'astrologers');
  res.json(a);
}));

// Rewards: credit an astrologer's wallet (performance bonus, incentive). Logged as kind "bonus".
r.post('/astrologers/:id/reward', wrap(async (req, res) => {
  const amount = Math.round(+req.body.amount);
  const note = String(req.body.note || '').trim().slice(0, 140) || 'Reward from admin';
  if (!(amount > 0 && amount <= 100000)) return res.status(400).json({ message: 'Enter an amount between 1 and 1,00,000' });
  const a = await Astrologer.findByIdAndUpdate(req.params.id, { $inc: { walletBalance: amount } }, { new: true });
  if (!a) return res.status(404).json({ message: 'Astrologer not found' });
  const t = await Transaction.create({ ownerType: 'astrologer', owner: a._id, kind: 'bonus', direction: 'credit', amount, balanceAfter: a.walletBalance, note, ref: `admin:${req.admin._id}` });
  res.status(201).json(t);
}));
r.get('/rewards', wrap(async (_q, res) => {
  const rows = await Transaction.find({ ownerType: 'astrologer', kind: 'bonus' }).sort('-createdAt').limit(300);
  const names = await Astrologer.find({ _id: { $in: rows.map((x) => x.owner) } }).select('name');
  res.json(rows.map((t) => ({ ...t.toObject(), astrologer: names.find((n) => String(n._id) === String(t.owner))?.name || 'Deleted' })));
}));

/* ======================= REVIEWS ======================= */
r.get('/reviews', wrap(async (req, res) => {
  const f = {};
  if (oid(req.query.astrologer)) f.astrologer = oid(req.query.astrologer);
  if (req.query.rating) f.rating = +req.query.rating;
  res.json(await Review.find(f).populate('user', 'name phone').populate('astrologer', 'name').sort('-createdAt').limit(300));
}));
r.delete('/reviews/:id', wrap(async (req, res) => {
  const rv = await Review.findByIdAndDelete(req.params.id);
  if (rv) await recomputeRating(rv.astrologer);
  res.json({ ok: true });
}));

export default r;
