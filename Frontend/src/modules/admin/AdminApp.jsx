import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Sparkles, Globe2, ListChecks, MessagesSquare, CreditCard, IndianRupee, Ban, BarChart3, LifeBuoy, Clock3, CheckCircle2,
  XCircle, ShieldOff, Radio, Star, Gift, Wallet, Percent, Smartphone, Palette, LayoutTemplate, FileText, SlidersHorizontal, Receipt,
  LogOut, Menu, ChevronLeft, ChevronRight, ChevronDown, Check, Search, Bell, Shield, RotateCcw, Megaphone, ExternalLink, X, Power, Layers, Banknote, KeyRound,
} from 'lucide-react';
import { api, inr, fmtDate, connectSocket } from '../../lib/api.js';
import PushListener from '../../shared/PushListener.jsx';
import { playAlert } from '../../shared/sound.js';
import { adminAuth } from '../../lib/auth.jsx';
import { PageLoader, ToastProvider, useToast, cx } from '../../shared/ui.jsx';
import { AdminShellSkeleton } from '../../shared/Skeleton.jsx';
import Login from './Login.jsx';

const L = (f) => lazy(f);
const Dashboard = L(() => import('./Dashboard.jsx'));
const UsersDashboard = L(() => import('./users/UsersDashboard.jsx'));
const UserList = L(() => import('./users/UserList.jsx'));
const UserDetail = L(() => import('./users/UserDetail.jsx'));
const Payments = L(() => import('./users/Payments.jsx'));
const PriceManagement = L(() => import('./pricing/PriceManagement.jsx'));
const Sessions = L(() => import('./Sessions.jsx'));
const Cancellations = L(() => import('./Cancellations.jsx'));
const Reports = L(() => import('./Reports.jsx'));
const Support = L(() => import('./Support.jsx'));
const AstroDashboard = L(() => import('./astro/AstroDashboard.jsx'));
const AstroApprovals = L(() => import('./astro/AstroApprovals.jsx'));
const AstroList = L(() => import('./astro/AstroList.jsx'));
const AstroDetail = L(() => import('./astro/AstroDetail.jsx'));
const AstroReviews = L(() => import('./astro/Reviews.jsx'));
const Rewards = L(() => import('./astro/Rewards.jsx'));
const Payouts = L(() => import('./Finance.jsx').then((m) => ({ default: m.Payouts })));
const Commission = L(() => import('./Finance.jsx').then((m) => ({ default: m.Commission })));
const Transactions = L(() => import('./Finance.jsx').then((m) => ({ default: m.Transactions })));
const AppManagement = L(() => import('./AppManagement.jsx'));
const AstroAppSettings = L(() => import('./AstroAppSettings.jsx'));
const Theme = L(() => import('./global/Theme.jsx'));
const LandingEditor = L(() => import('./global/LandingEditor.jsx'));
const SubscriptionPlans = L(() => import('./pricing/SubscriptionPlans.jsx'));
const Content = L(() => import('./Content.jsx'));
const PlatformSettings = L(() => import('./PlatformSettings.jsx'));
const PoliciesManager = L(() => import('./PoliciesManager.jsx'));
const NotificationManager = L(() => import('./NotificationManager.jsx'));
const Announcement = L(() => import('./global/Announcement.jsx'));
const Orders = L(() => import('./users/Orders.jsx'));

