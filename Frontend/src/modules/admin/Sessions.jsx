import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareText, Star } from 'lucide-react';
import { api, fmtDate, inr } from '../../lib/api.js';
import { Badge, Button, Modal, PageLoader, statusTone, useAsync, useDebouncedValue, cx } from '../../shared/ui.jsx';
import { InfoGrid, Panel, Pills, SearchBox, Table } from './kit.jsx';

/* Full chat transcript of one consultation. */
export function TranscriptModal({ id, onClose }) {
  const { data, loading } = useAsync(() => (id ? api.admin.get(`/admin/sessions/${id}`) : Promise.resolve(null)), [id]);
  const s = data?.session;
  return (
    <Modal open={!!id} onClose={onClose} title="Consultation details" wide>
      {loading || !s ? <PageLoader variant="chat" /> : (
        <div className="space-y-4">
          <InfoGrid cols={4} items={[['User', s.user?.name || s.user?.phone], ['Astrologer', s.astrologer?.name], ['Type', s.type], ['Status', s.status], ['Started', fmtDate(s.startedAt)], ['Ended', fmtDate(s.endedAt)], ['Minutes', s.minutes], ['Rate', `${inr(s.pricePerMin)}/min`], ['Amount', inr(s.amount)], ['Astrologer earned', inr(s.astrologerEarning)], ['Platform earned', inr(s.platformEarning)], ['Commission', `${s.commissionPct ?? '-'}%`]]} />
          {data.review && <div className="rounded-xl bg-amber-50 p-3 text-sm"><p className="flex items-center gap-1 font-bold text-amber-800"><Star size={14} className="fill-amber-400 text-amber-400" /> {data.review.rating}/5 review</p>{data.review.comment && <p className="mt-1 text-amber-900">{data.review.comment}</p>}</div>}
          <div className="max-h-[50vh] space-y-2 overflow-y-auto rounded-2xl bg-slate-50 p-3">
            {data.messages.length ? data.messages.map((m) => (
              <div key={m._id} className={cx('flex', m.senderRole === 'user' ? 'justify-end' : m.senderRole === 'system' ? 'justify-center' : 'justify-start')}>
                <div className={cx('max-w-[78%] rounded-2xl px-3 py-2 text-sm', m.senderRole === 'user' ? 'bg-brand-600 text-white' : m.senderRole === 'system' ? 'bg-white text-xs text-slate-500' : 'border border-slate-200 bg-white text-slate-800')}>
                  {m.senderRole !== 'system' && <p className={cx('text-[10px] font-bold', m.senderRole === 'user' ? 'text-white/70' : 'text-slate-400')}>{m.senderRole === 'user' ? s.user?.name || 'User' : s.astrologer?.name}</p>}
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  <p className={cx('mt-0.5 text-right text-[10px]', m.senderRole === 'user' ? 'text-white/60' : 'text-slate-400')}>{new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            )) : <p className="py-8 text-center text-sm text-slate-400">No messages in this consultation.</p>}
          </div>
        </div>
      )}
    </Modal>
  );
}

const STATUS = [['', 'All'], ['active', 'Live'], ['completed', 'Completed'], ['requested', 'Waiting'], ['failed', 'Cancelled / missed']];
const TYPES = [['', 'All types'], ['chat', 'Chat'], ['audio', 'Call'], ['video', 'Video']];

/* Consultations list. Used as "Consultations & chats" (users) and "Chat history" (astrologers). */
export default function Sessions({ scope = 'users', live = false }) {
  const [status, setStatus] = useState(live ? 'active' : '');
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 300);
  const [open, setOpen] = useState(null);
  const { data, loading, reload } = useAsync(() => api.admin.get('/admin/sessions', { status, type, q: dq }), [status, type, dq]);
  // Live view refreshes silently when visible so running sessions, minutes and amounts stay current.
  useEffect(() => {
    if (!live) return undefined;
    const t = setInterval(() => { if (!document.hidden) reload(true); }, 15000);
    return () => clearInterval(t);
  }, [live, reload]);
  const rows = data || [];
  const total = rows.reduce((a, x) => a + (x.amount || 0), 0);
  return (
    <div className="space-y-4">
      <InfoGrid cols={4} items={[['Consultations shown', rows.length], ['Minutes', rows.reduce((a, x) => a + (x.minutes || 0), 0)], ['Billed', inr(total)], ['Messages', rows.reduce((a, x) => a + (x.messageCount || 0), 0)]]} />
      <Panel title={live ? <span className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />Live active sessions</span> : scope === 'astro' ? 'Chat history' : 'Consultations & chats'} action={<div className="flex flex-wrap items-center gap-3"><Pills value={status} onChange={setStatus} options={STATUS} /><Pills value={type} onChange={setType} options={TYPES} /><SearchBox value={q} onChange={setQ} placeholder="User or astrologer" /></div>}>
        {loading && !data ? <PageLoader variant="table" /> : (
          <Table rows={rows} empty="No consultations match these filters" cols={[
            { h: 'Date', cell: (x) => fmtDate(x.createdAt) },
            { h: 'User', cell: (x) => x.user ? <Link to={`/admin/users/view/${x.user._id}`} className="font-semibold text-slate-900 hover:text-brand-700">{x.user.name || x.user.phone}</Link> : '—' },
            { h: 'Astrologer', cell: (x) => x.astrologer ? <Link to={`/admin/astro/view/${x.astrologer._id}`} className="font-semibold text-slate-900 hover:text-brand-700">{x.astrologer.name}</Link> : '—' },
            { h: 'Type', cell: (x) => <Badge tone="violet">{x.type === 'audio' ? 'call' : x.type}</Badge> },
            { h: 'Status', cell: (x) => <Badge tone={statusTone(x.status)}>{x.status}</Badge> },
            { h: 'Minutes', cell: (x) => x.minutes },
            { h: 'Rate', cell: (x) => `${inr(x.pricePerMin)}/min` },
            { h: 'Amount', cell: (x) => <b>{inr(x.amount)}</b> },
            { h: '', right: true, cell: (x) => <Button size="sm" variant="outline" onClick={() => setOpen(x._id)}><MessageSquareText size={13} /> {x.messageCount}</Button> },
          ]} />
        )}
      </Panel>
      <TranscriptModal id={open} onClose={() => setOpen(null)} />
    </div>
  );
}
