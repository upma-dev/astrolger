import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Percent, ListChecks, XCircle } from 'lucide-react';
import { api, fmtDate } from '../../lib/api.js';
import { Badge, PageLoader, statusTone, useAsync } from '../../shared/ui.jsx';
import { BarChart, Panel, StatCard, Table } from './kit.jsx';
import { TranscriptModal } from './Sessions.jsx';

const LABEL = { cancelled: 'Cancelled by user', rejected: 'Declined by astrologer', missed: 'Not answered (missed)' };

export default function Cancellations() {
  const { data, loading, error } = useAsync(() => api.admin.get('/admin/cancellations'));
  const [open, setOpen] = useState(null);
  if (loading && !data) return <PageLoader variant="dashboard" />;
  if (!data) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error?.message || 'Failed to load cancellations.'}</div>;
  const st = (k) => data.byStatus.find((x) => x._id === k)?.n || 0;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ListChecks} label="All consultation requests" value={data.total} />
        <StatCard icon={Ban} label="Did not happen" value={data.failed} tone="bg-rose-50 text-rose-600" />
        <StatCard icon={Percent} label="Cancellation rate" value={`${data.rate}%`} tone="bg-amber-50 text-amber-600" />
        <StatCard icon={XCircle} label="Declined by astrologers" value={st('rejected')} tone="bg-orange-50 text-orange-600" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <Panel title="Cancelled / missed per day (14 days)"><BarChart data={data.series} color="#e11d48" /></Panel>
        <Panel title="Why requests fail">
          <div className="space-y-3 p-4">
            {['cancelled', 'rejected', 'missed'].map((k) => (
              <div key={k}><div className="flex justify-between text-sm"><span className="font-semibold text-slate-700">{LABEL[k]}</span><b>{st(k)}</b></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-rose-400" style={{ width: `${data.failed ? (st(k) / data.failed) * 100 : 0}%` }} /></div></div>
            ))}
            <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">By type: {data.byType.length ? data.byType.map((t) => `${t._id === 'audio' ? 'call' : t._id} ${t.n}`).join(' · ') : 'none'}</div>
          </div>
        </Panel>
      </div>
      <Panel title="Astrologers with the most failed requests">
        <Table rows={data.byAstrologer} rowKey="_id" empty="No failed requests" cols={[
          { h: 'Astrologer', cell: (r) => <Link to={`/admin/astro/view/${r._id}`} className="font-semibold text-brand-700 hover:underline">{r.name}</Link> },
          { h: 'Requests', cell: (r) => r.total }, { h: 'Declined', cell: (r) => r.rejected }, { h: 'Missed', cell: (r) => r.missed }, { h: 'User cancelled', cell: (r) => r.cancelled },
          { h: 'Failure rate', right: true, cell: (r) => <b>{((r.failed / r.total) * 100).toFixed(0)}%</b> },
        ]} />
      </Panel>
      <Panel title="Recent cancellations">
        <Table rows={data.recent} empty="Nothing cancelled yet" cols={[
          { h: 'Date', cell: (x) => fmtDate(x.createdAt) }, { h: 'User', cell: (x) => x.user?.name || x.user?.phone || '—' }, { h: 'Astrologer', cell: (x) => x.astrologer?.name || '—' },
          { h: 'Type', cell: (x) => <Badge tone="violet">{x.type === 'audio' ? 'call' : x.type}</Badge> }, { h: 'Status', cell: (x) => <Badge tone={statusTone(x.status)}>{LABEL[x.status] || x.status}</Badge> },
          { h: '', right: true, cell: (x) => <button onClick={() => setOpen(x._id)} className="text-xs font-semibold text-brand-700 hover:underline">Details</button> },
        ]} />
      </Panel>
      <TranscriptModal id={open} onClose={() => setOpen(null)} />
    </div>
  );
}
