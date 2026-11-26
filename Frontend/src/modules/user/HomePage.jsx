import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, inr } from '../../lib/api.js';
import { userAuth } from '../../lib/auth.jsx';
import { useAsync } from '../../shared/ui.jsx';
import { ZodiacIcon } from '../../shared/AstroIcon.jsx';
import { useStartSession } from './Astrologers.jsx';
import { Icon, Rv, initials, priceOf, useAV, useAppData, useInView, vibrate } from './av.jsx';

const SIGNS = [['Aries', '♈'], ['Taurus', '♉'], ['Gemini', '♊'], ['Cancer', '♋'], ['Leo', '♌'], ['Virgo', '♍'], ['Libra', '♎'], ['Scorpio', '♏'], ['Sagittarius', '♐'], ['Capricorn', '♑'], ['Aquarius', '♒'], ['Pisces', '♓']];
const VS = '︎';
const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const fmt = (d, o) => d.toLocaleDateString('en-IN', o);
const isExternal = (l = '') => /^https?:\/\//.test(l);

/* Internal links use the router; admin may also point a poster or service at an external URL. */
function useGo() {
  const nav = useNavigate();
  return (link) => {
    vibrate();
    if (!link) return;
    if (isExternal(link)) window.open(link, '_blank', 'noopener');
    else nav(link);
  };
}

function SectionHead({ title, to, label = 'View all' }) {
  if (!title) return null;
  return (
    <Rv className="av-sec-h">
      <h2>{title}</h2>
      {to && <Link to={to} className="av-link">{label} <Icon n="arrow" s={14} /></Link>}
    </Rv>
  );
}

/* Chat price in the service's unit (per minute or per hour). */
function PickPrice({ a }) {
  const { data } = useAppData() || {};
  const pr = priceOf(a, 'chat', data?.services);
  return <b>{inr(pr.perUnit)}<small>/{pr.unit}</small></b>;
}

/* ---------------- Sign bar ---------------- */
function FindBar({ me }) {
  const nav = useNavigate();
  const idx = SIGNS.findIndex(([n]) => n === me?.zodiac);
  const first = (me?.name || '').split(' ')[0] || 'there';
  return (
    <div className="av-findbar">
      <span className="av-fb-ic" aria-hidden="true">{idx >= 0 ? <ZodiacIcon index={idx} size={18} /> : <Icon n="star" s={17} />}</span>
      <button className="av-fb-main" onClick={() => nav('/user/profile')}>
        <small>Namaste, {first}</small>
        <b>{idx >= 0 ? `${me.zodiac} · ${me.pob || 'Add birth place'}` : 'Add your birth details'} <Icon n="down" s={14} /></b>
      </button>
      <button className="av-fb-search" onClick={() => nav('/user/astrologers')} aria-label="Search astrologers"><Icon n="search" s={18} /></button>
    </div>
  );
}

/* ---------------- Posters (admin: App Management > Posters) ---------------- */
const PosterArt = () => (
  <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
    <circle cx="100" cy="100" r="94" /><circle cx="100" cy="100" r="70" /><circle cx="100" cy="100" r="30" />
    {Array.from({ length: 12 }, (_, i) => { const a = (i * 30 * Math.PI) / 180; return <line key={i} x1={100 + 30 * Math.cos(a)} y1={100 + 30 * Math.sin(a)} x2={100 + 94 * Math.cos(a)} y2={100 + 94 * Math.sin(a)} />; })}
    {SIGNS.map(([n], i) => { const a = ((i * 30 + 15 - 90) * Math.PI) / 180; return <g key={n} transform={`translate(${100 + 82 * Math.cos(a) - 6}, ${100 + 82 * Math.sin(a) - 6})`}><ZodiacIcon index={i} size={12} /></g>; })}
  </svg>
);

