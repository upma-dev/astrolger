import { api, inr } from '../../lib/api.js';
import { PageLoader, useAsync } from '../../shared/ui.jsx';
import { BarChart, Panel, Table } from './kit.jsx';

export default function Reports() {
  const { data, loading, error } = useAsync(() => api.admin.get('/admin/analytics'));
  const { data: dash, loading: dashLoading, error: dashError } = useAsync(() => api.admin.get('/admin/dashboard'));
  if ((loading && !data) || (dashLoading && !dash)) return <PageLoader variant="dashboard" />;
  if (!data || !dash) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error?.message || dashError?.message || 'Failed to load analytics.'}</div>;
  const hours = Array.from({ length: 24 }, (_, h) => ({ label: String(h).padStart(2, '0'), value: data.byHour.find((x) => x._id === h)?.count || 0 }));
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Revenue report — last 14 days"><BarChart data={dash.series.revenue} format={inr} height={170} /></Panel>
        <Panel title="User engagement — signups"><BarChart data={dash.series.signups} color="#0ea5e9" height={170} /></Panel>
      </div>
      <Panel title="Consultation trends — requests by hour of day (UTC)"><BarChart data={hours} color="#f59e0b" height={150} /></Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Consultations by type"><Table rows={data.byType} rowKey="_id" empty="No data yet" cols={[{ h: 'Type', cell: (r) => <span className="capitalize">{r._id}</span> }, { h: 'Sessions', cell: (r) => r.count }, { h: 'Revenue', right: true, cell: (r) => inr(r.revenue) }]} /></Panel>
        <Panel title="Report & remedy sales"><Table rows={data.purchases} rowKey="_id" empty="No purchases yet" cols={[{ h: 'Item', cell: (r) => <span className="capitalize">{r._id}</span> }, { h: 'Units', cell: (r) => r.count }, { h: 'Revenue', right: true, cell: (r) => inr(r.revenue) }]} /></Panel>
      </div>
      <Panel title="Top astrologers by revenue"><Table rows={data.topAstrologers} rowKey="_id" empty="No data yet" cols={[{ h: 'Astrologer', cell: (r) => <b className="text-slate-900">{r.name}</b> }, { h: 'Sessions', cell: (r) => r.sessions }, { h: 'Revenue', right: true, cell: (r) => inr(r.revenue) }]} /></Panel>
    </div>
  );
}
