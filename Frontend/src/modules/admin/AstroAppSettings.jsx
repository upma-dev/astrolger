import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowUp, Plus, Save, Trash2 } from 'lucide-react';
import { Button, Field, PageLoader, TextArea, cx } from '../../shared/ui.jsx';
import AstroIcon from '../../shared/AstroIcon.jsx';
import { SERVICE_ICONS } from '../../shared/astroIcons.js';
import { ImageInput, Panel } from './kit.jsx';
import SignupFields from './SignupFields.jsx';
import useAppConfig from './global/useAppConfig.js';

/* Astrologer (vendor) app: login / sign-up screen (images, texts, colour) and what is asked when an astrologer registers.
   Everything here is read live by the astrologer app (/vendor/login). */

export const ASTRO_SIGNUP_ROWS = [
  ['name', 'Full name', 'Shown to customers on the profile.', { locked: true }],
  ['phone', 'Mobile number (OTP)', 'Used to log in.', { locked: true }],
  ['email', 'Email', 'For payout and account emails.'],
  ['experience', 'Experience (years)', 'Shown on the profile card.'],
  ['expertise', 'Expertise', 'Vedic, Tarot, Numerology and more.'],
  ['languages', 'Languages', 'Customers filter astrologers by language.'],
  ['bio', 'About you', 'Short introduction on the profile.'],
  ['pricePerMin', 'Price per minute', 'Starting rate; can be changed later.'],
  ['kyc', 'KYC details', 'PAN, Aadhaar last 4, bank account and IFSC.'],
];

const TABS = { login: 'Login Screen', signup: 'Sign-up Details' };
const ACCENTS = ['#B9542C', '#8E2A1E', '#D9741F', '#6D3FC4', '#2F5BD3', '#14805E'];
const box = 'space-y-3 rounded-2xl border border-slate-200 p-4';
const move = (arr, i, d) => { const a = [...arr]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; };

