import { lazy, Suspense, useEffect, useRef } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Inbox, IndianRupee, UserCog, LogOut, Check, X, MessageCircle, Phone, Video } from 'lucide-react';
import { vendorAuth } from '../../lib/auth.jsx';
import { Avatar, Badge, Button, PageLoader, ToastProvider, cx } from '../../shared/ui.jsx';
import { VendorShellSkeleton } from '../../shared/Skeleton.jsx';
import Login from './Login.jsx';
import AnnouncementBar from '../../shared/AnnouncementBar.jsx';
import Maintenance from '../../shared/Maintenance.jsx';
import { VendorStatusProvider, useVendorStatus } from './status.jsx';
import { VendorRequestsProvider, useVendorRequests } from './requestsContext.jsx';
import { useLogoutPrompt } from '../../shared/SaveLoginPrompt.jsx';
import PushListener from '../../shared/PushListener.jsx';

const Dashboard = lazy(() => import('./Dashboard.jsx'));
const Requests = lazy(() => import('./Requests.jsx'));
const Chat = lazy(() => import('./Chat.jsx'));
const Earnings = lazy(() => import('./Earnings.jsx'));
const Profile = lazy(() => import('./Profile.jsx'));

const NAV = [
  { to: '/vendor', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/vendor/requests', label: 'Requests', icon: Inbox },
  { to: '/vendor/earnings', label: 'Earnings', icon: IndianRupee },
  { to: '/vendor/profile', label: 'Profile', icon: UserCog },
];

const TYPE_META = {
  chat: { label: 'Chat', Icon: MessageCircle },
  audio: { label: 'Audio call', Icon: Phone },
  video: { label: 'Video call', Icon: Video },
};

function IncomingRequestBanner() {
  const { pathname } = useLocation();
  const { requests, accept, reject, busyId } = useVendorRequests();
  if (!requests.length || pathname === '/vendor/requests') return null;
  const r = requests[0];
  const { label, Icon } = TYPE_META[r.type] || TYPE_META.chat;
  const busy = busyId === r._id;
  return (
    <div className="mb-4 rounded-2xl border-2 border-emerald-500 bg-white p-4 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Incoming {label} request</p>
          {requests.length > 1 && <Badge tone="amber">+{requests.length - 1} waiting</Badge>}
        </div>
        <Link to="/vendor/requests" className="text-xs font-semibold text-brand-700 hover:underline">View all ({requests.length})</Link>
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={r.user?.name || 'User'} size={42} />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
              {r.user?.name || 'Guest user'}
              <Badge tone="violet"><Icon size={11} className="mr-1" />{label}</Badge>
            </p>
            <p className="text-xs text-slate-500">{[r.user?.gender, r.user?.zodiac].filter(Boolean).join(' · ') || 'New consultation'}{r.user?.dob ? ` · DOB ${r.user.dob}` : ''}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <Button size="sm" variant="outline" loading={busy} onClick={() => reject(r)}><X size={15} /> Reject</Button>
          <Button size="sm" variant="success" loading={busy} onClick={() => accept(r)}><Check size={15} /> Accept</Button>
        </div>
      </div>
    </div>
  );
}

function ShellLayout() {
  const { me, logout } = vendorAuth.useAuth();
  const [askLogout, logoutPrompt] = useLogoutPrompt('astrologer', me, () => { logout(); nav('/vendor/login'); });
  const { status } = useVendorStatus();
  const { requests } = useVendorRequests();
  const { pathname } = useLocation();
  const nav = useNavigate();
  const pending = requests.length;
  const skVariant = pathname.startsWith('/vendor/requests') ? 'vendor-requests' : pathname.startsWith('/vendor/earnings') ? 'vendor-earnings' : pathname.startsWith('/vendor/session') ? 'chat' : 'vendor-dash';
  return (
    <div className="flex min-h-[100dvh] bg-slate-100">
      <aside className="hidden w-60 shrink-0 flex-col bg-slate-900 p-4 text-slate-300 lg:flex">
        <div className="mb-8 flex items-center gap-2 px-2 font-display text-lg font-bold text-white"><img src="/favicon.svg" className="h-7 w-7" alt="" /> AstroVani <span className="text-[10px] font-sans font-semibold text-gold-400">PRO</span></div>
        <nav className="flex-1 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition', isActive ? 'bg-brand-600 text-white' : 'hover:bg-white/5')}>
              <span className="flex items-center gap-3"><Icon size={18} />{label}</span>
              {to === '/vendor/requests' && pending > 0 && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white">{pending}</span>}
            </NavLink>
          ))}
        </nav>
        <button onClick={askLogout} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-white/5"><LogOut size={18} /> Logout</button>
      </aside>
      {logoutPrompt}
      <div className="flex min-w-0 flex-1 flex-col">
        <AnnouncementBar cfg={status?.announcement?.astrologer} storageKey="ann-astro" onNavigate={nav} />
        <header className="sticky top-0 z-20 flex items-center justify-between bg-white px-4 py-3 shadow-sm">
          <div><p className="text-sm font-bold text-slate-900">{me.name}</p><p className="text-[11px] text-slate-400">Astrologer panel</p></div>
          <div className="flex items-center gap-2">
            {pending > 0 && <Link to="/vendor/requests" className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">{pending} pending</Link>}
            <Badge tone={me.status === 'approved' ? 'green' : me.status === 'pending' ? 'amber' : 'red'}>{me.status}</Badge>
          </div>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 p-4 pb-24 lg:pb-6">
          <IncomingRequestBanner />
          <Suspense fallback={<PageLoader variant={skVariant} />}><Outlet /></Suspense>
        </main>
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white lg:hidden">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold', isActive ? 'text-brand-700' : 'text-slate-400')}>
              <Icon size={20} />
              {label}
              {to === '/vendor/requests' && pending > 0 && <span className="absolute top-1.5 right-[26%] flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">{pending}</span>}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

function Shell() {
  const { me, loading } = vendorAuth.useAuth();
  if (loading) return <VendorShellSkeleton />;
  if (!me) return <Navigate to="/vendor/login" replace />;
  return (
    <VendorRequestsProvider>
      <PushListener role="astrologer" />
      <ShellLayout />
    </VendorRequestsProvider>
  );
}

/* Astrologer app switched off by the admin (Global > System settings). */
function Gate({ children }) {
  const { status } = useVendorStatus();
  const auth = vendorAuth.useAuth();
  const off = status?.system?.astrologer?.enabled === false;
  const wasOff = useRef(off);
  useEffect(() => { if (wasOff.current && !off) auth.refresh(); wasOff.current = off; }, [off]); // eslint-disable-line react-hooks/exhaustive-deps
  if (off) return <Maintenance info={status.system.astrologer} brand={status.brand?.name ? `${status.brand.name} Pro` : 'Astrologer app'} dark />;
  return children;
}

export default function VendorApp() {
  return (
    <ToastProvider>
      <vendorAuth.Provider>
        <VendorStatusProvider>
        <Gate>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route element={<Shell />}>
            <Route index element={<Dashboard />} />
            <Route path="requests" element={<Requests />} />
            <Route path="session/:id" element={<Chat />} />
            <Route path="earnings" element={<Earnings />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/vendor" replace />} />
          </Route>
        </Routes>
        </Gate>
        </VendorStatusProvider>
      </vendorAuth.Provider>
    </ToastProvider>
  );
}
