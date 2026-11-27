import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift } from 'lucide-react';
import { api, fmtDate, inr } from '../../../lib/api.js';
import { Button, Field, Modal, PageLoader, Select, useAsync, useToast } from '../../../shared/ui.jsx';
import { InfoGrid, Panel, Table } from '../kit.jsx';

export default function Rewards() {
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => api.admin.get('/admin/rewards'));
  const { data: astros } = useAsync(() => api.admin.get('/admin/astrologers-list', { status: 'approved', sort: 'rating' }));
  const [f, setF] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    try { await api.admin.post(`/admin/astrologers/${f.astrologer}/reward`, { amount: f.amount, note: f.note }); toast('Reward credited', 'success'); setF(null); reload(); } catch (err) { toast(err.message, 'error'); }
  };
  const rows = data || [];
  return (
    <div className="space-y-5">
      <InfoGrid cols={3} items={[['Rewards given', rows.length], ['Total amount', inr(rows.reduce((s, r) => s + r.amount, 0))], ['Astrologers rewarded', new Set(rows.map((r) => String(r.owner))).size]]} />
      <Panel title="Rewards history" action={<Button size="sm" onClick={() => setF({ astrologer: astros?.[0]?._id || '', amount: '', note: '' })}><Gift size={14} /> Give reward</Button>}>
        {loading && !data ? <PageLoader /> : <Table rows={rows} empty="No rewards yet" cols={[
        {loading && !data ? <PageLoader variant="table" /> : <Table rows={rows} empty="No rewards yet" cols={[
          { h: 'Date', cell: (r) => fmtDate(r.createdAt) },
          { h: 'Astrologer', cell: (r) => <Link to={`/admin/astro/view/${r.owner}`} className="font-semibold text-brand-700 hover:underline">{r.astrologer}</Link> },
          { h: 'Reason', cell: (r) => <span className="text-xs text-slate-600">{r.note}</span> },
          { h: 'Amount', right: true, cell: (r) => <b className="text-emerald-600">+{inr(r.amount)}</b> },
        ]} />}
      </Panel>
      <Modal open={!!f} onClose={() => setF(null)} title="Give a reward">
        {f && <form onSubmit={submit} className="space-y-3">
          <Select label="Astrologer" value={f.astrologer} onChange={(e) => setF({ ...f, astrologer: e.target.value })} required>{(astros || []).map((a) => <option key={a._id} value={a._id}>{a.name}{a.ratingCount ? ` · ${a.rating.toFixed(1)}★` : ''}</option>)}</Select>
          <Field label="Amount (₹)" type="number" min={1} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required />
          <Field label="Reason" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} maxLength={140} required placeholder="e.g. Highest rated in November" />
          <Button type="submit" className="w-full">Credit to wallet</Button>
        </form>}
      </Modal>
    </div>
  );
}
