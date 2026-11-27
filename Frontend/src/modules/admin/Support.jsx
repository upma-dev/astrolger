import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Headphones, Loader2, LogIn, MessageSquare, Phone, RotateCcw, Search, Send } from 'lucide-react';
import { api, connectSocket, fmtDate } from '../../lib/api.js';
import { Badge, PageLoader, useAsync, useToast, cx } from '../../shared/ui.jsx';

/* Support queries, one page per app:
   Users > Queries & support (app="user") · Astrologers > Support queries (app="astrologer").
   Tickets come from the app profile or the login screen (not logged in). Replies show up in the person's app. */

const FILTERS = [['open', 'Open'], ['resolved', 'Resolved'], ['all', 'All']];

export default function Support({ app = 'user' }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('open');
  const [sel, setSel] = useState(null);
  const [text, setText] = useState('');
  const [resolve, setResolve] = useState(true);
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const { data, loading, reload, setData } = useAsync(() => api.admin.get('/admin/tickets', { app }), [app]);

  // New queries / replies arrive live (admin socket room); only poll as fallback if socket drops.
  useEffect(() => {
    const s = connectSocket('admin');
    let hadConnect = false;
    s.on('connect', () => {
      if (hadConnect) reload(true);
      hadConnect = true;
    });
    s.on('support:update', (e) => { if (!e?.app || (app === 'astrologer') === (e.app === 'astrologer')) reload(true); });
    const t = setInterval(() => {
      if (!document.hidden && !s.connected) reload(true);
    }, 30000);
    return () => { s.disconnect(); clearInterval(t); };
  }, [app, reload]);

  const list = (data || []).filter((t) => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (!q) return true;
    const who = t.user || t.astrologer || {};
    const hay = `${who.name || ''} ${who.phone || ''} ${t.guest?.name || ''} ${t.guest?.phone || ''} ${t.subject} ${t.messages.map((m) => m.text).join(' ')}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  const t = (data || []).find((x) => x._id === sel);
  const openCount = (data || []).filter((x) => x.status === 'open').length;
  const unreadCount = (data || []).filter((x) => x.unreadAdmin).length;
  const who = (x) => x.user || x.astrologer || null;
  const nameOf = (x) => who(x)?.name || x.guest?.name || 'Unknown';
  const phoneOf = (x) => who(x)?.phone || x.guest?.phone || '';
  const profileLink = (x) => (x.astrologer ? `/admin/astro/view/${x.astrologer._id}` : x.user ? `/admin/users/view/${x.user._id}` : null);

  useEffect(() => {
    if (!t) return;
    if (t.unreadAdmin) { api.admin.post(`/admin/tickets/${t._id}/read`).catch(() => {}); setData((d) => d.map((x) => (x._id === t._id ? { ...x, unreadAdmin: false } : x))); }
    setTimeout(() => endRef.current?.scrollIntoView({ block: 'end' }), 30);
  }, [sel, t?.messages?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const replace = (n) => setData((d) => d.map((x) => (x._id === n._id ? n : x)));
  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try { replace(await api.admin.post(`/admin/tickets/${t._id}/reply`, { reply: text.trim(), resolve })); setText(''); toast(resolve ? 'Reply sent and query resolved' : 'Reply sent', 'success'); } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const setStatus = async (status) => {
    try { replace({ ...(await api.admin.post(`/admin/tickets/${t._id}/status`, { status })), user: t.user, astrologer: t.astrologer }); } catch (err) { toast(err.message, 'error'); }
  };

  if (loading && !data) return <PageLoader />;
  if (loading && !data) return <PageLoader variant="split" />;
  const label = app === 'astrologer' ? 'Astrologer' : 'Customer';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{app === 'astrologer' ? 'Astrologers' : 'Users'}</p>
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Headphones size={20} className="text-brand-600" />{label} support queries</h2>
          <p className="text-sm text-slate-500">From the {app === 'astrologer' ? 'astrologer' : 'customer'} app profile and its login screen. Your reply appears in their app.</p>
        </div>
        <div className="flex gap-2 text-center">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2"><p className="text-lg font-bold text-amber-600">{openCount}</p><p className="text-[10.5px] font-semibold text-slate-400">Open</p></div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2"><p className="text-lg font-bold text-brand-600">{unreadCount}</p><p className="text-[10.5px] font-semibold text-slate-400">Unread</p></div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* list */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="space-y-2 border-b border-slate-100 p-3">
            <div className="relative"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone or message" className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500" /></div>
            <div className="flex gap-1">{FILTERS.map(([k, l]) => <button key={k} type="button" onClick={() => setFilter(k)} className={cx('flex-1 rounded-lg py-1.5 text-xs font-semibold', filter === k ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}>{l}</button>)}</div>
          </div>
          <ul className="max-h-[65vh] divide-y divide-slate-100 overflow-y-auto">
            {list.length ? list.map((x) => {
              const last = x.messages[x.messages.length - 1];
              return (
                <li key={x._id}>
                  <button type="button" onClick={() => setSel(x._id)} className={cx('w-full px-4 py-3 text-left transition', sel === x._id ? 'bg-brand-50' : 'hover:bg-slate-50')}>
                    <div className="flex items-center gap-2">
                      <b className="min-w-0 flex-1 truncate text-sm text-slate-900">{nameOf(x)}</b>
                      {x.unreadAdmin && <span className="h-2 w-2 rounded-full bg-brand-600" aria-label="Unread" />}
                      <span className="text-[10.5px] text-slate-400">{fmtDate(x.updatedAt)}</span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">{x.source === 'login' && <LogIn size={11} className="text-amber-600" />}{x.subject}</p>
                    <p className="truncate text-xs text-slate-400">{last?.from === 'admin' ? 'You: ' : ''}{last?.text}</p>
                  </button>
                </li>
              );
            }) : <li className="px-4 py-12 text-center text-sm text-slate-400">No {filter === 'all' ? '' : filter} queries</li>}
          </ul>
        </div>

        {/* conversation */}
        <div className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {!t ? (
            <div className="flex flex-1 flex-col items-center justify-center p-10 text-center text-slate-400"><MessageSquare size={36} className="mb-2" /><p className="text-sm">Select a query to read and reply</p></div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-bold text-slate-900">{nameOf(t)}
                    {profileLink(t) && <Link to={profileLink(t)} className="text-xs font-semibold text-brand-700 hover:underline">View profile</Link>}
                  </p>
                  <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {phoneOf(t) && <a href={`tel:+91${phoneOf(t)}`} className="flex items-center gap-1 hover:text-brand-700"><Phone size={11} />+91 {phoneOf(t)}</a>}
                    <span>· {t.subject}</span>
                    {t.source === 'login' && <Badge tone="amber">From login screen{who(t) ? '' : ' · no account'}</Badge>}
                  </p>
                </div>
                <Badge tone={t.status === 'resolved' ? 'green' : 'amber'}>{t.status}</Badge>
                {t.status === 'resolved'
                  ? <button type="button" onClick={() => setStatus('open')} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><RotateCcw size={13} /> Reopen</button>
                  : <button type="button" onClick={() => setStatus('resolved')} className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"><CheckCircle2 size={13} /> Mark resolved</button>}
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-4" style={{ maxHeight: '52vh' }}>
                {t.messages.map((m, i) => (
                  <div key={i} className={cx('flex', m.from === 'admin' ? 'justify-end' : 'justify-start')}>
                    <div className={cx('max-w-[75%] rounded-2xl px-3.5 py-2 text-sm', m.from === 'admin' ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-800')}>
                      <p className={cx('text-[10px] font-bold', m.from === 'admin' ? 'text-white/70' : 'text-slate-400')}>{m.from === 'admin' ? 'Support team' : nameOf(t)}</p>
                      <p className="whitespace-pre-wrap">{m.text}</p>
                      <p className={cx('mt-0.5 text-right text-[10px]', m.from === 'admin' ? 'text-white/60' : 'text-slate-400')}>{fmtDate(m.at)}</p>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <form onSubmit={send} className="border-t border-slate-100 p-3">
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder={who(t) ? 'Write a reply… it appears in their app' : 'Write a note (no account: call them on the number above)'} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={resolve} onChange={(e) => setResolve(e.target.checked)} className="accent-orange-700" /> Mark resolved after replying</label>
                  <button type="submit" disabled={busy || !text.trim()} className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />} Send reply</button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
