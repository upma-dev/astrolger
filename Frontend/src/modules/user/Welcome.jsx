import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { api } from '../../lib/api.js';
import { userAuth } from '../../lib/auth.jsx';
import { PageLoader } from '../../shared/ui.jsx';
import { ZodiacIcon } from '../../shared/AstroIcon.jsx';
import PlaceSearch from './PlaceSearch.jsx';
import TimePicker12 from '../../shared/TimePicker12.jsx';
import { Icon, useAV, useAppData, vibrate } from './av.jsx';
import { clearSignupStarted, missingSignup, rememberAccount, signupStarted } from './accounts.js';

const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const VEDIC = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'];
const GLYPH = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const VS = '︎';
const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
// Order of the sign-up steps; which ones appear (and which are required) is set by the admin
// in App Management > Customer App > Sign-up details.
const ORDER = ['name', 'email', 'gender', 'dob', 'tob', 'pob'];
// Fallback texts/photos until the admin config loads (Admin > Customer App > Sign-up Details sets them).
const DEFAULT_STEPS = {
  name: { imageUrl: '/signup/name.jpg', title: 'What should we call you?', help: 'Astrologers will see this name in chats.' },
  email: { imageUrl: '/signup/email.jpg', title: 'Your email', help: 'For receipts and important account updates.' },
  gender: { imageUrl: '/signup/gender.jpg', title: 'Your gender', help: 'Some readings, like Kundli Milan, depend on it.' },
  dob: { imageUrl: '/signup/dob.jpg', title: 'Date of birth', help: 'Needed to calculate your Moon sign and Kundli.' },
  tob: { imageUrl: '/signup/tob.jpg', title: 'Time of birth', help: 'Check your birth certificate. An exact time gives your Lagna and an accurate chart.' },
  pob: { imageUrl: '/signup/pob.jpg', title: 'Place of birth', help: 'We use its exact location and timezone for your chart.' },
};
const DEFAULT_FIELDS = { name: { show: true, required: true }, gender: { show: true, required: true }, dob: { show: true, required: true }, tob: { show: true, required: true }, pob: { show: true, required: true } };

