import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { api, fmtDate, inr } from '../../../lib/api.js';
import { Badge, Button, PageLoader, useAsync, useToast } from '../../../shared/ui.jsx';
import { InfoGrid, Panel, Pills, Table } from '../kit.jsx';

const STATUS = { cod_pending: ['Pending', 'amber'], cod_collected: ['Collected', 'green'], cancelled: ['Cancelled', 'red'], paid: ['Paid (wallet)', 'green'] };

/* Store orders. Cash-on-delivery orders are marked collected (adds to platform revenue) or cancelled here. */
export default function Orders() {
  const toast = useToast();
  const [payment, setPayment] = useState('cod');
  const { data, loading, reload } = useAsync(() => api.admin.get('/admin/orders', { payment }), [payment]);
  const [busy, setBusy] = useState(null);
  const rows = data || [];
  const pending = rows.filter((o) => o.status === 'cod_pending');
  const act = async (o, status) => {
    if (status === 'cancelled' && !window.confirm(`Cancel the order for "${o.title}"?`)) return;
    setBusy(o._id);
    try { await api.admin.put(`/admin/orders/${o._id}`, { status }); toast(status === 'cod_collected' ? 'Marked as collected' : 'Order cancelled', 'success'); reload(); } catch (e) { toast(e.message, 'error'); } finally { setBusy(null); }
  };
  return (
    <div className="space-y-4">
      <InfoGrid cols={3} items={[['Orders shown', rows.length], ['COD pending', pending.length], ['Cash to collect', inr(pending.reduce((s, o) => s + o.price + (o.codFee || 0), 0))]]} />
      <Panel title="Store orders" action={<Pills value={payment} onChange={setPayment} options={[['cod', 'Cash on delivery'], ['wallet', 'Wallet'], ['', 'All']]} />}>
        {loading && !data ? <PageLoader variant="table" /> : <Table rows={rows} empty="No orders yet. Turn on COD in Price management → Payments." cols={[
          { h: 'Date', cell: (o) => fmtDate(o.createdAt) },
          { h: 'Customer', cell: (o) => o.user ? <Link to={`/admin/users/view/${o.user._id}`} className="font-semibold text-slate-800 hover:text-brand-700">{o.user.name || o.user.phone}</Link> : '—' },
          { h: 'Item', cell: (o) => <span><b className="text-slate-800">{o.title}</b><span className="block text-[11px] capitalize text-slate-400">{o.itemType}</span></span> },
          { h: 'Delivery', cell: (o) => o.payment === 'cod' ? <span className="block max-w-[220px] text-[11px] text-slate-500">{o.address}<br /><span className="inline-flex items-center gap-1"><Phone size={10} />{o.contactPhone || o.user?.phone}</span></span> : '—' },
          { h: 'Status', cell: (o) => { const [l, t] = STATUS[o.status] || [o.status, 'slate']; return <Badge tone={t}>{l}</Badge>; } },
          { h: 'Amount', right: true, cell: (o) => <b>{inr(o.price + (o.codFee || 0))}</b> },
          { h: '', right: true, cell: (o) => o.status === 'cod_pending' && (
            <div className="flex justify-end gap-1">
              <Button size="sm" loading={busy === o._id} onClick={() => act(o, 'cod_collected')}>Collected</Button>
              <Button size="sm" variant="outline" disabled={busy === o._id} onClick={() => act(o, 'cancelled')}>Cancel</Button>
            </div>
          ) },
        ]} />}
      </Panel>
    </div>
  );
}
