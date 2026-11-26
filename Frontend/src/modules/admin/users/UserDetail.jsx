import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Star } from 'lucide-react';
import { api, fmtDate, inr } from '../../../lib/api.js';
import { Avatar, Badge, Button, Field, Modal, PageLoader, Select, statusTone, useAsync, useToast, cx } from '../../../shared/ui.jsx';
import { InfoGrid, Panel, Table, Tabs } from '../kit.jsx';
import { TranscriptModal } from '../Sessions.jsx';

export default function UserDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.admin.get(`/admin/users/${id}/detail`), [id]);
  const [tab, setTab] = useState('sessions');
  const [wallet, setWallet] = useState(null);
  const [chat, setChat] = useState(null);
  if (loading && !data) return <PageLoader variant="detail" />;
  if (!data) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error?.message || 'User not found.'}</div>;
  const { user: u, stats: s } = data;

  const block = async () => { try { await api.admin.post(`/admin/users/${u._id}/block`, { blocked: !u.blocked }); toast(u.blocked ? 'Unblocked' : 'Blocked', 'success'); reload(); } catch (e) { toast(e.message, 'error'); } };
  const adjust = async (e) => {
    e.preventDefault();
    try { const r = await api.admin.post(`/admin/users/${u._id}/wallet`, wallet); toast(`Done. New balance ${inr(r.balance)}`, 'success'); setWallet(null); reload(); } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <div className="space-y-5">
      <Link to="/admin/users/list" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft size={15} /> All users</Link>
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Panel>
          <div className="p-5 text-center">
            <Avatar name={u.name || 'U'} size={72} className="mx-auto" />
            <p className="mt-3 text-lg font-bold text-slate-900">{u.name || 'Unnamed user'}</p>
            <p className="text-sm text-slate-500">{u.phone ? `+91 ${u.phone}` : u.email}</p>
            <div className="mt-2 flex justify-center gap-1.5"><Badge tone={u.blocked ? 'red' : 'green'}>{u.blocked ? 'blocked' : 'active'}</Badge>{u.zodiac && <Badge tone="violet">{u.zodiac}</Badge>}</div>
            <p className="mt-4 text-3xl font-extrabold text-slate-900">{inr(u.walletBalance)}</p><p className="text-xs text-slate-400">Wallet balance</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setWallet({ direction: 'credit', amount: '', note: '', kind: 'adjustment' })}>Adjust wallet</Button>
              <Button variant={u.blocked ? 'outline' : 'danger'} onClick={block}>{u.blocked ? 'Unblock' : 'Block'}</Button>
            </div>
          </div>
          <div className="space-y-1.5 border-t border-slate-100 p-4 text-sm">
            {[['Gender', u.gender], ['Email', u.email], ['Birth date', u.dob], ['Birth time', u.tob || 'Not given'], ['Birth place', u.pob], ['Nakshatra', u.nakshatra], ['Lagna', u.lagna], ['Joined', fmtDate(u.createdAt)]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3"><span className="text-slate-400">{k}</span><span className="truncate text-right font-medium text-slate-800">{v || '—'}</span></div>
            ))}
          </div>
        </Panel>
        <div className="space-y-5">
          <InfoGrid cols={4} items={[['Consultations', s.sessions], ['Completed', s.completed], ['Cancelled / missed', s.cancelled], ['Minutes talked', s.minutes], ['Spent on consultations', inr(s.spent)], ['Recharged', inr(s.recharged)], ['Reports & remedies', inr(s.purchases)], ['Support tickets', data.tickets.length]]} />
          <Tabs value={tab} onChange={setTab} tabs={[['sessions', `Consultations (${data.sessions.length})`], ['tx', `Wallet history (${data.transactions.length})`], ['purchases', `Purchases (${data.purchases.length})`], ['reviews', `Reviews (${data.reviews.length})`], ['tickets', `Queries (${data.tickets.length})`]]} />
          {tab === 'sessions' && <Panel><Table rows={data.sessions} empty="No consultations yet" cols={[
            { h: 'Date', cell: (x) => fmtDate(x.createdAt) },
            { h: 'Astrologer', cell: (x) => x.astrologer ? <Link to={`/admin/astro/view/${x.astrologer._id}`} className="font-semibold text-brand-700 hover:underline">{x.astrologer.name}</Link> : '—' },
            { h: 'Type', cell: (x) => <Badge tone="violet">{x.type}</Badge> }, { h: 'Status', cell: (x) => <Badge tone={statusTone(x.status)}>{x.status}</Badge> },
            { h: 'Minutes', cell: (x) => x.minutes }, { h: 'Amount', cell: (x) => inr(x.amount) },
            { h: '', right: true, cell: (x) => <Button size="sm" variant="outline" onClick={() => setChat(x._id)}>Chat</Button> },
          ]} /></Panel>}
          {tab === 'tx' && <Panel><Table rows={data.transactions} empty="No wallet activity" cols={[
            { h: 'Date', cell: (t) => fmtDate(t.createdAt) }, { h: 'Kind', cell: (t) => <span className="capitalize">{t.kind}</span> },
            { h: 'Note', cell: (t) => <span className="text-xs text-slate-500">{t.note}</span> }, { h: 'Balance after', cell: (t) => inr(t.balanceAfter) },
            { h: 'Amount', right: true, cell: (t) => <b className={cx(t.direction === 'credit' ? 'text-emerald-600' : 'text-rose-500')}>{t.direction === 'credit' ? '+' : '-'}{inr(t.amount)}</b> },
          ]} /></Panel>}
          {tab === 'purchases' && <Panel><Table rows={data.purchases} empty="No purchases" cols={[{ h: 'Date', cell: (p) => fmtDate(p.createdAt) }, { h: 'Item', cell: (p) => p.title }, { h: 'Type', cell: (p) => <span className="capitalize">{p.itemType}</span> }, { h: 'Price', right: true, cell: (p) => inr(p.price) }]} /></Panel>}
          {tab === 'reviews' && <Panel><Table rows={data.reviews} empty="No reviews given" cols={[{ h: 'Date', cell: (r) => fmtDate(r.createdAt) }, { h: 'Astrologer', cell: (r) => r.astrologer?.name }, { h: 'Rating', cell: (r) => <span className="flex items-center gap-1"><Star size={13} className="fill-amber-400 text-amber-400" />{r.rating}</span> }, { h: 'Comment', cell: (r) => <span className="text-xs text-slate-600">{r.comment || '—'}</span> }]} /></Panel>}
          {tab === 'tickets' && <Panel><Table rows={data.tickets} empty="No queries" cols={[{ h: 'Date', cell: (t) => fmtDate(t.createdAt) }, { h: 'Query', cell: (t) => <div><p className="font-semibold">{t.subject}</p><p className="text-xs text-slate-500">{t.message}</p>{t.reply && <p className="mt-1 text-xs text-brand-700">Reply: {t.reply}</p>}</div> }, { h: 'Status', cell: (t) => <Badge tone={statusTone(t.status)}>{t.status}</Badge> }]} /></Panel>}
        </div>
      </div>
      <Modal open={!!wallet} onClose={() => setWallet(null)} title="Adjust wallet">
        {wallet && <form onSubmit={adjust} className="space-y-3">
          <Select label="Action" value={wallet.direction === 'debit' ? 'debit' : wallet.kind === 'refund' ? 'refund' : 'credit'} onChange={(e) => setWallet({ ...wallet, direction: e.target.value === 'debit' ? 'debit' : 'credit', kind: e.target.value === 'refund' ? 'refund' : 'adjustment' })}>
            <option value="credit">Add money (goodwill / correction)</option><option value="refund">Refund</option><option value="debit">Deduct money (correction)</option>
          </Select>
          <Field label="Amount (₹)" type="number" min={1} value={wallet.amount} onChange={(e) => setWallet({ ...wallet, amount: e.target.value })} required />
          <Field label="Reason (shown in the user's wallet history)" value={wallet.note} onChange={(e) => setWallet({ ...wallet, note: e.target.value })} maxLength={140} required />
          <Button type="submit" className="w-full">Confirm</Button>
        </form>}
      </Modal>
      <TranscriptModal id={chat} onClose={() => setChat(null)} />
    </div>
  );
}
