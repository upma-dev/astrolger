import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Sparkles, IndianRupee, Radio, Wallet, UserCheck, ArrowDownToLine } from 'lucide-react';
import { api, inr } from '../../lib/api.js';
import { Badge, PageLoader, useAsync } from '../../shared/ui.jsx';
import { BarChart, Panel, StatCard, Table } from './kit.jsx';

export default function Dashboard() {
  const nav = useNavigate();
  const { data, loading, error, reload } = useAsync(() => api.admin.get('/admin/dashboard'));
  useEffect(() => { const i = setInterval(() => { if (!document.hidden) reload(true); }, 15000); return () => clearInterval(i); }, [reload]);
  if (loading && !data) return <PageLoader variant="dashboard" />;
  if (!data) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error?.message || 'Failed to load dashboard.'}</div>;
  const t = data.totals;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total users" value={t.users.toLocaleString()} to="/admin/users/list" />
        <StatCard icon={Sparkles} label="Active astrologers" value={t.astrologers} sub={t.pendingAstro ? `${t.pendingAstro} pending approval` : null} tone="bg-sky-50 text-sky-600" to={t.pendingAstro ? '/admin/astro/approvals' : '/admin/astro/list/approved'} />
        <StatCard icon={IndianRupee} label="Platform revenue" value={inr(t.platformRevenue)} tone="bg-emerald-50 text-emerald-600" to="/admin/global/transactions" />
        <StatCard icon={Wallet} label="Wallet recharges" value={inr(t.totalRecharge)} tone="bg-amber-50 text-amber-600" to="/admin/users/payments" />
        <StatCard icon={Radio} label="Live consultations" value={data.live.length} tone="bg-rose-50 text-rose-600" to="/admin/astro/live" />
        <StatCard icon={UserCheck} label="Completed sessions" value={t.completedSessions} tone="bg-violet-50 text-violet-600" to="/admin/astro/chats" />
        <StatCard icon={ArrowDownToLine} label="Pending payouts" value={t.pendingWithdrawals} tone="bg-orange-50 text-orange-600" to="/admin/astro/payouts" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Revenue (14 days)" action={<Link to="/admin/global/transactions" className="text-xs font-semibold text-brand-700 hover:underline">Ledger →</Link>}><BarChart data={data.series.revenue} format={inr} /></Panel>
        <Panel title="New signups (14 days)" action={<Link to="/admin/users/list" className="text-xs font-semibold text-brand-700 hover:underline">Users →</Link>}><BarChart data={data.series.signups} color="#0ea5e9" /></Panel>
        <Panel title="Consultations (14 days)" action={<Link to="/admin/astro/chats" className="text-xs font-semibold text-brand-700 hover:underline">Sessions →</Link>}><BarChart data={data.series.consultations} color="#f59e0b" /></Panel>
      </div>
      <Panel title="Live consultations" action={<div className="flex items-center gap-2"><Badge tone="green">auto-refresh 15s</Badge><Link to="/admin/astro/live" className="text-xs font-semibold text-brand-700 hover:underline">Open live view →</Link></div>}>
        <Table rows={data.live} onRowClick={() => nav('/admin/astro/live')} empty="No live sessions right now" cols={[
          { h: 'User', cell: (r) => r.user }, { h: 'Astrologer', cell: (r) => r.astrologer },
          { h: 'Type', cell: (r) => <Badge tone="violet">{r.type}</Badge> }, { h: 'Minutes billed', cell: (r) => r.minutes },
          { h: 'Started', cell: (r) => new Date(r.startedAt).toLocaleTimeString() },
        ]} />
      </Panel>
    </div>
  );
}