/* Zodiac wheel that spins and stops with the user's sign under the pointer. */
function RevealWheel({ index, onDone }) {
  const [rot, setRot] = useState(0);
  useEffect(() => {
    // Segment i is centred at i*30+15 degrees clockwise from the top; rotate it back to the top after 4 full turns.
    const target = -(4 * 360 + index * 30 + 15);
    const id = requestAnimationFrame(() => setRot(target));
    const t = setTimeout(onDone, reduce() ? 0 : 3700);
    return () => { cancelAnimationFrame(id); clearTimeout(t); };
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="av-wl-wheel">
      <span className="av-wl-pointer" aria-hidden="true" />
      <svg viewBox="0 0 220 220" style={{ transform: `rotate(${rot}deg)`, transition: reduce() ? 'none' : 'transform 3.6s cubic-bezier(.15,.75,.1,1)' }} aria-hidden="true">
        <circle cx="110" cy="110" r="106" fill="var(--card)" stroke="var(--accent-line)" strokeWidth="2" />
        {SIGNS.map((s, i) => {
          const a0 = ((i * 30 - 90) * Math.PI) / 180, a1 = (((i + 1) * 30 - 90) * Math.PI) / 180, am = (((i + 0.5) * 30 - 90) * Math.PI) / 180;
          const p = (a, r) => `${110 + r * Math.cos(a)} ${110 + r * Math.sin(a)}`;
          return (
            <g key={s}>
              <path d={`M110 110L${p(a0, 104)}A104 104 0 0 1 ${p(a1, 104)}Z`} fill={i === index ? 'var(--accent)' : i % 2 ? 'var(--soft)' : 'var(--soft2)'} stroke="var(--line2)" />
              <g transform={`translate(${110 + 80 * Math.cos(am) - 9}, ${110 + 80 * Math.sin(am) - 9})`} style={{ color: i === index ? '#fff' : 'var(--accent)' }}><ZodiacIcon index={i} size={18} /></g>
            </g>
          );
        })}
        <circle cx="110" cy="110" r="44" fill="var(--card)" stroke="var(--line2)" />
        <g transform="translate(96, 96)" style={{ color: 'var(--accent)' }}><Sparkles size={28} strokeWidth={1.8} /></g>
      </svg>
    </div>
  );
}

// Leaves an unfinished sign-up: drops the login (after render) and opens the mobile number + OTP screen.
function BackToLogin({ logout }) {
  useEffect(() => { logout(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Navigate to="/user/login" replace />;
}

export default function Welcome() {
  const { me, setMe, loading, logout } = userAuth.useAuth();
  const { toast } = useAV();
  const { data: app } = useAppData() || {};
  const signup = app?.config?.signup?.customer;
  const fields = signup?.fields || DEFAULT_FIELDS;
  // "Skip" only leaves optional details for later; details the admin made required always have to be filled in.
  const allowSkip = signup?.allowSkip !== false && missingSignup(me, fields).length === 0;
  const STEPS = ORDER.filter((k) => fields[k]?.show);
  const stepCfg = { ...DEFAULT_STEPS, ...(signup?.steps || {}) };
  const T = (k) => stepCfg[k]?.title || DEFAULT_STEPS[k].title;
  const H = (k) => stepCfg[k]?.help ?? DEFAULT_STEPS[k].help;
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const [f, setF] = useState(() => ({ name: me?.name || '', email: me?.email || '', gender: me?.gender || '', dob: me?.dob || '', tob: me?.tob || '', unknownTime: false, pob: me?.pob || '', lat: me?.lat ?? null, lon: me?.lon ?? null, tz: me?.tz || null }));
  const [busy, setBusy] = useState(false);
  const [chart, setChart] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 350); }, [i]);
  // The profile may arrive after the first render; prefill once it does.
  const filled = useRef(false);
  useEffect(() => {
    if (!me || filled.current) return;
    filled.current = true;
    setF((x) => ({ ...x, name: x.name || me.name || '', email: x.email || me.email || '', gender: x.gender || me.gender || '', dob: x.dob || me.dob || '', tob: x.tob || me.tob || '', pob: x.pob || me.pob || '', lat: x.lat ?? me.lat ?? null, lon: x.lon ?? me.lon ?? null, tz: x.tz || me.tz || null }));
  }, [me]);
  if (loading) return <PageLoader variant="auth" />;
  if (!me) return <Navigate to="/user/login" replace />;
  // Sign-up always starts with number + OTP: opened directly (old saved login) → back to the login screen.
  if (!signupStarted(me._id) && missingSignup(me, fields).length) return <BackToLogin logout={logout} />;

  const key = STEPS[Math.min(i, STEPS.length - 1)];
  const today = new Date().toISOString().slice(0, 10);
  const ok = {
    name: f.name.trim().length >= 2,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()),
    gender: !!f.gender,
    dob: /^\d{4}-\d{2}-\d{2}$/.test(f.dob) && f.dob <= today && f.dob >= '1900-01-01',
    tob: f.unknownTime || /^\d{1,2}:\d{2}$/.test(f.tob),
    pob: f.lat != null && !!f.tz,
  };
  const empty = { name: !f.name.trim(), email: !f.email.trim(), gender: !f.gender, dob: !f.dob, tob: !f.tob && !f.unknownTime, pob: !f.pob };
  // Required steps need a valid answer; optional ones may be left empty but not half-filled.
  const valid = fields[key]?.required ? ok[key] : (empty[key] || ok[key]);

  const submit = async () => {
    setBusy(true);
    try {
      const body = { name: f.name.trim() };
      if (fields.email?.show && f.email.trim()) body.email = f.email.trim();
      if (fields.gender?.show && f.gender) body.gender = f.gender;
      if (fields.dob?.show && f.dob) body.dob = f.dob;
      if (fields.tob?.show) body.tob = f.unknownTime ? '' : f.tob;
      if (fields.pob?.show && f.lat != null) Object.assign(body, { pob: f.pob, lat: f.lat, lon: f.lon, tz: f.tz });
      const r = await api.user.put('/user/me', body);
      setMe(r);
      clearSignupStarted();
      if (r.phone) rememberAccount({ phone: r.phone, name: r.name }); // the login screen greets them by name next time
      if (r.chart) setChart(r.chart);
      else nav('/user', { replace: true });
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const next = () => { if (!valid) return; vibrate(); if (i < STEPS.length - 1) setI(i + 1); else submit(); };

  if (chart) {
    const idx = chart.rashiIndex;
    const first = (me.name || f.name).split(' ')[0];
    return (
      <div className="av-wl">
        <div className="av-wl-reveal">
          <p className="av-wl-eb">{revealed ? 'Your birth chart is ready' : 'Reading the sky at your birth…'}</p>
          <RevealWheel index={idx} onDone={() => { setRevealed(true); vibrate(); }} />
          <div className={`av-wl-result${revealed ? ' in' : ''}`}>
            <h1>Welcome, {first}</h1>
            <p className="av-wl-sign">Your Rashi is <b className="inline-flex items-center gap-1">{VEDIC[idx]} ({SIGNS[idx]}) <ZodiacIcon index={idx} size={17} /></b></p>
            {!chart.rashiCertain && <p className="av-wl-warn">The Moon changed sign on your birth date, so your rashi is {chart.possibleRashis.join(' or ')}. Add your birth time in Profile for an exact answer.</p>}
            <div className="av-wl-facts">
              {chart.nakshatra && <span><small>Nakshatra</small>{chart.nakshatra}</span>}
              {chart.lagna && <span><small>Lagna</small>{chart.lagna}</span>}
              <span><small>Sun sign (Vedic)</small>{chart.sunSign}</span>
            </div>
            <p className="av-wl-note">Calculated from your birth details using the sidereal zodiac (Lahiri). Your home screen horoscope now opens on {SIGNS[idx]}.</p>
            <button className="av-l2-btn ready" onClick={() => nav('/user', { replace: true })}>Continue <Icon n="arrow" s={16} /></button>
          </div>
        </div>
      </div>
    );
  }

  const photo = stepCfg[key]?.imageUrl;
  return (
    <div className={`av-wl${photo ? ' av-wl-photo' : ''}`}>
      {/* Background photo for each step (crossfades as the user moves on); set per step by the admin. */}
      <div className="av-wl-bg" aria-hidden="true">
        {STEPS.map((k) => stepCfg[k]?.imageUrl && <img key={k} src={stepCfg[k].imageUrl} alt="" className={k === key ? 'on' : ''} />)}
        <i />
      </div>
      <svg className="av-wl-deco" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
        <circle cx="100" cy="100" r="96" /><circle cx="100" cy="100" r="70" /><circle cx="100" cy="100" r="32" />
        {SIGNS.map((s, k) => { const a = ((k * 30 + 15 - 90) * Math.PI) / 180, b = ((k * 30 - 90) * Math.PI) / 180; return <g key={s}><line x1={100 + 32 * Math.cos(b)} y1={100 + 32 * Math.sin(b)} x2={100 + 96 * Math.cos(b)} y2={100 + 96 * Math.sin(b)} /><g transform={`translate(${100 + 83 * Math.cos(a) - 6}, ${100 + 83 * Math.sin(a) - 6})`} style={{ color: 'currentColor' }}><ZodiacIcon index={k} size={12} /></g></g>; })}
      </svg>
      <header className="av-wl-top">
        {/* Step 1 "back" = use a different number (goes back to the number + OTP screen). */}
        <button className="av-iconbtn" onClick={() => (i === 0 ? (clearSignupStarted(), logout(), nav('/user/login', { replace: true })) : setI(i - 1))} aria-label={i === 0 ? 'Use a different number' : 'Back'}><Icon n="back" s={18} /></button>
        <div className="av-wl-prog" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={i + 1}><i style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} /></div>
        {allowSkip ? <button className="av-link" onClick={() => nav('/user', { replace: true })}>Skip</button> : <span style={{ width: 38 }} />}
      </header>
      <form key={key} className="av-wl-step" onSubmit={(e) => { e.preventDefault(); next(); }}>
        <p className="av-wl-count">Step {i + 1} of {STEPS.length}</p>
        {key === 'name' && <>
          <h1>{T('name')}</h1>
          {H('name') && <p className="av-wl-help">{H('name')}</p>}
          <input ref={inputRef} className="av-wl-input" value={f.name} maxLength={40} placeholder="Your full name" autoComplete="name" onChange={(e) => setF({ ...f, name: e.target.value })} />
        </>}
        {key === 'email' && <>
          <h1>{T('email')}</h1>
          <p className="av-wl-help">{H('email')}{!fields.email?.required && ' Optional.'}</p>
          <input ref={inputRef} className="av-wl-input" type="email" value={f.email} maxLength={80} placeholder="you@example.com" autoComplete="email" onChange={(e) => setF({ ...f, email: e.target.value })} />
        </>}
        {key === 'gender' && <>
          <h1>{T('gender')}</h1>
          {H('gender') && <p className="av-wl-help">{H('gender')}</p>}
          <div className="av-wl-opts">
            {['Male', 'Female', 'Other'].map((g) => <button type="button" key={g} className={f.gender === g ? 'on' : ''} onClick={() => { vibrate(); setF({ ...f, gender: g }); }}>{g}</button>)}
          </div>
        </>}
        {key === 'dob' && <>
          <h1>{T('dob')}</h1>
          {H('dob') && <p className="av-wl-help">{H('dob')}</p>}
          <input ref={inputRef} className="av-wl-input" type="date" min="1900-01-01" max={today} value={f.dob} onChange={(e) => setF({ ...f, dob: e.target.value })} />
        </>}
        {key === 'tob' && <>
          <h1>{T('tob')}</h1>
          {H('tob') && <p className="av-wl-help">{H('tob')}</p>}
          {/* Hour : minute + AM/PM (saved as 24-hour time). */}
          <TimePicker12 variant="wl" value={f.tob} disabled={f.unknownTime} onChange={(v) => setF((x) => ({ ...x, tob: v }))} />
          <label className="av-wl-check"><input type="checkbox" checked={f.unknownTime} onChange={(e) => setF({ ...f, unknownTime: e.target.checked })} /> I don't know my birth time</label>
        </>}
        {key === 'pob' && <>
          <h1>{T('pob')}</h1>
          {H('pob') && <p className="av-wl-help">{H('pob')}</p>}
          <PlaceSearch label="" autoFocus value={f} onChange={(v) => setF({ ...f, pob: v.pob, lat: v.lat, lon: v.lon, tz: v.tz })} />
        </>}
        <button className={`av-l2-btn${valid ? ' ready' : ''}`} type="submit" disabled={!valid || busy}>
          {busy ? <span className="av-l2-spin" /> : <>{i >= STEPS.length - 1 ? (fields.dob?.show ? 'Reveal my sign' : 'Finish') : (!fields[key]?.required && empty[key] ? 'Skip this' : 'Next')} <Icon n="arrow" s={16} /></>}
        </button>
      </form>
    </div>
  );
}
