import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, Headphones, Loader2, MessageSquarePlus, Send, X } from 'lucide-react';
import { api, connectSocket, fmtDate } from '../lib/api.js';
import { SupportListSkeleton } from './Skeleton.jsx';

/* Customer support, connected straight to the admin panel.
   - Not logged in (login screen): name + mobile + message → lands in the admin section of that app.
   - Logged in (profile): my queries as conversations; admin replies appear here, and I can reply back.
   app = 'user' → Admin > Users > Queries & support · app = 'astrologer' → Admin > Astrologers > Support queries. */

const SUBJECTS = ['Payment / wallet', 'Consultation', 'Account / login', 'Payout', 'KYC', 'Other'];
const subjectsFor = (app) => (app === 'astrologer' ? SUBJECTS : SUBJECTS.filter((s) => s !== 'Payout' && s !== 'KYC'));
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-orange-600 focus:ring-4 focus:ring-orange-100';
const btn = 'flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#B9542C] text-sm font-bold text-white hover:brightness-110 disabled:opacity-50';

function Sheet({ title, onClose, onBack, children }) {
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          {onBack ? <button type="button" onClick={onBack} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Back"><ArrowLeft size={18} /></button> : <Headphones size={18} className="text-[#B9542C]" />}
          <h2 className="flex-1 truncate text-[15px] font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

/* Login screen: no account needed. */
function GuestForm({ app, onClose }) {
  const [f, setF] = useState({ name: '', phone: '', subject: 'Account / login', message: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try { const r = await api.public.post('/public/support', { ...f, app }); setDone(r.ticket); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  if (done) return (
    <div className="py-6 text-center">
      <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
      <p className="mt-3 text-lg font-bold text-slate-900">Request received</p>
      <p className="mt-1 text-sm text-slate-500">Ticket <b className="text-slate-800">#{done}</b>. Our support team will contact you on +91 {f.phone} soon.</p>
      <button type="button" onClick={onClose} className={`${btn} mt-5`}>Done</button>
    </div>
  );
  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-slate-500">Facing a problem? Tell us and our team will get back to you.</p>
      <input className={input} placeholder="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required maxLength={60} />
      <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 focus-within:border-orange-600">
        <span className="border-r border-slate-100 px-3 py-2.5 text-sm font-bold text-slate-600">+91</span>
        <input className="w-full px-3 py-2.5 text-sm outline-none" inputMode="numeric" placeholder="Mobile number" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} required />
      </div>
      <select className={input} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })}>{subjectsFor(app).map((s) => <option key={s}>{s}</option>)}</select>
      <textarea className={input} rows={4} placeholder="Describe your problem" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} required maxLength={2000} />
      {err && <p className="text-xs font-semibold text-rose-600">{err}</p>}
      <button type="submit" disabled={busy || f.phone.length !== 10} className={btn}>{busy ? <Loader2 size={17} className="animate-spin" /> : <><Send size={15} /> Send to support</>}</button>
    </form>
  );
}

