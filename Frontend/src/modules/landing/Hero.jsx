import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, Briefcase, HeartPulse, Heart, IndianRupee, Languages, Lock,
  MessageCircle, Orbit, Star, Gem, Users, GraduationCap, Plane, Home
} from 'lucide-react';
import { FaApple, FaGooglePlay } from 'react-icons/fa6';
import { ZodiacIcon } from '../../shared/AstroIcon.jsx';
import { Avatar, cx } from '../../shared/ui.jsx';

/* Topic chip icons; keys match HERO_TOPIC_ICONS in the backend app config. */
export const TOPIC_ICONS = {
  career: Briefcase, love: Heart, marriage: Gem, finance: IndianRupee, health: HeartPulse,
  kundli: Orbit, family: Users, education: GraduationCap, travel: Plane, property: Home,
};


/* Typewriter: types a prompt, holds 1.5s, deletes it, moves to the next. */
function useTypewriter(words, active) {
  const [text, setText] = useState('');
  const [i, setI] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const calm = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (!active || !words.length) return undefined;
    const word = words[i % words.length];
    if (calm) {
      // No typing animation, but the question still changes every few seconds.
      setText(word);
      const id = setTimeout(() => setI((n) => n + 1), 2800);
      return () => clearTimeout(id);
    }
    let delay = deleting ? 35 : 70;
    if (!deleting && text === word) delay = 1500;
    if (deleting && text === '') delay = 300;
    const id = setTimeout(() => {
      if (!deleting && text === word) setDeleting(true);
      else if (deleting && text === '') { setDeleting(false); setI((n) => n + 1); }
      else setText(word.slice(0, text.length + (deleting ? -1 : 1)));
    }, delay);
    return () => clearTimeout(id);
  }, [text, deleting, i, words, active, calm]);
  return text;
}

/* ---------------------------------------------------------------- AskBox */
export function AskBox({ prompts = [], topics = [], askLabel = 'Ask now', kundliLabel = 'Generate free Kundli', appUrl = '/user' }) {
  const inputRef = useRef(null);
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState('');
  const [focused, setFocused] = useState(false);
  const typed = useTypewriter(prompts, !q && !focused);

  // Consultations happen in the app, so asking opens the app / store link.
  const submit = (e) => {
    e.preventDefault();
    if (appUrl.startsWith('/')) window.location.assign(appUrl);
    else window.open(appUrl, '_blank', 'noopener');
  };

  const pick = (t) => { setTopic(t.label.toLowerCase()); if (t.q) setQ(t.q); inputRef.current?.focus(); };

  return (
    <div>
      <form onSubmit={submit} className="flex items-center gap-2 rounded-2xl bg-white p-2 pl-4 shadow-[0_18px_40px_-18px_rgba(0,0,0,.55)] ring-1 ring-black/5 focus-within:ring-4 focus-within:ring-white/30">
        <MessageCircle size={20} className="shrink-0 text-lp-accent" aria-hidden="true" />
        <label htmlFor="hero-ask" className="sr-only">Ask an astrologer a question</label>
        <input
          id="hero-ask" ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder={focused ? 'Type your question…' : typed || ' '}
          maxLength={200} autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-lp-t1 outline-none placeholder:text-lp-t3"
        />
        <button type="submit" aria-label={askLabel} className="group inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-lp-accent px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-lp-accent-dk sm:px-5">
          {askLabel} <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
        </button>
      </form>

      {topics.length > 0 && <div className="no-scrollbar -mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 sm:justify-center lg:mx-0 lg:justify-start lg:px-0" role="group" aria-label="Pick a topic">
        {topics.map((t) => {
          const on = topic === t.label.toLowerCase();
          const I = TOPIC_ICONS[t.icon] || Orbit;
          return (
            <button key={t.label} type="button" onClick={() => pick(t)} aria-pressed={on} aria-label={`Ask about ${t.label}`}
              className={cx('inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition',
                on ? 'border-white bg-white text-lp-brand' : 'border-white/25 bg-white/10 text-white hover:bg-white/20')}>
              <I size={14} aria-hidden="true" />{t.label}
            </button>
          );
        })}
      </div>}

      {kundliLabel && <a href={appUrl} {...(appUrl.startsWith('/') ? {} : { target: '_blank', rel: 'noreferrer' })} className="group mt-5 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-white underline-offset-4 hover:underline">
        {kundliLabel} <ArrowRight size={15} className="transition group-hover:translate-x-1" />
      </a>}
    </div>
  );
}

/* ---------------------------------------------------------------- ZodiacWheel
   Slowly rotating rashi wheel. Each sign is a link (today's horoscope in the app);
   hovering a sign pauses the wheel and highlights it. */
const RASHI = ['Mesh', 'Vrishabh', 'Mithun', 'Kark', 'Simha', 'Kanya', 'Tula', 'Vrishchik', 'Dhanu', 'Makar', 'Kumbh', 'Meen'];
const SIGN_EN = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

