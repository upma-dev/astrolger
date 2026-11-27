import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { House, MessageCircle, ScrollText, UserRound, Wallet } from 'lucide-react';
import { userAuth } from '../../lib/auth.jsx';
import { PageLoader } from '../../shared/ui.jsx';
import { UserShellSkeleton } from '../../shared/Skeleton.jsx';
import { inr } from '../../lib/api.js';
import { AppDataProvider, AVProvider, Icon, Phone, useAV, useAppData, vibrate } from './av.jsx';
import Login from './Login.jsx';
import { missingSignup, signupStarted } from './accounts.js';
import AnnouncementBar from '../../shared/AnnouncementBar.jsx';
import Maintenance from '../../shared/Maintenance.jsx';
import PushListener from '../../shared/PushListener.jsx';

const HomePage = lazy(() => import('./HomePage.jsx'));
const Kundli = lazy(() => import('./Kundli.jsx'));
const Matching = lazy(() => import('./Matching.jsx'));
const Astrologers = lazy(() => import('./Astrologers.jsx'));
const AstrologerProfile = lazy(() => import('./AstrologerProfile.jsx'));
const SessionPage = lazy(() => import('./SessionPage.jsx'));
const WalletPage = lazy(() => import('./WalletPage.jsx'));
const Store = lazy(() => import('./Store.jsx'));
const Profile = lazy(() => import('./Profile.jsx'));
const Welcome = lazy(() => import('./Welcome.jsx'));

function Header({ me, collapsed }) {
  const { openSheet } = useAV();
  const { data } = useAppData();
  const nav = useNavigate();
  const brand = data?.config?.brand || { name: 'AstroVani', tagline: '' };
  const bal = me.walletBalance || 0;
  return (
    <header className={`av-hdr${collapsed ? ' collapsed' : ''}`}>
      <button className="av-brand" onClick={() => nav('/user')} aria-label={`${brand.name} home`}>
        {brand.logoUrl ? <img src={brand.logoUrl} alt={brand.name} /> : (
          <span className="av-brand-txt"><b>{brand.name}</b>{brand.tagline && <small>{brand.tagline}</small>}</span>
        )}
      </button>
      <button className="av-wallet" onClick={() => openSheet()} aria-label="Wallet balance, add money">
        <Icon n="wallet" s={15} />{inr(bal)}{bal < 50 && <span className="av-add">+ Add</span>}
      </button>
      <button className="av-iconbtn" onClick={() => nav('/user/profile')} aria-label="Notifications and support"><Icon n="bell" s={18} /></button>
      <button className="av-iconbtn" onClick={() => nav('/user/profile')} aria-label="My profile"><Icon n="user" s={18} /></button>
    </header>
  );
}

/* Bottom tabs use the standard Lucide icon set (same as the rest of the app and admin). */
function BottomNav() {
  const item = (to, label, I, end) => (
    <NavLink to={to} end={end} onClick={vibrate} className={({ isActive }) => `av-nv${isActive ? ' on' : ''}`}>
      {({ isActive }) => <><span className="av-nv-ic"><I size={20} strokeWidth={isActive ? 2.2 : 1.8} /></span>{label}</>}
    </NavLink>
  );
  return (
    <nav className="av-nav">
      {item('/user', 'Home', House, true)}
      {item('/user/kundli', 'Kundli', ScrollText)}
      <NavLink to="/user/astrologers" onClick={vibrate} className="av-fabw" aria-label="Talk to an astrologer"><span className="av-fab"><MessageCircle size={24} strokeWidth={2.2} /></span>Talk</NavLink>
      {item('/user/wallet', 'Wallet', Wallet)}
      {item('/user/profile', 'Profile', UserRound)}
    </nav>
  );
}

const LEGACY = ['/user/kundli', '/user/matching', '/user/wallet', '/user/store', '/user/profile'];