/* Logged in: my conversations with support. */
function MyQueries({ app, setTitle, setBack }) {
  const client = app === 'astrologer' ? api.vendor : api.user;
  const base = app === 'astrologer' ? '/astrologer/tickets' : '/user/tickets';
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null); // ticket id
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ subject: subjectsFor(app)[0], message: '' });
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const endRef = useRef(null);
  const load = () => client.get(base).then(setList).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
    const s = connectSocket(app === 'astrologer' ? 'astrologer' : 'user');
    let hadConnect = false;
    s.on('connect', () => { if (hadConnect) load(); hadConnect = true; });
    s.on('support:reply', load);
    const t = setInterval(() => { if (!document.hidden && !s.connected) load(); }, 30000);
    return () => { s.close(); clearInterval(t); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const t = list?.find((x) => x._id === open);
  useEffect(() => {
    setTitle(t ? t.subject : creating ? 'New query' : 'Help & support');
    setBack(t || creating ? () => () => { setOpen(null); setCreating(false); } : null);
    if (t?.unreadOwner) client.post(`${base}/${t._id}/read`).catch(() => {});
    setTimeout(() => endRef.current?.scrollIntoView({ block: 'end' }), 50);
  }, [open, creating, t?.messages?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const n = await client.post(base, f); setList((l) => [n, ...(l || [])]); setCreating(false); setOpen(n._id); setF({ ...f, message: '' }); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const send = async (e) => {
    e.preventDefault(); if (!text.trim()) return; setBusy(true); setErr('');
    try { const n = await client.post(`${base}/${open}/messages`, { text }); setList((l) => l.map((x) => (x._id === n._id ? n : x))); setText(''); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  if (!list) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#B9542C]" /></div>;
  if (!list) return <SupportListSkeleton />;

  if (creating) return (
    <form onSubmit={create} className="space-y-3">
      <select className={input} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })}>{subjectsFor(app).map((s) => <option key={s}>{s}</option>)}</select>
      <textarea className={input} rows={5} autoFocus placeholder="Describe your problem" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} required maxLength={2000} />
      {err && <p className="text-xs font-semibold text-rose-600">{err}</p>}
      <button type="submit" disabled={busy} className={btn}>{busy ? <Loader2 size={17} className="animate-spin" /> : <><Send size={15} /> Send to support</>}</button>
    </form>
  );

  if (t) return (
    <div className="flex min-h-full flex-col">
      <p className="mb-3 text-center text-[11px] text-slate-400">Ticket #{String(t._id).slice(-6).toUpperCase()} · {t.status === 'resolved' ? 'Resolved' : 'Open'}</p>
      <div className="flex-1 space-y-2">
        {t.messages.map((m, i) => (
          <div key={i} className={`flex ${m.from === 'admin' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.from === 'admin' ? 'rounded-bl-md bg-slate-100 text-slate-800' : 'rounded-br-md bg-[#B9542C] text-white'}`}>
              {m.from === 'admin' && <p className="text-[10px] font-bold text-[#B9542C]">Support team</p>}
              <p className="whitespace-pre-wrap">{m.text}</p>
              <p className={`mt-0.5 text-right text-[10px] ${m.from === 'admin' ? 'text-slate-400' : 'text-white/70'}`}>{fmtDate(m.at)}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {err && <p className="mt-2 text-xs font-semibold text-rose-600">{err}</p>}
      <form onSubmit={send} className="sticky bottom-0 mt-3 flex gap-2 bg-white pt-2">
        <input className={input} placeholder={t.status === 'resolved' ? 'Reply to reopen this query…' : 'Type a message…'} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
        <button type="submit" disabled={busy || !text.trim()} className="flex h-[42px] w-12 shrink-0 items-center justify-center rounded-xl bg-[#B9542C] text-white disabled:opacity-50" aria-label="Send">{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
      </form>
    </div>
  );

  return (
    <div className="space-y-3">
      <button type="button" onClick={() => setCreating(true)} className={btn}><MessageSquarePlus size={16} /> New query</button>
      {err && <p className="text-xs font-semibold text-rose-600">{err}</p>}
      {list.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No queries yet. Our team usually replies within a few hours.</p> : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
          {list.map((x) => {
            const last = x.messages[x.messages.length - 1];
            return (
              <li key={x._id}>
                <button type="button" onClick={() => setOpen(x._id)} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-slate-50">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2"><b className="truncate text-sm text-slate-900">{x.subject}</b>{x.unreadOwner && <span className="h-2 w-2 shrink-0 rounded-full bg-[#B9542C]" aria-label="New reply" />}</span>
                    <span className="block truncate text-xs text-slate-500">{last?.from === 'admin' ? 'Support: ' : 'You: '}{last?.text}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${x.status === 'resolved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{x.status === 'resolved' ? 'Resolved' : 'Open'}</span>
                  <ChevronRight size={15} className="shrink-0 text-slate-300" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* The button: renders anything as the trigger and opens the support sheet. */
export default function SupportButton({ app = 'user', loggedIn = false, className, children }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('Help & support');
  const [back, setBack] = useState(null);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>{children || <><Headphones size={15} /> Customer support</>}</button>
      {open && (
        <Sheet title={loggedIn ? title : 'Contact support'} onBack={back} onClose={() => { setOpen(false); setBack(null); setTitle('Help & support'); }}>
          {loggedIn ? <MyQueries app={app} setTitle={setTitle} setBack={setBack} /> : <GuestForm app={app} onClose={() => setOpen(false)} />}
        </Sheet>
      )}
    </>
  );
}