/* Three modes matching Eqosy tabs: [ Astrologers ] [ Users ] [ Global ] */
const MODES = [
  {
    id: 'astro',
    label: 'Astrologers',
    hint: 'Approvals, orders, payouts',
    icon: Sparkles,
    home: '/admin/astro/dashboard',
    sections: [
      {
        title: 'ASTROLOGER MANAGEMENT',
        items: [
          { to: '/admin/astro/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          {
            id: 'astrologers_group',
            label: 'Astrologers',
            icon: Users,
            badgeKey: 'approvals',
            children: [
              { to: '/admin/astro/approvals', label: 'Astrologer Approvals', badgeKey: 'approvals' },
              { to: '/admin/astro/list/approved', label: 'Approved Astrologers' },
              { to: '/admin/astro/list/sponsored', label: 'Sponsored Astrologers' },
              { to: '/admin/astro/list/rejected', label: 'Rejected applications' },
              { to: '/admin/astro/list/blocked', label: 'Blocked Astrologers' },
              { to: '/admin/astro/online', label: 'Online Now' },
            ],
          },
        ],
      },
      {
        title: 'ORDER & CONSULTATION',
        items: [
          {
            id: 'consultations_group',
            label: 'Consultations',
            icon: MessagesSquare,
            children: [
              { to: '/admin/astro/chats', label: 'All Consultations' },
              { to: '/admin/astro/live', label: 'Live Active Sessions' },
            ],
          },
          { to: '/admin/astro/reviews', label: 'Ratings & Reviews', icon: Star },
          { to: '/admin/astro/rewards', label: 'Astrologer Rewards', icon: Gift },
        ],
      },
      {
        title: 'FINANCIAL MANAGEMENT',
        items: [
          {
            id: 'payouts_group',
            label: 'Payouts & Finance',
            icon: Wallet,
            badgeKey: 'withdrawals',
            children: [
              { to: '/admin/astro/payouts', label: 'Payout Requests', badgeKey: 'withdrawals' },
              { to: '/admin/astro/commission', label: 'Commission Tracking' },
            ],
          },
        ],
      },
      {
        title: 'PRICE MANAGEMENT',
        items: [
          { to: '/admin/astro/pricing/rates', label: 'Astrologer Rates', icon: IndianRupee },
          { to: '/admin/astro/pricing/rules', label: 'Chat / Call / Video Rules', icon: Layers },
          { to: '/admin/astro/pricing/payouts', label: 'Payout & TDS Settings', icon: Banknote },
          { to: '/admin/astro/plans', label: 'Subscription Plans', icon: Star },
        ],
      },
      {
        title: 'POLICY & BROADCAST',
        items: [
          { to: '/admin/astro/support', label: 'Support Queries', icon: LifeBuoy, badgeKey: 'supportAstro' },
          { to: '/admin/astro/policies', label: 'Terms & Policies', icon: Shield },
          { to: '/admin/astro/notifications', label: 'Push Notifications', icon: Megaphone },
        ],
      },
    ],
  },
  {
    id: 'users',
    label: 'Users',
    hint: 'Customers, chats, payments',
    icon: Users,
    home: '/admin/users/dashboard',
    sections: [
      {
        title: 'OVERVIEW',
        items: [{ to: '/admin/users/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
      },
      {
        title: 'CUSTOMER MANAGEMENT',
        items: [
          { to: '/admin/users/list', label: 'User list', icon: ListChecks },
          { to: '/admin/users/chats', label: 'Consultations & chats', icon: MessagesSquare },
          {
            id: 'wallet_group',
            label: 'Wallet & Payments',
            icon: CreditCard,
            children: [
              { to: '/admin/users/payments', label: 'Wallet Transactions' },
              { to: '/admin/users/orders', label: 'Store & COD Orders' },
            ],
          },
        ],
      },
      {
        title: 'PRICE MANAGEMENT',
        items: [
          { to: '/admin/users/pricing/recharge', label: 'Wallet Recharge & GST', icon: IndianRupee },
          { to: '/admin/users/pricing/charges', label: 'Consultation Charges', icon: Layers },
          { to: '/admin/users/pricing/payments', label: 'Payment Modes (Online / COD)', icon: CreditCard },
          { to: '/admin/users/plans', label: 'Subscription Plans', icon: Star },
        ],
      },
      {
        title: 'INSIGHTS & SUPPORT',
        items: [
          { to: '/admin/users/cancellations', label: 'Cancellation analytics', icon: Ban },
          { to: '/admin/users/analytics', label: 'Platform Analytics', icon: BarChart3 },
          { to: '/admin/users/support', label: 'Queries & support', icon: LifeBuoy, badgeKey: 'support' },
        ],
      },
      {
        title: 'POLICY & BROADCAST',
        items: [
          { to: '/admin/users/policies', label: 'Terms & Policies', icon: Shield },
          { to: '/admin/users/notifications', label: 'Broadcast Alerts', icon: Megaphone },
        ],
      },
    ],
  },
  {
    id: 'global',
    label: 'Global',
    hint: 'App, legal, theme, system',
    icon: Globe2,
    home: '/admin/global/overview',
    sections: [
      {
        title: 'SYSTEM OVERVIEW',
        items: [
          { to: '/admin/global/overview', label: 'Platform Overview', icon: LayoutDashboard },
          { to: '/admin/global/transactions', label: 'All Transactions', icon: Receipt },
        ],
      },
      {
        title: 'NOTIFICATIONS & BROADCAST',
        items: [
          { to: '/admin/global/notifications', label: 'Push Broadcast Manager', icon: Megaphone },
        ],
      },
      {
        title: 'APPS',
        items: [
          {
            id: 'customer_app',
            label: 'Customer App',
            icon: Smartphone,
            children: [
              { to: '/admin/global/app/login', label: 'Login Screen' },
              { to: '/admin/global/app/signup', label: 'Sign-up Details' },
              { to: '/admin/global/app/layout', label: 'Home Layout' },
              { to: '/admin/global/app/posters', label: 'Home Posters' },
              { to: '/admin/global/app/services', label: 'Services Row' },
              { to: '/admin/global/app/promo', label: 'Promo Offer Card' },
              { to: '/admin/global/app/branding', label: 'Branding & Search' },
              { to: '/admin/global/theme', label: 'Theme & Colours' },
              { to: '/admin/global/announcement/user', label: 'Announcement Bar' },
              { to: '/admin/global/content', label: 'Horoscopes & Content' },
            ],
          },
          {
            id: 'astro_app',
            label: 'Astrologer App',
            icon: Sparkles,
            children: [
              { to: '/admin/global/astro-app/login', label: 'Login Screen' },
              { to: '/admin/global/astro-app/signup', label: 'Sign-up Details' },
              { to: '/admin/global/announcement/astrologer', label: 'Announcement Bar' },
            ],
          },
        ],
      },
      {
        title: 'WEBSITE',
        items: [
          {
            id: 'landing_group',
            label: 'Landing Page',
            icon: LayoutTemplate,
            children: [
              { to: '/admin/global/landing/brand', label: 'Brand & App Links' },
              { to: '/admin/global/landing/hero', label: 'Hero Section' },
              { to: '/admin/global/landing/services', label: 'Services' },
              { to: '/admin/global/landing/how', label: 'How It Works' },
              { to: '/admin/global/landing/earn', label: 'Earn With Us' },
              { to: '/admin/global/landing/faq', label: 'FAQ' },
              { to: '/admin/global/landing/banner', label: 'Download Banner' },
              { to: '/admin/global/landing/footer', label: 'Footer' },
              { to: '/admin/global/announcement/website', label: 'Announcement Bar' },
              { to: '/admin/global/landing/policies', label: 'Terms, Privacy & Refund' },
            ],
          },
        ],
      },
      {
        title: 'SYSTEM SETTINGS',
        items: [
          { to: '/admin/global/platform', label: 'System Settings (App On/Off)', icon: Power },
        ],
      },
    ],
  },
];

const ALL_ITEMS = MODES.flatMap((m) =>
  m.sections.flatMap((s) =>
    s.items.flatMap((i) =>
      i.children
        ? i.children.map((c) => ({ ...c, icon: i.icon, mode: m.id }))
        : [{ ...i, mode: m.id }]
    )
  )
);
const modeOf = (pathname) => MODES.find((m) => pathname.startsWith(`/admin/${m.id}`)) || MODES[0];

/* Notifications Dropdown Panel - Matching Eqosy exact design */
function NotificationsPanel({ open, onClose, pendingData, reloadPending }) {
  const nav = useNavigate();
  const [filter, setFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const panelRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  if (!open) return null;

  const approvals = pendingData?.approvals || [];
  const withdrawals = pendingData?.withdrawals || [];
  const support = pendingData?.support || [];

  // Transform into unified notification cards
  const allCards = [
    ...withdrawals.map((w) => ({
      id: `wd_${w._id}`,
      type: 'WITHDRAWAL',
      badgeTone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      title: 'Astrologer Withdrawal Req...',
      desc: `${w.astrologer?.name || 'Astrologer'} requested a withdrawal of ${inr(w.amount)}. Status: Pending`,
      detail: `${w.astrologer?.name || 'Astrologer'} • ${inr(w.amount)}`,
      time: fmtDate(w.createdAt),
      link: '/admin/astro/payouts',
      category: 'withdrawals',
    })),
    ...approvals.map((a) => ({
      id: `app_${a._id}`,
      type: 'APPROVAL',
      badgeTone: 'bg-amber-50 text-amber-700 border-amber-200',
      title: 'New Astrologer Verification',
      desc: `${a.name} submitted application for Vedic astrology consultation verification.`,
      detail: `${a.phone} • Experience: ${a.experience || 0} yrs`,
      time: fmtDate(a.createdAt),
      link: '/admin/astro/approvals',
      category: 'approvals',
    })),
    ...support.map((t) => ({
      id: `sup_${t._id}`,
      type: 'SUPPORT',
      badgeTone: 'bg-sky-50 text-sky-700 border-sky-200',
      title: t.app === 'astrologer' ? 'Astrologer Support Query' : 'Customer Support Query',
      desc: `${(t.astrologer || t.user)?.name || t.guest?.name || 'Someone'}: ${t.subject || 'Support issue'}`,
      detail: `${(t.astrologer || t.user)?.phone || t.guest?.phone || '—'} • ${t.source === 'login' ? 'From login screen' : 'Open query'}`,
      time: fmtDate(t.updatedAt || t.createdAt),
      link: t.app === 'astrologer' ? '/admin/astro/support' : '/admin/users/support',
      category: 'support',
    })),
  ];

  const filteredCards = filter === 'all' ? allCards : allCards.filter((c) => c.category === filter);
  const totalCount = allCards.length;

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCards.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCards.map((c) => c.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleClear = () => {
    setSelectedIds([]);
    reloadPending?.();
  };

  return (
    <div
      ref={panelRef}
      className="absolute right-4 top-16 z-50 w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Notifications & Pending Tasks</h3>
          <p className="text-[11px] text-slate-400">Approvals, handovers, withdrawals & support requests</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition"
          >
            CLEAR ({totalCount})
          </button>
          <button
            onClick={() => {
              onClose();
              nav('/admin/astro/approvals');
            }}
            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition"
          >
            View all
          </button>
        </div>
      </div>

      {/* Filter Tabs / Pills */}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-2.5">
        <button
          onClick={() => setFilter('all')}
          className={cx(
            'rounded-full px-3 py-1 text-xs font-semibold transition',
            filter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          All {totalCount}
        </button>
        <button
          onClick={() => setFilter('handovers')}
          className={cx(
            'rounded-full px-3 py-1 text-xs font-semibold transition',
            filter === 'handovers' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          Handovers
        </button>
        <button
          onClick={() => setFilter('approvals')}
          className={cx(
            'rounded-full px-3 py-1 text-xs font-semibold transition',
            filter === 'approvals' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          Approvals {approvals.length > 0 && approvals.length}
        </button>
        <button
          onClick={() => setFilter('withdrawals')}
          className={cx(
            'rounded-full px-3 py-1 text-xs font-semibold transition',
            filter === 'withdrawals' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          Withdrawals {withdrawals.length > 0 && withdrawals.length}
        </button>
        <button
          onClick={() => setFilter('support')}
          className={cx(
            'rounded-full px-3 py-1 text-xs font-semibold transition',
            filter === 'support' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          Support {support.length > 0 && support.length}
        </button>
      </div>

      {/* Select All Checkbox */}
      <div className="flex items-center gap-2 border-t border-slate-100 py-2 text-xs font-medium text-slate-500">
        <input
          type="checkbox"
          checked={filteredCards.length > 0 && selectedIds.length === filteredCards.length}
          onChange={toggleSelectAll}
          className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        <span>Select All ({filteredCards.length})</span>
      </div>

      {/* List of Notification Items */}
      <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
        {filteredCards.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No pending tasks in this category
          </div>
        ) : (
          filteredCards.map((c) => (
            <div key={c.id} className="group flex items-start gap-2.5 py-3 transition hover:bg-slate-50/80">
              <input
                type="checkbox"
                checked={selectedIds.includes(c.id)}
                onChange={() => toggleSelect(c.id)}
                className="mt-1 h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-xs font-bold text-slate-900">{c.title}</p>
                  <span className={cx('rounded border px-1.5 py-0.5 text-[9px] font-bold', c.badgeTone)}>
                    {c.type}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500 leading-snug">{c.desc}</p>
                <p className="mt-1 text-[10px] text-slate-400">{c.detail}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <button
                    onClick={() => {
                      onClose();
                      nav(c.link);
                    }}
                    className="text-[11px] font-bold text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    Tap to inspect →
                  </button>
                  <span className="text-[10px] text-slate-400">{c.time}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* Quick Search Dialog (Ctrl+K) */
function SearchDialog({ open, onClose }) {
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  if (!open) return null;

  const matches = ALL_ITEMS.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-20 backdrop-blur-xs" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search panels, settings, astrologers or policies..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-brand-500 focus:bg-white"
          />
        </div>
        <div className="mt-3 max-h-64 overflow-y-auto">
          {matches.map((m) => (
            <button
              key={m.to}
              onClick={() => {
                onClose();
                nav(m.to);
              }}
              className="flex w-full items-center justify-between rounded-xl p-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <div className="flex items-center gap-2">
                <m.icon size={15} className="text-slate-400" />
                <span>{m.label}</span>
              </div>
              <span className="font-mono text-[10px] text-slate-400 uppercase">{m.mode}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Profile Dropdown Menu */
function ProfileMenu({ open, onClose, me, logout }) {
  const nav = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div ref={ref} className="absolute right-4 top-16 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
      <div className="border-b border-slate-100 pb-3">
        <p className="text-xs font-bold text-slate-900">{me?.name || 'Eqosy Admin'}</p>
        <p className="text-[11px] text-slate-400 font-mono">{me?.email || 'admin@astro.com'}</p>
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-50 p-2 text-[10px] font-semibold text-emerald-800">
          <KeyRound size={12} className="shrink-0" /> Login: {me?.email || 'admin@astro.com'} / Admin@123
        </div>
      </div>
      <div className="mt-2 space-y-1">
        <button
          onClick={() => {
            onClose();
            nav('/admin/global/platform');
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Power size={14} /> System Settings
        </button>
        <button
          onClick={() => {
            onClose();
            nav('/admin/global/landing/policies');
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Shield size={14} /> Terms & Policies
        </button>
        <button
          onClick={() => {
            logout();
            nav('/admin/login');
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"
        >
          <LogOut size={14} /> Logout
        </button>
      </div>
    </div>
  );
}

function Layout() {
  const { me, loading, logout } = adminAuth.useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('admin_sidebar')) === true;
    } catch {
      return false;
    }
  });

  const [menuSearch, setMenuSearch] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pendingData, setPendingData] = useState(null);
  const [expanded, setExpanded] = useState({});

  const toggleAccordion = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    try {
      localStorage.setItem('admin_sidebar', JSON.stringify(collapsed));
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => setOpen(false), [pathname]);

  // Load pending tasks for bell badge and dropdown (in-flight deduped)
  const pendingInFlight = useRef(null);
  const loadPending = () => {
    if (!me?._id) return Promise.resolve(null);
    if (pendingInFlight.current) return pendingInFlight.current;
    const p = api.admin.get('/admin/pending-tasks')
      .then((data) => { setPendingData(data); return data; })
      .catch(() => null)
      .finally(() => { if (pendingInFlight.current === p) pendingInFlight.current = null; });
    pendingInFlight.current = p;
    return p;
  };

  // Live alerts + pending-tasks sync: load once on login, stay synced via socket, only poll if socket disconnects.
  const toast = useToast();
  useEffect(() => {
    if (!me?._id) return undefined;
    loadPending();
    const s = connectSocket('admin');
    let hadConnect = false;
    s.on('connect', () => {
      if (hadConnect) loadPending();
      hadConnect = true;
    });
    s.on('pending:refresh', loadPending);
    s.on('support:update', (e) => {
      loadPending();
      if (e?.kind === 'approval') { playAlert('info', 'approval'); toast('New astrologer application', 'info'); return; }
      if (e?.kind === 'withdrawal') { playAlert('info', 'withdrawal'); toast('New payout request', 'info'); return; }
      if (!e?.id) return;
      playAlert('chat', `ticket-${e.id}`);
      toast(`${e.app === 'astrologer' ? 'Astrologer' : 'Customer'} support: ${e.text || 'new message'}`, 'info');
    });
    // Chat / call started, wallet recharge: 3-second ring (same tag as the push, so it rings once).
    s.on('admin:alert', (e) => { playAlert('request', e?.tag); toast(e?.body || e?.title || 'New activity', 'info'); });
    const timer = setInterval(() => {
      if (!document.hidden && !s.connected) loadPending();
    }, 30000);
    const onVis = () => {
      if (document.visibilityState === 'visible' && !s.connected) loadPending();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      s.close();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [me?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) return <AdminShellSkeleton />;
  if (!me) return <Navigate to="/admin/login" replace />;

  const mode = modeOf(pathname);
  const current = ALL_ITEMS.filter((m) => pathname.startsWith(m.to)).sort((a, b) => b.to.length - a.to.length)[0];
  const title = current?.label || (pathname.includes('/users/') ? 'User profile' : pathname.includes('/astro/') ? 'Astrologer profile' : 'Admin Panel');

  const pendingCount = pendingData?.counts?.total ?? 0;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      <PushListener role="admin" />
      {/* Mobile Backdrop */}
      {open && <div className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Dark Sidebar in Eqosy Style */}
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-neutral-950 text-neutral-200 transition-all border-r border-neutral-800/60 lg:static',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          collapsed ? 'w-64 lg:w-[4.8rem]' : 'w-[300px] lg:w-[300px]'
        )}
      >
        {/* Brand Top */}
        <div className="flex h-16 items-center justify-between border-b border-neutral-800/60 bg-neutral-900 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-amber-300 p-0.5 shadow-md">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-neutral-900">
                <img src="/favicon.svg" alt="" className="h-5 w-5" />
              </div>
            </div>
            {!collapsed && (
              <div>
                <span className="font-display text-[15px] font-bold tracking-tight text-white">AstroVani</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">Admin panel</span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="hidden lg:flex text-slate-500 hover:text-white"
              title="Collapse"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Eqosy Mode Switcher Pills: Separate pill buttons with distinct spacing between them */}
        {!collapsed && (
          <div className="mx-3 mt-3 flex items-center gap-1 rounded-xl border border-white/5 bg-neutral-800/40 p-1">
            {MODES.map((m) => {
              const active = m.id === mode.id;
              return (
                <button
                  key={m.id}
                  onClick={() => nav(m.home)}
                  className={cx(
                    'flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-[12.5px] font-semibold transition whitespace-nowrap',
                    active
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                  )}
                  title={m.label}
                >
                  <m.icon size={14} className={active ? 'text-neutral-900' : 'text-neutral-500'} />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Search Menu input */}
        {!collapsed && (
          <div className="px-3 pt-3">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                placeholder="Search Menu..."
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 pl-9 pr-3 text-sm text-neutral-200 placeholder-neutral-500 outline-none focus:border-neutral-600"
              />
              {menuSearch && (
                <button
                  onClick={() => setMenuSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sidebar Nav Items in Eqosy Accordion Style */}
        <nav className="admin-scroll flex-1 overflow-y-auto px-3 py-3">
          {mode.sections.map((s) => {
            const filteredItems = menuSearch
              ? s.items.filter((i) => {
                const matchParent = i.label.toLowerCase().includes(menuSearch.toLowerCase());
                const matchChild = i.children?.some((c) => c.label.toLowerCase().includes(menuSearch.toLowerCase()));
                return matchParent || matchChild;
              })
              : s.items;
            if (filteredItems.length === 0) return null;

            return (
              <div key={s.title} className="mt-4 border-t border-neutral-800/60 pt-4 first:mt-0 first:border-t-0 first:pt-1">
                {!collapsed && (
                  <p className="mb-2 px-3 text-[12px] font-bold uppercase tracking-wider text-neutral-400">
                    {s.title}
                  </p>
                )}
                <div className="space-y-1">
                  {filteredItems.map((item) => {
                    const Icon = item.icon;

                    // If item has expandable children (like Foods >, Categories > in Eqosy)
                    if (item.children) {
                      const hasActiveChild = item.children.some(
                        (c) => pathname === c.to || pathname.startsWith(c.to + '/')
                      );
                      const isExpanded = expanded[item.id] !== undefined ? expanded[item.id] : (hasActiveChild || !!menuSearch);
                      const badgeVal = item.badgeKey ? pendingData?.counts?.[item.badgeKey] : null;

                      return (
                        <div key={item.id} className="space-y-1">
                          <button
                            onClick={() => toggleAccordion(item.id)}
                            className={cx(
                              'group flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-[14.5px] font-semibold transition',
                              hasActiveChild
                                ? 'border-white/10 bg-white/[.06] text-white'
                                : 'border-transparent text-neutral-200 hover:bg-white/5 hover:text-white',
                              collapsed && 'lg:justify-center'
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Icon size={18} className="shrink-0 text-neutral-300 group-hover:text-white" />
                              {!collapsed && <span className="truncate">{item.label}</span>}
                            </div>
                            {!collapsed && (
                              <div className="flex items-center gap-1.5">
                                {badgeVal > 0 && (
                                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white shadow-xs">
                                    {badgeVal}
                                  </span>
                                )}
                                <ChevronRight
                                  size={14}
                                  className={cx(
                                    'text-slate-400 transition-transform duration-200',
                                    isExpanded && 'rotate-90 text-white'
                                  )}
                                />
                              </div>
                            )}
                          </button>

                          {!collapsed && isExpanded && (
                            <div className="ml-5 space-y-0.5 border-l border-neutral-800 py-1 pl-3">
                              {item.children.map((child) => {
                                const childBadge = child.badgeKey ? pendingData?.counts?.[child.badgeKey] : null;
                                return (
                                  <NavLink
                                    key={child.to}
                                    to={child.to}
                                    className={({ isActive }) =>
                                      cx(
                                        'group/sub flex items-center justify-between rounded-md px-3 py-2 text-[13.5px] font-normal transition',
                                        isActive
                                          ? 'bg-white/10 text-white font-semibold'
                                          : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                                      )
                                    }
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-500 group-hover/sub:bg-neutral-300" />
                                      <span className="truncate">{child.label}</span>
                                    </div>
                                    {childBadge > 0 && (
                                      <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
                                        {childBadge}
                                      </span>
                                    )}
                                  </NavLink>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Single direct item (like Food Approval in Eqosy!)
                    const badgeVal = item.badgeKey ? pendingData?.counts?.[item.badgeKey] : null;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        title={item.label}
                        className={({ isActive }) =>
                          cx(
                            'group flex items-center justify-between rounded-lg border px-3 py-2.5 text-[14.5px] font-semibold transition',
                            isActive
                              ? 'border-white/15 bg-white/10 text-white'
                              : 'border-transparent text-neutral-200 hover:bg-white/5 hover:text-white',
                            collapsed && 'lg:justify-center'
                          )
                        }
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon size={18} className="shrink-0 text-neutral-300 group-hover:text-white" />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </div>
                        {!collapsed && badgeVal > 0 && (
                          <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white shadow-xs">
                            {badgeVal}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-neutral-800/60 p-3 space-y-1">
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="flex w-full items-center justify-center rounded-lg p-2 text-neutral-400 hover:bg-white/5 hover:text-white"
              title="Expand menu"
            >
              <ChevronRight size={18} />
            </button>
          )}
          <button
            onClick={() => {
              logout();
              nav('/admin/login');
            }}
            className={cx(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-semibold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition',
              collapsed && 'lg:justify-center'
            )}
            title="Sign out"
          >
            <LogOut size={16} />
            {!collapsed && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Navbar in Eqosy Style */}
        <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-slate-200/90 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Menu"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{mode.label}</span>
              <h2 className="text-[17px] font-bold text-slate-900 leading-tight">{title}</h2>
            </div>
          </div>

          {/* Center Search Bar: Search Ctrl+K */}
          <div className="flex-1 max-w-md mx-4">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex w-full items-center justify-between rounded-full border border-slate-200 bg-slate-50/80 px-4 py-2 text-xs text-slate-400 shadow-xs hover:border-slate-300 hover:bg-white transition"
            >
              <div className="flex items-center gap-2">
                <Search size={14} className="text-slate-400" />
                <span>Search</span>
              </div>
              <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500 shadow-2xs">
                Ctrl+K
              </span>
            </button>
          </div>

          {/* Right Controls: Language, Notification Bell, Admin Profile */}
          <div className="flex items-center gap-3">
            {/* Language Selector Pill */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs">
              <Globe2 size={13} className="text-slate-400" />
              <span>English</span>
            </div>

            {/* Notification Bell with Badge */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-xs hover:bg-slate-50 transition"
                aria-label="Pending notifications"
              >
                <Bell size={17} />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </button>

              {/* Floating Notifications Popover */}
              <NotificationsPanel
                open={notifOpen}
                onClose={() => setNotifOpen(false)}
                pendingData={pendingData}
                reloadPending={loadPending}
              />
            </div>

            {/* Admin Profile Chip */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white p-1 pr-3.5 text-left shadow-xs hover:border-slate-300 transition"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white shadow-xs">
                  {me.name?.[0] || 'A'}
                </span>
                <div className="hidden text-left md:flex flex-col justify-center">
                  <p className="text-xs font-bold text-slate-800 leading-none">Eqosy Admin</p>
                  <p className="mt-1 text-[10.5px] text-slate-400 font-mono leading-none">admin@astro.com</p>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {/* Profile Dropdown */}
              <ProfileMenu
                open={profileOpen}
                onClose={() => setProfileOpen(false)}
                me={me}
                logout={logout}
              />
            </div>
          </div>
        </header>

        {/* Main Content View */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-[#f8fafc]">
          <Suspense fallback={<PageLoader variant={pathname.includes('/view/') ? 'detail' : pathname.includes('/support') ? 'split' : /\/(dashboard|overview|analytics|cancellations)/.test(pathname) ? 'dashboard' : /\/(pricing\/(recharge|payouts|payments)|platform|policies|theme|landing|announcement|astro-app|app\/(login|signup|layout|promo|branding))/.test(pathname) ? 'form' : 'table'} />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Global Quick Search (Ctrl+K) */}
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

export default function AdminApp() {
  return (
    <ToastProvider>
      <adminAuth.Provider>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/admin/astro/approvals" replace />} />

            {/* Astrologers Section */}
            <Route path="astro/approvals" element={<AstroApprovals />} />
            <Route path="astro/dashboard" element={<AstroDashboard />} />
            <Route path="astro/list/:status" element={<AstroList />} />
            <Route path="astro/online" element={<AstroList online />} />
            <Route path="astro/view/:id" element={<AstroDetail />} />
            <Route path="astro/reviews" element={<AstroReviews />} />
            <Route path="astro/chats" element={<Sessions scope="astro" />} />
            <Route path="astro/rewards" element={<Rewards />} />
            <Route path="astro/payouts" element={<Payouts />} />
            <Route path="astro/commission" element={<Commission />} />
            <Route path="astro/live" element={<Sessions key="live" scope="astro" live />} />
            <Route path="astro/pricing" element={<Navigate to="/admin/astro/pricing/rates" replace />} />
            <Route path="astro/pricing/rates" element={<PriceManagement section="astro-rates" />} />
            <Route path="astro/pricing/rules" element={<PriceManagement section="services" />} />
            <Route path="astro/pricing/payouts" element={<PriceManagement section="payouts" />} />
            <Route path="astro/plans" element={<SubscriptionPlans key="astro" audience="astrologer" />} />
            <Route path="astro/app/:tab" element={<AstroAppSettings />} />
            <Route path="astro/announcement/:target" element={<Announcement />} />
            <Route path="astro/policies" element={<PoliciesManager />} />
            <Route path="astro/notifications" element={<NotificationManager key="astro" defaultTarget="astrologer" />} />

            {/* Users Section */}
            <Route path="users/dashboard" element={<UsersDashboard />} />
            <Route path="users/list" element={<UserList />} />
            <Route path="users/view/:id" element={<UserDetail />} />
            <Route path="users/chats" element={<Sessions scope="users" />} />
            <Route path="users/payments" element={<Payments />} />
            <Route path="users/pricing" element={<Navigate to="/admin/users/pricing/recharge" replace />} />
            <Route path="users/pricing/recharge" element={<PriceManagement section="customer" />} />
            <Route path="users/pricing/charges" element={<PriceManagement section="services" />} />
            <Route path="users/pricing/payments" element={<PriceManagement section="payments" />} />
            <Route path="users/plans" element={<SubscriptionPlans key="users" audience="user" />} />
            <Route path="users/orders" element={<Orders />} />
            <Route path="users/app/:tab" element={<AppManagement />} />
            <Route path="users/theme" element={<Theme />} />
            <Route path="users/announcement/:target" element={<Announcement />} />
            <Route path="users/policies" element={<PoliciesManager />} />
            <Route path="users/notifications" element={<NotificationManager key="users" defaultTarget="user" />} />
            <Route path="users/cancellations" element={<Cancellations />} />
            <Route path="users/analytics" element={<Reports />} />
            <Route path="users/support" element={<Support key="user" app="user" />} />
            <Route path="astro/support" element={<Support key="astro" app="astrologer" />} />

            {/* Global Settings & Legal Section */}
            <Route path="global/overview" element={<Dashboard />} />
            {/* Terms / Privacy / Refund are website pages (/terms, /privacy, /refund): managed under Landing Page */}
            <Route path="global/landing/policies" element={<PoliciesManager />} />
            <Route path="global/policies" element={<Navigate to="/admin/global/landing/policies" replace />} />
            <Route path="global/notifications" element={<NotificationManager key="global" />} />
            <Route path="global/app" element={<Navigate to="/admin/global/app/login" replace />} />
            <Route path="global/app/:tab" element={<AppManagement />} />
            <Route path="global/astro-app" element={<Navigate to="/admin/global/astro-app/signup" replace />} />
            <Route path="global/astro-app/:tab" element={<AstroAppSettings />} />
            <Route path="global/theme" element={<Theme />} />
            <Route path="global/landing" element={<Navigate to="/admin/global/landing/brand" replace />} />
            <Route path="global/landing/:tab" element={<LandingEditor />} />
            <Route path="global/content" element={<Content />} />
            <Route path="global/platform" element={<PlatformSettings />} />
            <Route path="global/transactions" element={<Transactions />} />
            <Route path="global/pricing/*" element={<Navigate to="/admin/users/pricing/recharge" replace />} />
            <Route path="global/announcement/:target" element={<Announcement />} />
            <Route path="global/plans" element={<Navigate to="/admin/users/plans" replace />} />

            {/* Aliases & Old Links */}
            <Route path="astrologers" element={<Navigate to="/admin/astro/approvals" replace />} />
            <Route path="policies" element={<Navigate to="/admin/global/landing/policies" replace />} />
            <Route path="notifications" element={<Navigate to="/admin/global/notifications" replace />} />
            <Route path="settings/app" element={<Navigate to="/admin/global/app" replace />} />
            <Route path="settings/platform" element={<Navigate to="/admin/global/platform" replace />} />
            <Route path="users" element={<Navigate to="/admin/users/list" replace />} />
            <Route path="*" element={<Navigate to="/admin/astro/approvals" replace />} />
          </Route>
        </Routes>
      </adminAuth.Provider>
    </ToastProvider>
  );
}
