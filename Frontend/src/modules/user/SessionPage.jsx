import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Star } from 'lucide-react';
import { api, connectSocket, inr } from '../../lib/api.js';
import { playAlert, playRingback } from '../../shared/sound.js';
import CallScreen from '../../shared/CallScreen.jsx';
import { userAuth } from '../../lib/auth.jsx';
import { PageLoader } from '../../shared/ui.jsx';
import { AstroPhoto, Icon, useAV, vibrate } from './av.jsx';

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const hm = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export default function SessionPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { toast, openSheet } = useAV();
  const { me, setMe, refresh } = userAuth.useAuth();
  const [s, setS] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [typing, setTyping] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const sock = useRef(null);
  const endRef = useRef(null);
  const typingT = useRef();
  const statusRef = useRef(null);
  const loadInFlight = useRef(null);
  const [view, setView] = useState('call'); // audio/video sessions: 'call' screen or the chat
  const [unread, setUnread] = useState(0);
  const viewRef = useRef('call');
  viewRef.current = view;
  statusRef.current = s?.status || null;

  const load = useCallback(() => {
    if (loadInFlight.current) return loadInFlight.current;
    const p = api.user.get(`/user/sessions/${id}`)
      .then((d) => { setS(d); setMsgs(d.messages || []); return d; })
      .finally(() => { if (loadInFlight.current === p) loadInFlight.current = null; });
    loadInFlight.current = p;
    return p;
  }, [id]);

  useEffect(() => {
    load().catch((e) => { toast(e.message, 'error'); nav('/user', { replace: true }); });
    const socket = connectSocket('user');
    sock.current = socket;
    let hadConnect = false;
    socket.on('connect', () => {
      socket.emit('session:join', id);
      if (hadConnect && ['requested', 'active'].includes(statusRef.current)) load().catch(() => {});
      hadConnect = true;
    });
    socket.on('message', (m) => {
      if (String(m.session) !== id) return;
      if (m.senderRole === 'astrologer') { playAlert('chat', `msg-${m._id}`); if (viewRef.current === 'call') setUnread((n) => n + 1); }
      setMsgs((x) => (x.some((y) => y._id === m._id) ? x : [...x, m]));
    });
    socket.on('session:update', (u) => {
      if (String(u.id) !== id) return;
      // Astrologer accepted: ring (same key as the push, so it rings once).
      if (u.status === 'active') playAlert('request', `session-${id}`);
      load().catch(() => {});
      refresh();
    });
    socket.on('session:rejected', (u) => { if (!u?.id || String(u.id) === id) load().catch(() => {}); });
    socket.on('queue:update', () => { if (statusRef.current === 'requested') load().catch(() => {}); });
    socket.on('wallet:update', ({ balance }) => setMe((m) => (m ? { ...m, walletBalance: balance } : m)));
    socket.on('typing', () => { setTyping(true); clearTimeout(typingT.current); typingT.current = setTimeout(() => setTyping(false), 1500); });
    // Fallback only while waiting/active AND socket is disconnected (never poll completed/cancelled/rejected sessions or hidden tabs).
    const poll = setInterval(() => {
      if (document.hidden || socket.connected) return;
      if (['requested', 'active'].includes(statusRef.current)) load().catch(() => {});
    }, 5000);
    const onVis = () => {
      if (document.visibilityState === 'visible' && !socket.connected && ['requested', 'active'].includes(statusRef.current)) {
        load().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      socket.close();
      clearInterval(poll);
      clearTimeout(typingT.current);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (s?.status !== 'active' || !s.startedAt) return undefined;
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(s.startedAt)) / 1000)));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [s?.status, s?.startedAt]);
  const pastLimit = s?.status === 'active' && s.maxMinutes > 0 && elapsed >= s.maxMinutes * 60;
  useEffect(() => {
    if (!pastLimit) return undefined;
    const t = setTimeout(() => { load().catch(() => {}); refresh(); }, 600);
    return () => clearTimeout(t);
  }, [pastLimit, load, refresh]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs.length, typing, view]);
  // Calling: "tuu… tuu…" until the astrologer picks up.
  useEffect(() => (s?.status === 'requested' && s.type !== 'chat' ? playRingback() : undefined), [s?.status, s?.type]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    vibrate();
    sock.current?.emit('message', { sessionId: id, text }, (r) => r && !r.ok && toast(r.message || 'Message not sent', 'error'));
    setText('');
  };
  const end = async () => { vibrate(); try { await api.user.post(`/user/sessions/${id}/end`); await load(); refresh(); } catch (e) { toast(e.message, 'error'); } };
  const cancel = async () => {
    try {
      const r = await api.user.post(`/user/sessions/${id}/cancel`);
      if (r?.status === 'active') {
        toast('Astrologer just accepted your request!');
        await load();
        refresh();
        return;
      }
    } catch { /* navigate away */ }
    nav('/user/astrologers', { replace: true });
  };
  const submitReview = async () => {
    try { await api.user.post(`/user/sessions/${id}/review`, { rating, comment }); setReviewed(true); toast('Thanks for your feedback'); } catch (e) { toast(e.message, 'error'); }
  };

  if (!s) return <PageLoader variant="chat-mobile" />;
  const a = s.astrologer || {};
  const first = (a.name || '').replace(/^(Pt\.|Dr\.|Acharya|Guru|Swami)\s+/i, '').split(' ')[0];
  const active = s.status === 'active';
  // Price per billing unit (minute / hour / pack), as frozen on the session.
  const blk = s.block || 1;
  const maxSec = s.maxMinutes > 0 ? s.maxMinutes * 60 : 0;
  const unit = blk === 1 ? 'min' : blk === 60 ? 'hr' : `${blk} min`;
  const price = s.chargePerBlock ?? s.userBlock ?? s.userPricePerMin ?? s.pricePerMin;
  const paidThroughMin = Math.ceil((s.minutes || 0) / blk) * blk;
  const needsMoreBalance = !s.maxMinutes || paidThroughMin < s.maxMinutes;
  const low = active && needsMoreBalance && me.walletBalance < price * (blk === 1 ? 1.5 : 1);
  const endingSoon = active && maxSec > 0 && maxSec - elapsed <= 30;

  const Header = (
    <header className="av-chat-hdr">
      <button className="av-iconbtn" onClick={() => nav(active ? '/user' : -1)} aria-label="Back"><Icon n="back" s={18} /></button>
      <AstroPhoto a={{ ...a, online: s.status !== 'completed' && a.online !== false, busy: false }} />
      <div className="av-chat-who">
        <b>{a.name}</b>
        <small>
          {s.status === 'requested' && <>Connecting · {inr(price)}/{unit}{maxSec > 0 && ` · ${s.maxMinutes} min limit`}</>}
          {active && (typing ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>typing…</span> : <><span className="av-timer">{mmss(elapsed)}{maxSec > 0 ? ` / ${mmss(maxSec)}` : ''}</span>· {inr(price)}/{unit} · {inr(me.walletBalance)} left</>)}
          {!active && s.status !== 'requested' && <>Session {s.status}</>}
        </small>
      </div>
      {active && <button className="av-endbtn" onClick={end}><Icon n="end" s={15} /> End</button>}
    </header>
  );

  /* ---------- Waiting for the astrologer ---------- */
  if (s.status === 'requested') return (
    <>
      {Header}
      <div className="av-wait">
        <div className="av-ringwrap"><AstroPhoto a={{ ...a, online: true }} /></div>
        <h2>Waiting for {first}</h2>
        <p>{s.queuePosition > 1 ? `You are #${s.queuePosition} in the queue.` : 'Your request has been sent — the astrologer will accept shortly.'} You are only charged once the session starts.</p>
        <span className="av-pill"><Icon n={s.type === 'chat' ? 'chat' : s.type === 'video' ? 'video' : 'phone'} s={14} /> {s.type === 'audio' ? 'Call' : s.type[0].toUpperCase() + s.type.slice(1)} · {inr(price)}/{unit}</span>
        <button className="av-btn-ghost" style={{ marginTop: 8 }} onClick={cancel}>Cancel request</button>
      </div>
    </>
  );

  /* ---------- Finished / rejected ---------- */
  if (!active) return (
    <>
      {Header}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 0 30px' }}>
        <div className="av-card" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><AstroPhoto a={{ ...a, online: false }} /></div>
          <h2 style={{ fontSize: 21, color: 'var(--t1)' }}>{s.status === 'completed' ? 'Session completed' : s.status === 'rejected' ? `${first} is unavailable right now` : 'Request closed'}</h2>
          {s.status === 'completed' && <p style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4 }}>{s.minutes} min · {inr(s.amount)} charged{s.endReason === 'time-limit' ? ' · time limit reached' : s.endReason === 'low-balance' ? ' · balance finished' : ''}</p>}
          {s.status === 'completed' && !s.rated && !reviewed && (
            <div style={{ marginTop: 16, textAlign: 'left' }}>
              <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>How was your consultation?</p>
              <div className="av-starsel">{[1, 2, 3, 4, 5].map((n) => <button key={n} className={n <= rating ? 'on' : ''} onClick={() => { vibrate(); setRating(n); }} aria-label={`${n} star${n > 1 ? 's' : ''}`}><Star size={28} strokeWidth={1.6} className={n <= rating ? 'fill-current' : ''} /></button>)}</div>
              <textarea className="av-textarea" placeholder="Share a few words (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
              <button className="av-btn-gold" style={{ width: '100%', marginTop: 12, padding: 13 }} onClick={submitReview}>Submit review</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="av-btn-ghost" style={{ flex: 1 }} onClick={() => nav('/user/astrologers')}>Browse astrologers</button>
            <button className="av-btn-gold" style={{ flex: 1 }} onClick={() => nav('/user')}>Home</button>
          </div>
        </div>
        {msgs.length > 0 && (
          <div className="av-card av-transcript" style={{ marginTop: 14 }}>
            <h3 style={{ fontSize: 17, color: 'var(--t1)', marginBottom: 6 }}>Chat transcript</h3>
            {msgs.map((m) => <p key={m._id}><b>{m.senderRole === 'user' ? 'You' : m.senderRole === 'system' ? '•' : first}:</b> {m.text}</p>)}
          </div>
        )}
      </div>
    </>
  );

  /* ---------- Live chat ---------- */
  return (
    <>
      {Header}
      {s.type !== 'chat' && (
        <CallScreen hidden={view === 'chat'} socketRef={sock} sessionId={id} role="user" type={s.type} active={active}
          peerName={a.name} peerAvatar={a.avatar} timer={`${mmss(elapsed)}${maxSec > 0 ? ` / ${mmss(maxSec)}` : ''} · ${inr(me.walletBalance)} left`}
          onEnd={end} onShowChat={() => { setView('chat'); setUnread(0); }} unread={unread} />
      )}
      {s.type !== 'chat' && view === 'chat' && <div className="av-strip warn"><Icon n={s.type === 'video' ? 'video' : 'phone'} s={14} /> Call is running · <button onClick={() => setView('call')}>Back to call</button></div>}
      {endingSoon && <div className="av-strip warn"><Icon n="clock" s={14} /> Session ends automatically in {Math.max(0, maxSec - elapsed)}s ({s.maxMinutes} min limit).</div>}
      {low && <div className="av-strip low">Low balance — the session ends automatically. <button onClick={() => openSheet(`Keep talking to ${first} — add money without leaving the chat.`)}>Add money</button></div>}
      {(s.type === 'chat' || view === 'chat') && <>
      <div className="av-msgs">
        <span className="av-daychip">TODAY</span>
        {msgs.length === 0 && <span className="av-sys">Say namaste and share your question with {first}.</span>}
        {msgs.map((m) => m.senderRole === 'system'
          ? <span key={m._id} className="av-sys">{m.text}</span>
          : <div key={m._id} className={`av-bub ${m.senderRole === 'user' ? 'me' : 'them'}`}>{m.text}<time>{hm(m.createdAt)}</time></div>)}
        {typing && <div className="av-typing" aria-label={`${first} is typing`}><i /><i /><i /></div>}
        <div ref={endRef} />
      </div>
      <form className="av-compose" onSubmit={send}>
        <input value={text} onChange={(e) => { setText(e.target.value); sock.current?.emit('typing', { sessionId: id }); }} placeholder={`Message ${first}…`} aria-label="Message" />
        <button className="av-send" aria-label="Send"><Icon n="send" s={18} /></button>
      </form>
      </>}
    </>
  );
}
