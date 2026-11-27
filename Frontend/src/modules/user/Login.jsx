import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Check, Orbit, Sparkles, Star } from 'lucide-react';
import { api, authApi, inr } from '../../lib/api.js';
import { userAuth } from '../../lib/auth.jsx';
import { PageLoader, useAsync, useToast } from '../../shared/ui.jsx';
import { Icon, useAV, useAppData, vibrate } from './av.jsx';
import { resolveTrust } from '../../shared/loginTrust.js';
import SupportButton from '../../shared/Support.jsx';
import { forgetAccount, markSignupStarted, missingSignup, readAccounts, rememberAccount } from './accounts.js';

const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const fmtPhone = (d) => (d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d);
const RESEND_AFTER = 30;
// Shown on the one-tap account buttons: +91 98••• ••210
const maskPhone = (d) => `+91 ${d.slice(0, 2)}••• ••${d.slice(7)}`;

const IndiaFlag = () => (
  <svg width="22" height="15" viewBox="0 0 30 20" aria-hidden="true" style={{ borderRadius: 3, boxShadow: '0 0 0 1px rgba(0,0,0,.08)' }}>
    <rect width="30" height="20" fill="#fff" /><rect width="30" height="6.67" fill="#FF9933" /><rect y="13.33" width="30" height="6.67" fill="#138808" />
    <circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" strokeWidth=".7" /><circle cx="15" cy="10" r=".5" fill="#000080" />
  </svg>
);

/* Background slideshow; slides/timing come from Admin > App Management > Login screen. */
function useSlideshow(count, seconds) {
  const [cur, setCur] = useState(0);
  useEffect(() => {
    setCur(0);
    if (count < 2) return undefined;
    const t = setInterval(() => { if (!document.hidden) setCur((c) => (c + 1) % count); }, Math.max(2, seconds) * 1000);
    return () => clearInterval(t);
  }, [count, seconds]);
  return [cur, setCur];
}

/* Keeps the focused field above the on-screen keyboard: measures the keyboard via visualViewport,
   pads the scroll area by that much and scrolls the field into view. */
// Smoothly lifts the tapped field to ~30% from the top of the visible area (only ever upwards, never a big jump).
// It never adds blank space: if the page can't scroll that far, the field moves up as far as the page allows.
export function liftIntoView(scroller, el) {
  if (!scroller || !el) return;
  const vv = window.visualViewport;
  const s = scroller.getBoundingClientRect();
  const visible = vv ? Math.min(s.bottom, vv.height + vv.offsetTop) - s.top : s.height;
  const delta = el.getBoundingClientRect().top - (s.top + visible * 0.3);
  const room = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;
  const by = Math.min(delta, room);
  if (by > 6) scroller.scrollBy({ top: by, behavior: reduce() ? 'auto' : 'smooth' });
}

function useKeyboardSafe(scrollRef) {
  const [kb, setKb] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const on = () => {
      const h = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      setKb(h > 80 ? h : 0);
      const el = document.activeElement;
      if (h > 80 && el && scrollRef.current?.contains(el)) liftIntoView(scrollRef.current, el.closest('label, .av-l2-otp') || el);
    };
    vv.addEventListener('resize', on);
    vv.addEventListener('scroll', on);
    return () => { vv.removeEventListener('resize', on); vv.removeEventListener('scroll', on); };
  }, [scrollRef]);
  return kb;
}

/* Bottom badges: configured in Admin > Login screen (live platform numbers or custom text). */
function TrustBadges({ lc, stats }) {
  if (lc.showTrust === false) return null;
  const items = resolveTrust(lc.trust, stats);
  if (!items.length) return null;
  return (
    <div className="av-l4-trust" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((t, i) => <div key={i}><b><Icon n={t.icon} s={14} />{t.value}</b>{t.label && <small>{t.label}</small>}</div>)}
    </div>
  );
}

/* Offer badge text comes from Admin > Login screen; {bonus} is the real sign-up bonus from Platform settings. */
function OfferBadge({ lc, bonus }) {
  const text = (lc.offerText || '').trim();
  if (lc.showOffer === false || !text) return null;
  const needsBonus = text.includes('{bonus}');
  if (needsBonus && !(bonus > 0)) return null;
  const parts = text.split('{bonus}');
  return (
    <div className="av-l4-ticket"><div className="av-l4-tk-ic"><span><Icon n="gift" s={16} /></span></div>
      <p>{lc.offerLabel && <small>{lc.offerLabel}</small>}{parts.map((p, i) => <span key={i}>{p}{i < parts.length - 1 && <b>{inr(bonus)}</b>}</span>)}</p>
    </div>
  );
}

