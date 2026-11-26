import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import {
  ArrowDown, ArrowUp, ExternalLink, Plus, Save, Trash2, Smartphone, Monitor, Sparkles, Palette,
  HelpCircle, Coins, ListOrdered, PanelBottom, Grid3x3, Eye, EyeOff, CheckCircle2, CircleDot
} from 'lucide-react';
import { SERVICE_ICONS } from '../../../shared/astroIcons.js';
import { Button, Field, PageLoader, TextArea, cx } from '../../../shared/ui.jsx';
import { ImageInput } from '../kit.jsx';
import useAppConfig from './useAppConfig.js';
import AstroIcon from '../../../shared/AstroIcon.jsx';
import { TOPIC_ICONS } from '../../landing/Hero.jsx';

/* Everything on the public landing page is edited here. The preview on the right is the real
   landing page (/?preview=1) in an iframe, fed the unsaved config through postMessage. */

const PRESETS = [
  { name: 'Vedic Terracotta', accent: '#B9542C', brand: '#7A2618', background: '#FBF4EE', darkAccent: '#E0784B' },
  { name: 'Divine Saffron', accent: '#D9741F', brand: '#8A3B0F', background: '#FFF6EC', darkAccent: '#F0A050' },
  { name: 'Royal Maroon', accent: '#8E2A1E', brand: '#5A1410', background: '#FBF1EE', darkAccent: '#D96A5A' },
  { name: 'Cosmic Purple', accent: '#6D3FC4', brand: '#3B1F7A', background: '#F7F3FF', darkAccent: '#A68BF0' },
  { name: 'Midnight Mystic', accent: '#2F5BD3', brand: '#14254F', background: '#F2F6FF', darkAccent: '#7AA0FF' },
  { name: 'Sacred Emerald', accent: '#14805E', brand: '#0B3B2E', background: '#F1FAF6', darkAccent: '#4CC79A' },
];

const ICONS = [...new Set([...SERVICE_ICONS, 'clock', 'shield', 'users'])];

const TABS = [
  { id: 'brand', label: 'Brand & App Links', icon: Palette },
  { id: 'hero', label: 'Hero Section', icon: Sparkles },
  { id: 'services', label: 'Services', icon: Grid3x3, sec: 'features' },
  { id: 'how', label: 'How It Works', icon: ListOrdered, sec: 'how' },
  { id: 'earn', label: 'Earn With Us', icon: Coins, sec: 'cta' },
  { id: 'faq', label: 'FAQ', icon: HelpCircle, sec: 'faq' },
  { id: 'banner', label: 'Download Banner', icon: Smartphone, sec: 'final' },
  { id: 'footer', label: 'Footer', icon: PanelBottom },
];

const move = (a, i, d) => {
  const b = [...a];
  const j = i + d;
  if (j < 0 || j >= b.length) return b;
  [b[i], b[j]] = [b[j], b[i]];
  return b;
};

/* ---------------------------------------------------------------- small building blocks */

function Card({ title, desc, right, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
      {(title || right) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            {desc && <p className="mt-0.5 text-xs text-slate-500">{desc}</p>}
          </div>
          {right}
        </header>
      )}
      <div className="space-y-3 p-5">{children}</div>
    </section>
  );
}

function Switch({ checked, onChange, label, hint }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:bg-slate-50">
      <span className={cx('relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition', checked ? 'bg-brand-600' : 'bg-slate-300')}>
        <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </span>
      <span>
        <span className="block text-xs font-semibold text-slate-800">{label}</span>
        {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
      </span>
    </button>
  );
}

function SectionToggle({ on, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!on)}
      className={cx('flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition', on ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
      {on ? <Eye size={13} /> : <EyeOff size={13} />}{on ? 'Visible' : 'Hidden'}
    </button>
  );
}

