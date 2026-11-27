import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, MessagesSquare, Moon, Radio, ShieldCheck, Sparkles, Sun, Sunset, Users } from 'lucide-react';
import { api, authApi } from '../../lib/api.js';
import { adminAuth } from '../../lib/auth.jsx';
import { PageLoader, cx, useToast } from '../../shared/ui.jsx';

const SLIDES = [
  {
    imageUrl: '/store/yearly-horoscope.jpg',
    tag: 'Celestial Precision',
    title: 'Command the cosmos, with clarity.',
    subtitle: 'Oversee live consultations, astrologer onboarding, pricing rules, and platform health in one place.',
  },
  {
    imageUrl: '/store/navagraha-puja.jpg',
    tag: 'Sacred Network',
    title: 'Empower trusted Vedic experts.',
    subtitle: 'Approve verified Acharyas, monitor real-time sessions, and manage payouts transparently.',
  },
  {
    imageUrl: '/store/deep-daan.jpg',
    tag: 'Illuminated Operations',
    title: 'Every seeker guided, every detail tracked.',
    subtitle: 'Configure store remedies, horoscopes, customer experience, and live announcements instantly.',
  },
  {
    imageUrl: '/signup/tob.jpg',
    tag: '24×7 Nakshatra Watch',
    title: 'Real-time insight across every session.',
    subtitle: 'Track revenue, active chats, support queries, and platform uptime around the clock.',
  },
  {
    imageUrl: '/store/lakshmi-puja.jpg',
    tag: 'Abundance & Growth',
    title: 'Built for seamless scale.',
    subtitle: 'Fine-tune per-minute, pack, and subscription pricing with live previews across all apps.',
  },
  {
    imageUrl: '/store/gemstone-report.jpg',
    tag: 'Curated Quality',
    title: 'Authentic remedies & reports.',
    subtitle: 'Manage AstroVani store offerings, COD orders, and verified consultation reviews.',
  },
];

function getTimeContext(date) {
  const h = date.getHours();
  if (h >= 5 && h < 12) {
    return {
      greeting: 'Good morning',
      phase: 'Morning Muhurta',
      Icon: Sun,
      accent: 'from-slate-950/80 via-slate-950/30 to-slate-950/95',
      startSlide: 1,
    };
  }
  if (h >= 12 && h < 17) {
    return {
      greeting: 'Good afternoon',
      phase: 'Midday Command',
      Icon: Sun,
      accent: 'from-slate-950/80 via-slate-950/35 to-slate-950/95',
      startSlide: 0,
    };
  }
  if (h >= 17 && h < 21) {
    return {
      greeting: 'Good evening',
      phase: 'Sandhya Hour',
      Icon: Sunset,
      accent: 'from-slate-950/80 via-rose-950/45 to-slate-950/95',
      startSlide: 2,
    };
  }
  return {
    greeting: 'Good evening',
    phase: 'Nakshatra Night Watch',
    Icon: Moon,
    accent: 'from-slate-950/80 via-indigo-950/45 to-slate-950/95',
    startSlide: 3,
  };
}