const Mandala = () => <Orbit size={620} strokeWidth={0.35} className="av-l4-mandala" aria-hidden="true" />;

export default function Login() {
  const { me, loading, login } = userAuth.useAuth();
  const { theme, setTheme } = useAV();
  const { data: app, loading: appLoading } = useAppData();
  const { data: stats } = useAsync(() => api.public.get('/public/stats'));
  const nav = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  const [step, setStep] = useState('phone');
  // One flow for everyone: mobile number → OTP. The server says whether the number is new:
  // existing users go straight to Home, new users go through the sign-up steps.
  // Accounts saved at logout (Instagram-style) show first for one-tap login.
  const [accounts, setAccounts] = useState(readAccounts);
  const [mode, setMode] = useState(() => (readAccounts().length ? 'saved' : 'phone')); // saved | phone
  const [picked, setPicked] = useState(null); // saved account being logged into, for the OTP screen greeting
  const [phone, setPhone] = useState('');
  const known = mode === 'saved';
  const [otp, setOtp] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | busy | done
  const [hint, setHint] = useState('');
  const [focused, setFocused] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const scrollRef = useRef(null);
  const otpRef = useRef(null);
  const kb = useKeyboardSafe(scrollRef);

  const brand = app?.config?.brand || { name: 'AstroVani', tagline: '' };
  const lc = app?.config?.login || {};
  const slides = lc.slides || [];
  const [cur, setCur] = useSlideshow(slides.length, lc.intervalSec || 4);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  if (loading || (appLoading && !app)) return <PageLoader variant="auth" />;
  if (me) return <Navigate to={loc.state?.from || '/user'} replace />;

  const ready = phone.length === 10;
  const sendOtp = async (e, number = phone) => {
    e?.preventDefault();
    if (number.length !== 10 || phase === 'busy') return;
    setPhase('busy');
    try {
      const r = await authApi.post('/auth/user/send-otp', { phone: number });
      setHint(r.devHint || '');
      setPhase('done'); vibrate();
      setTimeout(() => { setStep('otp'); setOtp(''); setPhase('idle'); setResendIn(RESEND_AFTER); }, reduce() ? 0 : 450);
    } catch (err) { toast(err.message, 'error'); setPhase('idle'); }
  };
  const verify = async (code = otp) => {
    if (code.length !== 6 || phase === 'busy') return;
    setPhase('busy');
    try {
      const r = await authApi.post('/auth/user/verify-otp', { phone, otp: code });
      setPhase('done'); vibrate();
      rememberAccount({ phone, name: r.user.name });
      setTimeout(() => {
        login(r.token, r.user);
        // New user, or details the admin made required are missing: sign-up comes first.
        const needsSignup = missingSignup(r.user, app?.config?.signup?.customer?.fields).length > 0;
        if (needsSignup) markSignupStarted(r.user._id);
        nav(needsSignup ? '/user/welcome' : loc.state?.from || '/user', { replace: true });
      }, reduce() ? 0 : 450);
    } catch (err) { toast(err.message, 'error'); setPhase('idle'); setOtp(''); otpRef.current?.focus(); }
  };

  const fill = (t) => (t || '').replaceAll('{app}', brand.name);
  const firstOf = (n) => (n || '').trim().split(/\s+/)[0];
  const loginSaved = (a) => { vibrate(); setPicked(a); setPhone(a.phone); sendOtp(null, a.phone); };
  const removeAccount = (a) => {
    forgetAccount(a.phone);
    const left = readAccounts();
    setAccounts(left);
    if (!left.length) setMode('phone');
  };
  const goMode = (m) => { vibrate(); setMode(m); setPicked(null); setPhone(''); };
  const slide = slides[cur];
  const overlay = (lc.overlay ?? 35) / 100;
  const btnInner = (label, icon) => (phase === 'busy' ? <span className="av-l2-spin" aria-label="Please wait" /> : phase === 'done' ? <span className="av-l2-check"><Check size={20} strokeWidth={2.5} /></span> : <>{icon && <Icon n={icon} s={16} />}{label}</>);
  const focusProps = {
    onFocus: (e) => { setFocused(true); const box = e.target.closest('label, .av-l2-otp') || e.target; setTimeout(() => liftIntoView(scrollRef.current, box), 280); },
    onBlur: () => setFocused(false),
  };

  return (
    <div className="av-l4" style={{ '--lg-accent': lc.colors?.accent || '#B9542C', '--lg-hero': lc.colors?.hero || '#7A2A18', '--lg-offer-bg': lc.colors?.offerBg || '#FFD27A', '--lg-offer-tx': lc.colors?.offerText || '#6B3A08' }}>
      <Mandala />
      <div className="av-l4-scroll" ref={scrollRef} style={{ paddingBottom: kb ? kb + 16 : undefined }}>
        <header className="av-l4-top">
          {lc.showLogo !== false && <img src={brand.logoUrl || '/favicon.svg'} alt="" className={brand.logoUrl ? 'custom' : ''} />}
          <div className="av-l4-name"><b>{brand.name}</b>{brand.tagline && <small>{brand.tagline}</small>}</div>
          <button className="av-l4-tgl" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle light or dark theme"><Icon n={theme === 'dark' ? 'sun' : 'moon'} s={17} /></button>
        </header>

        <div className="av-l4-stage">
          <div className="av-l4-archbox">
            <span className="av-l4-frame" aria-hidden="true" />
            <span className="av-l4-apex" aria-hidden="true"><Sparkles size={13} strokeWidth={2} /></span>
            <div className="av-l4-arch">
              {slides.map((s, i) => (
                <div key={s.imageUrl + i} className={`av-lg-slide${i === cur ? ' on' : ''}`} style={{ animationDuration: `${(lc.intervalSec || 4) + 1.5}s` }}><img src={s.imageUrl} alt="" /></div>
              ))}
              <div className="av-l4-shade" style={{ '--ov': overlay }} />
              <div className="av-l4-cap">
                {slide?.title && <h2 key={`t${cur}`}>{slide.title}</h2>}
                {slide?.subtitle && <p key={`s${cur}`}>{slide.subtitle}</p>}
              </div>
            </div>
          </div>
          {slides.length > 1 && <div className="av-l4-dots">{slides.map((_, i) => <button key={i} className={i === cur ? 'on' : ''} onClick={() => setCur(i)} aria-label={`Slide ${i + 1}`} />)}</div>}
        </div>

        <section className="av-l4-form">
          {step === 'phone' && mode === 'phone' && <OfferBadge lc={lc} bonus={stats?.welcomeBonus} />}
          <div key={step} className="av-l2-step">
            {step === 'phone' ? (
              <form onSubmit={sendOtp}>
                <div className="av-l4-orn" aria-hidden="true"><i /><Star size={11} strokeWidth={2} /><i /></div>
                {mode === 'phone' ? (
                  <div className="av-l4-hello">
                    <div className="av-l4-titlewrap"><h1 className="av-l4-title">{fill(lc.newUser?.title) || `Welcome to ${brand.name}`}</h1></div>
                    {lc.newUser?.text && <p className="av-l4-sub">{fill(lc.newUser.text)}</p>}
                  </div>
                ) : (
                  <div className="av-l4-hello">
                    <div className="av-l4-titlewrap"><h1 className="av-l4-title">{fill(lc.returning?.title) || `Welcome back to ${brand.name}`}</h1></div>
                    <p className="av-l4-sub">{known ? 'Choose your saved account to log in.' : fill(lc.returning?.text) || 'Log in with your mobile number.'}</p>
                  </div>
                )}
                {known ? (
                  <div className="av-acc-list">
                    {accounts.map((a) => (
                      <div key={a.phone} className="av-acc">
                        <div className="av-acc-main">
                          <span className="av-acc-av">{a.avatar ? <img src={a.avatar} alt="" /> : (firstOf(a.name)[0] || '+').toUpperCase()}</span>
                          <span className="av-acc-txt"><b>{a.name || 'Saved account'}</b><small>{maskPhone(a.phone)}</small></span>
                          <button type="button" className="av-acc-login" disabled={phase !== 'idle'} onClick={() => loginSaved(a)}>
                            {phase !== 'idle' && picked?.phone === a.phone ? <span className="av-l2-spin" aria-label="Please wait" /> : 'Log in'}
                          </button>
                        </div>
                        <button type="button" className="av-acc-x" onClick={() => removeAccount(a)} aria-label={`Remove ${a.name || 'account'} from this device`}>×</button>
                      </div>
                    ))}
                    <button type="button" className="av-acc-other" onClick={() => goMode('phone')}>Use another number</button>
                  </div>
                ) : <>
                {lc.heading && <p className="av-l4-label">{lc.heading}</p>}
                <label className="av-l2-phone av-l4-field">
                  <span className="av-l2-cc"><IndiaFlag />+91</span>
                  <input inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" aria-label="Mobile number" value={fmtPhone(phone)}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').slice(0, 10))} {...focusProps} />
                  {ready && <span className="av-l2-ok" aria-hidden="true"><Check size={13} strokeWidth={2.8} /></span>}
                </label>
                {lc.subheading && <p className="av-l4-help">{lc.subheading}</p>}
                <button className={`av-l2-btn av-l4-btn${ready ? ' ready' : ''}`} type="submit" disabled={!ready || phase !== 'idle'}>{btnInner('Get OTP')}</button>
                {accounts.length > 0 && <p className="av-l4-notyou"><button type="button" onClick={() => goMode('saved')}>Saved accounts</button></p>}
                </>}
                {/* Feature boxes (Chat & call, Free Kundli, …) sit below the number field so it is the first thing a new user sees. */}
                {mode === 'phone' && lc.newUser?.points?.length > 0 && <ul className="av-l4-points av-l4-points-below">{lc.newUser.points.map((x, i) => <li key={i}><i><Icon n={x.icon} s={16} /></i>{x.text}</li>)}</ul>}
              </form>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); verify(); }}>
                <button type="button" className="av-link av-l4-back" onClick={() => { setStep('phone'); setOtp(''); setHint(''); setPicked(null); }}><Icon n="back" s={14} /> {picked ? 'Back' : 'Change number'}</button>
                <div className="av-l4-orn" aria-hidden="true"><i /><Star size={11} strokeWidth={2} /><i /></div>
                {picked?.name && <p className="av-l4-eb">Namaste, {firstOf(picked.name)}</p>}
                <h1>Verify OTP</h1>
                <p className="av-l4-sub">Code sent to <b>+91 {fmtPhone(phone)}</b></p>
                <div className="av-l2-otp av-l4-otp" onClick={() => otpRef.current?.focus()}>
                  {Array.from({ length: 6 }, (_, i) => <span key={i} className={`${otp[i] ? 'filled' : ''}${i === Math.min(otp.length, 5) && focused ? ' cur' : ''}`}>{otp[i] || ''}</span>)}
                  <input ref={otpRef} autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label="6-digit OTP" value={otp}
                    onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setOtp(v); if (v.length === 6) verify(v); }} {...focusProps} />
                </div>
                {hint && <p className="av-lg-hint">{hint}</p>}
                <button className={`av-l2-btn av-l4-btn${otp.length === 6 ? ' ready' : ''}`} type="submit" disabled={otp.length !== 6 || phase !== 'idle'}>{btnInner('Verify & continue')}</button>
                <p className="av-l2-resend">{resendIn > 0 ? <>Resend code in 0:{String(resendIn).padStart(2, '0')}</> : <button type="button" onClick={() => sendOtp()}>Resend code</button>}</p>
              </form>
            )}
          </div>
          {lc.terms && (
            <p className="av-l4-terms">
              By continuing you agree to our{' '}
              <a href="/terms" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-brand-700">Terms</a>,{' '}
              <a href="/privacy" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-brand-700">Privacy Policy</a> &amp;{' '}
              <a href="/refund" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-brand-700">Refund Policy</a>.
            </p>
          )}
          <TrustBadges lc={lc} stats={stats} />
          {/* Help before logging in: goes to Admin > Users > Queries & support */}
          <SupportButton app="user" className="av-l4-support">Need help? <b>Contact support</b></SupportButton>
        </section>
      </div>
    </div>
  );
}
