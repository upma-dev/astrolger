import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { api, fmtDate, inr } from '../../../lib/api.js';
import { Avatar, Badge, Button, PageLoader, useAsync, useDebouncedValue, useToast } from '../../../shared/ui.jsx';
import { Panel, Pills, SearchBox, Table } from '../kit.jsx';

export default function UserList() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 300);
  const [status, setStatus] = useState('all');
  const { data, loading, reload } = useAsync(() => api.admin.get('/admin/users', { q: dq }), [dq]);
  const rows = (data || []).filter((u) => status === 'all' || (status === 'blocked' ? u.blocked : !u.blocked));
  const block = async (u) => {
    try { await api.admin.post(`/admin/users/${u._id}/block`, { blocked: !u.blocked }); toast(u.blocked ? 'User unblocked' : 'User blocked', 'success'); reload(); } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <Panel title={`Users (${rows.length})`} action={<div className="flex flex-wrap items-center gap-3"><Pills value={status} onChange={setStatus} options={[['all', 'All'], ['active', 'Active'], ['blocked', 'Blocked']]} /><SearchBox value={q} onChange={setQ} placeholder="Search name or phone" /></div>}>
      {loading && !data ? <PageLoader variant="table" /> : (
        <Table rows={rows} empty="No users found" cols={[
          { h: 'User', cell: (u) => <Link to={`/admin/users/view/${u._id}`} className="flex items-center gap-3"><Avatar name={u.name || 'U'} size={34} /><div><p className="font-semibold text-slate-900 hover:text-brand-700">{u.name || '—'}</p><p className="text-xs text-slate-400">{u.phone || u.email}</p></div></Link> },
          { h: 'Rashi', cell: (u) => u.zodiac || '—' },
          { h: 'Birth place', cell: (u) => <span className="text-xs">{u.pob || '—'}</span> },
          { h: 'Wallet', cell: (u) => inr(u.walletBalance) },
          { h: 'Joined', cell: (u) => fmtDate(u.createdAt) },
          { h: 'Status', cell: (u) => <Badge tone={u.blocked ? 'red' : 'green'}>{u.blocked ? 'blocked' : 'active'}</Badge> },
          { h: '', right: true, cell: (u) => <div className="flex justify-end gap-1.5"><Link to={`/admin/users/view/${u._id}`}><Button size="sm" variant="outline"><Eye size={13} /> View</Button></Link><Button size="sm" variant={u.blocked ? 'outline' : 'danger'} onClick={() => block(u)}>{u.blocked ? 'Unblock' : 'Block'}</Button></div> },
        ]} />
      )}
    </Panel>
  );
}