function Posters({ banners }) {
  const go = useGo();
  const ref = useRef(null);
  const [cur, setCur] = useState(0);
  const curRef = useRef(0);
  const paused = useRef(false);
  const pauseT = useRef();
  curRef.current = cur;
  const count = banners.length;

  const scrollTo = (i) => {
    const el = ref.current; if (!el) return;
    const s = el.children[(i + count) % count];
    if (s) el.scrollTo({ left: s.offsetLeft - 18, behavior: reduce() ? 'auto' : 'smooth' });
  };
  useEffect(() => {
    if (reduce() || count < 2) return undefined;
    const t = setInterval(() => { if (!paused.current) scrollTo(curRef.current + 1); }, 5000);
    return () => clearInterval(t);
  }, [count]); // eslint-disable-line react-hooks/exhaustive-deps
  const onScroll = () => { const el = ref.current; const w = el.children[0]?.offsetWidth || 1; setCur(Math.round(el.scrollLeft / (w + 12))); };
  const hold = () => { paused.current = true; clearTimeout(pauseT.current); pauseT.current = setTimeout(() => { paused.current = false; }, 6000); };
  if (!count) return null;

  return (
    <section className="av-posters" aria-label="Offers">
      <div className="av-poster-track" ref={ref} onScroll={onScroll} onPointerDown={hold} onTouchStart={hold}>
        {banners.map((b) => (
          <article key={b._id} className={`av-poster t-${b.color || 'terracotta'}`}>
            <div className="av-poster-txt">
              {b.eyebrow && <div className="av-poster-eb">{b.eyebrow}</div>}
              <h3>{b.title}</h3>
              {b.subtitle && <p>{b.subtitle}</p>}
              {b.cta && <button className="av-poster-cta" onClick={() => go(b.link)}>{b.cta} <Icon n="arrow" s={14} /></button>}
            </div>
            <div className="av-poster-art">{b.imageUrl ? <img src={b.imageUrl} alt="" /> : <PosterArt />}</div>
          </article>
        ))}
      </div>
      {count > 1 && (
        <div className={`av-poster-dots${banners[cur]?.color === 'sand' ? ' dark' : ''}`}>
          {banners.map((b, i) => <button key={b._id} className={i === cur ? 'on' : ''} aria-label={`Poster ${i + 1}`} onClick={() => scrollTo(i)} style={banners[cur]?.color === 'sand' ? { background: i === cur ? '#6E2417' : 'rgba(110,36,23,.3)' } : undefined} />)}
        </div>
      )}
    </section>
  );
}

/* ---------------- Services row (admin: App Management > Services) ---------------- */
function Services({ items, title }) {
  if (!items.length) return null;
  return (
    <>
      <SectionHead title={title} />
      <nav className="av-svc" aria-label="Services">
        {items.map((c) => {
          const inner = (
            <>
              {c.tag && <i>{c.tag}</i>}
              <span className="av-svc-ic">{c.imageUrl ? <img src={c.imageUrl} alt="" /> : <Icon n={c.icon || 'star'} s={22} />}</span>
              <span className="av-svc-l">{c.label}</span>
            </>
          );
          return isExternal(c.link)
            ? <a key={c._id} href={c.link} target="_blank" rel="noopener noreferrer" onClick={vibrate}>{inner}</a>
            : <Link key={c._id} to={c.link || '/user'} onClick={vibrate}>{inner}</Link>;
        })}
      </nav>
    </>
  );
}

