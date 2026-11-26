import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Search, Check, X, Eye, Phone, Star, Award, ShieldCheck, UserCheck } from 'lucide-react';
import { api, inr } from '../../../lib/api.js';
import { Avatar, Badge, Button, Modal, PageLoader, statusTone, useAsync, useDebouncedValue, useToast } from '../../../shared/ui.jsx';

export default function AstroApprovals() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 300);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [inspectModal, setInspectModal] = useState(null);

  const { data, loading, reload } = useAsync(
    () => api.admin.get('/admin/astrologers-list', statusFilter === 'all' ? { q: dq } : { status: statusFilter, q: dq }),
    [statusFilter, dq]
  );

  const updateStatus = async (astroId, patch, msg) => {
    try {
      await api.admin.put(`/admin/astrologers/${astroId}`, patch);
      toast(msg, 'success');
      setInspectModal(null);
      reload();
    } catch (err) {
      toast(err.message || 'Action failed', 'error');
    }
  };

  const pendingCount = data?.filter((a) => a.status === 'pending').length ?? 0;

  return (
    <div className="space-y-5">
      {/* Page Title with Green Circle Checkmark matching Eqosy */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
          <CheckCircle2 size={18} />
        </span>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Astrologer Approval</h1>
      </div>

      {/* Main Approval Card container */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
        {/* Subheading & Search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-slate-800">Pending Astrologer & Verification Approvals</h2>
            <span className="flex h-5 items-center justify-center rounded-full bg-amber-100 px-2 text-xs font-bold text-amber-700">
              {data ? (statusFilter === 'pending' ? data.length : pendingCount) : 0}
            </span>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1">
            {[
              ['pending', 'Pending Approvals'],
              ['approved', 'Approved'],
              ['rejected', 'Rejected'],
              ['all', 'All Applications'],
            ].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setStatusFilter(k)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  statusFilter === k ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Eqosy Search Input */}
        <div className="relative mt-4">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, category, expertise or status"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {/* Table in Eqosy Style */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">S.NO</th>
                <th className="px-4 py-3">ASTROLOGER</th>
                <th className="px-4 py-3">CATEGORY / EXPERTISE</th>
                <th className="px-4 py-3">EXP & RATE</th>
                <th className="px-4 py-3">PHONE / KYC</th>
                <th className="px-4 py-3">STATUS</th>
                <th className="px-4 py-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <PageLoader variant="table" />
                  </td>
                </tr>
              ) : !data || data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-xs text-slate-400">
                    No astrologer applications found for this filter.
                  </td>
                </tr>
              ) : (
                data.map((a, i) => (
                  <tr key={a._id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3.5 font-semibold text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={a.name} src={a.avatar} size={36} />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{a.name}</p>
                          <p className="mt-0.5 line-clamp-1 max-w-[180px] text-[11px] text-slate-400">{a.bio || 'Vedic Astrology Expert'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {a.expertise?.length ? (
                          a.expertise.map((exp) => (
                            <span key={exp} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                              {exp}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400">Vedic</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-slate-800">{a.experience || 0} yrs</span>
                      <p className="text-[11px] text-emerald-600 font-bold">{inr(a.pricePerMin)}/min</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs text-slate-700">{a.phone}</span>
                      <div className="mt-0.5">
                        <Badge tone={statusTone(a.kyc?.status)}>KYC: {a.kyc?.status || 'pending'}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={a.status === 'approved' ? 'green' : a.status === 'rejected' ? 'red' : a.status === 'blocked' ? 'slate' : 'amber'}>
                        {a.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {a.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => updateStatus(a._id, { status: 'approved', kycStatus: 'verified' }, `Approved ${a.name}`)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition"
                              title="Approve applicant"
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button
                              onClick={() => updateStatus(a._id, { status: 'rejected', kycStatus: 'rejected' }, `Rejected ${a.name}`)}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition"
                              title="Reject applicant"
                            >
                              <X size={13} /> Reject
                            </button>
                          </>
                        ) : (
                          <Link to={`/admin/astro/view/${a._id}`}>
                            <Button size="sm" variant="outline" className="gap-1 text-xs">
                              <UserCheck size={13} /> View
                            </Button>
                          </Link>
                        )}
                        <button
                          onClick={() => setInspectModal(a)}
                          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 transition"
                          title="Inspect application details"
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Modal */}
      <Modal open={!!inspectModal} onClose={() => setInspectModal(null)} title="Inspect Astrologer Application">
        {inspectModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <Avatar name={inspectModal.name} src={inspectModal.avatar} size={48} />
              <div>
                <h3 className="font-bold text-slate-900">{inspectModal.name}</h3>
                <p className="text-xs text-slate-500">Phone: {inspectModal.phone}</p>
                <div className="mt-1 flex gap-1.5">
                  <Badge tone={inspectModal.status === 'approved' ? 'green' : 'amber'}>{inspectModal.status}</Badge>
                  <Badge tone="violet">KYC: {inspectModal.kyc?.status || 'pending'}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-200 p-3">
                <span className="font-semibold text-slate-400">Experience</span>
                <p className="mt-0.5 font-bold text-slate-800">{inspectModal.experience || 0} Years</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <span className="font-semibold text-slate-400">Proposed Rate</span>
                <p className="mt-0.5 font-bold text-emerald-600">{inr(inspectModal.pricePerMin)} / min</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <span className="font-semibold text-slate-400">PAN Number</span>
                <p className="mt-0.5 font-mono font-bold text-slate-800">{inspectModal.kyc?.panNumber || 'Not provided'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <span className="font-semibold text-slate-400">Bank Details</span>
                <p className="mt-0.5 text-slate-700">A/C: {inspectModal.kyc?.bankAccount || '—'}</p>
                <p className="text-[10px] text-slate-400">IFSC: {inspectModal.kyc?.ifsc || '—'}</p>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-700">Bio & Introduction</span>
              <p className="mt-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 leading-relaxed">
                {inspectModal.bio || 'No bio provided.'}
              </p>
            </div>

            <div className="flex gap-2 border-t border-slate-100 pt-3">
              {inspectModal.status === 'pending' && (
                <>
                  <Button
                    className="flex-1"
                    variant="success"
                    onClick={() => updateStatus(inspectModal._id, { status: 'approved', kycStatus: 'verified' }, 'Astrologer Approved')}
                  >
                    <Check size={14} /> Approve & Verify
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => updateStatus(inspectModal._id, { status: 'rejected', kycStatus: 'rejected' }, 'Astrologer Rejected')}
                  >
                    <X size={14} /> Reject
                  </Button>
                </>
              )}
              <Link to={`/admin/astro/view/${inspectModal._id}`} className="flex-1">
                <Button variant="outline" className="w-full">
                  Full Profile & Performance
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