function Shell() {
  const { me, loading } = userAuth.useAuth();
  const { data, loading: appLoading } = useAppData();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const scrollRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const chat = pathname.startsWith('/user/session');
  const legacy = LEGACY.some((p) => pathname.startsWith(p)) || /^\/user\/astrologers\/.+/.test(pathname);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    el.scrollTop = 0;
    setCollapsed(false);
    // Collapsing shrinks the header by ~30px, which moves scrollTop. A single threshold made it flip
    // back and forth (blinking). Use a gap wider than that change: collapse past 64px, expand below 8px.
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = el.scrollTop;
        setCollapsed((c) => (c ? y > 8 : y > 64));
      });
    };
    el.addEventListener('scroll', on, { passive: true });
    return () => { cancelAnimationFrame(raf); el.removeEventListener('scroll', on); };
  }, [pathname, me]);

  if (loading) return <Phone><PageLoader /></Phone>;
  if (loading) return <Phone bare><UserShellSkeleton /></Phone>;
  if (!me) return <Navigate to="/user/login" replace state={{ from: pathname }} />;
  // Sign-up must be finished first: no app screens until the details the admin made required are filled in.
  if (appLoading && !data) return <Phone><PageLoader /></Phone>;
  if (appLoading && !data) return <Phone bare><UserShellSkeleton /></Phone>;
  if (missingSignup(me, data?.config?.signup?.customer?.fields).length) {
    // Just verified the OTP in this session → continue the sign-up steps. Otherwise start at number + OTP.
    return signupStarted(me._id) ? <Navigate to="/user/welcome" replace /> : <RestartAtLogin />;
  }
  const skVariant = pathname.startsWith('/user/wallet') ? 'wallet' : pathname.startsWith('/user/store') ? 'store' : pathname.startsWith('/user/session') ? 'chat-mobile' : /^\/user\/astrologers\/.+/.test(pathname) ? 'astro-profile' : 'default';
  return (
    <Phone bare={chat} scrollRef={scrollRef} nav={chat ? null : <BottomNav />}>
      <PushListener role="user" />
      {!chat && <AnnouncementBar className="av-ann" cfg={data?.config?.announcement?.user} storageKey="ann-user" onNavigate={nav} />}
      {!chat && <Header me={me} collapsed={collapsed} />}
      <Suspense fallback={<PageLoader />}>
      <Suspense fallback={<PageLoader variant={skVariant} />}>
        {legacy ? <div className="av-legacy"><Outlet /></div> : <Outlet />}
      </Suspense>
    </Phone>
  );
}

function LoginScreen() {
  return <Phone bare><Login /></Phone>;
}

/* An unfinished profile from an older login: drop that login and show the mobile number + OTP screen. */
function RestartAtLogin() {
  const { logout } = userAuth.useAuth();
  useEffect(() => { logout(); }, [logout]);
  return <Navigate to="/user/login" replace />;
}

/* Admin switched the customer app off (Global > System settings): nothing else renders. */
function Gate({ children }) {
  const { data } = useAppData();
  const auth = userAuth.useAuth();
  const off = data?.system?.user?.enabled === false;
  const wasOff = useRef(off);
  useEffect(() => {
    // Back on: the profile request failed while it was off, so load it again.
    if (wasOff.current && !off) auth.refresh();
    wasOff.current = off;
  }, [off]); // eslint-disable-line react-hooks/exhaustive-deps
  if (off) return <Phone bare><Maintenance info={data.system.user} brand={data.config?.brand?.name} compact /></Phone>;
  return children;
}

export default function UserApp() {
  return (
    <userAuth.Provider>
      <AVProvider>
        <AppDataProvider>
        <Gate>
        <Routes>
          <Route path="login" element={<LoginScreen />} />
          <Route path="welcome" element={<Phone bare><Suspense fallback={<PageLoader />}><Welcome /></Suspense></Phone>} />
          <Route path="welcome" element={<Phone bare><Suspense fallback={<PageLoader variant="auth" />}><Welcome /></Suspense></Phone>} />
          <Route element={<Shell />}>
            <Route index element={<HomePage />} />
            <Route path="kundli" element={<Kundli />} />
            <Route path="matching" element={<Matching />} />
            <Route path="astrologers" element={<Astrologers />} />
            <Route path="astrologers/:id" element={<AstrologerProfile />} />
            <Route path="session/:id" element={<SessionPage />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="store" element={<Store />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/user" replace />} />
          </Route>
        </Routes>
        </Gate>
        </AppDataProvider>
      </AVProvider>
    </userAuth.Provider>
  );
}