/* ---------------- Astrologer picks (admin chooses source / exact astrologers) ---------------- */
function AstroPick({ a, start }) {
  const nav = useNavigate();
  const [bad, setBad] = useState(false);
  const state = !a.online ? 'offline' : a.busy ? 'busy' : 'online';
  const open = () => nav(`/user/astrologers/${a._id}`);
  return (
    <article className="av-pick">
      <div className={`av-pick-img${state === 'offline' ? ' off' : ''}`} onClick={open} role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && open()} aria-label={a.name}>
        {initials(a.name)}
        {a.avatar && !bad && <img src={a.avatar} alt="" loading="lazy" onError={() => setBad(true)} />}
        {a.rating > 0 && <span className="av-pick-badge"><Icon n="star" s={11} />{a.rating.toFixed(1)}</span>}
        <span className={`av-pick-st ${state}`}>{state === 'online' ? 'Online' : state === 'busy' ? 'Busy' : 'Offline'}</span>
      </div>
      <div className="av-pick-body">
        <h4 onClick={open}>{a.name}</h4>
        <small>{a.expertise?.slice(0, 2).join(' · ')} · {a.experience} yrs</small>
        <div className="av-pick-foot">
          <PickPrice a={a} />
          <button className="av-round" disabled={state !== 'online'} onClick={() => start(a, 'chat')} aria-label={state === 'online' ? `Chat with ${a.name}` : `${a.name} is ${state}`}><Icon n="chat" s={15} /></button>
        </div>
      </div>
    </article>
  );
}

function Astrologers({ list, title }) {
  const start = useStartSession();
  if (!list.length) return null;
  return (
    <>
      <SectionHead title={title} to="/user/astrologers" />
      <div className="av-rail">{list.map((a) => <AstroPick key={a._id} a={a} start={start} />)}</div>
    </>
  );
}

