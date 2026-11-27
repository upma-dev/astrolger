import { useState } from 'react';
import { Check, X, Star, Eye } from 'lucide-react';
import { api, inr } from '../../lib/api.js';
import { Avatar, Badge, Button, Field, Modal, PageLoader, statusTone, useAsync, useToast } from '../../shared/ui.jsx';
import { Panel, Table, Tabs } from './kit.jsx';

export default function Astrologers() {
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  const { data, loading, reload } = useAsync(() => api.admin.get('/admin/astrologers', { status }), [status]);
  const [sel, setSel] = useState(null);
  const [perf, setPerf] = useState(null);
  const [commission, setCommission] = useState('');

  const update = async (a, patch, msg = 'Updated') => {
    try { await api.admin.put(`/admin/astrologers/${a._id}`, patch); toast(msg, 'success'); reload(); setSel(null); } catch (e) { toast(e.message, 'error'); }
  };
  const open = async (a) => {
    setSel(a); setCommission(a.commissionPct); setPerf(null);
    setPerf(await api.admin.get(`/admin/astrologers/${a._id}/performance`));
  };

  return (
    <>
      <Tabs value={status} onChange={setStatus} tabs={[['pending', 'Pending approval'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['blocked', 'Blocked']]} />
      <Panel title={`${status[0].toUpperCase()}${status.slice(1)} astrologers`}>
        {loading && !data ? <PageLoader variant="table" /> : (
          <Table rows={data} empty="Nothing here" cols={[
            { h: 'Astrologer', cell: (a) => <div className="flex items-center gap-3"><Avatar name={a.name} size={36} /><div><p className="font-semibold text-slate-900">{a.name}</p><p className="text-xs text-slate-400">{a.phone}</p></div></div> },
            { h: 'Expertise', cell: (a) => <span className="text-xs">{a.expertise.join(', ')}</span> },
            { h: 'Exp / Price', cell: (a) => `${a.experience}y · ${inr(a.pricePerMin)}/min` },
            { h: 'Rating', cell: (a) => <span className="flex items-center gap-1"><Star size={13} className="fill-amber-400 text-amber-400" />{a.rating.toFixed(1)}</span> },
            { h: 'KYC', cell: (a) => <Badge tone={statusTone(a.kyc?.status)}>{a.kyc?.status}</Badge> },
            { h: 'Commission', cell: (a) => `${a.commissionPct}%` },
            { h: '', right: true, cell: (a) => (
              <div className="flex justify-end gap-1.5">
                {a.status === 'pending' && <><Button size="sm" variant="success" onClick={() => update(a, { status: 'approved', kycStatus: 'verified' }, 'Approved')}><Check size={14} /></Button><Button size="sm" variant="danger" onClick={() => update(a, { status: 'rejected' }, 'Rejected')}><X size={14} /></Button></>}
                <Button size="sm" variant="outline" onClick={() => open(a)}><Eye size={14} /> Manage</Button>
              </div>) },
          ]} />
        )}
      </Panel>
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel?.name} wide>
        {sel && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['Sessions', perf?.sessions], ['Minutes', perf?.minutes], ['Gross', perf && inr(perf.gross)], ['Astrologer earned', perf && inr(perf.earned)], ['Platform earned', perf && inr(perf.platform)], ['Rating', `${sel.rating.toFixed(1)} (${sel.ratingCount})`]].map(([k, v]) => <div key={k} className="rounded-xl bg-slate-50 p-3"><p className="text-base font-bold text-slate-900">{v ?? '…'}</p><p className="text-[11px] text-slate-400">{k}</p></div>)}
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <p className="mb-1 font-bold text-slate-800">KYC</p>
              <p>PAN: {sel.kyc?.panNumber || '—'} · Aadhaar ••••{sel.kyc?.aadhaarLast4 || '—'}</p>
              <p>Bank: {sel.kyc?.bankAccount || '—'} · IFSC {sel.kyc?.ifsc || '—'}</p>
              <p className="mt-1 text-slate-500">{sel.bio}</p>
            </div>
            <div className="flex items-end gap-2"><Field label="Commission %" type="number" min={0} max={90} value={commission} onChange={(e) => setCommission(e.target.value)} className="flex-1" /><Button onClick={() => update(sel, { commissionPct: commission }, 'Commission saved')}>Save</Button></div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => update(sel, { featured: !sel.featured }, sel.featured ? 'Unfeatured' : 'Featured')}>{sel.featured ? 'Remove featured' : 'Mark featured'}</Button>
              {sel.kyc?.status !== 'verified' && <Button variant="success" onClick={() => update(sel, { kycStatus: 'verified' }, 'KYC verified')}>Verify KYC</Button>}
              {sel.status !== 'approved' && <Button variant="success" onClick={() => update(sel, { status: 'approved' }, 'Approved')}>Approve</Button>}
              {sel.status !== 'blocked' && <Button variant="danger" onClick={() => update(sel, { status: 'blocked' }, 'Blocked')}>Block</Button>}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
