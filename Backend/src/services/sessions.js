import { Session, Astrologer, Message } from '../models/index.js';
import { billMinute, chargeSessionFee } from './wallet.js';
import { User } from '../models/index.js';
import { alertAdmins } from './push.js';

const timers = new Map();

export const roomOf = (id) => `session:${id}`;

export async function notifyQueueWaiters(io, astrologerId) {
  if (!io || !astrologerId) return;
  const waiting = await Session.find({ astrologer: astrologerId, status: 'requested' }).select('_id').lean();
  waiting.forEach((w) => io.to(roomOf(w._id)).emit('queue:update'));
}

export async function startSession(io, session) {
  session.status = 'active';
  session.startedAt = new Date();
  await session.save();
  await Astrologer.updateOne({ _id: session.astrologer }, { busy: true });
  io?.emit('platform:updated', { what: 'astrologers', at: Date.now() });
  const fee = await chargeSessionFee(session);
  if (!fee.ok) return endSession(io, session._id, 'low-balance');
  const first = await billMinute(session._id);
  if (first.ended) return endSession(io, session._id, first.reason || 'low-balance');
  const payload = { id: session._id, status: 'active', balance: first.balance };
  io?.to(roomOf(session._id)).to(`user:${session.user}`).to(`astro:${session.astrologer}`).emit('session:update', payload);
  io?.to(`user:${session.user}`).emit('wallet:update', { balance: first.balance });
  io?.to(`astro:${session.astrologer}`).emit('queue:refresh');
  notifyQueueWaiters(io, session.astrologer).catch(() => {});
  // Admin panel: ring + toast + push when a consultation starts.
  Promise.all([User.findById(session.user).select('name phone').lean(), Astrologer.findById(session.astrologer).select('name').lean()]).then(([u, a]) => {
    const label = session.type === 'audio' ? 'audio call' : session.type === 'video' ? 'video call' : 'chat';
    alertAdmins(io, { title: `New ${label} started`, body: `${u?.name || u?.phone || 'A user'} is now in a ${label} with ${a?.name || 'an astrologer'}`, link: '/admin/astro/live', tag: `session-${session._id}` });
  }).catch(() => {});

  const key = String(session._id);
  const existing = timers.get(key);
  if (existing) {
    existing.stopped = true;
    clearTimeout(existing.timer);
    timers.delete(key);
  }
  const entry = { timer: null, stopped: false, tick: 1 };
  const startMs = session.startedAt.getTime();
  const scheduleNext = () => {
    if (entry.stopped) return;
    const delay = Math.max(100, startMs + entry.tick * 60_000 - Date.now());
    entry.timer = setTimeout(async () => {
      if (entry.stopped) return;
      try {
        entry.tick += 1;
        const r = await billMinute(session._id);
        if (r.ended) return await endSession(io, session._id, r.reason || 'ended');
        io?.to(`user:${session.user}`).emit('wallet:update', { balance: r.balance });
        io?.to(roomOf(session._id)).emit('session:tick', { balance: r.balance, minutes: r.minutes });
        scheduleNext();
      } catch (err) {
        console.error('[sessions] tick error:', err?.message || err);
        endSession(io, session._id, 'error').catch(() => {});
      }
    }, delay);
  };
  timers.set(key, entry);
  scheduleNext();
  return session;
}

export async function endSession(io, sessionId, reason = 'ended') {
  const key = String(sessionId);
  const entry = timers.get(key);
  if (entry) {
    entry.stopped = true;
    clearTimeout(entry.timer);
    timers.delete(key);
  }
  const s = await Session.findOneAndUpdate(
    { _id: sessionId, status: 'active' },
    { status: 'completed', endedAt: new Date(), endReason: reason },
    { new: true },
  );
  if (!s) return null;
  await Astrologer.updateOne({ _id: s.astrologer }, { busy: false });
  const text = reason === 'low-balance'
    ? 'Session ended: insufficient wallet balance.'
    : reason === 'time-limit'
      ? `Session ended: ${s.maxMinutes}-minute consultation time reached.`
      : 'Session ended.';
  await Message.create({ session: s._id, senderRole: 'system', text });
  const payload = { id: s._id, status: 'completed', reason, minutes: s.minutes, amount: s.amount };
  io?.to(roomOf(s._id)).to(`user:${s.user}`).to(`astro:${s.astrologer}`).emit('session:update', payload);
  io?.to(`astro:${s.astrologer}`).emit('queue:refresh');
  io?.emit('platform:updated', { what: 'astrologers', at: Date.now() });
  return s;
}

// On boot: close sessions left active by a crash so astrologers aren't stuck "busy".
export async function recoverSessions() {
  await Session.updateMany({ status: 'active' }, { status: 'completed', endedAt: new Date() });
  await Astrologer.updateMany({ busy: true }, { busy: false });
}
