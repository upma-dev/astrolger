import { useState } from 'react';
import { api, fmtDate, inr } from '../../../lib/api.js';
import { PageLoader, useAsync, cx } from '../../../shared/ui.jsx';
import { InfoGrid, Panel, Pills, Table } from '../kit.jsx';

const KINDS = [['', 'All'], ['recharge', 'Recharges'], ['consultation', 'Consultation charges'], ['report', 'Reports'], ['remedy', 'Remedies'], ['bonus', 'Bonuses'], ['refund', 'Refunds'], ['adjustment', 'Admin adjustments']];

/* Every money movement in user wallets. */
export default function Payments() {
  const [kind, setKind] = useState('');
  const { data, loading } = useAsync(() => api.admin.get('/admin/transactions', { ownerType: 'user', kind }), [kind]);
  const rows = data || [];
  const credit = rows.filter((t) => t.direction === 'credit').reduce((s, t) => s + t.amount, 0);
  const debit = rows.filter((t) => t.direction === 'debit').reduce((s, t) => s + t.amount, 0);
  return (
    <div className="space-y-4">
      <InfoGrid cols={3} items={[['Entries shown', rows.length], ['Money in', inr(credit)], ['Money out', inr(debit)]]} />
      <Panel title="User wallet transactions" action={<Pills value={kind} onChange={setKind} options={KINDS} />}>
        {loading && !data ? <PageLoader /> : <Table rows={rows} empty="No transactions yet" cols={[
        {loading && !data ? <PageLoader variant="table" /> : <Table rows={rows} empty="No transactions yet" cols={[
          { h: 'Date', cell: (t) => fmtDate(t.createdAt) }, { h: 'Kind', cell: (t) => <span className="capitalize">{t.kind}</span> },
          { h: 'Note', cell: (t) => <span className="text-xs text-slate-500">{t.note}</span> }, { h: 'Reference', cell: (t) => <span className="font-mono text-[11px] text-slate-400">{t.ref || '—'}</span> },
          { h: 'Balance after', cell: (t) => inr(t.balanceAfter) },
          { h: 'Amount', right: true, cell: (t) => <b className={cx(t.direction === 'credit' ? 'text-emerald-600' : 'text-rose-500')}>{t.direction === 'credit' ? '+' : '-'}{inr(t.amount)}</b> },
        ]} />}
      </Panel>
    </div>
  );
}
