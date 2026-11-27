import { useState } from 'react';
import { Search } from 'lucide-react';
import { api, fmtDate, inr } from '../../lib/api.js';
import { Badge, Button, PageLoader, useAsync, useDebouncedValue, useToast } from '../../shared/ui.jsx';
import { Panel, Table } from './kit.jsx';

export default function UsersPage() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 300);
  const { data, loading, reload } = useAsync(() => api.admin.get('/admin/users', { q: dq }), [dq]);
  const block = async (u) => {
    try { await api.admin.post(`/admin/users/${u._id}/block`, { blocked: !u.blocked }); toast(u.blocked ? 'User unblocked' : 'User blocked', 'success'); reload(); } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <Panel title="Users" action={<div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / phone" className="rounded-xl border border-slate-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-brand-500" /></div>}>
      {loading && !data ? <PageLoader /> : (
      {loading && !data ? <PageLoader variant="table" /> : (
        <Table rows={data} cols={[
          { h: 'Name', cell: (u) => <div><p className="font-semibold text-slate-900">{u.name || '—'}</p><p className="text-xs text-slate-400">{u.phone || u.email}</p></div> },
          { h: 'Zodiac', cell: (u) => u.zodiac || '—' },
          { h: 'Birth', cell: (u) => (u.dob ? `${u.dob} ${u.tob || ''}` : '—') },
          { h: 'Wallet', cell: (u) => inr(u.walletBalance) },
          { h: 'Joined', cell: (u) => fmtDate(u.createdAt) },
          { h: 'Status', cell: (u) => <Badge tone={u.blocked ? 'red' : 'green'}>{u.blocked ? 'blocked' : 'active'}</Badge> },
          { h: '', right: true, cell: (u) => <Button size="sm" variant={u.blocked ? 'outline' : 'danger'} onClick={() => block(u)}>{u.blocked ? 'Unblock' : 'Block'}</Button> },
        ]} />
      )}
    </Panel>
  );
}