function IconSelect({ value, onChange, options = ICONS }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600">Icon</span>
      <div className="flex items-center gap-2">
        <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><AstroIcon n={value} s={18} /></span>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="h-[42px] w-full rounded-xl border border-slate-200 bg-white px-2.5 text-sm capitalize">
          {options.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>
    </label>
  );
}

function ListEditor({ title, items = [], max, blank, onChange, render, addLabel = 'Add' }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-700">{title} <span className="font-normal text-slate-400">({items.length}/{max})</span></p>
        <Button size="sm" variant="outline" disabled={items.length >= max} onClick={() => onChange([...items, blank])}><Plus size={14} /> {addLabel}</Button>
      </div>
      {items.map((it, i) => (
        <div key={i} className="flex gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="min-w-0 flex-1 space-y-2">{render(it, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))), i)}</div>
          <div className="flex flex-col gap-1 border-l border-slate-200 pl-2">
            <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30" disabled={i === 0} onClick={() => onChange(move(items, i, -1))} aria-label="Move up"><ArrowUp size={14} /></button>
            <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30" disabled={i === items.length - 1} onClick={() => onChange(move(items, i, 1))} aria-label="Move down"><ArrowDown size={14} /></button>
            <button type="button" className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
      {!items.length && <p className="rounded-xl border border-dashed border-slate-200 py-4 text-center text-xs text-slate-400">Nothing here yet.</p>}
    </div>
  );
}

/* Mix two #rrggbb colours (t = share of b). */
const HEX6 = /^#[0-9a-f]{6}$/i;
const mix = (a, b, t) => {
  if (!HEX6.test(a || '') || !HEX6.test(b || '')) return b || a || '#ffffff';
  const h = (x) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
  const [A, B] = [h(a), h(b)];
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};

/* Section background + whole-site theme, shown on every section page. */
function ColoursCard({ value = '', onChange, theme, setTheme, dark }) {
  const t = { accent: '#B9542C', brand: '#7A2618', background: '#FBF4EE', ...theme };
  const swatches = dark
    ? [['', 'Default', '#1F1512'], [mix(t.brand, '#000000', 0.55), 'Brand dark'], ['#111111', 'Black'], [mix(t.accent, '#000000', 0.65), 'Accent dark']]
    : [['', 'Default', null], ['#ffffff', 'White'], [t.background, 'Cream'], [mix(t.accent, '#ffffff', 0.92), 'Soft tint'], [mix(t.brand, '#ffffff', 0.94), 'Rose tint']];
  return (
    <Card title="Colours" desc={dark ? 'Footer background (pick a dark colour so the text stays readable).' : 'Background of this section, and the colours of the whole site.'}>
      <p className="text-xs font-bold text-slate-700">Section background</p>
      <div className="flex flex-wrap items-center gap-2">
        {swatches.map(([hex, label, show]) => {
          const on = (value || '') === hex;
          return (
            <button key={label} type="button" onClick={() => onChange(hex)} title={label}
              className={cx('flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition', on ? 'border-brand-600 bg-brand-50 text-brand-800 ring-1 ring-brand-500' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
              <span className="h-5 w-5 rounded-md border border-slate-200" style={{ background: show || hex || 'repeating-linear-gradient(45deg,#fff,#fff 3px,#e2e8f0 3px,#e2e8f0 6px)' }} />
              {label}
            </button>
          );
        })}
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          <input type="color" value={value || (dark ? '#1f1512' : '#ffffff')} onChange={(e) => onChange(e.target.value)} className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0" />
          Custom
        </label>
      </div>
      <div className="border-t border-slate-100 pt-3">
        <p className="text-xs font-bold text-slate-700">Site theme <span className="font-normal text-slate-400">(whole website + app)</span></p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const on = p.accent.toLowerCase() === (t.accent || '').toLowerCase() && p.brand.toLowerCase() === (t.brand || '').toLowerCase();
            return (
              <button key={p.name} type="button" onClick={() => setTheme(p)} title={p.name}
                className={cx('flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold transition', on ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                <span className="flex">{[p.accent, p.brand].map((c, i) => <span key={i} className={cx('h-3.5 w-3.5 rounded-full border border-white', i && '-ml-1')} style={{ background: c }} />)}</span>
                {p.name}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {[['accent', 'Accent'], ['brand', 'Brand'], ['background', 'Background']].map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
              <input type="color" value={t[k]} onChange={(e) => setTheme({ [k]: e.target.value })} className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0" />{label}
            </label>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- live preview */

function PreviewFrame({ config, device }) {
  const wrapRef = useRef(null);
  const frameRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const base = device === 'mobile' ? 390 : 1280;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const send = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ type: 'landing-preview', config }, window.location.origin);
  }, [config]);

  useEffect(() => { send(); }, [send]);
  useEffect(() => {
    const onMsg = (e) => { if (e.origin === window.location.origin && e.data?.type === 'landing-preview-ready') send(); };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [send]);

  const scale = box.w ? Math.min(1, box.w / base) : 1;
  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden">
      <div className="absolute left-1/2 top-0 h-full" style={{ width: base * scale, transform: 'translateX(-50%)' }}>
        <iframe ref={frameRef} title="Landing page preview" src="/?preview=1"
          className={cx('origin-top-left border-0 bg-white', device === 'mobile' && 'rounded-[28px] shadow-xl ring-8 ring-slate-900')}
          style={{ width: base, height: box.h / scale, transform: `scale(${scale})` }} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- editor */

export default function LandingEditor() {
  const { cfg, setCfg, dirty, save, busy } = useAppConfig();
  const { tab = 'brand' } = useParams();
  const [device, setDevice] = useState('desktop');

  // Each part of the page has its own sidebar entry: /admin/global/landing/<tab>
  if (!TABS.some((x) => x.id === tab)) return <Navigate to="/admin/global/landing/brand" replace />;
  if (!cfg) return <PageLoader variant="form" />;

  const l = cfg.landing || {};
  const h = l.hero || {};
  const cta = l.cta || {};
  const ft = l.footer || {};
  const fin = l.finalCta || {};
  const tr = h.trust || {};
  const t = cfg.theme || PRESETS[0];
  const brand = cfg.brand || {};
  const sec = l.sections || {};

  const setL = (patch) => setCfg({ ...cfg, landing: { ...l, ...patch } });
  const setHero = (patch) => setL({ hero: { ...h, ...patch } });
  const setTrust = (patch) => setHero({ trust: { ...tr, ...patch } });
  const setCta = (patch) => setL({ cta: { ...cta, ...patch } });
  const setFooter = (patch) => setL({ footer: { ...ft, ...patch } });
  const setFinal = (patch) => setL({ finalCta: { ...fin, ...patch } });
  const setSec = (k, v) => setL({ sections: { ...sec, [k]: v } });
  const setTheme = (patch) => setCfg({ ...cfg, theme: { ...t, ...patch } });
  const setBrand = (patch) => setCfg({ ...cfg, brand: { ...brand, ...patch } });

  const active = TABS.find((x) => x.id === tab);
  const secOn = active.sec ? sec[active.sec] !== false : true;
  const toggle = active.sec && <SectionToggle on={secOn} onChange={(v) => setSec(active.sec, v)} />;

  return (
    <div className="space-y-4">
      {/* top bar */}
      <div className="sticky -top-6 z-30 -mx-6 -mt-6 bg-[#f8fafc] px-6 pb-3 pt-6 lg:-top-8 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><active.icon size={19} /></span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Landing page</p>
            <h2 className="text-[17px] font-bold leading-tight text-slate-900">{active.label}</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cx('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', dirty ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>
            {dirty ? <CircleDot size={12} /> : <CheckCircle2 size={12} />}{dirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
          <a href="/" target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><ExternalLink size={14} /> Open live site</Button></a>
          <Button size="sm" onClick={save} loading={busy} disabled={!dirty}><Save size={14} /> Save & publish</Button>
        </div>
      </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(380px,460px)_1fr]">
        {/* ---------------- left: editor ---------------- */}
        <div className="space-y-4">

          {/* BRAND & APPS */}
          {tab === 'brand' && (
            <>
              <Card title="Brand" desc="Name and logo appear in the website header and footer, and in the app.">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Brand name" value={brand.name || ''} onChange={(e) => setBrand({ name: e.target.value })} maxLength={40} placeholder="Astrology" />
                  <Field label="Tagline" value={brand.tagline || ''} onChange={(e) => setBrand({ tagline: e.target.value })} maxLength={80} placeholder="Trusted Vedic Astrologers" />
                </div>
                <ImageInput label="Logo (square PNG)" value={brand.logoUrl || ''} fallback="/favicon.svg" onChange={(logoUrl) => setBrand({ logoUrl })} aspect="aspect-square" hint="Uploads are stored on Cloudinary. Empty = built-in logo." />
              </Card>
              <Card title="App store links" desc="Every Google Play / App Store button on the page uses these. Empty = opens the web app.">
                <Field label="Customer app · Google Play" value={ft.customerPlayStoreUrl || ''} onChange={(e) => setFooter({ customerPlayStoreUrl: e.target.value })} placeholder="https://play.google.com/store/apps/details?id=..." />
                <Field label="Customer app · App Store (iPhone)" value={ft.customerAppStoreUrl || ''} onChange={(e) => setFooter({ customerAppStoreUrl: e.target.value })} placeholder="https://apps.apple.com/app/id..." />
                <Field label="Astrologer app · Google Play" value={cta.playStoreUrl || ft.vendorPlayStoreUrl || ''} placeholder="https://play.google.com/store/apps/details?id=..."
                  onChange={(e) => setL({ cta: { ...cta, playStoreUrl: e.target.value }, footer: { ...ft, vendorPlayStoreUrl: e.target.value } })} hint="Used in Earn with us and the footer." />
              </Card>
              <Card title="Colours" desc="Shared with the user app.">
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((p) => {
                    const on = p.accent.toLowerCase() === (t.accent || '').toLowerCase() && p.brand.toLowerCase() === (t.brand || '').toLowerCase();
                    return (
                      <button key={p.name} type="button" onClick={() => setTheme(p)}
                        className={cx('flex items-center gap-2 rounded-xl border p-2.5 text-left transition', on ? 'border-brand-600 bg-brand-50/70 ring-1 ring-brand-500' : 'border-slate-200 hover:bg-slate-50')}>
                        <span className="flex shrink-0">
                          {[p.accent, p.brand, p.background].map((c, i) => <span key={i} className={cx('h-4 w-4 rounded-full border border-white', i && '-ml-1.5')} style={{ background: c }} />)}
                        </span>
                        <span className="truncate text-xs font-semibold text-slate-700">{p.name}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[['accent', 'Accent', 'Buttons, icons'], ['brand', 'Brand', 'Hero gradient'], ['background', 'Background', 'Page canvas']].map(([k, label, hint]) => (
                    <label key={k} className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-2.5">
                      <input type="color" value={t[k] || '#000000'} onChange={(e) => setTheme({ [k]: e.target.value })} className="h-9 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
                      <span className="min-w-0"><span className="block text-xs font-bold text-slate-800">{label}</span><span className="block text-[11px] text-slate-400">{hint}</span></span>
                    </label>
                  ))}
                </div>
              </Card>
            </>
          )}

          {/* HERO */}
          {tab === 'hero' && (
            <>
              <Card title="Headline area">
                <Field label="Top pill" value={h.badge || ''} onChange={(e) => setHero({ badge: e.target.value })} maxLength={60} placeholder="First chat free · Pay per minute" hint="Empty = hidden." />
                <ListEditor title="Headlines (rotate every 4 s)" items={h.headlines} max={6} blank={{ title: '', highlight: '' }} addLabel="Add headline"
                  onChange={(headlines) => setHero({ headlines })}
                  render={(x, up) => (
                    <div className="grid gap-2 sm:grid-cols-[3fr_2fr]">
                      <Field label="White part" value={x.title || ''} onChange={(e) => up({ title: e.target.value })} maxLength={60} placeholder="Ask the stars. Get answers" />
                      <Field label="Peach part" value={x.highlight || ''} onChange={(e) => up({ highlight: e.target.value })} maxLength={40} placeholder="in minutes." />
                    </div>
                  )} />
                <TextArea label="Subtitle" rows={2} value={h.subtitle || ''} onChange={(e) => setHero({ subtitle: e.target.value })} maxLength={240} />
              </Card>
              <Card title="Ask box" desc="Asking opens the app (Google Play link).">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Ask button text" value={h.primaryCta || ''} onChange={(e) => setHero({ primaryCta: e.target.value })} maxLength={30} placeholder="Ask now" />
                  <Field label="Kundli link text" value={h.secondaryCta || ''} onChange={(e) => setHero({ secondaryCta: e.target.value })} maxLength={30} placeholder="Generate free Kundli" hint="Empty = hidden." />
                </div>
                <TextArea label="Rotating questions (one per line, up to 8)" rows={4} value={(h.prompts || []).join('\n')} onChange={(e) => setHero({ prompts: e.target.value.split('\n') })} />
                <ListEditor title="Topic chips" items={h.topics} max={8} blank={{ icon: 'kundli', label: '', q: '' }} addLabel="Add topic"
                  onChange={(topics) => setHero({ topics })}
                  render={(x, up) => (
                    <div className="grid gap-2 sm:grid-cols-[150px_1fr]">
                      <IconSelect value={x.icon} onChange={(icon) => up({ icon })} options={Object.keys(TOPIC_ICONS)} />
                      <Field label="Label" value={x.label || ''} onChange={(e) => up({ label: e.target.value })} maxLength={20} />
                      <div className="sm:col-span-2"><Field label="Question it fills in" value={x.q || ''} onChange={(e) => up({ q: e.target.value })} maxLength={100} /></div>
                    </div>
                  )} />
              </Card>
              <Card title="Trust chips" desc="Astrologer count and rating are counted live from your database.">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Switch checked={tr.showAstrologers !== false} onChange={(v) => setTrust({ showAstrologers: v })} label="Astrologer count" hint="Live count of approved astrologers." />
                  <Switch checked={tr.showRating !== false} onChange={(v) => setTrust({ showRating: v })} label="Average rating" hint="Shown once real reviews exist." />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Languages chip" value={tr.languages ?? ''} onChange={(e) => setTrust({ languages: e.target.value })} maxLength={40} hint="Empty = hidden." />
                  <Field label="Languages note" value={tr.languagesNote ?? ''} onChange={(e) => setTrust({ languagesNote: e.target.value })} maxLength={40} />
                  <Field label="Privacy chip" value={tr.privacy ?? ''} onChange={(e) => setTrust({ privacy: e.target.value })} maxLength={40} hint="Empty = hidden." />
                  <Field label="Privacy note" value={tr.privacyNote ?? ''} onChange={(e) => setTrust({ privacyNote: e.target.value })} maxLength={40} />
                </div>
              </Card>
              <Card title="App preview (right side)">
                <Switch checked={h.showLive !== false} onChange={(v) => setHero({ showLive: v })} label="Show phone with app screenshot" hint="With the rotating rashi wheel and store badges." />
                <ImageInput label="Phone screenshot" value={h.imageUrl || ''} fallback="/landing/app-home.webp" onChange={(imageUrl) => setHero({ imageUrl })} aspect="aspect-[9/19]" hint="Tall app home screen, stored on Cloudinary. Empty = built-in one." />
              </Card>
            </>
          )}

          {/* SERVICES */}
          {tab === 'services' && (
            <>
            <Card title="Services section" right={toggle}>
              <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
                <Field label="Small tag" value={l.featuresTag || ''} onChange={(e) => setL({ featuresTag: e.target.value })} maxLength={30} />
                <Field label="Title" value={l.featuresTitle || ''} onChange={(e) => setL({ featuresTitle: e.target.value })} maxLength={60} />
              </div>
              <TextArea label="Subtitle" rows={2} value={l.featuresSubtitle || ''} onChange={(e) => setL({ featuresSubtitle: e.target.value })} maxLength={200} />
              <ListEditor title="Service cards" items={l.features} max={9} blank={{ icon: 'star', title: '', text: '' }} addLabel="Add card"
                onChange={(features) => setL({ features })}
                render={(x, up) => (
                  <>
                    <div className="grid gap-2 sm:grid-cols-[150px_1fr]">
                      <IconSelect value={x.icon} onChange={(icon) => up({ icon })} />
                      <Field label="Title" value={x.title || ''} onChange={(e) => up({ title: e.target.value })} maxLength={40} />
                    </div>
                    <TextArea label="Text" rows={2} value={x.text || ''} onChange={(e) => up({ text: e.target.value })} maxLength={200} />
                  </>
                )} />
            </Card>
              <ColoursCard value={l.colors?.features} onChange={(v) => setL({ colors: { ...(l.colors || {}), features: v } })} theme={t} setTheme={setTheme} />
            </>
          )}

          {/* HOW IT WORKS */}
          {tab === 'how' && (
            <>
            <Card title="How it works" right={toggle}>
              <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
                <Field label="Small tag" value={l.howTag || ''} onChange={(e) => setL({ howTag: e.target.value })} maxLength={30} />
                <Field label="Title" value={l.howTitle || ''} onChange={(e) => setL({ howTitle: e.target.value })} maxLength={60} />
              </div>
              <TextArea label="Subtitle" rows={2} value={l.howSubtitle || ''} onChange={(e) => setL({ howSubtitle: e.target.value })} maxLength={200} />
              <ListEditor title="Steps" items={l.steps} max={6} blank={{ title: '', text: '' }} addLabel="Add step"
                onChange={(steps) => setL({ steps })}
                render={(x, up, i) => (
                  <>
                    <Field label={`Step ${i + 1} title`} value={x.title || ''} onChange={(e) => up({ title: e.target.value })} maxLength={40} />
                    <TextArea label="Text" rows={2} value={x.text || ''} onChange={(e) => up({ text: e.target.value })} maxLength={160} />
                  </>
                )} />
              <ListEditor title="Small badges under the steps" items={l.howBadges} max={6} blank={{ icon: 'star', label: '' }} addLabel="Add badge"
                onChange={(howBadges) => setL({ howBadges })}
                render={(x, up) => (
                  <div className="grid gap-2 sm:grid-cols-[150px_1fr]">
                    <IconSelect value={x.icon} onChange={(icon) => up({ icon })} />
                    <Field label="Label" value={x.label || ''} onChange={(e) => up({ label: e.target.value })} maxLength={30} />
                  </div>
                )} />
            </Card>
              <ColoursCard value={l.colors?.how} onChange={(v) => setL({ colors: { ...(l.colors || {}), how: v } })} theme={t} setTheme={setTheme} />
            </>
          )}

          {/* EARN WITH US */}
          {tab === 'earn' && (
            <>
              <Card title="Earn with us (astrologers)" right={toggle}>
                <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
                  <Field label="Small tag" value={cta.badge || ''} onChange={(e) => setCta({ badge: e.target.value })} maxLength={40} />
                  <Field label="Title" value={cta.title || ''} onChange={(e) => setCta({ title: e.target.value })} maxLength={80} />
                </div>
                <TextArea label="Text" rows={3} value={cta.text || ''} onChange={(e) => setCta({ text: e.target.value })} maxLength={300} />
                <Field label="Earnings highlight" value={cta.earningsHighlight || ''} onChange={(e) => setCta({ earningsHighlight: e.target.value })} maxLength={120} hint="Empty = hidden." />
                <ListEditor title="Perk cards" items={cta.perks} max={4} blank={{ icon: 'star', title: '', text: '' }} addLabel="Add perk"
                  onChange={(perks) => setCta({ perks })}
                  render={(x, up) => (
                    <>
                      <div className="grid gap-2 sm:grid-cols-[150px_1fr]">
                        <IconSelect value={x.icon} onChange={(icon) => up({ icon })} />
                        <Field label="Title" value={x.title || ''} onChange={(e) => up({ title: e.target.value })} maxLength={40} />
                      </div>
                      <TextArea label="Text" rows={2} value={x.text || ''} onChange={(e) => up({ text: e.target.value })} maxLength={160} />
                    </>
                  )} />
              </Card>
              <Card title="Onboarding steps card">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Card title" value={cta.stepsTitle || ''} onChange={(e) => setCta({ stepsTitle: e.target.value })} maxLength={60} />
                  <Field label="Green label" value={cta.freeLabel || ''} onChange={(e) => setCta({ freeLabel: e.target.value })} maxLength={30} hint="Empty = hidden." />
                </div>
                <ListEditor title="Steps" items={cta.steps} max={4} blank={{ title: '', text: '' }} addLabel="Add step"
                  onChange={(steps) => setCta({ steps })}
                  render={(x, up, i) => (
                    <>
                      <Field label={`Step ${i + 1} title`} value={x.title || ''} onChange={(e) => up({ title: e.target.value })} maxLength={50} />
                      <TextArea label="Text" rows={2} value={x.text || ''} onChange={(e) => up({ text: e.target.value })} maxLength={160} />
                    </>
                  )} />
                <Field label="Footnote" value={cta.footnote || ''} onChange={(e) => setCta({ footnote: e.target.value })} maxLength={100} hint="Empty = hidden." />
              </Card>
              <ColoursCard value={l.colors?.cta} onChange={(v) => setL({ colors: { ...(l.colors || {}), cta: v } })} theme={t} setTheme={setTheme} />
            </>
          )}

          {/* FAQ */}
          {tab === 'faq' && (
            <>
            <Card title="FAQ" right={toggle}>
              <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
                <Field label="Small tag" value={l.faqTag || ''} onChange={(e) => setL({ faqTag: e.target.value })} maxLength={30} />
                <Field label="Title" value={l.faqTitle || ''} onChange={(e) => setL({ faqTitle: e.target.value })} maxLength={60} />
              </div>
              <TextArea label="Subtitle" rows={2} value={l.faqSubtitle || ''} onChange={(e) => setL({ faqSubtitle: e.target.value })} maxLength={200} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Support email" value={ft.supportEmail || ''} onChange={(e) => setFooter({ supportEmail: e.target.value })} maxLength={80} hint="Empty = hidden." />
                <Field label="Support phone" value={ft.supportPhone || ''} onChange={(e) => setFooter({ supportPhone: e.target.value })} maxLength={40} hint="Empty = hidden." />
              </div>
              <ListEditor title="Questions" items={l.faq} max={12} blank={{ q: '', a: '' }} addLabel="Add question"
                onChange={(faq) => setL({ faq })}
                render={(x, up) => (
                  <>
                    <Field label="Question" value={x.q || ''} onChange={(e) => up({ q: e.target.value })} maxLength={120} />
                    <TextArea label="Answer" rows={3} value={x.a || ''} onChange={(e) => up({ a: e.target.value })} maxLength={500} />
                  </>
                )} />
            </Card>
              <ColoursCard value={l.colors?.faq} onChange={(v) => setL({ colors: { ...(l.colors || {}), faq: v } })} theme={t} setTheme={setTheme} />
            </>
          )}

          {/* DOWNLOAD BANNER */}
          {tab === 'banner' && (
            <>
              <Card title="Download banner (above footer)" right={toggle}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Title" value={fin.title || ''} onChange={(e) => setFinal({ title: e.target.value })} maxLength={60} />
                  <Field label="Coloured line" value={fin.highlight || ''} onChange={(e) => setFinal({ highlight: e.target.value })} maxLength={60} />
                </div>
                <TextArea label="Text" rows={2} value={fin.text || ''} onChange={(e) => setFinal({ text: e.target.value })} maxLength={200} />
                <p className="text-[11px] text-slate-500">The Google Play / App Store buttons use the links from Brand &amp; App Links.</p>
              </Card>
              <ColoursCard value={l.colors?.final} onChange={(v) => setL({ colors: { ...(l.colors || {}), final: v } })} theme={t} setTheme={setTheme} />
            </>
          )}

          {/* FOOTER */}
          {tab === 'footer' && (
            <>
              <Card title="Footer content">
                <TextArea label="About text" rows={2} value={ft.about || ''} onChange={(e) => setFooter({ about: e.target.value })} maxLength={240} hint="Empty = brand tagline." />
                <Switch checked={ft.showBadges !== false} onChange={(v) => setFooter({ showBadges: v })} label="Show app store badges" hint="Google Play, App Store and Astrologer App buttons under the about text." />
                <TextArea label="Disclaimer" rows={3} value={ft.disclaimer || ''} onChange={(e) => setFooter({ disclaimer: e.target.value })} maxLength={500} />
                <Field label="Copyright text" value={ft.copyrightText || ''} onChange={(e) => setFooter({ copyrightText: e.target.value })} maxLength={100} placeholder="All rights reserved." />
              </Card>
              <Card title="Social links" desc="Leave empty to hide an icon.">
                {[['instagram', 'Instagram', 'https://instagram.com/yourpage'], ['facebook', 'Facebook', 'https://facebook.com/yourpage'], ['youtube', 'YouTube', 'https://youtube.com/@yourchannel'], ['twitter', 'X (Twitter)', 'https://x.com/yourhandle'], ['whatsapp', 'WhatsApp', 'https://wa.me/919876543210']].map(([k, label, ph]) => (
                  <Field key={k} label={label} value={ft.socials?.[k] || ''} placeholder={ph}
                    onChange={(e) => setFooter({ socials: { ...(ft.socials || {}), [k]: e.target.value } })} />
                ))}
              </Card>
              <Card title="Contact (also shown in FAQ)">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Support email" value={ft.supportEmail || ''} onChange={(e) => setFooter({ supportEmail: e.target.value })} maxLength={80} />
                  <Field label="Support phone" value={ft.supportPhone || ''} onChange={(e) => setFooter({ supportPhone: e.target.value })} maxLength={40} />
                </div>
              </Card>
              <ColoursCard value={l.colors?.footer} onChange={(v) => setL({ colors: { ...(l.colors || {}), footer: v } })} theme={t} setTheme={setTheme} dark />
            </>
          )}
        </div>

        {/* ---------------- right: live preview ---------------- */}
        <div className="sticky top-[84px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xs">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Live preview</span>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
              {[['desktop', Monitor, 'Desktop'], ['mobile', Smartphone, 'Mobile']].map(([k, I, label]) => (
                <button key={k} type="button" onClick={() => setDevice(k)}
                  className={cx('flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold transition', device === k ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800')}>
                  <I size={13} />{label}
                </button>
              ))}
            </div>
          </div>
          <div className={cx('h-[calc(100vh-190px)] min-h-[520px]', device === 'mobile' && 'p-4')}>
            <PreviewFrame config={cfg} device={device} />
          </div>
        </div>
      </div>
    </div>
  );
}
