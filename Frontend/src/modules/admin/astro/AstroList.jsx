import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, X, Star, Eye } from 'lucide-react';
import { api, inr } from '../../../lib/api.js';
import { usePlatformLive } from '../../../lib/live.js';
import { Avatar, Badge, Button, PageLoader, statusTone, useAsync, useDebouncedValue, useToast } from '../../../shared/ui.jsx';
import { Panel, Pills, SearchBox, Table } from '../kit.jsx';

const TITLES = { pending: 'Pending approval', approved: 'Approved astrologers', rejected: 'Rejected applications', blocked: 'Blocked astrologers', sponsored: 'Sponsored astrologers' };
const untilText = (a) => (a.sponsoredUntil ? `until ${new Date(a.sponsoredUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'no end date');
const sponsorActive = (a) => a.sponsored && (!a.sponsoredUntil || new Date(a.sponsoredUntil) > new Date());

export default function AstroList({ online = false }) {
  const { status = 'approved' } = useParams();
  const toast = useToast();
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 300);
  const [sort, setSort] = useState('recent');
  const { data, loading, reload } = useAsync(() => api.admin.get('/admin/astrologers-list', online ? { online: '1', q: dq, sort } : { status, q: dq, sort }), [status, online, dq, sort]);
  // Live updates via socket when astrologers go online/offline or become busy.
  usePlatformLive((what) => online && (what === 'astrologers' || what === 'focus') && reload(true));
  const update = async (a, patch, msg) => { try { await api.admin.put(`/admin/astrologers/${a._id}`, patch); toast(msg, 'success'); reload(); } catch (e) { toast(e.message, 'error'); } };

  return (
    <Panel title={online ? `Online now (${data?.length ?? 0})` : `${TITLES[status] || 'Astrologers'} (${data?.length ?? 0})`}
      action={<div className="flex flex-wrap items-center gap-3"><Pills value={sort} onChange={setSort} options={[['recent', 'Newest'], ['rating', 'Top rated'], ['minutes', 'Most minutes'], ['price', 'Highest price']]} /><SearchBox value={q} onChange={setQ} placeholder="Name or phone" /></div>}>
      {loading && !data ? <PageLoader variant="table" /> : (
        <Table rows={data} empty={online ? 'Nobody is online right now' : status === 'sponsored' ? 'No sponsored astrologers yet. Open an astrologer → Sponsor.' : 'Nothing here'} cols={[
          { h: 'Astrologer', cell: (a) => <Link to={`/admin/astro/view/${a._id}`} className="flex items-center gap-3"><Avatar name={a.name} src={a.avatar} size={38} /><div><p className="font-semibold text-slate-900 hover:text-brand-700">{a.name} {a.featured && <Badge tone="amber">featured</Badge>} {sponsorActive(a) && <Badge tone="violet">sponsored</Badge>}</p><p className="text-xs text-slate-400">{a.phone}{status === 'sponsored' && !online ? ` · ${sponsorActive(a) ? untilText(a) : 'expired'}` : ''}</p></div></Link> },
          { h: 'Expertise', cell: (a) => <span className="text-xs">{a.expertise?.join(', ')}</span> },
          { h: 'Exp / price', cell: (a) => `${a.experience}y · ${inr(a.pricePerMin)}/min` },
          { h: 'Rating', cell: (a) => (a.ratingCount ? <span className="flex items-center gap-1"><Star size={13} className="fill-amber-400 text-amber-400" />{a.rating.toFixed(1)} <span className="text-xs text-slate-400">({a.ratingCount})</span></span> : <span className="text-xs text-slate-400">No reviews</span>) },
          { h: 'Status', cell: (a) => (a.status === 'approved' ? <Badge tone={a.online ? (a.busy ? 'amber' : 'green') : 'slate'}>{a.online ? (a.busy ? 'busy' : 'online') : 'offline'}</Badge> : <Badge tone={statusTone(a.kyc?.status)}>KYC {a.kyc?.status}</Badge>) },
          { h: 'Minutes', cell: (a) => a.totalMinutes || 0 },
          { h: 'Commission', cell: (a) => `${a.commissionPct}%` },
          { h: '', right: true, cell: (a) => (
            <div className="flex justify-end gap-1.5">
              {a.status === 'pending' && <><Button size="sm" variant="success" title="Approve" onClick={() => update(a, { status: 'approved', kycStatus: 'verified' }, 'Approved')}><Check size={14} /></Button><Button size="sm" variant="danger" title="Reject" onClick={() => update(a, { status: 'rejected' }, 'Rejected')}><X size={14} /></Button></>}
              {(a.status === 'rejected' || a.status === 'blocked') && <Button size="sm" variant="success" onClick={() => update(a, { status: 'approved' }, 'Approved')}>Approve</Button>}
              {status === 'sponsored' && !online && <Button size="sm" variant="danger" onClick={() => update(a, { sponsored: false }, 'Sponsorship removed')}>Remove</Button>}
              <Link to={`/admin/astro/view/${a._id}`}><Button size="sm" variant="outline"><Eye size={14} /> Manage</Button></Link>
            </div>) },
        ]} />
      )}
    </Panel>
  );
}
