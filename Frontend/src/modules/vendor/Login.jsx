import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BadgeCheck, Briefcase, IndianRupee, Landmark, Loader2, Plus, ShieldCheck, UserRound, X } from 'lucide-react';
import { authApi, EXPERTISE, LANGUAGES } from '../../lib/api.js';
import { vendorAuth } from '../../lib/auth.jsx';
import { PageLoader, useToast, cx } from '../../shared/ui.jsx';
import AstroIcon from '../../shared/AstroIcon.jsx';
import { useVendorStatus } from './status.jsx';
import SupportButton from '../../shared/Support.jsx';
import { firstName as firstOf, maskPhone as mask, readSaved, refreshSaved, removeSaved } from '../../shared/savedLogins.js';

/* Astrologer app: login & sign-up.
   - Accounts saved on this device (only when chosen at logout, Instagram-style) → one-tap "Log in" (OTP still sent).
   - Otherwise: mobile number → OTP. Existing account → logged in. New number → sign-up form.
   - The sign-up form shows exactly the fields the admin set (Admin > Astrologer App > Sign-up Details);
     images, texts and colour come from Admin > Astrologer App > Login Screen. */

const readAccounts = () => readSaved('astrologer');
// Only refreshes the name of an account that is already saved; nothing is saved without the person's choice.
const saveAccount = (phone, name) => refreshSaved('astrologer', { phone, name });
const dropAccount = (phone) => removeSaved('astrologer', phone);
const fmt = (d) => (d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d);

const DEFAULT = {
  title: 'AstroVani Pro', subtitle: 'Astrologer partner panel',
  screen: { slides: [{ imageUrl: '/store/navagraha-puja.jpg', title: 'Your wisdom, their answers', subtitle: 'Consult seekers by chat, call and video.' }], intervalSec: 4, welcomeTitle: 'Welcome, Acharya', welcomeText: 'Log in with your registered mobile number.', signupTitle: 'Join as an astrologer', signupText: 'Create your partner account in 2 minutes.', points: [], accent: '#B9542C' },
  fields: { email: { show: true }, experience: { show: true, required: true }, expertise: { show: true }, languages: { show: true }, bio: { show: true }, pricePerMin: { show: true }, kyc: { show: true, required: true } },
};

const input = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--acc)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--acc)_15%,transparent)]';
const Label = ({ children, optional }) => <span className="mb-1.5 block text-[12.5px] font-semibold text-slate-700">{children}{optional && <span className="font-normal text-slate-400"> (optional)</span>}</span>;

function Chips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o);
        return <button type="button" key={o} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])} className={cx('rounded-full border px-3 py-1.5 text-xs font-semibold transition', on ? 'border-transparent bg-[var(--acc)] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>{o}</button>;
      })}
    </div>
  );
}

