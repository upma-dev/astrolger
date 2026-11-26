import { Server } from 'socket.io';
import { verify } from './middleware/auth.js';
import { Session, Message, User, Astrologer } from './models/index.js';
import { config } from './config/index.js';
import { roomOf } from './services/sessions.js';
import { pushUser, pushAstrologer } from './services/push.js';
import { getIceServers } from './services/ice.js';

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.env === 'production' ? config.frontendUrl.split(',') : true, credentials: true },
  });

  // Visitors without a token connect as guests: they only receive public broadcasts (settings changes).
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) { socket.data = { role: 'guest', id: null }; return next(); }
    try {
      const p = verify(token);
      socket.data = { role: p.role, id: p.id ? String(p.id) : null };
      next();
    } catch { next(new Error('unauthorized')); }
  });

  io.on('connection', (socket) => {
    const { role, id } = socket.data;
    socket.join(`role:${role}`);
    if (role === 'guest') return;
    if (role === 'user' && id) socket.join(`user:${id}`);
    if (role === 'astrologer' && id) socket.join(`astro:${id}`);
    if (role === 'admin') socket.join('admins');

    socket.on('session:join', async (sessionId, ack) => {
      try {
        const s = await Session.findById(sessionId).lean();
        const allowed = s && ((role === 'user' && String(s.user) === id) || (role === 'astrologer' && String(s.astrologer) === id));
        if (!allowed) return ack?.({ ok: false });
        socket.join(roomOf(sessionId));
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false });
      }
    });

    socket.on('message', async ({ sessionId, text }, ack) => {
      try {
        const body = String(text || '').trim().slice(0, 2000);
        if (!body) return;
        const s = await Session.findById(sessionId).lean();
        const allowed = s && s.status === 'active' && ((role === 'user' && String(s.user) === id) || (role === 'astrologer' && String(s.astrologer) === id));
        if (!allowed) return ack?.({ ok: false, message: 'Session is not active' });
        const m = await Message.create({ session: sessionId, senderRole: role, text: body });
        io.to(roomOf(sessionId)).emit('message', m);
        ack?.({ ok: true });
        // Always push (lock screen / background tab). If the other side has this app open in front,
        // the service worker skips the system notification and the page only plays the chat sound.
        const sender = role === 'user'
          ? await User.findById(s.user).select('name phone').lean()
          : await Astrologer.findById(s.astrologer).select('name').lean();
        const msg = { title: sender?.name || (role === 'user' ? 'Your client' : 'Your astrologer'), body: body.slice(0, 200), kind: 'chat', tag: `chat-${sessionId}`, data: { key: `msg-${m._id}` } };
        if (role === 'user') pushAstrologer(s.astrologer, { ...msg, link: `/vendor/session/${sessionId}` });
        else pushUser(s.user, { ...msg, link: `/user/session/${sessionId}` });
      } catch {
        ack?.({ ok: false, message: 'Message not sent' });
      }
    });

    socket.on('typing', ({ sessionId }) => socket.to(roomOf(sessionId)).emit('typing', { role }));

    // ---- WebRTC fallback signaling & STUN/TURN list (used when Agora is not configured) ----
    socket.on('rtc:ice', async (_x, ack) => {
      try { ack?.({ ok: true, iceServers: await getIceServers() }); } catch { ack?.({ ok: false, iceServers: [] }); }
    });
    socket.on('rtc:signal', ({ sessionId, data } = {}) => {
      if (!sessionId || !data || !socket.rooms.has(roomOf(sessionId))) return;
      if (JSON.stringify(data).length > 64_000) return;
      socket.to(roomOf(sessionId)).emit('rtc:signal', { from: role, data });
    });
  });
  return io;
}
