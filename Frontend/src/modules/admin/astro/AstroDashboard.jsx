import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock3, Radio, Star, IndianRupee, Wallet, ShieldOff, Activity } from 'lucide-react';
import { api, fmtDate, inr } from '../../../lib/api.js';
import { Avatar, Button, PageLoader, useAsync } from '../../../shared/ui.jsx';
import { BarChart, Panel, StatCard, Table } from '../kit.jsx';

export default function AstroDashboard() {
  const nav = useNavigate();
  const { data, loading, error } = useAsync(() => api.admin.get('/admin/astrologers-overview'));
  if (loading && !data) return <PageLoader variant="dashboard" />;
  if (!data) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error?.message || 'Failed to load astrologer overview.'}</div>;
  const t = data.totals;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CheckCircle2} label="Approved astrologers" value={t.approved} to="/admin/astro/list/approved" />
        <StatCard icon={Clock3} label="Waiting for approval" value={t.pending} tone="bg-amber-50 text-amber-600" to="/admin/astro/approvals" />
        <StatCard icon={Radio} label="Online now" value={t.online} sub={t.busy ? `${t.busy} in a session` : null} tone="bg-emerald-50 text-emerald-600" to="/admin/astro/online" />
        <StatCard icon={Star} label="Average rating" value={t.rating ? `${t.rating} / 5` : 'No reviews'} sub={t.reviews ? `${t.reviews} reviews` : null} tone="bg-yellow-50 text-yellow-600" to="/admin/astro/reviews" />
        <StatCard icon={IndianRupee} label="Paid to astrologers (earned)" value={inr(t.earned)} tone="bg-violet-50 text-violet-600" to="/admin/astro/commission" />
        <StatCard icon={Wallet} label="Pending payouts" value={inr(t.pendingPayout)} sub={t.pendingPayoutCount ? `${t.pendingPayoutCount} requests` : null} tone="bg-orange-50 text-orange-600" to="/admin/astro/payouts" />
        <StatCard icon={ShieldOff} label="Blocked" value={t.blocked} tone="bg-rose-50 text-rose-600" to="/admin/astro/list/blocked" />
        <StatCard icon={Activity} label="Rejected applications" value={t.rejected} tone="bg-slate-100 text-slate-600" to="/admin/astro/list/rejected" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Astrologer earnings (14 days)" action={<Link to="/admin/astro/commission" className="text-xs font-semibold text-brand-700 hover:underline">View commission →</Link>}><BarChart data={data.series.earnings} format={inr} color="#7c3aed" /></Panel>
        <Panel title="Completed consultations (14 days)" action={<Link to="/admin/astro/chats" className="text-xs font-semibold text-brand-700 hover:underline">View chats →</Link>}><BarChart data={data.series.sessions} color="#f59e0b" /></Panel>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Top earners" action={<Link to="/admin/astro/commission" className="text-xs font-semibold text-brand-700 hover:underline">View all →</Link>}>
          <Table rows={data.top} rowKey="_id" onRowClick={(r) => nav(`/admin/astro/view/${r._id}`)} empty="No completed consultations yet" cols={[
            { h: 'Astrologer', cell: (r) => <span className="flex items-center gap-2"><Avatar name={r.astrologer?.name || 'A'} src={r.astrologer?.avatar} size={30} /><span className="font-semibold text-slate-900">{r.astrologer?.name || 'Deleted'}</span></span> },
            { h: 'Sessions', cell: (r) => r.sessions }, { h: 'Minutes', cell: (r) => r.minutes }, { h: 'Earned', right: true, cell: (r) => <b>{inr(r.earned)}</b> },
          ]} />
        </Panel>
        <Panel title="New applications" action={<Link to="/admin/astro/approvals"><Button size="sm" variant="outline">Review all</Button></Link>}>
          <Table rows={data.applicants} onRowClick={(a) => nav(`/admin/astro/view/${a._id}`)} empty="No pending applications" cols={[
            { h: 'Name', cell: (a) => <span className="font-semibold text-brand-700">{a.name}</span> },
            { h: 'Expertise', cell: (a) => <span className="text-xs">{a.expertise?.join(', ')}</span> }, { h: 'Experience', cell: (a) => `${a.experience} yrs` }, { h: 'Applied', cell: (a) => fmtDate(a.createdAt) },
          ]} />
        </Panel>
      </div>
    </div>
  );
}