export function ZodiacWheel({ href = '/user', className }) {
  const [hover, setHover] = useState(-1);
  const C = 250;
  const R_OUT = 246, R_IN = 196, R_GLYPH = 221;
  return (
    <div className={cx('pointer-events-none', className)}>
      <svg viewBox="0 0 500 500" className="lp-wheel-spin h-full w-full" style={{ animationPlayState: hover >= 0 ? 'paused' : 'running' }} role="group" aria-label="Pick your rashi for today's horoscope">
        <circle cx={C} cy={C} r={R_OUT} fill="none" stroke="#fff" strokeOpacity=".28" />
        <circle cx={C} cy={C} r={R_IN} fill="none" stroke="#fff" strokeOpacity=".28" />
        <circle cx={C} cy={C} r={R_IN - 14} fill="none" stroke="#fff" strokeOpacity=".14" strokeDasharray="2 7" />
        {Array.from({ length: 72 }, (_, i) => {
          const a = i * 5 * (Math.PI / 180);
          return <line key={i} x1={C + R_IN * Math.cos(a)} y1={C + R_IN * Math.sin(a)} x2={C + (R_IN + (i % 6 ? 5 : 10)) * Math.cos(a)} y2={C + (R_IN + (i % 6 ? 5 : 10)) * Math.sin(a)} stroke="#fff" strokeOpacity=".3" />;
        })}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 30 - 90) * (Math.PI / 180);
          const g = (i * 30 - 75) * (Math.PI / 180);
          const x = C + R_GLYPH * Math.cos(g), y = C + R_GLYPH * Math.sin(g);
          const on = hover === i;
          return (
            <g key={i}>
              <line x1={C + R_IN * Math.cos(a)} y1={C + R_IN * Math.sin(a)} x2={C + R_OUT * Math.cos(a)} y2={C + R_OUT * Math.sin(a)} stroke="#fff" strokeOpacity=".28" />
              <a href={href} className="pointer-events-auto cursor-pointer outline-none" aria-label={`${SIGN_EN[i]} (${RASHI[i]}) horoscope`}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(-1)} onFocus={() => setHover(i)} onBlur={() => setHover(-1)}>
                <title>{`${SIGN_EN[i]} · ${RASHI[i]} — today's horoscope`}</title>
                <circle cx={x} cy={y} r="20" fill="#fff" fillOpacity={on ? 1 : 0.08} style={{ transition: 'fill-opacity .2s' }} />
                <g transform={`translate(${x - 9}, ${y - 9})`} style={{ color: on ? 'var(--lpa)' : '#FFE1CC', transition: 'color .2s' }}><ZodiacIcon index={i} size={18} /></g>
              </a>
            </g>
          );
        })}
      </svg>
      {/* name of the hovered sign, shown upright under the wheel */}
      <p className={cx('pointer-events-none absolute inset-x-0 -bottom-2 text-center text-[13px] font-semibold text-white transition-opacity', hover >= 0 ? 'opacity-100' : 'opacity-0')} aria-hidden="true">
        {hover >= 0 && <>{SIGN_EN[hover]} · {RASHI[hover]} <span className="font-normal text-white/70">— tap for today's horoscope</span></>}
      </p>
    </div>
  );
}

export function GooglePlayIcon({ className = 'h-5 w-5' }) {
  return <FaGooglePlay className={className} aria-hidden="true" />;
}

export function AppleIcon({ className = 'h-5 w-5' }) {
  return <FaApple className={className} aria-hidden="true" />;
}

function StoreBadge({ href, store }) {
  const ext = href && !href.startsWith('/') ? { target: '_blank', rel: 'noreferrer' } : {};
  const play = store === 'play';
  return (
    <a href={href} {...ext} aria-label={play ? 'Get it on Google Play' : 'Download on the App Store'}
      className="inline-flex items-center gap-2.5 rounded-xl border border-white/20 bg-black px-3.5 py-2 text-white transition hover:-translate-y-0.5 hover:border-white/40">
      {play ? <GooglePlayIcon className="h-6 w-6 shrink-0" /> : <AppleIcon className="h-6 w-6 shrink-0" />}
      <span className="text-left leading-tight">
        <span className="block text-[9.5px] font-medium uppercase tracking-wider text-white/65">{play ? 'Get it on' : 'Download on the'}</span>
        <span className="block text-[14px] font-semibold">{play ? 'Google Play' : 'App Store'}</span>
      </span>
    </a>
  );
}

/* ---------------------------------------------------------------- AppPreview
   Real screenshot of the customer app home screen in a phone frame, on the rotating
   rashi wheel, with the store badges underneath. */
