import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, PhoneOff, Clock, User } from 'lucide-react';
import { api, connectSocket, inr } from '../../lib/api.js';
import { playAlert } from '../../shared/sound.js';
import CallScreen from '../../shared/CallScreen.jsx';
import { Avatar, Card, PageLoader, cx, useToast } from '../../shared/ui.jsx';

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function Chat() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [s, setS] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [typing, setTyping] = useState(false);
  const sock = useRef(null);
  const endRef = useRef(null);
  const statusRef = useRef(null);
  const loadInFlight = useRef(null);
  const [view, setView] = useState('call');
  const [unread, setUnread] = useState(0);
  const viewRef = useRef('call');
  viewRef.current = view;
  statusRef.current = s?.status || null;

  const load = useCallback(() => {
    if (loadInFlight.current) return loadInFlight.current;
    const p = api.vendor.get(`/astrologer/sessions/${id}`)
      .then((d) => { setS(d); setMsgs(d.messages); return d; })
      .finally(() => { if (loadInFlight.current === p) loadInFlight.current = null; });
    loadInFlight.current = p;
    return p;
  }, [id]);

  useEffect(() => {
    load().catch((e) => { toast(e.message, 'error'); nav('/vendor/requests', { replace: true }); });
    const socket = connectSocket('astrologer');
    sock.current = socket;
    let hadConnect = false;
    socket.on('connect', () => {
      socket.emit('session:join', id);
      if (hadConnect && statusRef.current === 'active') load().catch(() => {});
      hadConnect = true;
    });
    socket.on('message', (m) => {
      if (String(m.session) !== id) return;
      if (m.senderRole === 'user') { playAlert('chat', `msg-${m._id}`); if (viewRef.current === 'call') setUnread((n) => n + 1); }
      setMsgs((x) => (x.some((y) => y._id === m._id) ? x : [...x, m]));
    });
    socket.on('session:update', (u) => String(u.id) === id && load().catch(() => {}));
    let t;
    socket.on('typing', () => { setTyping(true); clearTimeout(t); t = setTimeout(() => setTyping(false), 1500); });
    const onVis = () => {
      if (document.visibilityState === 'visible' && !socket.connected && statusRef.current === 'active') load().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVis);
    return () => { socket.close(); clearTimeout(t); document.removeEventListener('visibilitychange', onVis); };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (s?.status !== 'active' || !s.startedAt) return;
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(s.startedAt)) / 1000)));
    tick(); const i = setInterval(tick, 1000); return () => clearInterval(i);
  }, [s?.status, s?.startedAt]);
  const pastLimit = s?.status === 'active' && s.maxMinutes > 0 && elapsed >= s.maxMinutes * 60;
  useEffect(() => {
    if (!pastLimit) return undefined;
    const t = setTimeout(() => { load().catch(() => {}); }, 600);
    return () => clearTimeout(t);
  }, [pastLimit, load]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length, view]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sock.current?.emit('message', { sessionId: id, text }, (r) => r && !r.ok && toast(r.message || 'Not sent', 'error'));
    setText('');
  };
  const end = async () => { try { await api.vendor.post(`/astrologer/sessions/${id}/end`); await load(); } catch (e) { toast(e.message, 'error'); } };

  if (!s) return <PageLoader variant="chat" />;
  const active = s.status === 'active';
  const u = s.user;
  const maxSec = s.maxMinutes > 0 ? s.maxMinutes * 60 : 0;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
      <div className="flex h-[calc(100dvh-9rem)] flex-col overflow-hidden rounded-2xl bg-[#efeae2] shadow-sm lg:h-[calc(100dvh-6rem)]">
        <header className="flex items-center gap-3 bg-white px-3 py-2.5">
          <button onClick={() => nav('/vendor/requests')} aria-label="Back"><ArrowLeft size={18} /></button>
          <Avatar name={u?.name || 'User'} size={36} />
          <div className="flex-1"><p className="text-sm font-bold text-slate-900">{u?.name || 'User'}</p><p className="flex items-center gap-1 text-[11px] text-slate-400">{typing ? 'typing…' : active ? <><Clock size={11} /> {mmss(elapsed)}{maxSec > 0 ? ` / ${mmss(maxSec)}` : ''} · {s.type}</> : s.status}</p></div>
          {active && <button onClick={end} className="flex items-center gap-1.5 rounded-full bg-rose-500 px-3 py-2 text-xs font-bold text-white"><PhoneOff size={14} /> End</button>}
        </header>
        {s.type !== 'chat' && active && (
          <CallScreen hidden={view === 'chat'} socketRef={sock} sessionId={id} role="astrologer" type={s.type} active={active}
            peerName={u?.name || 'Client'} timer={`${mmss(elapsed)}${maxSec > 0 ? ` / ${mmss(maxSec)}` : ''} · earned ${inr(s.astrologerEarning)}`}
            onEnd={end} onShowChat={() => { setView('chat'); setUnread(0); }} unread={unread} />
        )}
        {s.type !== 'chat' && active && view === 'chat' && <button onClick={() => setView('call')} className="bg-emerald-600 py-1.5 text-center text-xs font-bold text-white">Call is running · tap to go back to the call</button>}
        <div className={cx('flex-1 space-y-2 overflow-y-auto p-3', s.type !== 'chat' && active && view === 'call' && 'hidden')}>
          {msgs.map((m) => m.senderRole === 'system'
            ? <p key={m._id} className="mx-auto w-fit rounded-full bg-white/80 px-3 py-1 text-[11px] text-slate-500">{m.text}</p>
            : <div key={m._id} className={cx('flex', m.senderRole === 'astrologer' ? 'justify-end' : 'justify-start')}><p className={cx('max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm shadow-sm', m.senderRole === 'astrologer' ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-white text-slate-800')}>{m.text}</p></div>)}
          <div ref={endRef} />
        </div>
        {active && s.type !== 'chat' && view === 'call' ? null : active ? (
          <form onSubmit={send} className="flex gap-2 bg-white p-2.5">
            <input value={text} onChange={(e) => { setText(e.target.value); sock.current?.emit('typing', { sessionId: id }); }} placeholder="Type your reply" className="flex-1 rounded-full bg-slate-100 px-4 py-2.5 text-sm outline-none" />
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white" aria-label="Send"><Send size={17} /></button>
          </form>
        ) : <p className="bg-white p-3 text-center text-xs text-slate-400">{s.endReason === 'time-limit' ? `${s.maxMinutes} min limit reached · ` : s.endReason === 'low-balance' ? 'Client balance finished · ' : ''}Session ended · {s.minutes} min · you earned {inr(s.astrologerEarning)}</p>}
      </div>
      <Card className="hidden h-fit space-y-2 p-4 text-xs lg:block">
        <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><User size={15} /> Client birth details</p>
        {[['Name', u?.name], ['Gender', u?.gender], ['Sun/Moon sign', u?.zodiac], ['Date of birth', u?.dob], ['Time', u?.tob], ['Place', u?.pob]].map(([k, v]) => <div key={k} className="flex justify-between border-t border-slate-100 pt-2"><span className="text-slate-400">{k}</span><span className="font-semibold text-slate-700">{v || '–'}</span></div>)}
        <div className="flex justify-between border-t border-slate-100 pt-2"><span className="text-slate-400">Earned so far</span><span className="font-bold text-emerald-600">{inr(s.astrologerEarning)}</span></div>
      </Card>
    </div>
  );
}
