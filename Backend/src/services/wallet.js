import { User, Astrologer, Transaction, Session } from '../models/index.js';
import { r2 } from './pricing.js';

export async function creditUser(userId, amount, kind, note, ref, meta) {
  const u = await User.findByIdAndUpdate(userId, { $inc: { walletBalance: amount } }, { new: true });
  if (!u) return null;
  await Transaction.create({ ownerType: 'user', owner: userId, kind, direction: 'credit', amount, balanceAfter: u.walletBalance, note, ref, meta });
  return u;
}

// Atomic debit: fails (returns null) if balance is insufficient.
export async function debitUser(userId, amount, kind, note, ref, meta) {
  const u = await User.findOneAndUpdate({ _id: userId, walletBalance: { $gte: amount } }, { $inc: { walletBalance: -amount } }, { new: true });
  if (!u) return null;
  await Transaction.create({ ownerType: 'user', owner: userId, kind, direction: 'debit', amount, balanceAfter: u.walletBalance, note, ref, meta });
  return u;
}

// Runs at the start of each minute of an active session (minute 0 -> 1st minute, minute 1 -> 2nd minute, ...).
// Charges at the start of every billing block (every minute for per-minute pricing, every N minutes for packs).
// Returns { ok, balance, minutes, maxMinutes } or { ended, reason }.
export async function billMinute(sessionId) {
  const s = await Session.findById(sessionId);
  if (!s || s.status !== 'active') return { ended: true };
  if (s.maxMinutes > 0 && s.minutes >= s.maxMinutes) return { ended: true, reason: 'time-limit' };
  const block = s.block || 1;
  // Sessions created before per-service pricing only have per-minute fields.
  const listed = s.listedBlock ?? s.pricePerMin;
  const userBase = s.userBlock ?? s.userPricePerMin ?? s.pricePerMin;
  const earn = s.astroBlock ?? r2(s.pricePerMin * (1 - (s.commissionPct || 0) / 100));
  const fee = r2(userBase * (s.feePct || 0) / 100);
  const gst = r2((userBase + fee) * (s.gstPct || 0) / 100);
  const total = r2(userBase + fee + gst);
  const startsBlock = s.minutes % block === 0;
  let balance;
  if (startsBlock) {
    const label = block === 1 ? '1 min' : block === 60 ? '1 hour' : `${block} min`;
    const u = await debitUser(s.user, total, 'consultation', `${s.type} consultation (${label})`, String(s._id),
      { listed, discountPct: s.discountPct || 0, commissionPct: s.commissionPct, block, platformFee: fee, gst, astrologer: earn });
    if (!u) return { ended: true, reason: 'low-balance' };
    balance = u.walletBalance;
    const platform = r2(userBase + fee - earn);
    const a = await Astrologer.findByIdAndUpdate(s.astrologer, { $inc: { walletBalance: earn } }, { new: true });
    if (a) await Transaction.create({ ownerType: 'astrologer', owner: s.astrologer, kind: 'earning', direction: 'credit', amount: earn, balanceAfter: a.walletBalance, note: `Session ${s._id}`, ref: String(s._id) });
    if (platform !== 0) await Transaction.create({ ownerType: 'platform', owner: s._id, kind: 'consultation', direction: platform >= 0 ? 'credit' : 'debit', amount: Math.abs(platform), note: platform >= 0 ? 'Commission' + (fee ? ' + platform fee' : '') : 'Premium discount (platform-funded)', ref: String(s._id) });
    if (gst > 0) await Transaction.create({ ownerType: 'platform', owner: s._id, kind: 'gst', direction: 'credit', amount: gst, note: `GST ${s.gstPct}% on ${s.type} consultation`, ref: String(s._id) });
    await Session.updateOne({ _id: s._id }, { $inc: { minutes: 1, amount: total, astrologerEarning: earn, platformEarning: platform } });
  } else {
    balance = (await User.findById(s.user).select('walletBalance'))?.walletBalance ?? 0;
    await Session.updateOne({ _id: s._id }, { $inc: { minutes: 1 } });
  }
  await Astrologer.updateOne({ _id: s.astrologer }, { $inc: { totalMinutes: 1 } });
  return { ok: true, balance, minutes: s.minutes + 1, maxMinutes: s.maxMinutes || 0 };
}

// One-time platform fee (+ GST) when a session starts (service rule with a fixed platform fee).
export async function chargeSessionFee(s) {
  const fee = s.sessionFee || 0;
  if (!(fee > 0)) return { ok: true };
  const total = s.sessionFeeTotal || fee;
  const gst = r2(total - fee);
  const u = await debitUser(s.user, total, 'platform_fee', `Platform fee (per consultation)${gst > 0 ? ' incl. GST' : ''}`, String(s._id));
  if (!u) return { ok: false };
  await Transaction.create({ ownerType: 'platform', owner: s._id, kind: 'platform_fee', direction: 'credit', amount: fee, note: 'Consultation platform fee', ref: String(s._id) });
  if (gst > 0) await Transaction.create({ ownerType: 'platform', owner: s._id, kind: 'gst', direction: 'credit', amount: gst, note: 'GST on platform fee', ref: String(s._id) });
  await Session.updateOne({ _id: s._id }, { $inc: { platformEarning: fee, amount: total } });
  return { ok: true, balance: u.walletBalance };
}
