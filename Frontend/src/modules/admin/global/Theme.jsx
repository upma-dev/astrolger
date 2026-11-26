import { useState } from 'react';
import { RotateCcw, Save, Moon, Sun, House, MessageCircle, ScrollText, UserRound, Wallet } from 'lucide-react';
import { api, inr } from '../../../lib/api.js';
import { Button, PageLoader, useAsync, cx } from '../../../shared/ui.jsx';
import AstroIcon, { ZodiacIcon } from '../../../shared/AstroIcon.jsx';
import AnnouncementBar from '../../../shared/AnnouncementBar.jsx';
import { themeVars } from '../../user/av.jsx';
import { Panel } from '../kit.jsx';
import useAppConfig from './useAppConfig.js';
import '../../user/av.css';

const PRESETS = [
  ['Terracotta', { accent: '#B9542C', brand: '#7A2618', background: '#FBF4EE', darkAccent: '#E0784B' }],
  ['Saffron', { accent: '#D9741F', brand: '#8A3B0F', background: '#FFF6EC', darkAccent: '#F0A050' }],
  ['Maroon', { accent: '#8E2A1E', brand: '#5A1410', background: '#FBF1EE', darkAccent: '#D96A5A' }],
  ['Royal purple', { accent: '#6D3FC4', brand: '#3B1F7A', background: '#F7F3FF', darkAccent: '#A68BF0' }],
  ['Midnight blue', { accent: '#2F5BD3', brand: '#14254F', background: '#F2F6FF', darkAccent: '#7AA0FF' }],
  ['Emerald', { accent: '#14805E', brand: '#0B3B2E', background: '#F1FAF6', darkAccent: '#4CC79A' }],
  ['Rose gold', { accent: '#C0566B', brand: '#6E2236', background: '#FFF4F5', darkAccent: '#EE8FA2' }],
  ['Teal', { accent: '#0F7C86', brand: '#0B3A40', background: '#F0FAFA', darkAccent: '#4CC4CC' }],
];
const FIELDS = [
  ['accent', 'Main colour', 'Buttons, links, active tab, default poster'],
  ['brand', 'Brand colour', 'App name, prices, labels'],
  ['background', 'Page background', 'Light-mode canvas behind cards'],
  ['darkAccent', 'Main colour in dark mode', 'A lighter tone that reads well on dark'],
];
const DEMO_ASTROS = [
  { _id: 'a', name: 'Pt. Rajesh Sharma', expertise: ['Vedic', 'Marriage'], pricePerMin: 25, rating: 4.8, online: true },
  { _id: 'b', name: 'Acharya Meera', expertise: ['Tarot', 'Love'], pricePerMin: 30, rating: 4.9, online: true },
  { _id: 'c', name: 'Guru Anand', expertise: ['KP', 'Career'], pricePerMin: 20, rating: 4.6, online: false },
];
const initials = (n = '?') => n.replace(/^(Pt\.|Dr\.|Acharya|Guru|Swami)\s+/i, '').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
const Ic = ({ n, s = 20 }) => <AstroIcon n={n} s={s} />;

/* A real copy of the customer home screen: same CSS (av.css), same theme maths (themeVars),
   real posters / services / astrologers from the database. What you see here is what users see. */