/* Phone preview of /vendor/login: hero slideshow + the screen the admin is editing. */
function Preview({ a, logo, view }) {
  const sc = a.screen;
  const slides = sc.slides.filter((x) => x.imageUrl);
  const [cur, setCur] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return undefined;
    const t = setInterval(() => setCur((c) => (c + 1) % slides.length), Math.max(2, sc.intervalSec) * 1000);
    return () => clearInterval(t);
  }, [slides.length, sc.intervalSec]);
  const s = slides[cur % Math.max(1, slides.length)] || {};
  const asked = ASTRO_SIGNUP_ROWS.filter(([k, , , o]) => !o?.locked && a.fields?.[k]?.show);
  return (
    <div className="mx-auto w-[270px] overflow-hidden rounded-[30px] border-[7px] border-slate-900 bg-white shadow-xl" style={{ '--acc': sc.accent }}>
      <div className="relative h-[210px] bg-slate-800">
        {s.imageUrl && <img src={s.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 to-black/80" />
        <div className="absolute left-3 top-3 flex items-center gap-2 text-white"><img src={logo} alt="" className="h-7 w-7 rounded-lg bg-white/10 object-contain p-0.5" /><div><p className="text-[12px] font-bold leading-tight">{a.title}</p><p className="text-[8.5px] text-white/75">{a.subtitle}</p></div></div>
        <div className="absolute inset-x-3 bottom-6 text-white"><p className="text-[14px] font-bold leading-tight">{s.title}</p><p className="text-[9px] text-white/85">{s.subtitle}</p></div>
      </div>
      <div className="relative -mt-4 space-y-2 rounded-t-[18px] bg-white p-3.5">
        {view === 'signup' ? (
          <>
            <p className="text-[13px] font-bold text-slate-900">{sc.signupTitle}</p>
            <p className="text-[9px] text-slate-500">{sc.signupText}</p>
            <div className="rounded-lg border border-slate-200 px-2 py-1.5 text-[9px] text-slate-400">Full name</div>
            {asked.slice(0, 4).map(([k, l]) => <div key={k} className="flex justify-between rounded-lg border border-slate-200 px-2 py-1.5 text-[9px] text-slate-400"><span>{l}</span>{a.fields[k]?.required && <span className="text-rose-500">*</span>}</div>)}
            {asked.length > 4 && <p className="text-center text-[8.5px] text-slate-400">+ {asked.length - 4} more</p>}
            <div className="rounded-lg py-2 text-center text-[10px] font-bold text-white" style={{ background: sc.accent }}>Submit application</div>
          </>
        ) : (
          <>
            <p className="text-[13px] font-bold text-slate-900">{sc.welcomeTitle}</p>
            <p className="text-[9px] text-slate-500">{sc.welcomeText}</p>
            <div className="flex rounded-lg border border-slate-200 text-[9.5px]"><span className="border-r border-slate-100 px-2 py-1.5 font-bold">+91</span><span className="px-2 py-1.5 text-slate-300">98765 43210</span></div>
            <div className="rounded-lg py-2 text-center text-[10px] font-bold text-white" style={{ background: sc.accent }}>Get OTP</div>
            <div className="rounded-lg border py-1.5 text-center text-[10px] font-bold" style={{ borderColor: sc.accent, color: sc.accent }}>Create account</div>
            {sc.points.length > 0 && <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${sc.points.length}, 1fr)` }}>{sc.points.map((x, i) => <div key={i} className="flex flex-col items-center gap-0.5 rounded-lg bg-slate-50 py-1.5 text-center text-[7.5px] font-semibold text-slate-600"><span className="flex h-5 w-5 items-center justify-center rounded text-white" style={{ background: sc.accent }}><AstroIcon n={x.icon} s={10} /></span>{x.text}</div>)}</div>}
          </>
        )}
      </div>
    </div>
  );
}

function LoginScreenEditor({ a, set }) {
  const sc = a.screen;
  const setSc = (patch) => set({ screen: { ...sc, ...patch } });
  const setSlide = (i, patch) => setSc({ slides: sc.slides.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const pts = [0, 1, 2].map((i) => sc.points[i] || { icon: 'star', text: '' });
  // Empty highlights are kept while editing and dropped by the server on save.
  const setPt = (i, patch) => setSc({ points: pts.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  return (
    <div className="space-y-4">
      <div className={box}>
        <p className="text-sm font-bold text-slate-900">App name</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title" value={a.title || ''} onChange={(e) => set({ title: e.target.value })} maxLength={40} placeholder="AstroVani Pro" />
          <Field label="Subtitle" value={a.subtitle || ''} onChange={(e) => set({ subtitle: e.target.value })} maxLength={80} placeholder="Astrologer partner panel" />
        </div>
        <p className="text-[11px] text-slate-400">The logo is the brand logo (Landing Page &gt; Brand &amp; App Links).</p>
      </div>

      <div className={box}>
        <div className="flex items-center justify-between">
          <div><p className="text-sm font-bold text-slate-900">Top images (slideshow)</p><p className="text-xs text-slate-400">Up to 6. Each can have a heading and a line of text.</p></div>
          <Button size="sm" variant="outline" disabled={sc.slides.length >= 6} onClick={() => setSc({ slides: [...sc.slides, { imageUrl: '', title: '', subtitle: '' }] })}><Plus size={14} /> Add image</Button>
        </div>
        {sc.slides.map((x, i) => (
          <div key={i} className="grid gap-3 rounded-xl bg-slate-50 p-3 lg:grid-cols-[1fr_1fr_auto]">
            <ImageInput label={`Image ${i + 1}`} value={x.imageUrl} onChange={(v) => setSlide(i, { imageUrl: v })} aspect="aspect-[4/3]" />
            <div className="space-y-2">
              <Field label="Heading" value={x.title} maxLength={50} onChange={(e) => setSlide(i, { title: e.target.value })} />
              <Field label="Text" value={x.subtitle} maxLength={100} onChange={(e) => setSlide(i, { subtitle: e.target.value })} />
            </div>
            <div className="flex gap-1 lg:flex-col">
              <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 disabled:opacity-30" disabled={i === 0} onClick={() => setSc({ slides: move(sc.slides, i, -1) })} aria-label="Move up"><ArrowUp size={15} /></button>
              <button type="button" className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" onClick={() => setSc({ slides: sc.slides.filter((_, j) => j !== i) })} aria-label="Remove image"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
        <Field label="Change image every (seconds)" type="number" min={2} max={15} value={sc.intervalSec} onChange={(e) => setSc({ intervalSec: +e.target.value })} className="max-w-[220px]" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={box}>
          <p className="text-sm font-bold text-slate-900">Login</p>
          <Field label="Heading" value={sc.welcomeTitle} maxLength={50} onChange={(e) => setSc({ welcomeTitle: e.target.value })} />
          <TextArea label="Text" rows={2} value={sc.welcomeText} maxLength={140} onChange={(e) => setSc({ welcomeText: e.target.value })} />
        </div>
        <div className={box}>
          <p className="text-sm font-bold text-slate-900">Create account</p>
          <Field label="Heading" value={sc.signupTitle} maxLength={50} onChange={(e) => setSc({ signupTitle: e.target.value })} />
          <TextArea label="Text" rows={2} value={sc.signupText} maxLength={160} onChange={(e) => setSc({ signupText: e.target.value })} />
        </div>
      </div>

      <div className={box}>
        <p className="text-sm font-bold text-slate-900">Highlights under the form <span className="font-normal text-slate-400">(leave text empty to hide)</span></p>
        <div className="grid gap-2 sm:grid-cols-3">
          {pts.map((x, i) => (
            <div key={i} className="flex gap-2">
              <select value={x.icon} onChange={(e) => setPt(i, { icon: e.target.value })} className="h-[42px] rounded-xl border border-slate-200 px-2 text-sm">{[...SERVICE_ICONS, 'clock', 'shield', 'users'].map((ic) => <option key={ic}>{ic}</option>)}</select>
              <Field value={x.text} maxLength={24} onChange={(e) => setPt(i, { text: e.target.value })} placeholder={['Weekly payouts', 'Flexible hours', 'Verified seekers'][i]} className="flex-1" />
            </div>
          ))}
        </div>
      </div>

      <div className={box}>
        <p className="text-sm font-bold text-slate-900">Main colour</p>
        <div className="flex flex-wrap items-center gap-2">
          {ACCENTS.map((c) => <button key={c} type="button" onClick={() => setSc({ accent: c })} className={cx('h-8 w-8 rounded-full border-2', sc.accent.toLowerCase() === c.toLowerCase() ? 'border-slate-900 ring-2 ring-white ring-offset-1' : 'border-white shadow')} style={{ background: c }} aria-label={c} />)}
          <label className="ml-2 flex items-center gap-2 text-xs text-slate-500"><input type="color" value={sc.accent} onChange={(e) => setSc({ accent: e.target.value })} className="h-8 w-9 cursor-pointer rounded border-0 bg-transparent p-0" /><span className="font-mono uppercase">{sc.accent}</span></label>
        </div>
      </div>
    </div>
  );
}

export default function AstroAppSettings() {
  const { tab: raw } = useParams();
  const tab = TABS[raw] ? raw : 'signup';
  const { cfg, setCfg, dirty, save, busy } = useAppConfig();
  const [view, setView] = useState('login');
  if (!cfg) return <PageLoader variant="form" />;

  const a = cfg.signup?.astrologer || { title: '', subtitle: '', fields: {}, screen: {} };
  const set = (patch) => setCfg({ ...cfg, signup: { ...cfg.signup, astrologer: { ...a, ...patch } } });
  const logo = cfg.brand?.logoUrl || '/favicon.svg';
  const pv = tab === 'signup' ? 'signup' : view;

  return (
    <>
      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Astrologer app</p>
        <h2 className="text-xl font-bold text-slate-900">{TABS[tab]}</h2>
        <p className="text-sm text-slate-500">Changes go live in the astrologer app (/vendor/login) as soon as you save.</p>
      </div>
      <Panel title={TABS[tab]} action={<Button size="sm" onClick={save} loading={busy} disabled={!dirty}><Save size={14} /> {dirty ? 'Save changes' : 'Saved'}</Button>}>
        <div className="grid gap-5 p-4 xl:grid-cols-[1fr_320px]">
          {tab === 'login' ? <LoginScreenEditor a={a} set={set} /> : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Choose what an astrologer fills in when they create an account. Required details are also checked on the server.</p>
              <SignupFields rows={ASTRO_SIGNUP_ROWS} value={a.fields} onChange={(fields) => set({ fields })} />
            </div>
          )}
          <div className="xl:sticky xl:top-4 xl:self-start">
            {tab === 'login' && (
              <div className="mb-3 flex justify-center gap-1 text-xs font-semibold">
                {[['login', 'Login'], ['signup', 'Create account']].map(([k, l]) => <button key={k} type="button" onClick={() => setView(k)} className={cx('rounded-lg px-3 py-1.5', view === k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600')}>{l}</button>)}
              </div>
            )}
            {a.screen?.slides ? <Preview a={a} logo={logo} view={pv} /> : <PageLoader variant="auth" />}
          </div>
        </div>
      </Panel>
    </>
  );
}
