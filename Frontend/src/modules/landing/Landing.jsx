import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone, Menu, X, ArrowRight, BadgeCheck, ShieldCheck, Mail, ChevronDown, Star, Sparkles,
  MessageCircle, Orbit, Smartphone, FileCheck2, Zap, Clock, IndianRupee
} from 'lucide-react';
import { FaFacebookF, FaInstagram, FaWhatsapp, FaXTwitter, FaYoutube } from 'react-icons/fa6';
import AstroIcon from '../../shared/AstroIcon.jsx';
import Hero, { AppleIcon, GooglePlayIcon } from './Hero.jsx';
import { api, inr } from '../../lib/api.js';
import { FALLBACK_PUBLIC_APP, isValidPublicApp, readCachedApp, writeCachedApp } from '../../lib/publicApp.js';
import { usePlatformLive } from '../../lib/live.js';
import AnnouncementBar from '../../shared/AnnouncementBar.jsx';
import Maintenance from '../../shared/Maintenance.jsx';
import { LandingSkeleton } from '../../shared/Skeleton.jsx';
import { cx } from '../../shared/ui.jsx';


const isExt = (u) => !!u && u !== '#' && !u.startsWith('/');
const ext = (u) => (isExt(u) ? { target: '_blank', rel: 'noreferrer' } : {});

/* ---------------------------------------------------------------- bits */

function PlayBadge({ href, label = 'Google Play', className }) {
  return (
    <a href={href} {...ext(href)}
      className={cx('inline-flex items-center gap-3 rounded-2xl bg-lp-espresso px-4 py-2.5 text-white transition hover:-translate-y-0.5 hover:bg-black', className)}>
      <GooglePlayIcon className="h-5 w-5 shrink-0" />
      <span className="text-left leading-tight">
        <span className="block text-[10px] font-medium uppercase tracking-wider text-white/60">Get it on</span>
        <span className="block text-[14px] font-semibold">{label}</span>
      </span>
    </a>
  );
}

function AppStoreBadge({ href, className }) {
  return (
    <a href={href} {...ext(href)}
      className={cx('inline-flex items-center gap-3 rounded-2xl bg-lp-espresso px-4 py-2.5 text-white transition hover:-translate-y-0.5 hover:bg-black', className)}>
      <AppleIcon className="h-6 w-6 shrink-0" />
      <span className="text-left leading-tight">
        <span className="block text-[10px] font-medium uppercase tracking-wider text-white/60">Download on the</span>
        <span className="block text-[14px] font-semibold">App Store</span>
      </span>
    </a>
  );
}