function PhonePreview({ theme, mode, cfg, data }) {
  const brand = cfg.brand || { name: 'AstroVani' };
  const banner = data?.banners?.find((b) => b.active !== false);
  const services = (data?.categories || []).filter((c) => c.active !== false).slice(0, 5);
  const astros = data?.astros?.length ? data.astros.slice(0, 3) : DEMO_ASTROS;
  const vars = { ...themeVars(theme, mode) };
  delete vars.display;
  return (
    <div className="shrink-0" style={{ width: 300, height: 616 }}>
      <div className="origin-top-left" style={{ width: 375, height: 770, transform: 'scale(.8)' }}>
        <div className="av-root" data-theme={mode} style={{ height: '100%' }}>
          <div style={{ ...vars, height: '100%' }}>
            <div className="av-phone" style={{ width: 375, height: 770, borderRadius: 40, boxShadow: '0 0 0 9px #0f172a, 0 30px 60px -20px rgba(0,0,0,.45)' }}>
              <div className="av-scroll" style={{ paddingBottom: 100, overflow: 'hidden' }}>
                <AnnouncementBar cfg={cfg.announcement?.user} preview />
                <header className="av-hdr">
                  <span className="av-brand">
                    {brand.logoUrl ? <img src={brand.logoUrl} alt="" /> : <span className="av-brand-txt"><b>{brand.name}</b>{brand.tagline && <small>{brand.tagline}</small>}</span>}
                  </span>
                  <span className="av-wallet"><Ic n="wallet" s={15} />{inr(500)}</span>
                  <span className="av-iconbtn"><Ic n="bell" s={18} /></span>
                </header>
                <div className="av-findbar">
                  <span className="av-fb-ic"><ZodiacIcon sign="Leo" size={18} /></span>
                  <span className="av-fb-main"><small>Namaste, Aman</small><b>Leo · New Delhi</b></span>
                  <span className="av-fb-search"><Ic n="search" s={18} /></span>
                </div>
                <div className="av-posters">
                  <div className="av-poster-track">
                    <article className={`av-poster t-${banner?.color || 'terracotta'}`}>
                      <div className="av-poster-txt">
                        <div className="av-poster-eb">{banner?.eyebrow || 'LIVE NOW'}</div>
                        <h3>{banner?.title || 'Ask. Know.\nGrow.'}</h3>
                        <p>{banner?.subtitle || 'Verified astrologers are online right now.'}</p>
                        <span className="av-poster-cta">{banner?.cta || 'Talk now'} <Ic n="arrow" s={14} /></span>
                      </div>
                      <div className="av-poster-art">{banner?.imageUrl ? <img src={banner.imageUrl} alt="" /> : <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="100" cy="100" r="94" /><circle cx="100" cy="100" r="70" /><circle cx="100" cy="100" r="30" /></svg>}</div>
                    </article>
                  </div>
                </div>
                <nav className="av-svc">
                  {(services.length ? services : [{ label: 'Chat', icon: 'chat' }, { label: 'Call', icon: 'phone' }, { label: 'Kundli', icon: 'kundli' }, { label: 'Match', icon: 'match' }, { label: 'Puja', icon: 'diya' }]).map((c, i) => (
                    <a key={c._id || i}><span className="av-svc-ic">{c.imageUrl ? <img src={c.imageUrl} alt="" /> : <Ic n={c.icon || 'star'} s={22} />}</span><span className="av-svc-l">{c.label}</span>{c.tag && <i>{c.tag}</i>}</a>
                  ))}
                </nav>
                <div className="av-sec-h"><h2>Top Astrologers</h2><span className="av-link">View all <Ic n="arrow" s={14} /></span></div>
                <div className="av-rail">
                  {astros.map((a) => (
                    <article key={a._id} className="av-pick">
                      <div className={`av-pick-img${a.online ? '' : ' off'}`}>
                        {initials(a.name)}{a.avatar && <img src={a.avatar} alt="" />}
                        {a.rating > 0 && <span className="av-pick-badge"><Ic n="star" s={11} />{(+a.rating).toFixed(1)}</span>}
                        <span className={`av-pick-st ${a.online ? 'online' : ''}`}>{a.online ? 'Online' : 'Offline'}</span>
                      </div>
                      <div className="av-pick-body">
                        <h4>{a.name}</h4>
                        <small>{(a.expertise || []).slice(0, 2).join(', ')}</small>
                        <div className="av-pick-foot"><b>₹{a.pricePerMin}<small>/min</small></b><span className="av-round"><Ic n="chat" s={15} /></span></div>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="av-promo">
                  <span className="av-promo-ic"><Ic n={cfg.promo?.icon || 'kundli'} s={22} /></span>
                  <div className="av-promo-txt"><small>{cfg.promo?.eyebrow || 'FREE TOOL'}</small><b>{cfg.promo?.title || 'Your complete Kundli, free'}</b></div>
                  <span className="av-btn-gold">{cfg.promo?.cta || 'Open'}</span>
                </div>
              </div>
              <nav className="av-nav">
                <span className="av-nv on"><span className="av-nv-ic"><House size={20} strokeWidth={2.2} /></span>Home</span>
                <span className="av-nv"><span className="av-nv-ic"><ScrollText size={20} strokeWidth={1.8} /></span>Kundli</span>
                <span className="av-fabw"><span className="av-fab"><MessageCircle size={24} strokeWidth={2.2} /></span>Talk</span>
                <span className="av-nv"><span className="av-nv-ic"><Wallet size={20} strokeWidth={1.8} /></span>Wallet</span>
                <span className="av-nv"><span className="av-nv-ic"><UserRound size={20} strokeWidth={1.8} /></span>Profile</span>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Theme() {
  const { cfg, setCfg, dirty, save, busy } = useAppConfig();
  const [view, setView] = useState('both');
  const { data } = useAsync(() => Promise.all([
    api.admin.get('/admin/banners').catch(() => []),
    api.admin.get('/admin/categories').catch(() => []),
    api.admin.get('/admin/astrologers', { status: 'approved' }).catch(() => []),
  ]).then(([banners, categories, astros]) => ({ banners, categories, astros: [...astros].sort((a, b) => (b.online - a.online) || (b.rating - a.rating)) })));
  if (!cfg) return <PageLoader variant="form" />;
  const t = cfg.theme;
  const set = (patch) => setCfg({ ...cfg, theme: { ...t, ...patch } });
  const same = (p) => FIELDS.every(([k]) => (p[k] || '').toLowerCase() === (t[k] || '').toLowerCase());

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Customer app</p>
          <h2 className="text-xl font-bold text-slate-900">Theme & colours</h2>
          <p className="text-sm text-slate-500">The preview uses the app's real styles and your real posters, services and astrologers. Saving updates every open app instantly.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCfg({ ...cfg, theme: PRESETS[0][1] })}><RotateCcw size={14} /> Default</Button>
          <Button onClick={save} loading={busy} disabled={!dirty}><Save size={14} /> {dirty ? 'Save & publish' : 'Saved'}</Button>
        </div>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-5">
          <Panel title="Presets">
            <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
              {PRESETS.map(([name, p]) => (
                <button key={name} type="button" onClick={() => setCfg({ ...cfg, theme: p })} className={cx('flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition', same(p) ? 'border-brand-600 bg-brand-50 text-brand-800 ring-2 ring-brand-100' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                  <span className="flex shrink-0">{[p.background, p.accent, p.brand, p.darkAccent].map((c, i) => <span key={i} className={cx('h-6 w-6 rounded-full border-2 border-white shadow-sm', i && '-ml-2.5')} style={{ background: c }} />)}</span>
                  {name}
                </button>
              ))}
            </div>
          </Panel>
          <Panel title="Custom colours">
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {FIELDS.map(([k, label, hint]) => (
                <label key={k} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-slate-300">
                  <input type="color" value={t[k]} onChange={(e) => set({ [k]: e.target.value })} className="h-11 w-12 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800">{label}</span>
                    <span className="block text-[11px] text-slate-400">{hint}</span>
                  </span>
                  <input value={t[k]} onChange={(e) => /^#[0-9a-f]{0,6}$/i.test(e.target.value) && set({ [k]: e.target.value })} className="w-20 rounded-lg border border-slate-200 px-2 py-1 font-mono text-xs uppercase text-slate-600 outline-none focus:border-brand-500" />
                </label>
              ))}
            </div>
            <p className="px-4 pb-4 text-xs text-slate-500">Applies to home, astrologer list, Kundli, wallet, profile and the website. Posters keep their own colour unless they use the default "terracotta" style, which follows the main colour. Login screen colours are set in Customer App → Login Screen.</p>
          </Panel>
        </div>

        <Panel title="Live preview" action={
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
            {[['light', 'Light', Sun], ['both', 'Both', null], ['dark', 'Dark', Moon]].map(([k, l, I]) => (
              <button key={k} type="button" onClick={() => setView(k)} className={cx('flex items-center gap-1 rounded-md px-2.5 py-1', view === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>{I && <I size={12} />}{l}</button>
            ))}
          </div>
        }>
          <div className="flex flex-wrap justify-center gap-6 bg-slate-50 p-6">
            {(view === 'both' ? ['light', 'dark'] : [view]).map((m) => (
              <div key={m}>
                <p className="mb-3 text-center text-xs font-semibold capitalize text-slate-500">{m} mode</p>
                <PhonePreview theme={t} mode={m} cfg={cfg} data={data} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
