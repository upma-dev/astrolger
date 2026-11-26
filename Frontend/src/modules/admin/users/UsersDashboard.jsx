import { Link, useNavigate } from 'react-router-dom';
import { Users, UserPlus, Activity, Wallet, IndianRupee, Gift, Undo2, MessagesSquare } from 'lucide-react';
import { api, inr } from '../../../lib/api.js';
import { PageLoader, useAsync } from '../../../shared/ui.jsx';
import { BarChart, Panel, StatCard, Table } from '../kit.jsx';

export default function UsersDashboard() {
  const nav = useNavigate();
  const { data, loading, error } = useAsync(() => api.admin.get('/admin/users-overview'));
  if (loading && !data) return <PageLoader variant="dashboard" />;
  if (!data) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error?.message || 'Failed to load users overview.'}</div>;
  const t = data.totals;
  const maxZ = Math.max(1, ...data.zodiac.map((z) => z.n));
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total users" value={t.users.toLocaleString('en-IN')} sub={t.newToday ? `${t.newToday} joined today` : null} to="/admin/users/list" />
        <StatCard icon={UserPlus} label="New in last 7 days" value={t.new7d} tone="bg-sky-50 text-sky-600" to="/admin/users/list" />
        <StatCard icon={Activity} label="Active (consulted in 30 days)" value={t.active30d} tone="bg-emerald-50 text-emerald-600" to="/admin/users/chats" />
        <StatCard icon={MessagesSquare} label="Completed consultations" value={t.consultations} tone="bg-violet-50 text-violet-600" to="/admin/users/chats" />
        <StatCard icon={IndianRupee} label="Total recharges" value={inr(t.recharges)} tone="bg-amber-50 text-amber-600" to="/admin/users/payments" />
        <StatCard icon={Wallet} label="Balance held in wallets" value={inr(t.walletHeld)} tone="bg-orange-50 text-orange-600" to="/admin/users/payments" />
        <StatCard icon={Gift} label="Bonuses given" value={inr(t.bonuses)} tone="bg-pink-50 text-pink-600" to="/admin/users/payments" />
        <StatCard icon={Undo2} label="Refunds" value={inr(t.refunds)} sub={t.blocked ? `${t.blocked} blocked users` : null} tone="bg-rose-50 text-rose-600" to="/admin/users/cancellations" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="New signups (14 days)" action={<Link to="/admin/users/list" className="text-xs font-semibold text-brand-700 hover:underline">User list →</Link>}><BarChart data={data.series.signups} color="#0ea5e9" /></Panel>
        <Panel title="Wallet recharges (14 days)" action={<Link to="/admin/users/payments" className="text-xs font-semibold text-brand-700 hover:underline">Transactions →</Link>}><BarChart data={data.series.recharges} format={inr} /></Panel>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Top spenders" action={<Link to="/admin/users/list" className="text-xs font-semibold text-brand-700 hover:underline">All users →</Link>}>
          <Table rows={data.topSpenders} rowKey="_id" onRowClick={(r) => nav(`/admin/users/view/${r._id}`)} empty="No completed consultations yet" cols={[
            { h: 'User', cell: (r) => <span className="font-semibold text-brand-700">{r.user?.name || r.user?.phone || 'User'}</span> },
            { h: 'Sessions', cell: (r) => r.sessions },
            { h: 'Spent', right: true, cell: (r) => <b>{inr(r.spent)}</b> },
          ]} />
        </Panel>
        <Panel title="Users by Rashi" action={<Link to="/admin/users/list" className="text-xs font-semibold text-brand-700 hover:underline">View users →</Link>}>
          <div className="space-y-2 p-4">
            {data.zodiac.length ? data.zodiac.map((z) => (
              <div key={z._id} className="flex items-center gap-3 text-sm"><span className="w-24 shrink-0 font-semibold text-slate-700">{z._id}</span><span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-brand-500" style={{ width: `${(z.n / maxZ) * 100}%` }} /></span><span className="w-8 text-right text-slate-500">{z.n}</span></div>
            )) : <p className="py-6 text-center text-sm text-slate-400">No birth details saved yet</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