export default function Login() {
  const { me, loading, login } = adminAuth.useAuth();
  const nav = useNavigate();
  const toast = useToast();

  const [now, setNow] = useState(() => new Date());
  const timeCtx = getTimeContext(now);
  const [cur, setCur] = useState(() => getTimeContext(new Date()).startSlide);
  const [showPw, setShowPw] = useState(false);
  const [f, setF] = useState({ email: '', password: '' });
  const [fieldErr, setFieldErr] = useState({ email: '', password: '' });
  const [authErr, setAuthErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState({ brand: null, stats: null });

  // Update clock/day-phase every minute and auto-rotate background showcase images every 4.5s.
  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 60_000);
    const slider = setInterval(() => {
      if (!document.hidden) setCur((c) => (c + 1) % SLIDES.length);
    }, 4500);
    return () => {
      clearInterval(clock);
      clearInterval(slider);
    };
  }, []);

  useEffect(() => {
    Promise.all([
      api.public.get('/public/status').catch(() => null),
      api.public.get('/public/stats').catch(() => null),
    ]).then(([status, stats]) => setMeta({ brand: status?.brand || null, stats }));
  }, []);

  if (loading) return <PageLoader variant="auth" />;
  if (me) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    const email = f.email.trim();
    const nextErr = {
      email: !email ? 'Admin email is required' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Enter a valid email address' : '',
      password: !f.password ? 'Password is required' : '',
    };
    setFieldErr(nextErr);
    setAuthErr('');
    if (nextErr.email || nextErr.password) return;

    setBusy(true);
    try {
      const r = await authApi.post('/auth/admin/login', { email, password: f.password });
      login(r.token, r.admin);
      nav('/admin', { replace: true });
    } catch (err) {
      const msg = err.status === 401 ? 'Incorrect email or password. Please check and try again.' : (err.message || 'Sign in failed');
      setAuthErr(msg);
      toast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const slide = SLIDES[cur] || SLIDES[0];
  const brandName = meta.brand?.name || 'AstroVani';
  const logoUrl = meta.brand?.logoUrl || '/favicon.svg';
  const TimeIcon = timeCtx.Icon;
  const formattedTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-[100dvh] bg-slate-950 lg:grid lg:grid-cols-[1.15fr_1fr]">
      {/* Left: Dynamic Time-of-Day & Auto-Changing Visual Showcase */}
      <div className="relative h-[44vh] min-h-[310px] overflow-hidden bg-slate-950 lg:sticky lg:top-0 lg:h-[100dvh]">
        {SLIDES.map((s, i) => (
          <img
            key={s.imageUrl}
            src={s.imageUrl}
            alt=""
            className={cx(
              'absolute inset-0 h-full w-full object-cover transition-all duration-[1400ms] ease-out',
              i === cur ? 'scale-105 opacity-100' : 'scale-100 opacity-0',
            )}
          />
        ))}
        {/* Atmospheric gradient & subtle starlight overlay */}
        <div className={cx('absolute inset-0 bg-gradient-to-b', timeCtx.accent)} />
        <div className="lp-stars pointer-events-none absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10 opacity-40" />
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full border border-amber-300/15 opacity-50" />

        {/* Top Bar: Brand + Live Day-Phase Pill */}
        <div className="relative z-10 flex items-center justify-between p-5 lg:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 p-1.5 ring-1 ring-white/20 backdrop-blur-md">
              <img src={logoUrl} alt={brandName} className="h-full w-full rounded-lg object-contain" />
            </div>
            <div className="text-white">
              <p className="flex items-center gap-2 text-lg font-bold leading-tight tracking-tight">
                {brandName}
                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30">
                  Admin
                </span>
              </p>
              <p className="text-xs text-white/70">Platform Control Center</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full bg-black/35 px-3.5 py-1.5 text-xs font-medium text-white/90 ring-1 ring-white/15 backdrop-blur-md sm:flex">
            <TimeIcon size={14} className="text-amber-300" />
            <span>{timeCtx.phase}</span>
            <span className="text-white/40">•</span>
            <span className="font-mono text-[11px] text-amber-200">{formattedTime}</span>
          </div>
        </div>

        {/* Bottom Editorial Caption + Live Stats + Slide Dots */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-5 pb-10 text-white lg:p-8">
          <div key={cur} className="animate-fade-up max-w-lg">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-200 ring-1 ring-white/20 backdrop-blur-md">
              <Sparkles size={12} /> {slide.tag}
            </span>
            <h2 className="mt-2.5 text-2xl font-bold leading-snug tracking-tight drop-shadow sm:text-3xl">
              {slide.title}
            </h2>
            <p className="mt-1.5 hidden text-sm leading-relaxed text-white/85 sm:block">
              {slide.subtitle}
            </p>
          </div>

          {/* Live platform snapshot (when loaded) */}
          {meta.stats && (
            <div className="mt-5 hidden max-w-md grid-cols-3 gap-2.5 sm:grid">
              <div className="rounded-2xl border border-white/10 bg-black/35 px-3.5 py-2.5 backdrop-blur-md">
                <p className="flex items-center gap-1.5 text-[11px] text-white/65"><Users size={12} className="text-amber-300" /> Astrologers</p>
                <p className="mt-0.5 text-base font-bold">{meta.stats.astrologers ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/35 px-3.5 py-2.5 backdrop-blur-md">
                <p className="flex items-center gap-1.5 text-[11px] text-white/65"><Radio size={12} className="text-emerald-400" /> Online now</p>
                <p className="mt-0.5 text-base font-bold text-emerald-300">{meta.stats.online ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/35 px-3.5 py-2.5 backdrop-blur-md">
                <p className="flex items-center gap-1.5 text-[11px] text-white/65"><MessagesSquare size={12} className="text-sky-300" /> Sessions</p>
                <p className="mt-0.5 text-base font-bold">{meta.stats.consultations ?? 0}</p>
              </div>
            </div>
          )}

          {/* Slideshow indicators */}
          <div className="mt-5 flex items-center gap-1.5">
            {SLIDES.map((s, i) => (
              <button
                key={s.imageUrl}
                type="button"
                onClick={() => setCur(i)}
                aria-label={`View slide ${i + 1}: ${s.tag}`}
                className={cx(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === cur ? 'w-7 bg-amber-300' : 'w-2 bg-white/40 hover:bg-white/70',
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right: Crisp Executive Sign-In Surface */}
      <div className="relative z-20 -mt-7 flex flex-1 flex-col justify-between rounded-t-[28px] bg-[#FCF9F6] px-6 pb-8 pt-8 shadow-2xl lg:mt-0 lg:min-h-[100dvh] lg:rounded-none lg:px-12 lg:py-10">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-[11px] font-bold text-brand-700">
            <TimeIcon size={13} /> {timeCtx.greeting}, Admin
          </div>

          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">
            Sign in to {brandName}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Astrology consultations, orders, pricing &amp; platform controls.
          </p>

          {/* Form */}
          <form onSubmit={submit} noValidate className="mt-7 space-y-4">
            {authErr && (
              <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs font-semibold text-rose-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
                <span>{authErr}</span>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Admin Email</label>
              <div className="relative">
                <Mail size={16} className={cx('pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2', fieldErr.email || authErr ? 'text-rose-400' : 'text-slate-400')} />
                <input
                  type="email"
                  autoFocus
                  autoComplete="email"
                  value={f.email}
                  onChange={(e) => { setF({ ...f, email: e.target.value }); if (fieldErr.email) setFieldErr((p) => ({ ...p, email: '' })); if (authErr) setAuthErr(''); }}
                  placeholder="admin@astro.com"
                  className={cx(
                    'w-full rounded-xl border bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-900 shadow-2xs outline-none transition placeholder:text-slate-400',
                    fieldErr.email || authErr ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-100' : 'border-slate-200 focus:border-brand-600 focus:ring-4 focus:ring-brand-100',
                  )}
                />
              </div>
              {fieldErr.email && <p className="mt-1.5 text-xs font-semibold text-rose-600">{fieldErr.email}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Password</label>
              <div className="relative">
                <Lock size={16} className={cx('pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2', fieldErr.password || authErr ? 'text-rose-400' : 'text-slate-400')} />
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={f.password}
                  onChange={(e) => { setF({ ...f, password: e.target.value }); if (fieldErr.password) setFieldErr((p) => ({ ...p, password: '' })); if (authErr) setAuthErr(''); }}
                  placeholder="Enter your password"
                  className={cx(
                    'w-full rounded-xl border bg-white py-3 pl-10 pr-12 text-sm font-medium text-slate-900 shadow-2xs outline-none transition placeholder:text-slate-400 [&::-ms-clear]:hidden [&::-ms-reveal]:hidden',
                    fieldErr.password || authErr ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-100' : 'border-slate-200 focus:border-brand-600 focus:ring-4 focus:ring-brand-100',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  title={showPw ? 'Hide password' : 'Show password'}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  aria-pressed={showPw}
                  className={cx(
                    'absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition',
                    showPw ? 'bg-brand-50 text-brand-700 hover:bg-brand-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
                  )}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErr.password && <p className="mt-1.5 text-xs font-semibold text-rose-600">{fieldErr.password}</p>}
            </div>

            <button
              type="submit"
              disabled={busy}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#B9542C] to-[#9A4423] text-sm font-bold text-white shadow-lg shadow-[#B9542C]/25 transition hover:brightness-110 active:scale-[.99] disabled:opacity-60"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={17} /> Sign In to Admin Panel</>}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-[11px] text-slate-400">
          {brandName} Astrology Platform &copy; {now.getFullYear()} · Secure Admin Portal
        </p>
      </div>
    </div>
  );
}
