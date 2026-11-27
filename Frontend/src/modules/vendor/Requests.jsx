import { useEffect } from 'react';
import { Check, X, Inbox, Phone, Video, MessageCircle } from 'lucide-react';
import { api, fmtDate, inr } from '../../lib/api.js';
import { Avatar, Badge, Button, Card, Empty, PageLoader, statusTone, useAsync } from '../../shared/ui.jsx';
import { useVendorRequests } from './requestsContext.jsx';

const TYPE_ICON = { chat: MessageCircle, audio: Phone, video: Video };

export default function Requests() {
  const { requests: reqs, loading, version, busyId, accept, reject } = useVendorRequests();
  const { data: past, reload: reloadPast } = useAsync(() => api.vendor.get('/astrologer/sessions'));

  useEffect(() => {
    if (version > 0) reloadPast(true);
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <PageLoader />;
  if (loading) return <PageLoader variant="vendor-requests" />;
  return (
    <div className="space-y-5">
      <section>
        <h1 className="mb-2 text-base font-bold text-slate-900">Incoming requests <span className="text-slate-400">({reqs.length})</span></h1>
        {reqs.length ? (
          <div className="space-y-3">
            {reqs.map((r, i) => {
              const Icon = TYPE_ICON[r.type] || MessageCircle;
              const busy = busyId === r._id;
              return (
                <Card key={r._id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={r.user?.name || 'User'} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900">{r.user?.name || 'Guest user'} {i === 0 && <Badge tone="green">Next</Badge>}</p>
                      <p className="text-xs text-slate-500">{r.user?.gender} {r.user?.zodiac && `· ${r.user.zodiac}`}</p>
                      <p className="text-xs text-slate-400">DOB {r.user?.dob || '–'} {r.user?.tob || ''} · {r.user?.pob || '–'}</p>
                    </div>
                    <div className="text-right"><Badge tone="violet"><Icon size={12} className="mr-1" />{r.type}</Badge><p className="mt-1 text-[11px] text-slate-400">{fmtDate(r.createdAt)}</p></div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2"><Button variant="outline" loading={busy} onClick={() => reject(r)}><X size={16} /> Reject</Button><Button variant="success" loading={busy} onClick={() => accept(r)}><Check size={16} /> Accept</Button></div>
                </Card>
              );
            })}
          </div>
        ) : <Card><Empty icon={Inbox} title="No pending requests" hint="Stay online — new requests appear here instantly." /></Card>}
      </section>
      <section>
        <h2 className="mb-2 text-base font-bold text-slate-900">Recent sessions</h2>
        <Card className="divide-y divide-slate-100">
          {past?.length ? past.slice(0, 15).map((s) => (
            <div key={s._id} className="flex items-center justify-between p-3 text-xs">
              <div><p className="font-semibold text-slate-800">{s.user?.name || 'User'}</p><p className="text-slate-400">{fmtDate(s.createdAt)} · {s.type} · {s.minutes} min</p></div>
              <div className="text-right"><Badge tone={statusTone(s.status)}>{s.status}</Badge>{s.astrologerEarning > 0 && <p className="mt-0.5 font-bold text-emerald-600">+{inr(s.astrologerEarning)}</p>}</div>
            </div>
          )) : <p className="p-4 text-xs text-slate-400">Nothing yet.</p>}
        </Card>
      </section>
    </div>
  );
}