function Section({ icon: I, title, children }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <p className="mb-3 flex items-center gap-2 text-[13px] font-bold text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--acc)_14%,white)] text-[var(--acc)]"><I size={15} /></span>{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/* Image slideshow with captions (admin managed). */
function Hero({ sc, brand, logo, compact }) {
  const slides = sc.slides?.length ? sc.slides : DEFAULT.screen.slides;
  const [cur, setCur] = useState(0);
  useEffect(() => {
    setCur(0);
    if (slides.length < 2) return undefined;
    const t = setInterval(() => !document.hidden && setCur((c) => (c + 1) % slides.length), Math.max(2, sc.intervalSec || 4) * 1000);
    return () => clearInterval(t);
  }, [slides.length, sc.intervalSec]);
  const s = slides[cur] || {};
  return (
    <div className={cx('relative overflow-hidden bg-slate-900 transition-all duration-500', compact ? 'h-44 lg:h-full' : 'h-[46vh] min-h-[300px] lg:h-full')}>
      {slides.map((x, i) => <img key={x.imageUrl + i} src={x.imageUrl} alt="" className={cx('absolute inset-0 h-full w-full object-cover transition-opacity duration-1000', i === cur ? 'opacity-100' : 'opacity-0')} />)}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-black/80" />
      <div className="absolute inset-x-0 top-0 flex items-center gap-2.5 p-5">
        <img src={logo} alt="" className="h-10 w-10 rounded-xl bg-white/10 object-contain p-1 backdrop-blur" />
        <div className="text-white"><p className="text-[17px] font-bold leading-tight">{brand.title}</p>{brand.subtitle && <p className="text-[11.5px] text-white/75">{brand.subtitle}</p>}</div>
      </div>
      {!compact && (
        <div className="absolute inset-x-0 bottom-0 p-5 pb-12 text-white lg:pb-10">
          {s.title && <h2 key={`t${cur}`} className="text-2xl font-bold leading-tight drop-shadow">{s.title}</h2>}
          {s.subtitle && <p key={`s${cur}`} className="mt-1 max-w-sm text-sm text-white/85">{s.subtitle}</p>}
          {slides.length > 1 && <div className="mt-3 flex gap-1.5">{slides.map((_, i) => <button key={i} type="button" onClick={() => setCur(i)} aria-label={`Slide ${i + 1}`} className={cx('h-1.5 rounded-full transition-all', i === cur ? 'w-6 bg-white' : 'w-1.5 bg-white/50')} />)}</div>}
        </div>
      )}
    </div>
  );
}

export default function Login() {
  const { me, loading, login } = vendorAuth.useAuth();
  const { status } = useVendorStatus();
  const nav = useNavigate();
  const toast = useToast();
  const sg = status?.astroSignup || DEFAULT;
  const sc = { ...DEFAULT.screen, ...(sg.screen || {}) };
  const F = sg.fields || DEFAULT.fields;
  const show = (k) => !!F[k]?.show;
  const need = (k) => !!F[k]?.required;
  const logo = status?.brand?.logoUrl || '/favicon.svg';
  const chat = status?.services?.chat;
  const cu = chat ? (chat.block === 1 ? 'min' : chat.block === 60 ? 'hr' : `${chat.block} min`) : 'min';
  const cr = (v) => Math.round(v * (chat?.block || 1) * 100) / 100;

  const [accounts, setAccounts] = useState(readAccounts);
  const [step, setStep] = useState(() => (readAccounts().length ? 'accounts' : 'phone')); // accounts | phone | otp | form
  const [intent, setIntent] = useState('login'); // login | signup
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [signupToken, setSignupToken] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [f, setF] = useState({ name: '', email: '', experience: '', bio: '', pricePerMin: '', expertise: [], languages: [], panNumber: '', aadhaarLast4: '', bankAccount: '', ifsc: '' });
  const otpRef = useRef(null);
  useEffect(() => { if (resendIn <= 0) return undefined; const t = setTimeout(() => setResendIn((x) => x - 1), 1000); return () => clearTimeout(t); }, [resendIn]);
  useEffect(() => { if (chat && f.pricePerMin === '') setF((x) => ({ ...x, pricePerMin: cr(chat.defaultRate) })); }, [chat]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <PageLoader variant="auth" />;
  if (me) return <Navigate to="/vendor" replace />;

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const sendOtp = async (number = phone) => {
    if (!/^\d{10}$/.test(number)) return toast('Enter a valid 10-digit mobile number', 'error');
    setBusy(true);
    try {
      const r = await authApi.post('/auth/astrologer/send-otp', { phone: number });
      setPhone(number); setHint(r.devHint || ''); setOtp(''); setStep('otp'); setResendIn(30);
      setTimeout(() => otpRef.current?.focus(), 100);
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const verify = async (code = otp) => {
    if (code.length !== 6 || busy) return;
    setBusy(true);
    try {
      const r = await authApi.post('/auth/astrologer/login', { phone, otp: code });
      if (r.isNew) {
        // Number verified, no account yet: complete the sign-up the admin set up.
        setSignupToken(r.signupToken);
        setStep('form');
        if (intent === 'login') toast('No account for this number yet. Complete your sign-up below.');
      } else {
        saveAccount(phone, r.astrologer.name);
        if (intent === 'signup') toast('You already have an account. Logged you in.', 'success');
        login(r.token, r.astrologer);
        nav('/vendor', { replace: true });
      }
    } catch (e) { toast(e.message, 'error'); setOtp(''); otpRef.current?.focus(); } finally { setBusy(false); }
  };
  const register = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await authApi.post('/auth/astrologer/register', {
        ...f, phone, signupToken, experience: f.experience === '' ? undefined : +f.experience,
        pricePerMin: (+f.pricePerMin || 0) / (chat?.block || 1),
        kyc: { panNumber: f.panNumber.toUpperCase(), aadhaarLast4: f.aadhaarLast4, bankAccount: f.bankAccount, ifsc: f.ifsc.toUpperCase() },
      });
      saveAccount(phone, r.astrologer.name);
      toast('Application submitted. Our team will verify your profile.', 'success');
      login(r.token, r.astrologer);
      nav('/vendor', { replace: true });
    } catch (err) {
      toast(err.message, 'error');
      if (/expired/i.test(err.message)) { setStep('phone'); setSignupToken(''); }
    } finally { setBusy(false); }
  };
  const startSignup = () => { setIntent('signup'); setStep('phone'); setPhone(''); };
  const startLogin = () => { setIntent('login'); setStep(accounts.length ? 'accounts' : 'phone'); setPhone(''); };
  const removeAcc = (a) => { dropAccount(a.phone); const left = readAccounts(); setAccounts(left); if (!left.length) setStep('phone'); };

  const isForm = step === 'form';
  const btn = 'flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--acc)] text-[15px] font-bold text-white shadow-[0_10px_24px_-12px_var(--acc)] transition hover:brightness-110 active:scale-[.99] disabled:opacity-50';

  return (
    <div className="min-h-[100dvh] bg-slate-950 lg:grid lg:grid-cols-[1.05fr_1fr]" style={{ '--acc': sc.accent }}>
      <div className="lg:sticky lg:top-0 lg:h-[100dvh]"><Hero sc={sc} brand={sg} logo={logo} compact={isForm} /></div>

      <div className="relative -mt-7 rounded-t-[28px] bg-white px-5 pb-10 pt-6 lg:mt-0 lg:flex lg:min-h-[100dvh] lg:items-center lg:justify-center lg:rounded-none lg:px-10">
        <div className="mx-auto w-full max-w-md">
          {step === 'accounts' && (
            <>
              <h1 className="text-[22px] font-bold text-slate-900">{sc.welcomeTitle || 'Welcome back'}</h1>
              <p className="mt-1 text-sm text-slate-500">Choose your saved account to log in.</p>
              <div className="mt-5 space-y-2.5">
                {accounts.map((a) => (
                  <div key={a.phone} className="flex items-center gap-1.5">
                    <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--acc)] text-lg font-bold text-white">{a.avatar ? <img src={a.avatar} alt="" className="h-full w-full object-cover" /> : (firstOf(a.name)[0] || '+').toUpperCase()}</span>
                      <span className="min-w-0 flex-1"><b className="block truncate text-[15px] text-slate-900">{a.name || 'Saved account'}</b><small className="text-xs text-slate-400">{mask(a.phone)}</small></span>
                      <button type="button" disabled={busy} onClick={() => { setIntent('login'); sendOtp(a.phone); }} className="flex h-9 shrink-0 items-center justify-center rounded-lg bg-[var(--acc)] px-4 text-[13px] font-bold text-white disabled:opacity-60">
                        {busy && phone === a.phone ? <Loader2 size={16} className="animate-spin" /> : 'Log in'}
                      </button>
                    </div>
                    <button type="button" onClick={() => removeAcc(a)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100" aria-label="Remove from this device"><X size={15} /></button>
                  </div>
                ))}
                <button type="button" onClick={() => { setIntent('login'); setStep('phone'); }} className="flex h-12 w-full items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-slate-300 text-sm font-bold text-[var(--acc)]"><Plus size={16} /> Log in with another number</button>
                <button type="button" onClick={startSignup} className="flex h-12 w-full items-center justify-center rounded-2xl border-[1.5px] border-[var(--acc)] text-sm font-bold text-[var(--acc)]">Create new account</button>
              </div>
            </>
          )}

          {step === 'phone' && (
            <form onSubmit={(e) => { e.preventDefault(); sendOtp(); }}>
              {(intent === 'signup' || accounts.length > 0) && <button type="button" onClick={intent === 'signup' ? startLogin : () => setStep('accounts')} className="mb-3 flex items-center gap-1 text-xs font-semibold text-slate-500"><ArrowLeft size={14} /> Back</button>}
              <h1 className="text-[22px] font-bold text-slate-900">{intent === 'signup' ? sc.signupTitle || 'Create your account' : sc.welcomeTitle || 'Welcome back'}</h1>
              <p className="mt-1 text-sm text-slate-500">{intent === 'signup' ? sc.signupText : sc.welcomeText}</p>
              <label className="mt-5 block">
                <Label>Mobile number</Label>
                <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-[var(--acc)] focus-within:ring-4 focus-within:ring-[color-mix(in_srgb,var(--acc)_15%,transparent)]">
                  <span className="border-r border-slate-100 px-3.5 py-3 text-sm font-bold text-slate-700">+91</span>
                  <input autoFocus inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" value={fmt(phone)} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').slice(0, 10))} className="w-full px-3.5 py-3 text-[15px] font-semibold tracking-wide text-slate-900 outline-none" />
                  {phone.length === 10 && <BadgeCheck size={18} className="mr-3 shrink-0 text-emerald-500" />}
                </div>
              </label>
              <button type="submit" disabled={busy || phone.length !== 10} className={cx(btn, 'mt-4')}>{busy ? <Loader2 size={18} className="animate-spin" /> : <>{intent === 'signup' ? 'Create account' : 'Log in'} <ArrowRight size={17} /></>}</button>
              {intent === 'login' ? (
                <div className="mt-7">
                  <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" />New astrologer?<span className="h-px flex-1 bg-slate-200" /></div>
                  <button type="button" onClick={startSignup} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-[var(--acc)] text-[15px] font-bold text-[var(--acc)] transition hover:bg-[color-mix(in_srgb,var(--acc)_6%,white)]">Create new account</button>
                </div>
              ) : (
                <p className="mt-4 text-center text-sm text-slate-500">Already registered? <button type="button" onClick={startLogin} className="font-bold text-[var(--acc)]">Log in</button></p>
              )}
              {sc.points?.length > 0 && (
                <ul className="mt-6 grid grid-cols-3 gap-2">
                  {sc.points.map((x, i) => <li key={i} className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-100 bg-slate-50 px-2 py-3 text-center text-[11px] font-semibold text-slate-700"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--acc)] text-white"><AstroIcon n={x.icon} s={16} /></span>{x.text}</li>)}
                </ul>
              )}
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={(e) => { e.preventDefault(); verify(); }}>
              <button type="button" onClick={() => setStep(intent === 'login' && accounts.some((a) => a.phone === phone) ? 'accounts' : 'phone')} className="mb-3 flex items-center gap-1 text-xs font-semibold text-slate-500"><ArrowLeft size={14} /> Back</button>
              {accounts.find((a) => a.phone === phone)?.name && <p className="text-xs font-bold uppercase tracking-widest text-[var(--acc)]">Namaste, {firstOf(accounts.find((a) => a.phone === phone).name)}</p>}
              <h1 className="text-[22px] font-bold text-slate-900">Verify your number</h1>
              <p className="mt-1 text-sm text-slate-500">Enter the 6-digit code sent to <b className="text-slate-800">+91 {fmt(phone)}</b></p>
              <div className="relative mt-5" onClick={() => otpRef.current?.focus()}>
                <div className="grid grid-cols-6 gap-2">{Array.from({ length: 6 }, (_, i) => <span key={i} className={cx('flex h-12 items-center justify-center rounded-xl border text-lg font-bold text-slate-900', otp[i] ? 'border-[var(--acc)] bg-[color-mix(in_srgb,var(--acc)_6%,white)]' : i === otp.length ? 'border-slate-400' : 'border-slate-200')}>{otp[i] || ''}</span>)}</div>
                <input ref={otpRef} inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label="6-digit OTP" value={otp} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setOtp(v); if (v.length === 6) verify(v); }} className="absolute inset-0 opacity-0" />
              </div>
              {hint && <p className="mt-2 text-center text-xs text-slate-400">{hint}</p>}
              <button type="submit" disabled={busy || otp.length !== 6} className={cx(btn, 'mt-4')}>{busy ? <Loader2 size={18} className="animate-spin" /> : 'Verify & continue'}</button>
              <p className="mt-3 text-center text-xs text-slate-500">{resendIn > 0 ? `Resend code in 0:${String(resendIn).padStart(2, '0')}` : <button type="button" onClick={() => sendOtp()} className="font-bold text-[var(--acc)]">Resend code</button>}</p>
            </form>
          )}

          {isForm && (
            <form onSubmit={register} className="space-y-4">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><BadgeCheck size={14} /> +91 {fmt(phone)} verified</p>
                <h1 className="mt-1 text-[22px] font-bold text-slate-900">{sc.signupTitle || 'Complete your profile'}</h1>
                <p className="mt-1 text-sm text-slate-500">{sc.signupText}</p>
              </div>
              <Section icon={UserRound} title="About you">
                <label className="block"><Label>Full name</Label><input className={input} value={f.name} onChange={set('name')} required maxLength={60} placeholder="Pt. Ramesh Sharma" /></label>
                {show('email') && <label className="block"><Label optional={!need('email')}>Email</Label><input className={input} type="email" value={f.email} onChange={set('email')} required={need('email')} placeholder="you@example.com" /></label>}
                {show('bio') && <label className="block"><Label optional={!need('bio')}>About you</Label><textarea className={input} rows={3} value={f.bio} onChange={set('bio')} required={need('bio')} maxLength={600} placeholder="Your background, style and what you help with" /></label>}
              </Section>
              {(show('experience') || show('expertise') || show('languages')) && (
                <Section icon={Briefcase} title="Experience & expertise">
                  {show('experience') && <label className="block"><Label optional={!need('experience')}>Experience (years)</Label><input className={input} type="number" min={0} max={80} value={f.experience} onChange={set('experience')} required={need('experience')} /></label>}
                  {show('expertise') && <div><Label optional={!need('expertise')}>Expertise</Label><Chips options={EXPERTISE} value={f.expertise} onChange={(v) => setF((s) => ({ ...s, expertise: v }))} /></div>}
                  {show('languages') && <div><Label optional={!need('languages')}>Languages</Label><Chips options={LANGUAGES} value={f.languages} onChange={(v) => setF((s) => ({ ...s, languages: v }))} /></div>}
                </Section>
              )}
              {show('pricePerMin') && (
                <Section icon={IndianRupee} title="Your price">
                  <label className="block">
                    <Label optional={!need('pricePerMin')}>Chat price (₹ per {cu})</Label>
                    <input className={input} type="number" step="any" min={chat ? cr(chat.minRate) : 1} max={chat ? cr(chat.maxRate) : undefined} value={f.pricePerMin} onChange={set('pricePerMin')} required={need('pricePerMin')} />
                    {chat && <span className="mt-1 block text-[11px] text-slate-400">Allowed ₹{cr(chat.minRate)} – ₹{cr(chat.maxRate)} per {cu}. Call & video rates start at the default and can be changed later.</span>}
                  </label>
                </Section>
              )}
              {show('kyc') && (
                <Section icon={Landmark} title={`KYC & bank${need('kyc') ? '' : ' (optional now)'}`}>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block"><Label>PAN number</Label><input className={cx(input, 'uppercase')} maxLength={10} value={f.panNumber} onChange={set('panNumber')} required={need('kyc')} placeholder="ABCDE1234F" /></label>
                    <label className="block"><Label>Aadhaar (last 4)</Label><input className={input} inputMode="numeric" maxLength={4} value={f.aadhaarLast4} onChange={(e) => setF((s) => ({ ...s, aadhaarLast4: e.target.value.replace(/\D/g, '') }))} required={need('kyc')} /></label>
                    <label className="block"><Label>Bank account no.</Label><input className={input} inputMode="numeric" value={f.bankAccount} onChange={(e) => setF((s) => ({ ...s, bankAccount: e.target.value.replace(/\D/g, '') }))} required={need('kyc')} /></label>
                    <label className="block"><Label>IFSC</Label><input className={cx(input, 'uppercase')} maxLength={11} value={f.ifsc} onChange={set('ifsc')} required={need('kyc')} placeholder="SBIN0001234" /></label>
                  </div>
                  <p className="flex items-start gap-1.5 text-[11px] text-slate-500"><ShieldCheck size={13} className="mt-px shrink-0 text-emerald-600" />{need('kyc') ? 'Verified by our team before you can go live or withdraw.' : 'Needed before your first withdrawal.'}</p>
                </Section>
              )}
              <button type="submit" disabled={busy} className={btn}>{busy ? <Loader2 size={18} className="animate-spin" /> : 'Submit application'}</button>
            </form>
          )}

          {/* Help before logging in: goes to Admin > Astrologers > Support queries */}
          <SupportButton app="astrologer" className="mx-auto mt-6 flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Need help? <b className="text-[var(--acc)]">Contact support</b></SupportButton>
          <p className="mt-4 text-center text-[11.5px] leading-relaxed text-slate-400">
            By continuing, you agree to our <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-slate-600 underline">Astrologer Terms</a>, <a href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-slate-600 underline">Privacy Policy</a> &amp; <a href="/refund" target="_blank" rel="noreferrer" className="font-semibold text-slate-600 underline">Refund Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
