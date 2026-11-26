import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Power, IndianRupee, Clock, MessageCircle, Star, Inbox, AlertTriangle } from 'lucide-react';
import { api, inr } from '../../lib/api.js';
import { vendorAuth } from '../../lib/auth.jsx';
import { Card, PageLoader, useAsync, useToast, cx } from '../../shared/ui.jsx';
import { useVendorRequests } from './requestsContext.jsx';

const Stat = ({ icon: Icon, label, value, tone, to }) => (
  <Link to={to} className="group block">
    <Card className="p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
      <span className={cx('mb-2 flex h-9 w-9 items-center justify-center rounded-xl', tone)}><Icon size={18} /></span>
      <p className="text-xl font-extrabold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 group-hover:text-slate-600">{label}</p>
    </Card>
  </Link>
);

export default function Dashboard() {
  const { me, setMe } = vendorAuth.useAuth();
  const toast = useToast();
  const { requests, version } = useVendorRequests();
  const { data, loading, reload: reloadDash } = useAsync(() => api.vendor.get('/astrologer/dashboard'));
  const { data: active, reload: reloadActive } = useAsync(() => api.vendor.get('/astrologer/active'));

  useEffect(() => {
    if (version === 0) return;
    reloadDash(true);
    reloadActive(true);
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async () => {
    try { setMe(await api.vendor.post('/astrologer/online', { online: !me.online })); } catch (e) { toast(e.message, 'error'); }
  };
  if (loading || !data) return <PageLoader variant="vendor-dash" />;
  const approved = me.status === 'approved';
  const pendingCount = requests.length;
  return (
    <div className="space-y-4">
      {!approved && <Card className="flex gap-3 border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><AlertTriangle className="shrink-0" size={18} /><p>{me.status === 'pending' ? 'Your application is under review. You can go online once an admin approves your profile.' : `Your account is ${me.status}. Contact support.`}</p></Card>}
      <Card className={cx('flex items-center justify-between p-5', me.online ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white' : 'bg-white')}>
        <div><p className={cx('text-xs font-semibold', me.online ? 'text-emerald-100' : 'text-slate-400')}>Availability</p><p className="text-xl font-extrabold">{me.online ? 'You are online' : 'You are offline'}</p><p className={cx('text-xs', me.online ? 'text-emerald-100' : 'text-slate-400')}>{me.online ? 'Users can send you consultation requests.' : 'Go online to receive requests.'}</p></div>
        <button onClick={toggle} disabled={!approved} aria-label="Toggle online" className={cx('flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition disabled:opacity-40', me.online ? 'bg-white text-emerald-600' : 'bg-brand-600 text-white')}><Power size={24} /></button>
      </Card>
      {active && <Link to={`/vendor/session/${active._id}`}><Card className="flex items-center justify-between border-brand-200 bg-brand-50 p-4 text-sm font-semibold text-brand-800"><span>Live session with {active.user?.name || 'user'}</span><span>Open →</span></Card></Link>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={IndianRupee} label="Today's earnings" value={inr(data.today.earnings)} tone="bg-emerald-50 text-emerald-600" to="/vendor/earnings" />
        <Stat icon={IndianRupee} label="Wallet balance" value={inr(data.balance)} tone="bg-brand-50 text-brand-600" to="/vendor/earnings" />
        <Stat icon={MessageCircle} label="Sessions today" value={data.today.sessions} tone="bg-sky-50 text-sky-600" to="/vendor/requests" />
        <Stat icon={Clock} label="Minutes today" value={data.today.minutes} tone="bg-amber-50 text-amber-600" to="/vendor/requests" />
        <Stat icon={Star} label={`Rating (${data.ratingCount})`} value={data.rating?.toFixed(1) || '–'} tone="bg-yellow-50 text-yellow-600" to="/vendor/profile" />
        <Stat icon={IndianRupee} label="Lifetime earnings" value={inr(data.total.earnings)} tone="bg-slate-100 text-slate-600" to="/vendor/earnings" />
        <Stat icon={MessageCircle} label="Total sessions" value={data.total.sessions} tone="bg-slate-100 text-slate-600" to="/vendor/requests" />
        <Stat icon={Inbox} label="Pending requests" value={pendingCount} tone={pendingCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} to="/vendor/requests" />
      </div>
    </div>
  );
}