/* ---------------- Reports / remedies rail ---------------- */
function Products({ items, title, tab }) {
  const nav = useNavigate();
  if (!items.length) return null;
  const to = tab === 'remedies' ? '/user/store?tab=remedies' : '/user/store';
  return (
    <>
      <SectionHead title={title} to={to} />
      <div className="av-rail">
        {items.map((it) => (
          <article key={it._id} className="av-pick">
            <div className="av-pick-img" onClick={() => nav(to)} role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && nav(to)} aria-label={it.title}>
              {it.imageUrl ? <img src={it.imageUrl} alt="" loading="lazy" /> : <Icon n={tab === 'remedies' ? 'diya' : 'report'} s={34} />}
              {it.category && <span className="av-pick-badge">{it.category}</span>}
            </div>
            <div className="av-pick-body">
              <h4 onClick={() => nav(to)}>{it.title}</h4>
              <div className="av-pick-foot">
                <b>{inr(it.price)}</b>
                <button className="av-round" onClick={() => { vibrate(); nav(to); }} aria-label={`Get ${it.title}`}><Icon n="plus" s={15} /></button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

/* ---------------- Promo strip (admin: App Management > Promo card) ---------------- */
function Promo({ p }) {
  const go = useGo();
  if (!p?.title) return null;
  return (
    <Rv className="av-promo">
      <span className="av-promo-ic"><Icon n={p.icon || 'star'} s={22} /></span>
      <div className="av-promo-txt">
        {p.eyebrow && <small>{p.eyebrow}</small>}
        <b>{p.title}</b>
        {p.subtitle && <p>{p.subtitle}</p>}
      </div>
      {p.cta && <button className="av-btn-gold" onClick={() => go(p.link)}>{p.cta}</button>}
    </Rv>
  );
}

/* ---------------- Horoscope ---------------- */
const COLOR_HEX = { white: '#F5F5F5', gold: '#E0A93B', emerald: '#10B981', 'royal blue': '#3B82F6', maroon: '#9F1239', saffron: '#F28C28', lavender: '#C4B5FD', silver: '#CBD5E1', 'sea green': '#2DD4BF', 'rose pink': '#F472B6', red: '#EF4444', blue: '#3B82F6', green: '#22C55E', yellow: '#FACC15', orange: '#FB923C', violet: '#8B5CF6', pink: '#F472B6', purple: '#A855F7', black: '#1F2937', brown: '#92400E', grey: '#9CA3AF', gray: '#9CA3AF', cream: '#FFF3D6' };
const METERS = [['love', 'Love', 'var(--m0)'], ['career', 'Career', 'var(--m1)'], ['health', 'Health', 'var(--m2)'], ['money', 'Money', 'var(--m3)']];

function dateLabel(t) {
  const today = new Date();
  if (t === 'daily') return fmt(today, { weekday: 'short', day: 'numeric', month: 'short' });
  if (t === 'weekly') { const e = new Date(today); e.setDate(e.getDate() + 6); return `${fmt(today, { day: 'numeric', month: 'short' })} – ${fmt(e, { day: 'numeric', month: 'short' })}`; }
  return fmt(today, { month: 'long', year: 'numeric' });
}

function Meters({ scores, run }) {
  return (
    <div className="av-meters">
      {METERS.map(([k, label, col]) => {
        const v = Math.max(0, Math.min(100, Number(scores?.[k]) || 0));
        return (
          <div className="av-meter" key={k}>
            <label>{label}<b>{v}%</b></label>
            <div><i style={{ width: run ? `${v}%` : 0, background: col }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function Horoscope({ defaultSign, title }) {
  const { toast } = useAV();
  const startIdx = Math.max(0, SIGNS.findIndex(([n]) => n === defaultSign));
  const [sign, setSign] = useState(startIdx);
  const [tab, setTab] = useState('daily');
  const [shown, setShown] = useState({ sign: startIdx, tab: 'daily' });
  const [fade, setFade] = useState(false);
  const [open, setOpen] = useState(false);
  const [auto, setAuto] = useState(true);
  const { data, loading } = useAsync(() => Promise.all(['daily', 'weekly', 'monthly'].map((p) => api.public.get('/public/horoscopes', { period: p }))).then(([daily, weekly, monthly]) => ({ daily, weekly, monthly })));
  const chipsRef = useRef(null);
  const indRef = useRef(null);
  const [cardRef, seen] = useInView();

  const place = (smooth) => {
    const chips = chipsRef.current; if (!chips) return;
    const c = chips.querySelectorAll('.av-chip')[sign]; if (!c) return;
    if (indRef.current) indRef.current.style.transform = `translateX(${c.offsetLeft}px)`;
    chips.scrollTo({ left: c.offsetLeft - chips.clientWidth / 2 + c.offsetWidth / 2, behavior: smooth && !reduce() ? 'smooth' : 'auto' });
  };
  useLayoutEffect(() => { place(false); document.fonts?.ready?.then(() => place(false)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { place(true); }, [sign]); // eslint-disable-line react-hooks/exhaustive-deps

  // crossfade when sign / tab changes
  useEffect(() => {
    if (shown.sign === sign && shown.tab === tab) return undefined;
    if (reduce()) { setShown({ sign, tab }); return undefined; }
    setFade(true);
    const t = setTimeout(() => { setShown({ sign, tab }); setOpen(false); setFade(false); }, 220);
    return () => clearTimeout(t);
  }, [sign, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // gently rotate through the signs until the user picks one
  useEffect(() => {
    if (!auto || reduce()) return undefined;
    const t = setInterval(() => setSign((s) => (s + 1) % 12), 7000);
    return () => clearInterval(t);
  }, [auto]);

  const [name, glyph] = SIGNS[shown.sign];
  const cur = data?.[shown.tab]?.find((h) => h.sign === name);
  const colName = cur?.lucky?.color || '';
  const share = async () => {
    vibrate();
    if (!cur) return;
    const text = `${name} ${shown.tab} horoscope — ${cur.text}`;
    try {
      if (navigator.share) await navigator.share({ title: document.title, text });
      else { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); }
    } catch { /* cancelled */ }
  };
  const TABS = ['daily', 'weekly', 'monthly'];

  return (
    <>
      <SectionHead title={title} />
      <section className={`av-card av-rv${seen ? ' in' : ''}`} ref={cardRef}>
        <div className="av-chips" ref={chipsRef}>
          <div className="av-chip-ind" ref={indRef} />
          {SIGNS.map(([n], i) => (
            <button key={n} className={`av-chip${i === sign ? ' on' : ''}`} aria-label={n} aria-pressed={i === sign} onClick={() => { if (i === sign) return; vibrate(); setAuto(false); setSign(i); }}>
              <span className="av-g"><ZodiacIcon index={i} size={18} /></span>{n}
            </button>
          ))}
        </div>
        <div className="av-tabs" role="tablist">
          <div className="av-tab-ind" style={{ transform: `translateX(${TABS.indexOf(tab) * 100}%)` }} />
          {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={`av-tab${tab === t ? ' on' : ''}`} onClick={() => { if (tab === t) return; vibrate(); setTab(t); }}>{t[0].toUpperCase() + t.slice(1)}</button>)}
        </div>
        <div className={`av-hz${fade ? ' fade' : ''}`}>
          <div className="av-hz-top">
            <div className="av-hz-glyph"><ZodiacIcon index={shown.sign} size={24} /></div>
            <div className="av-hz-name"><h3>{name}</h3><small>{dateLabel(shown.tab)}</small></div>
            <button className="av-iconbtn" aria-label="Share horoscope" onClick={share}><Icon n="share" s={17} /></button>
          </div>
          {loading ? (
            <div style={{ marginTop: 14 }}><div className="av-sk" style={{ height: 30, width: '70%', marginBottom: 12 }} /><div className="av-sk" style={{ height: 64 }} /></div>
          ) : !cur ? (
            <p className="av-empty">{name}'s {shown.tab} horoscope hasn't been published yet.</p>
          ) : (
            <>
              <div className="av-lucky">
                <div className="av-lk"><span className="av-sw" style={{ background: COLOR_HEX[colName.toLowerCase()] || colName || '#ccc' }} />Lucky colour <b>{colName || '–'}</b></div>
                <div className="av-lk"><span className="av-num">{cur.lucky?.number ?? '–'}</span>Lucky number</div>
              </div>
              <p className={`av-pred${open ? ' open' : ''}`}>{cur.text}</p>
              {cur.text?.length > 140 && <button className="av-more" onClick={() => setOpen(!open)}>{open ? 'Show less' : 'Read more'}</button>}
            </>
          )}
        </div>
        {cur && <Meters scores={cur.scores} run={seen} />}
      </section>
    </>
  );
}

/* ---------------- Panchang ---------------- */
const TITHIS = ['Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi'];
const toMin = (s = '00:00') => { const [h, m] = s.split(':').map(Number); return h * 60 + (m || 0); };
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

function MoonPhase({ tithi }) {
  const [paksha, nm] = (tithi || 'Shukla Purnima').split(' ');
  const n = nm === 'Purnima' ? 15 : nm === 'Amavasya' ? 0 : TITHIS.indexOf(nm) + 1;
  const f = paksha === 'Shukla' ? n / 15 : 1 - n / 15;
  const r = 12, rx = r * Math.abs(1 - 2 * f);
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" >
      <defs><radialGradient id="av-mp" cx="38%" cy="35%"><stop offset="0" stopColor="#fffbe8" /><stop offset=".6" stopColor="#e8dcb0" /><stop offset="1" stopColor="#bfae7a" /></radialGradient></defs>
      <circle cx="13" cy="13" r={r} fill="rgba(168,139,125,.3)" />
      {f >= 0.98 ? <circle cx="13" cy="13" r={r} fill="url(#av-mp)" /> : f > 0.02 && (
        <path d={`M13 ${13 - r}A${r} ${r} 0 0 1 13 ${13 + r}A${rx} ${r} 0 0 ${f < 0.5 ? 0 : 1} 13 ${13 - r}Z`} fill="url(#av-mp)" transform={paksha === 'Krishna' ? 'translate(26 0) scale(-1 1)' : undefined} />
      )}
    </svg>
  );
}

function Panchang({ me, title }) {
  const hasLoc = me?.lat != null && me?.lon != null;
  const place = hasLoc && me.pob ? me.pob.split(',')[0] : 'New Delhi';
  const { data } = useAsync(() => api.public.get('/public/panchang', hasLoc ? { lat: me.lat, lon: me.lon, tz: me.tz || 'Asia/Kolkata' } : undefined), [me?.lat, me?.lon, me?.tz]);
  const [now, setNow] = useState(nowMin);
  const [ref, seen] = useInView();
  useEffect(() => { const t = setInterval(() => setNow(nowMin()), 30000); return () => clearInterval(t); }, []);

  const SR = toMin(data?.sunrise || '06:00'), SS = toMin(data?.sunset || '18:00');
  const t = SS > SR ? Math.max(0, Math.min(1, (now - SR) / (SS - SR))) : 0;
  // point on the quadratic arc M14 78 Q150 -30 286 78
  const bx = (1 - t) ** 2 * 14 + 2 * (1 - t) * t * 150 + t * t * 286;
  const by = (1 - t) ** 2 * 78 + 2 * (1 - t) * t * -30 + t * t * 78;
  const night = now < SR || now >= SS;
  const left = SS - now;
  const [rs, re] = (data?.rahuKaal || '00:00 - 00:00').split(/\s*-\s*/).map(toMin);
  const rahu = now >= rs && now < re ? { c: 'active', t: `Active · ends in ${re - now}m` } : now < rs ? { c: 'soon', t: `Starts in ${Math.floor((rs - now) / 60)}h ${(rs - now) % 60}m` } : { c: 'over', t: 'Over for today' };
  const date = data ? new Date(`${data.date}T12:00:00`) : new Date();

  return (
    <>
      <SectionHead title={title} />
      <section className={`av-card av-rv${seen ? ' in' : ''}`} ref={ref}>
        {!data ? <div><div className="av-sk" style={{ height: 22, width: '55%' }} /><div className="av-sk" style={{ height: 90, marginTop: 14 }} /><div className="av-sk" style={{ height: 110, marginTop: 12 }} /></div> : (
          <>
            <div className="av-pc-head">
              <div><h3>{fmt(date, { weekday: 'long', day: 'numeric', month: 'short' })}</h3><small>{place}</small></div>
              <div className="av-moon"><MoonPhase tithi={data.tithi} />{data.tithi.split(' ').slice(1).join(' ')}</div>
            </div>
            <div className="av-arc">
              <svg viewBox="0 0 300 86">
                <defs>
                  <linearGradient id="av-ag" x1="0" x2="1"><stop offset="0" stopColor="#B9542C" /><stop offset="1" stopColor="#D98A2B" /></linearGradient>
                  <radialGradient id="av-sg"><stop offset="0" stopColor="rgba(217,138,43,.45)" /><stop offset="1" stopColor="rgba(217,138,43,0)" /></radialGradient>
                </defs>
                <path d="M14 78 Q150 -30 286 78" style={{ stroke: 'var(--track2)' }} strokeWidth="1.5" strokeDasharray="3 5" fill="none" />
                <path d="M14 78 Q150 -30 286 78" stroke="url(#av-ag)" strokeWidth="2.5" fill="none" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={seen ? 1 - t : 1} style={{ transition: reduce() ? 'none' : 'stroke-dashoffset 1.6s cubic-bezier(.2,.8,.2,1)' }} />
                <line x1="0" y1="78" x2="300" y2="78" style={{ stroke: 'var(--track)' }} />
                <circle cx={bx} cy={by} r="16" fill="url(#av-sg)" opacity={night ? 0.3 : 1} />
                <circle cx={bx} cy={by} r="6" style={{ fill: night ? 'var(--t3)' : 'var(--sun)' }} />
              </svg>
              <div className="av-arc-l"><span>Sunrise <b>{data.sunrise}</b></span><span>{night ? (now >= SS ? 'Sun has set' : 'Before sunrise') : `${Math.floor(left / 60)}h ${left % 60}m of daylight left`}</span><span>Sunset <b>{data.sunset}</b></span></div>
            </div>
            <div className="av-pgrid">
              <div className="av-pi"><small>Tithi</small><b>{data.tithi}</b></div>
              <div className="av-pi"><small>Nakshatra</small><b>{data.nakshatra}</b></div>
              <div className="av-pi"><small>Yoga</small><b>{data.yoga}</b></div>
              <div className="av-pi"><small>Rahu Kaal</small><b>{hhmm(rs)} – {hhmm(re)}</b><br /><span className={`av-status ${rahu.c}`}>{rahu.t}</span></div>
            </div>
            <div className="av-pfoot"><span><Icon n="sun" s={15} style={{ color: 'var(--amber)' }} />Sun in {data.sunSign}</span><span><Icon n="moon" s={15} style={{ color: 'var(--t2)' }} />Moon in {data.moonSign}</span></div>
          </>
        )}
      </section>
    </>
  );
}

/* ---------------- Page ---------------- */
function HomeSkeleton() {
  return (
    <div style={{ padding: '16px 18px' }} aria-busy="true" aria-label="Loading home">
      <div className="av-sk" style={{ height: 196, borderRadius: 22 }} />
      <div className="av-card" style={{ margin: '14px 0 0', padding: '10px 8px', display: 'flex', justifyContent: 'space-around', gap: 6 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div className="av-sk" style={{ width: 44, height: 44, borderRadius: 14 }} />
            <div className="av-sk" style={{ width: 38, height: 8, borderRadius: 4 }} />
          </div>
        ))}
      </div>
      <div className="av-sk" style={{ height: 18, width: 140, marginTop: 24, borderRadius: 6 }} />
      <div style={{ display: 'flex', gap: 10, marginTop: 12, overflow: 'hidden' }}>
        {[0, 1, 2].map((i) => <div key={i} className="av-sk" style={{ height: 205, flex: '0 0 146px', borderRadius: 18 }} />)}
      </div>
      <div className="av-card" style={{ margin: '22px 0 0' }}>
        <div className="av-sk" style={{ height: 18, width: '50%', marginBottom: 12 }} />
        <div className="av-sk" style={{ height: 76, borderRadius: 14 }} />
      </div>
    </div>
  );
}

export default function HomePage() {
  const { me } = userAuth.useAuth();
  const { data, loading } = useAppData();
  if (loading && !data) return <><FindBar me={me} /><HomeSkeleton /></>;
  if (!data) return <><FindBar me={me} /><div className="av-card" style={{ marginTop: 16 }}><p className="av-empty">Couldn't load the home screen. Pull to refresh or try again shortly.</p></div></>;

  const render = (s) => {
    switch (s.key) {
      case 'posters': return <Posters key={s.key} banners={data.banners} />;
      case 'services': return <Services key={s.key} items={data.categories} title={s.title} />;
      case 'astrologers': return <Astrologers key={s.key} list={data.astrologers} title={s.title} />;
      case 'horoscope': return <Horoscope key={s.key} title={s.title} defaultSign={me?.zodiac} />;
      case 'promo': return <Promo key={s.key} p={data.config.promo} />;
      case 'panchang': return <Panchang key={s.key} title={s.title} me={me} />;
      case 'reports': return <Products key={s.key} items={data.reports} title={s.title} tab="reports" />;
      case 'remedies': return <Products key={s.key} items={data.remedies} title={s.title} tab="remedies" />;
      default: return null;
    }
  };
  return (
    <>
      <FindBar me={me} />
      {data.config.sections.filter((s) => s.visible).map(render)}
      <div style={{ height: 8 }} />
    </>
  );
}
