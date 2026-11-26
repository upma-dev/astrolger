import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Star, Gift, Trash2 } from 'lucide-react';
import { api, fmtDate, inr, EXPERTISE, LANGUAGES } from '../../../lib/api.js';
import { Avatar, Badge, Button, Field, Modal, PageLoader, TextArea, statusTone, useAsync, useToast, cx } from '../../../shared/ui.jsx';
import { InfoGrid, Panel, Table, Tabs } from '../kit.jsx';
import { TranscriptModal } from '../Sessions.jsx';

const Chips = ({ all, value, onChange }) => (
  <div className="flex flex-wrap gap-1.5">{all.map((x) => <button type="button" key={x} onClick={() => onChange(value.includes(x) ? value.filter((v) => v !== x) : [...value, x])} className={cx('rounded-full border px-2.5 py-1 text-xs font-semibold', value.includes(x) ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500')}>{x}</button>)}</div>
);

export default function AstroDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.admin.get(`/admin/astrologers/${id}/detail`), [id]);
  const [tab, setTab] = useState('sessions');
  const [form, setForm] = useState(null);
  const [reward, setReward] = useState(null);
  const [chat, setChat] = useState(null);
  useEffect(() => { if (data) { const a = data.astrologer; setForm({ bio: a.bio || '', experience: a.experience, pricePerMin: a.pricePerMin, commissionPct: a.commissionPct, expertise: a.expertise || [], languages: a.languages || [] }); } }, [data]);
  if (loading && !data) return <PageLoader variant="detail" />;
  if (!data) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error?.message || 'Astrologer not found.'}</div>;
  if (!form) return <PageLoader variant="detail" />;
  const { astrologer: a, stats: s } = data;

  const status = async (patch, msg) => { try { await api.admin.put(`/admin/astrologers/${a._id}`, patch); toast(msg, 'success'); reload(); } catch (e) { toast(e.message, 'error'); } };
  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      await api.admin.put(`/admin/astrologers/${a._id}/profile`, form);
      await api.admin.put(`/admin/astrologers/${a._id}`, { commissionPct: form.commissionPct });
      toast('Profile saved', 'success'); reload();
    } catch (err) { toast(err.message, 'error'); }
  };
  const giveReward = async (e) => { e.preventDefault(); try { await api.admin.post(`/admin/astrologers/${a._id}/reward`, reward); toast('Reward credited to wallet', 'success'); setReward(null); reload(); } catch (err) { toast(err.message, 'error'); } };
  const delReview = async (r) => { if (!window.confirm('Delete this review? The rating will be recalculated.')) return; await api.admin.del(`/admin/reviews/${r._id}`); reload(); };

  return (
    <div className="space-y-5">
      <Link to={`/admin/astro/list/${a.status}`} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft size={15} /> Back to list</Link>
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="space-y-5">
          <Panel>
            <div className="p-5 text-center">
              <Avatar name={a.name} src={a.avatar} size={80} className="mx-auto" />
              <p className="mt-3 text-lg font-bold text-slate-900">{a.name}</p><p className="text-sm text-slate-500">+91 {a.phone}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                {a.status === 'approved' && <Badge tone={a.online ? 'green' : 'slate'}>{a.online ? (a.busy ? 'busy' : 'online') : 'offline'}</Badge>}
                {a.featured && <Badge tone="amber">featured</Badge>}
                {a.sponsored && (!a.sponsoredUntil || new Date(a.sponsoredUntil) > new Date()) && <Badge tone="violet">sponsored</Badge>}
              </div>
              <p className="mt-3 flex items-center justify-center gap-1 text-sm font-bold text-slate-800">{a.ratingCount ? <><Star size={15} className="fill-amber-400 text-amber-400" />{a.rating.toFixed(2)} <span className="font-normal text-slate-400">({a.ratingCount} reviews)</span></> : <span className="font-normal text-slate-400">No reviews yet</span>}</p>
              {data.live && <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs font-semibold text-emerald-700">In a live {data.live.type} with {data.live.user?.name || 'a user'}</p>}
              <p className="mt-4 text-2xl font-extrabold text-slate-900">{inr(a.walletBalance)}</p><p className="text-xs text-slate-400">Wallet balance</p>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-4">
              {a.status !== 'approved' && <Button variant="success" onClick={() => status({ status: 'approved', kycStatus: 'verified' }, 'Approved')}>Approve</Button>}
              {a.status === 'pending' && <Button variant="danger" onClick={() => status({ status: 'rejected' }, 'Rejected')}>Reject</Button>}
              {a.status === 'approved' && <Button variant="danger" onClick={() => status({ status: 'blocked' }, 'Blocked')}>Block</Button>}
              <Button variant="outline" onClick={() => status({ featured: !a.featured }, a.featured ? 'Removed from featured' : 'Marked featured')}>{a.featured ? 'Unfeature' : 'Feature'}</Button>
              {a.sponsored && (!a.sponsoredUntil || new Date(a.sponsoredUntil) > new Date())
                ? <Button variant="outline" onClick={() => status({ sponsored: false }, 'Sponsorship removed')}>Unsponsor</Button>
                : <Button variant="outline" onClick={() => {
                  const v = window.prompt('Sponsor for how many days? (0 = until you switch it off)', '30');
                  if (v === null) return;
                  status({ sponsored: true, sponsorDays: Math.max(0, Math.round(+v) || 0) }, 'Sponsored: shown first in astrologer lists');
                }}>Sponsor</Button>}
              {a.kyc?.status !== 'verified' && <Button variant="outline" onClick={() => status({ kycStatus: 'verified' }, 'KYC verified')}>Verify KYC</Button>}
              <Button variant="outline" onClick={() => setReward({ amount: '', note: '' })}><Gift size={14} /> Reward</Button>
            </div>
          </Panel>
          <Panel title="KYC & bank">
            <div className="space-y-1.5 p-4 text-sm">
              {[['KYC status', a.kyc?.status], ['PAN', a.kyc?.panNumber], ['Aadhaar', a.kyc?.aadhaarLast4 ? `•••• ${a.kyc.aadhaarLast4}` : null], ['Bank account', a.kyc?.bankAccount], ['IFSC', a.kyc?.ifsc], ['Joined', fmtDate(a.createdAt)]].map(([k, v]) => <div key={k} className="flex justify-between gap-3"><span className="text-slate-400">{k}</span><span className="font-medium text-slate-800">{v || '—'}</span></div>)}
            </div>
          </Panel>
        </div>
        <div className="space-y-5">
          <InfoGrid cols={4} items={[['Requests', s.sessions], ['Completed', s.completed], ['Acceptance', s.acceptance != null ? `${s.acceptance}%` : '—'], ['Minutes', s.minutes], ['Gross billed', inr(s.gross)], ['Astrologer earned', inr(s.earned)], ['Platform commission', inr(s.platform)], ['Rewards given', inr(s.rewards)]]} />
          <Tabs value={tab} onChange={setTab} tabs={[['sessions', `Chat history (${data.sessions.length})`], ['reviews', `Reviews (${data.reviews.length})`], ['profile', 'Edit profile'], ['wallet', `Wallet (${data.transactions.length})`], ['payouts', `Payouts (${data.withdrawals.length})`]]} />
          {tab === 'sessions' && <Panel><Table rows={data.sessions} empty="No consultations yet" cols={[
            { h: 'Date', cell: (x) => fmtDate(x.createdAt) }, { h: 'User', cell: (x) => x.user ? <Link to={`/admin/users/view/${x.user._id}`} className="font-semibold text-brand-700 hover:underline">{x.user.name || x.user.phone}</Link> : '—' },
            { h: 'Type', cell: (x) => <Badge tone="violet">{x.type === 'audio' ? 'call' : x.type}</Badge> }, { h: 'Status', cell: (x) => <Badge tone={statusTone(x.status)}>{x.status}</Badge> },
            { h: 'Minutes', cell: (x) => x.minutes }, { h: 'Earned', cell: (x) => inr(x.astrologerEarning) },
            { h: '', right: true, cell: (x) => <Button size="sm" variant="outline" onClick={() => setChat(x._id)}>Chat</Button> },
          ]} /></Panel>}
          {tab === 'reviews' && <Panel><Table rows={data.reviews} empty="No reviews yet" cols={[
            { h: 'Date', cell: (r) => fmtDate(r.createdAt) }, { h: 'User', cell: (r) => r.user?.name || 'User' },
            { h: 'Rating', cell: (r) => <span className="flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={13} className={n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />)}</span> },
            { h: 'Comment', cell: (r) => <span className="text-xs text-slate-600">{r.comment || '—'}</span> },
            { h: '', right: true, cell: (r) => <Button size="sm" variant="danger" onClick={() => delReview(r)}><Trash2 size={13} /></Button> },
          ]} /></Panel>}
          {tab === 'profile' && <Panel><form onSubmit={saveProfile} className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Experience (years)" type="number" min={0} value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
              <Field label="Price per minute (₹)" type="number" min={1} value={form.pricePerMin} onChange={(e) => setForm({ ...form, pricePerMin: e.target.value })} />
              <Field label="Platform commission (%)" type="number" min={0} max={90} value={form.commissionPct} onChange={(e) => setForm({ ...form, commissionPct: e.target.value })} />
            </div>
            <TextArea label="Bio (shown to users)" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={600} />
            <div><span className="mb-1 block text-xs font-semibold text-slate-600">Expertise</span><Chips all={EXPERTISE} value={form.expertise} onChange={(expertise) => setForm({ ...form, expertise })} /></div>
            <div><span className="mb-1 block text-xs font-semibold text-slate-600">Languages</span><Chips all={LANGUAGES} value={form.languages} onChange={(languages) => setForm({ ...form, languages })} /></div>
            <Button type="submit">Save profile</Button>
          </form></Panel>}
          {tab === 'wallet' && <Panel><Table rows={data.transactions} empty="No wallet activity" cols={[
            { h: 'Date', cell: (t) => fmtDate(t.createdAt) }, { h: 'Kind', cell: (t) => <span className="capitalize">{t.kind === 'bonus' ? 'reward' : t.kind}</span> }, { h: 'Note', cell: (t) => <span className="text-xs text-slate-500">{t.note}</span> },
            { h: 'Amount', right: true, cell: (t) => <b className={cx(t.direction === 'credit' ? 'text-emerald-600' : 'text-rose-500')}>{t.direction === 'credit' ? '+' : '-'}{inr(t.amount)}</b> },
          ]} /></Panel>}
          {tab === 'payouts' && <Panel><Table rows={data.withdrawals} empty="No payout requests" cols={[{ h: 'Requested', cell: (w) => fmtDate(w.createdAt) }, { h: 'Amount', cell: (w) => <b>{inr(w.amount)}</b> }, { h: 'Status', cell: (w) => <Badge tone={statusTone(w.status)}>{w.status}</Badge> }, { h: 'Note', cell: (w) => <span className="text-xs text-slate-500">{w.note || '—'}</span> }]} /></Panel>}
        </div>
      </div>
      <Modal open={!!reward} onClose={() => setReward(null)} title={`Reward ${a.name}`}>
        {reward && <form onSubmit={giveReward} className="space-y-3">
          <p className="text-xs text-slate-500">The amount is added to the astrologer's wallet and can be withdrawn like normal earnings.</p>
          <Field label="Amount (₹)" type="number" min={1} value={reward.amount} onChange={(e) => setReward({ ...reward, amount: e.target.value })} required />
          <Field label="Reason (e.g. Top rated this month)" value={reward.note} onChange={(e) => setReward({ ...reward, note: e.target.value })} maxLength={140} required />
          <Button type="submit" className="w-full">Credit reward</Button>
        </form>}
      </Modal>
      <TranscriptModal id={chat} onClose={() => setChat(null)} />
    </div>
  );
}
