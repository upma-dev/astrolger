import { useState } from 'react';
import { api, fmtDate, inr } from '../../lib/api.js';
import { Badge, Button, PageLoader, Select, statusTone, useAsync, useToast, cx } from '../../shared/ui.jsx';
import { Panel, Table, Tabs } from './kit.jsx';

export function Transactions() {
  const [ownerType, setOwnerType] = useState('');
  const { data, loading } = useAsync(() => api.admin.get('/admin/transactions', { ownerType }), [ownerType]);
  return (
    <Panel title="Transaction logs" action={<Select value={ownerType} onChange={(e) => setOwnerType(e.target.value)}><option value="">All</option><option value="user">User wallets</option><option value="astrologer">Astrologer wallets</option><option value="platform">Platform</option></Select>}>
      {loading && !data ? <PageLoader /> : <Table rows={data} cols={[
      {loading && !data ? <PageLoader variant="table" /> : <Table rows={data} cols={[
        { h: 'Date', cell: (t) => fmtDate(t.createdAt) }, { h: 'Type', cell: (t) => <Badge tone="violet">{t.ownerType}</Badge> }, { h: 'Kind', cell: (t) => <span className="capitalize">{t.kind}</span> },
        { h: 'Note', cell: (t) => <span className="text-xs text-slate-500">{t.note}</span> },
        { h: 'Amount', right: true, cell: (t) => <b className={cx(t.direction === 'credit' ? 'text-emerald-600' : 'text-rose-500')}>{t.direction === 'credit' ? '+' : '-'}{inr(t.amount)}</b> },
      ]} />}
    </Panel>
  );
}

export function Payouts() {
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => api.admin.get('/admin/withdrawals'));
  const act = async (w, action) => {
    const note = action === 'reject' ? window.prompt('Reason for rejection (optional)') ?? '' : 'Paid via bank transfer';
    try { await api.admin.post(`/admin/withdrawals/${w._id}`, { action, note }); toast(action === 'pay' ? 'Marked as paid' : 'Rejected & refunded to wallet', 'success'); reload(); } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <Panel title="Payout requests">
      {loading && !data ? <PageLoader /> : <Table rows={data} empty="No payout requests" cols={[
      {loading && !data ? <PageLoader variant="table" /> : <Table rows={data} empty="No payout requests" cols={[
        { h: 'Requested', cell: (w) => fmtDate(w.createdAt) },
        { h: 'Astrologer', cell: (w) => <div><p className="font-semibold text-slate-900">{w.astrologer?.name}</p><p className="text-xs text-slate-400">A/C {w.astrologer?.kyc?.bankAccount} · {w.astrologer?.kyc?.ifsc}</p></div> },
        { h: 'Amount', cell: (w) => <b>{inr(w.amount)}</b> }, { h: 'Status', cell: (w) => <Badge tone={statusTone(w.status)}>{w.status}</Badge> },
        { h: '', right: true, cell: (w) => w.status === 'pending' && <div className="flex justify-end gap-1.5"><Button size="sm" variant="success" onClick={() => act(w, 'pay')}>Mark paid</Button><Button size="sm" variant="danger" onClick={() => act(w, 'reject')}>Reject</Button></div> },
      ]} />}
    </Panel>
  );
}

export function Commission() {
  const { data, loading } = useAsync(() => api.admin.get('/admin/commission'));
  return (
    <Panel title="Commission tracking">
      {loading && !data ? <PageLoader /> : <Table rows={data} rowKey="_id" empty="No completed sessions yet" cols={[
      {loading && !data ? <PageLoader variant="table" /> : <Table rows={data} rowKey="_id" empty="No completed sessions yet" cols={[
        { h: 'Astrologer', cell: (r) => <b className="text-slate-900">{r.astrologer?.name || '—'}</b> }, { h: 'Rate', cell: (r) => `${r.astrologer?.commissionPct ?? '-'}%` },
        { h: 'Sessions', cell: (r) => r.sessions }, { h: 'Gross', cell: (r) => inr(r.gross) }, { h: 'Astrologer share', cell: (r) => inr(r.earned) },
        { h: 'Platform commission', right: true, cell: (r) => <b className="text-emerald-600">{inr(r.platform)}</b> },
      ]} />}
    </Panel>
  );
}

export default function Finance() {
  const [tab, setTab] = useState('tx');
  return (
    <>
      <Tabs value={tab} onChange={setTab} tabs={[['tx', 'Transactions'], ['payouts', 'Payouts'], ['commission', 'Commission']]} />
      {tab === 'tx' && <Transactions />}{tab === 'payouts' && <Payouts />}{tab === 'commission' && <Commission />}
    </>
  );
}