const SOCIAL_LABEL = { instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', twitter: 'X (Twitter)', whatsapp: 'WhatsApp' };
const SOCIAL_ICONS = { instagram: FaInstagram, facebook: FaFacebookF, youtube: FaYoutube, twitter: FaXTwitter, whatsapp: FaWhatsapp };
function SocialIcon({ k }) {
  const I = SOCIAL_ICONS[k] || MessageCircle;
  return <I size={17} aria-hidden="true" />;
}

const BTN = 'group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[14.5px] font-semibold transition duration-200 hover:-translate-y-0.5';
const btnStyles = {
  accent: 'bg-lp-accent text-white shadow-[0_8px_20px_-8px_var(--lpa)] hover:bg-lp-accent-dk',
  white: 'bg-white text-lp-brand shadow-[0_10px_24px_-10px_rgba(0,0,0,.5)] hover:bg-lp-soft2',
  outline: 'border border-lp-line2 bg-white text-lp-t1 hover:border-lp-accent hover:text-lp-accent',
  glass: 'border border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20',
};
function Btn({ href, v = 'accent', children, className }) {
  return <a href={href} {...ext(href)} className={cx(BTN, btnStyles[v], className)}>{children}</a>;
}

function SectionHead({ tag, title, text, center = true, light, className }) {
  return (
    <div className={cx('max-w-2xl', center && 'mx-auto text-center', className)}>
      <span className={cx('inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[12.5px] font-semibold', light ? 'bg-white/10 text-lp-peach' : 'bg-lp-soft text-lp-accent')}>
        <Sparkles size={13} />{tag}
      </span>
      <h2 className={cx('mt-3 text-[1.7rem] font-bold leading-tight tracking-tight sm:text-[2.1rem]', light ? 'text-white' : 'text-lp-t1')}>{title}</h2>
      {text && <p className={cx('mt-3 text-[15.5px] leading-relaxed', light ? 'text-white/70' : 'text-lp-t2')}>{text}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- page */

export default function Landing() {
  const [open, setOpen] = useState(false);
  const [faq, setFaq] = useState(0);
  const [stats, setStats] = useState(null);
  const [allAstros, setAllAstros] = useState([]);
  const [app, setApp] = useState(() => readCachedApp());
  const [scrolled, setScrolled] = useState(false);

  // Admin live preview: /?preview=1 inside the Landing Editor iframe receives the unsaved config.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('preview') !== '1' || window.parent === window) return undefined;
    const onMsg = (e) => {
      if (e.origin !== window.location.origin || e.data?.type !== 'landing-preview' || !e.data.config) return;
      setApp((a) => ({ ...(a || {}), config: e.data.config, preview: true }));
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: 'landing-preview-ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setApp((cur) => cur || FALLBACK_PUBLIC_APP);
    }, 2500);
    api.public.get('/public/app').then((a) => {
      if (!isValidPublicApp(a)) throw new Error('Invalid app config');
      writeCachedApp(a);
      setApp((cur) => (cur?.preview ? cur : a));
    }).catch(() => {
      setApp((cur) => cur || FALLBACK_PUBLIC_APP);
    }).finally(() => clearTimeout(fallbackTimer));
    api.public.get('/public/stats').then(setStats).catch(() => { });
    api.public.get('/public/astrologers', { sort: 'rating' }).then(setAllAstros).catch(() => { });
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { clearTimeout(fallbackTimer); window.removeEventListener('scroll', onScroll); };
  }, []);

  // Admin saves (theme, texts, announcement, on/off) show up here without a refresh.
  usePlatformLive((what) => {
    if (what === 'astrologers') return;
    api.public.get('/public/app').then((a) => {
      if (!isValidPublicApp(a)) return;
      writeCachedApp(a);
      setApp((cur) => (cur?.preview ? cur : a));
    }).catch(() => { });
  });

  const L = app?.config?.landing;
  const brand = app?.config?.brand || { name: 'AstroVani' };
  const sec = L?.sections || {};
  const t = app?.config?.theme;
  // Admin theme (Global > Theme) drives the landing colours, same as the user app.
  const themeVars = t ? { '--lpa': t.accent, '--lpb': t.brand, '--lpbg': t.background } : undefined;

  // No Play Store link yet? Fall back to the web apps so no button is dead.
  const userUrl = L?.footer?.customerPlayStoreUrl || '/user';
  const vendorUrl = L?.cta?.playStoreUrl || L?.footer?.vendorPlayStoreUrl || '/vendor/login';

  const links = [
    ['Services', '#features', sec.features],
    ['How it works', '#how', sec.how],
    ['Earn with us', '#earn', sec.cta],
    ['FAQ', '#faq', sec.faq]
  ].filter((x) => x[2] !== false);
  const allLinks = links;
  const appStoreUrl = L?.footer?.customerAppStoreUrl || userUrl;

  if (app && !app.preview && app.system?.website?.enabled === false) return <Maintenance info={app.system.website} brand={brand.name} />;
  if (!L) return <LandingSkeleton themeVars={themeVars} />;
  const logo = brand.logoUrl || '/favicon.svg';
  // Admin can give any section its own background colour; '' keeps the design default.
  const bgOf = (k) => (L.colors?.[k] ? { background: L.colors[k] } : undefined);
  const socials = Object.entries(L.footer?.socials || {}).filter(([, url]) => url);
  // Stats tiles: live numbers from the database (astrologer count is already in the hero chips).
  // When a number does not exist yet, a true fact takes its place.
  const minPrice = allAstros.length ? Math.min(...allAstros.map((a) => a.pricePerMin || Infinity)) : Infinity;
  const statItems = [
    stats?.reviews > 0 && stats?.rating
      ? { v: <>{stats.rating}<Star size={20} className="text-amber-400" fill="currentColor" strokeWidth={0} /></>, l: `From ${stats.reviews.toLocaleString('en-IN')} reviews`, I: Star }
      : Number.isFinite(minPrice) && { v: <>{inr(minPrice)}<span className="text-[14px] font-medium text-lp-t3">/min</span></>, l: 'Starting price', I: IndianRupee },
    stats?.consultations > 0
      ? { v: stats.consultations.toLocaleString('en-IN'), l: 'Consultations done', I: MessageCircle }
      : { v: 'Free', l: 'Kundli & matching', I: Orbit },
    stats?.online > 0 ? { v: stats.online, l: 'Astrologers online now', live: true, I: Zap } : { v: '24×7', l: 'Always available', I: Clock }
  ].filter(Boolean);

  return (
    <div className="min-h-screen overflow-x-hidden bg-lp-bg font-sans text-lp-t1 antialiased selection:bg-lp-accent selection:text-white" style={themeVars}>

      {/* ================= NAVBAR ================= */}
      <header className={cx('fixed inset-x-0 top-0 z-50 transition-all duration-300', scrolled || open ? 'border-b border-lp-line bg-white/90 shadow-[0_6px_24px_-16px_rgba(122,54,32,.4)] backdrop-blur-xl' : 'bg-transparent')}>
        <AnnouncementBar cfg={app?.config?.announcement?.website} storageKey="ann-web" preview={!!app?.preview} />
        <nav className={cx('mx-auto flex max-w-7xl items-center justify-between px-4 transition-all sm:px-6 lg:px-8', scrolled ? 'h-16' : 'h-20')}>
          <a href="#" className="flex min-w-0 items-center gap-2.5">
            <img src={logo} className="h-9 w-9 shrink-0 rounded-xl object-contain" alt="" />
            <span className={cx('truncate text-[19px] font-bold tracking-tight transition-colors', scrolled || open ? 'text-lp-brand' : 'text-white')}>{brand.name}</span>
          </a>
          <div className={cx('hidden items-center gap-8 text-[14px] font-medium transition-colors lg:flex', scrolled ? 'text-lp-t2' : 'text-white/80')}>
            {links.map(([l, h]) => <a key={l} href={h} className={cx('transition', scrolled ? 'hover:text-lp-accent' : 'hover:text-white')}>{l}</a>)}
          </div>
          <div className="hidden items-center gap-2.5 md:flex">
            {[['play', userUrl, 'Get it on Google Play'], ['apple', appStoreUrl, 'Download on the App Store']].map(([k, href, label]) => (
              <a key={k} href={href} {...ext(href)} aria-label={label} title={label}
                className={cx('flex h-10 w-10 items-center justify-center rounded-full border transition hover:-translate-y-0.5', scrolled ? 'border-lp-line2 bg-white text-lp-t1 hover:border-lp-accent' : 'border-white/25 bg-white/10 text-white backdrop-blur hover:bg-white/20')}>
                {k === 'play' ? <GooglePlayIcon className="h-[18px] w-[18px]" /> : <AppleIcon className="h-[18px] w-[18px]" />}
              </a>
            ))}
          </div>
          <button className={cx('-mr-2 rounded-xl p-2 md:hidden', scrolled || open ? 'text-lp-t1 hover:bg-lp-soft' : 'text-white hover:bg-white/10')} onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>
        {open && (
          <div className="border-t border-lp-line bg-white px-4 pb-6 pt-2 md:hidden">
            {allLinks.map(([l, h]) => (
              <a key={l} href={h} onClick={() => setOpen(false)} className="flex items-center justify-between border-b border-lp-line py-3.5 text-[15px] font-medium text-lp-t1">
                {l}<ArrowRight size={16} className="text-lp-t3" />
              </a>
            ))}
            <div className="mt-5 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
              <PlayBadge href={userUrl} label="Google Play" className="justify-center px-3" />
              <AppStoreBadge href={appStoreUrl} className="justify-center px-3" />
            </div>
          </div>
        )}
      </header>

      {/* ================= HERO ================= */}
      <Hero hero={L.hero} stats={stats} astrologers={allAstros} appUrl={userUrl} appStoreUrl={L.footer?.customerAppStoreUrl} />

      {/* ================= OVERLAP SHEET: stats + services ================= */}
      <div style={bgOf("features")} className="relative z-10 -mt-14 rounded-t-[32px] bg-lp-bg shadow-[0_-24px_50px_-20px_rgba(0,0,0,.35)] sm:-mt-16 sm:rounded-t-[40px]">
        {/* stats tiles straddle the sheet edge */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className={cx('relative -top-9 grid gap-3 sm:gap-4', ['grid-cols-1', 'grid-cols-1', 'grid-cols-1 sm:grid-cols-2', 'grid-cols-1 sm:grid-cols-3', 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'][statItems.length] || 'grid-cols-1 sm:grid-cols-3')}>
            {statItems.map((s) => (
              <div key={s.l} className="lp-card-shadow group relative flex min-w-0 items-center gap-3.5 overflow-hidden rounded-3xl border border-lp-line bg-white p-4 transition duration-300 hover:-translate-y-1 hover:border-lp-line2 sm:p-5">
                <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-lp-accent via-[#f6a275] to-lp-brand opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-lp-accent to-lp-brand text-white shadow-[0_8px_18px_-8px_var(--lpa)] sm:h-12 sm:w-12"><s.I size={21} /></span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[1.35rem] font-extrabold leading-none text-lp-t1 sm:text-[1.65rem]">
                    {s.v}
                    {s.live && <span className="relative ml-1 flex h-2.5 w-2.5 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative h-2.5 w-2.5 rounded-full bg-emerald-500" /></span>}
                  </p>
                  <p className="mt-1.5 truncate text-[12.5px] text-lp-t2 sm:text-[13px]">{s.l}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= SERVICES ================= */}
        {sec.features && L.features.length > 0 && (
          <section id="features" className="scroll-mt-24 pb-12 pt-0 lg:pb-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <SectionHead tag={L.featuresTag} title={L.featuresTitle} text={L.featuresSubtitle} />
              <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                {L.features.map((f, i) => (
                  <a key={f.title} href={userUrl} {...ext(userUrl)}
                    className="lp-card-shadow group relative isolate flex min-w-0 flex-col overflow-hidden rounded-3xl border border-lp-line bg-white p-5 transition duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-[0_24px_50px_-20px_var(--lpb)] sm:p-6">
                    {/* hover fill in the hero gradient */}
                    <span className="lp-hero-bg absolute inset-0 -z-10 opacity-0 transition duration-300 group-hover:opacity-100" aria-hidden="true" />
                    <span className="pointer-events-none absolute right-5 top-4 text-[3.75rem] font-extrabold leading-none text-lp-soft transition duration-300 group-hover:text-white/10" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                    <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-lp-accent to-lp-brand text-white shadow-[0_10px_22px_-10px_var(--lpa)] transition duration-300 group-hover:scale-105 group-hover:bg-none group-hover:bg-white group-hover:text-lp-accent">
                      <AstroIcon n={f.icon} s={25} />
                    </span>
                    <h3 className="relative mt-5 text-[18px] font-semibold text-lp-t1 transition group-hover:text-white">{f.title}</h3>
                    <p className="relative mb-5 mt-2 text-[14.5px] leading-relaxed text-lp-t2 transition group-hover:text-white/80">{f.text}</p>
                    <span className="relative mt-auto inline-flex items-center gap-1.5 text-[14px] font-semibold text-lp-accent transition group-hover:text-white">
                      Try it in the app <ArrowRight size={15} className="transition group-hover:translate-x-1" />
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ================= HOW IT WORKS ================= */}
      {sec.how && L.steps.length > 0 && (
        <section id="how" style={bgOf("how")} className="scroll-mt-20 bg-white py-12 lg:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHead tag={L.howTag} title={L.howTitle} text={L.howSubtitle} />
            <ol className={cx('relative mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6', L.steps.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
              <div className="absolute left-[12%] right-[12%] top-[52px] hidden border-t-2 border-dashed border-lp-line2 lg:block" />
              {L.steps.map(({ title: st, text: d }, i) => (
                <li key={st} className="relative min-w-0 rounded-3xl border border-lp-line bg-lp-soft2 px-5 pb-6 pt-6 text-center sm:px-6 sm:pb-7">
                  <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lp-accent text-[1.25rem] font-bold text-white shadow-[0_0_0_6px_var(--color-lp-soft2),0_10px_20px_-8px_var(--lpa)]">{i + 1}</span>
                  <h3 className="mt-5 text-[17px] font-semibold text-lp-t1">{st}</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-lp-t2">{d}</p>
                </li>
              ))}
            </ol>
            <div className="mt-9 flex flex-wrap justify-center gap-3 text-[13.5px] font-medium text-lp-t2">
              {(L.howBadges || []).map((x) => (
                <span key={x.label} className="flex items-center gap-2 rounded-full border border-lp-line bg-lp-bg px-4 py-2"><AstroIcon n={x.icon} s={15} className="text-lp-accent" />{x.label}</span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= FOR ASTROLOGERS ================= */}
      {sec.cta && (
        <section id="earn" style={bgOf("cta")} className="scroll-mt-20 py-12 lg:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHead tag={L.cta?.badge || 'Earn with us'} title={L.cta?.title || 'Are you an astrologer?'} text={L.cta?.text} />
            {L.cta?.earningsHighlight && (
              <div className="mt-6 flex justify-center">
                <p className="inline-flex max-w-full items-center gap-2.5 rounded-2xl border border-lp-line2 bg-white px-4 py-2.5 text-center text-[13px] font-semibold text-lp-brand lp-card-shadow sm:rounded-full sm:px-5 sm:text-[14px]">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lp-accent to-lp-brand text-white"><IndianRupee size={14} /></span>
                  <span>{L.cta.earningsHighlight}</span>
                </p>
              </div>
            )}

            {(L.cta?.perks || []).length > 0 && (
              <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {L.cta.perks.map((p) => (
                  <div key={p.title} className="lp-card-shadow min-w-0 rounded-3xl border border-lp-line bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-lp-line2">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-lp-accent to-lp-brand text-white shadow-[0_10px_22px_-10px_var(--lpa)]"><AstroIcon n={p.icon || 'star'} s={21} /></span>
                    <h3 className="mt-4 text-[16px] font-semibold text-lp-t1">{p.title}</h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-lp-t2">{p.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* onboarding steps + app badge */}
            <div className="lp-card-shadow mt-5 rounded-3xl border border-lp-line bg-white p-5 sm:p-7">
              {(L.cta?.stepsTitle || L.cta?.freeLabel) && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-[18px] font-bold text-lp-t1">{L.cta?.stepsTitle}</h3>
                  {L.cta?.freeLabel && <span className="rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700">{L.cta.freeLabel}</span>}
                </div>
              )}
              {(L.cta?.steps || []).length > 0 && (
                <ol className={cx('mt-6 grid grid-cols-1 gap-5 md:gap-6', ['md:grid-cols-1', 'md:grid-cols-1', 'md:grid-cols-2', 'md:grid-cols-3', 'md:grid-cols-2 lg:grid-cols-4'][L.cta.steps.length] || 'md:grid-cols-3')}>
                  {L.cta.steps.map((st, i) => {
                    const I = [Smartphone, FileCheck2, Zap, BadgeCheck][i] || Zap;
                    return (
                      <li key={st.title} className="flex min-w-0 gap-3.5">
                        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lp-soft text-lp-accent">
                          <I size={18} />
                          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-lp-accent text-[10.5px] font-bold text-white ring-2 ring-white">{i + 1}</span>
                        </span>
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-lp-t1">{st.title}</p>
                          <p className="mt-0.5 text-[13.5px] leading-relaxed text-lp-t2">{st.text}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
              <div className="mt-6 flex flex-col items-stretch justify-between gap-4 border-t border-lp-line pt-5 sm:flex-row sm:items-center">
                {L.cta?.footnote ? <p className="flex items-center gap-2.5 text-[13.5px] text-lp-t2"><ShieldCheck size={18} className="shrink-0 text-emerald-600" /><span>{L.cta.footnote}</span></p> : <span />}
                <PlayBadge href={vendorUrl} label="Astrologer App" className="w-full justify-center sm:w-auto" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= FAQ ================= */}
      {sec.faq && L.faq.length > 0 && (
        <section id="faq" style={bgOf("faq")} className="scroll-mt-20 bg-white py-12 lg:py-16">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:gap-10 sm:px-6 lg:grid-cols-[1fr_1.6fr] lg:gap-14 lg:px-8">
            <div className="min-w-0">
              <SectionHead center={false} className="mx-auto text-center lg:mx-0 lg:text-left" tag={L.faqTag} title={L.faqTitle} text={L.faqSubtitle} />
              <div className="mt-7 space-y-3 sm:mt-8">
                {L.footer?.supportEmail && (
                  <a href={`mailto:${L.footer.supportEmail}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-lp-line bg-lp-soft2 p-3.5 text-[14.5px] font-medium text-lp-t1 transition hover:border-lp-accent">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lp-soft text-lp-accent"><Mail size={17} /></span>
                    <span className="min-w-0 truncate">{L.footer.supportEmail}</span>
                  </a>
                )}
                {L.footer?.supportPhone && (
                  <a href={`tel:${L.footer.supportPhone.replace(/\s/g, '')}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-lp-line bg-lp-soft2 p-3.5 text-[14.5px] font-medium text-lp-t1 transition hover:border-lp-accent">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lp-soft text-lp-accent"><Phone size={17} /></span>
                    <span className="min-w-0 truncate">{L.footer.supportPhone}</span>
                  </a>
                )}
              </div>
            </div>
            <div className="min-w-0 space-y-3">
              {L.faq.map(({ q, a }, i) => {
                const on = faq === i;
                return (
                  <div key={q} className={cx('overflow-hidden rounded-2xl border transition', on ? 'border-lp-line2 bg-lp-soft2' : 'border-lp-line bg-white')}>
                    <button onClick={() => setFaq(on ? -1 : i)} aria-expanded={on} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[14.5px] font-semibold text-lp-t1 sm:gap-4 sm:px-5 sm:py-4 sm:text-[15.5px]">
                      <span className="min-w-0 flex-1">{q}</span>
                      <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition duration-300', on ? 'rotate-180 bg-lp-accent text-white' : 'bg-lp-soft text-lp-accent')}><ChevronDown size={16} /></span>
                    </button>
                    <div className={cx('grid transition-all duration-300', on ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                      <div className="overflow-hidden"><p className="px-4 pb-4 text-[14px] leading-relaxed text-lp-t2 sm:px-5 sm:pb-5 sm:text-[14.5px]">{a}</p></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ================= FINAL CTA ================= */}
      {sec.final !== false && (
      <section style={bgOf("final")} className="py-12 lg:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="lp-card-shadow relative overflow-hidden rounded-[2.25rem] border border-lp-line2 bg-lp-soft px-5 py-9 text-center sm:px-12 sm:py-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full border-[28px] border-lp-accent/[.07]" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full border-[28px] border-lp-accent/[.07]" />
            <h2 className="relative text-[1.65rem] font-bold leading-tight tracking-tight text-lp-t1 sm:text-[2.6rem]">
              {L.finalCta?.title}{L.finalCta?.highlight && <><br className="hidden sm:block" /> <span className="text-lp-accent">{L.finalCta.highlight}</span></>}
            </h2>
            {L.finalCta?.text && <p className="relative mx-auto mt-4 max-w-lg text-[14.5px] leading-relaxed text-lp-t2 sm:text-[15.5px]">{L.finalCta.text}</p>}
            <div className="relative mt-7 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row">
              <PlayBadge href={userUrl} label="Google Play" className="w-full max-w-[220px] justify-center sm:w-auto" />
              <AppStoreBadge href={appStoreUrl} className="w-full max-w-[220px] justify-center sm:w-auto" />
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ================= FOOTER ================= */}
      <footer style={bgOf("footer")} className="bg-lp-espresso pb-6 pt-12 text-white/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 pb-10 sm:grid-cols-2 md:grid-cols-12">
            <div className="md:col-span-5">
              <div className="flex items-center gap-2.5">
                <img src={logo} className="h-9 w-9 rounded-xl object-contain" alt="" />
                <span className="text-[19px] font-bold text-white">{brand.name}</span>
              </div>
              <p className="mt-4 max-w-sm text-[14px] leading-relaxed">{L.footer?.about || brand.tagline || "India's trusted Vedic astrology platform for personalised predictions, Kundli and real-time consultations."}</p>
              {L.footer?.showBadges !== false && (
                <div className="mt-6 flex flex-wrap gap-2">
                  <PlayBadge href={userUrl} label="Google Play" className="!bg-white/10 hover:!bg-white/15" />
                  <AppStoreBadge href={appStoreUrl} className="!bg-white/10 hover:!bg-white/15" />
                  <PlayBadge href={vendorUrl} label="Astrologer App" className="!bg-white/10 hover:!bg-white/15" />
                </div>
              )}
              {socials.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {socials.map(([k, url]) => (
                    <a key={k} href={url} target="_blank" rel="noreferrer" aria-label={SOCIAL_LABEL[k]} title={SOCIAL_LABEL[k]}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:-translate-y-0.5 hover:bg-white/20 hover:text-white">
                      <SocialIcon k={k} />
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-3 md:col-start-7">
              <h5 className="text-[14px] font-semibold text-white">Explore</h5>
              <ul className="mt-4 space-y-2.5 text-[14px]">
                {allLinks.map(([l, h]) => <li key={l}><a href={h} className="transition hover:text-white">{l}</a></li>)}
              </ul>
            </div>
            <div className="md:col-span-3">
              <h5 className="text-[14px] font-semibold text-white">Legal & support</h5>
              <ul className="mt-4 space-y-2.5 text-[14px]">
                <li><Link to="/terms" className="transition hover:text-white">Terms of Service</Link></li>
                <li><Link to="/privacy" className="transition hover:text-white">Privacy Policy</Link></li>
                <li><Link to="/refund" className="transition hover:text-white">Refund Policy</Link></li>
                {L.footer?.supportEmail && <li><a href={`mailto:${L.footer.supportEmail}`} className="transition hover:text-white">Contact support</a></li>}
              </ul>
            </div>
          </div>
          {L.footer?.disclaimer && <p className="border-t border-white/10 pt-6 text-[12.5px] leading-relaxed text-white/45">{L.footer.disclaimer}</p>}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[13px] text-white/45">
            <p>&copy; {new Date().getFullYear()} {brand.name}. {L.footer?.copyrightText || 'All rights reserved.'}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