export function AppPreview({ screenshot, appUrl, appStoreUrl, wheelHref }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-[380px] w-full items-center justify-center sm:h-[400px]">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,170,120,.45),transparent_65%)] blur-xl" aria-hidden="true" />
        <ZodiacWheel href={wheelHref} className="absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 sm:h-[390px] sm:w-[390px]" />
        <div className="relative z-10 w-[170px] rounded-[30px] bg-[#1a0f0b] p-[5px] shadow-[0_34px_70px_-24px_rgba(0,0,0,.75),inset_0_0_0_1.5px_rgba(255,255,255,.15)] sm:w-[180px]">
          <div className="overflow-hidden rounded-[25px] bg-lp-bg">
            <img src={screenshot} alt="App home screen" className="block w-full" loading="eager" />
          </div>
        </div>
      </div>
      <div className="relative z-10 mt-2 flex flex-wrap justify-center gap-2.5">
        <StoreBadge store="play" href={appUrl} />
        <StoreBadge store="apple" href={appStoreUrl || appUrl} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Hero */
export default function Hero({ hero = {}, stats, astrologers = [], appUrl = '/user', appStoreUrl }) {
  // Headlines rotate automatically (admin: Landing > Hero > Headlines).
  const heads = (hero.headlines || []).filter((x) => x?.title || x?.highlight);
  const list = heads.length ? heads : [{ title: hero.title, highlight: hero.highlight }];
  const [hi, setHi] = useState(0);
  useEffect(() => {
    if (list.length < 2) return undefined;
    const id = setInterval(() => setHi((n) => n + 1), 4000);
    return () => clearInterval(id);
  }, [list.length]);
  const head = list[hi % list.length];
  const tr = hero.trust || {};
  const showPreview = hero.showLive !== false;

  // Trust chips: numbers are live from the database and only shown once they exist; texts come from admin.
  const chips = [
    tr.showAstrologers !== false && stats?.astrologers > 0 && { k: 'astro', v: `${stats.astrologers} verified`, l: 'Vedic astrologers' },
    tr.showRating !== false && stats?.reviews > 0 && stats?.rating && { k: 'rating', v: `${stats.rating} rating`, l: `${stats.reviews.toLocaleString('en-IN')} user reviews`, I: Star },
    tr.languages && { k: 'lang', v: tr.languages, l: tr.languagesNote, I: Languages },
    tr.privacy && { k: 'privacy', v: tr.privacy, l: tr.privacyNote, I: Lock },
  ].filter(Boolean);

  return (
    <section id="hero" aria-label="Ask an astrologer" className="lp-hero-bg relative overflow-hidden pb-32 pt-24 text-white">
      <div className="lp-stars pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />

      <div className={cx('relative mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:gap-6 lg:px-8', showPreview && 'lg:grid-cols-[58fr_42fr]')}>
        {/* left */}
        <div className="text-center lg:text-left">
          {hero.badge && (
            <span className="lp-rise inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[13px] font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-300" aria-hidden="true" />{hero.badge}
            </span>
          )}
          <h1 key={hi % list.length} className="lp-rise mt-4 min-h-[2.24em] text-[1.9rem] font-extrabold leading-[1.12] tracking-[-0.02em] sm:text-[2.3rem] lg:text-[2.5rem] xl:text-[2.8rem]" style={{ animationDelay: '80ms' }}>
            {head.title}{head.highlight && <>{' '}<span className="text-[#f6b48f]">{head.highlight}</span></>}
          </h1>
          {hero.subtitle && <p className="lp-rise mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-white/85 lg:mx-0" style={{ animationDelay: '160ms' }}>{hero.subtitle}</p>}
          <div className="lp-rise mx-auto mt-5 max-w-xl lg:mx-0" style={{ animationDelay: '240ms' }}>
            <AskBox prompts={hero.prompts} topics={hero.topics} askLabel={hero.primaryCta || 'Ask now'} kundliLabel={hero.secondaryCta} appUrl={appUrl} />
          </div>
        </div>

        {/* right: app preview on the rotating rashi wheel */}
        {showPreview && (
          <div className="lp-rise" style={{ animationDelay: '320ms' }}>
            <AppPreview screenshot={hero.imageUrl || '/landing/app-home.webp'} appUrl={appUrl} appStoreUrl={appStoreUrl} wheelHref={appUrl} />
          </div>
        )}
      </div>

      {/* trust chips */}
      {chips.length > 0 && (
        <div className="relative mx-auto mt-8 max-w-6xl px-4 sm:px-6 lg:px-8">
          <ul className="flex flex-wrap justify-center gap-3">
            {chips.map((c, i) => (
              <li key={c.k} className="lp-rise flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[.09] py-2.5 pl-2.5 pr-5 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/[.14]" style={{ animationDelay: `${400 + i * 60}ms` }}>
                {c.k === 'astro' ? (
                  <span className="flex -space-x-2.5" aria-hidden="true">
                    {astrologers.slice(0, 3).map((a) => <span key={a._id} className="rounded-full ring-2 ring-white/70"><Avatar name={a.name} src={a.avatar} size={34} /></span>)}
                  </span>
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffd2b5] to-[#f6a275] text-lp-brand" aria-hidden="true">
                    <c.I size={17} fill={c.k === 'rating' ? 'currentColor' : 'none'} strokeWidth={c.k === 'rating' ? 0 : 2} />
                  </span>
                )}
                <span className="text-left leading-tight">
                  <span className="block text-[14px] font-semibold">{c.v}</span>
                  {c.l && <span className="block text-[12px] text-white/70">{c.l}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
