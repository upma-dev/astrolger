import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SignupFields from './SignupFields.jsx';
import { ArrowDown, ArrowUp, Eye, EyeOff, Gift, Home, Pencil, Plus, Save, Search, Smartphone, Sparkles, Star, Trash2 } from 'lucide-react';
import { api, inr } from '../../lib/api.js';
import { POSTER_THEMES, SERVICE_ICONS } from '../../shared/astroIcons.js';
import { Badge, Button, Field, Modal, PageLoader, Select, TextArea, cx, useAsync, useToast } from '../../shared/ui.jsx';
import { AstroIcon, ImageInput, Panel } from './kit.jsx';
import { resolveTrust, TRUST_SOURCE_LABELS } from '../../shared/loginTrust.js';

const LINKS = [
  ['/user/astrologers', 'Astrologer list'], ['/user/kundli', 'Free Kundli'], ['/user/matching', 'Kundli Matching'],
  ['/user/store', 'Reports store'], ['/user/store?tab=remedies', 'Remedies store'], ['/user/wallet', 'Wallet'], ['/user/profile', 'Profile'],
];

const SECTION_INFO = {
  posters: ['Posters', 'Swipeable posters at the top. Manage them in the Posters tab.'],
  services: ['Services row', 'Service shortcuts below the posters. Manage them in the Services tab.'],
  astrologers: ['Astrologer cards', 'Horizontal astrologer cards with price and chat button.'],
  horoscope: ['Horoscope', 'Daily, weekly and monthly predictions from Content > Horoscope.'],
  promo: ['Promo card', 'One highlighted offer strip. Edit it in the Promo card tab.'],
  panchang: ["Today's Panchang", 'Sunrise, sunset, tithi, nakshatra and Rahu Kaal.'],
  reports: ['Paid reports', 'Report cards from Content > Paid reports.'],
  remedies: ['Remedies', 'Remedy and puja cards from Content > Remedies.'],
};
const ASTRO_SOURCES = [['featured', 'Featured astrologers first'], ['rating', 'Top rated'], ['online', 'Online now first'], ['manual', 'Pick astrologers manually']];

/* Link input with quick picks of the app's screens. */
function LinkField({ value, onChange }) {
  const known = LINKS.some(([l]) => l === value);
  return (
    <div className="grid grid-cols-2 gap-3">
      <Select label="Opens" value={known ? value : 'custom'} onChange={(e) => onChange(e.target.value === 'custom' ? '' : e.target.value)}>
        {LINKS.map(([l, t]) => <option key={l} value={l}>{t}</option>)}
        <option value="custom">Custom link…</option>
      </Select>
      <Field label="Link" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="/user/... or https://..." />
    </div>
  );
}

function IconPicker({ value, onChange }) {
  return (
    <div>
      <span className="mb-1 block text-xs font-semibold text-slate-600">Icon</span>
      <div className="grid grid-cols-8 gap-1.5">
        {SERVICE_ICONS.map((n) => (
          <button type="button" key={n} title={n} onClick={() => onChange(n)} className={cx('flex aspect-square items-center justify-center rounded-xl border transition', value === n ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}>
            <AstroIcon n={n} size={18} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* Small replica of the user-app poster so admins see what they publish. */
function PosterPreview({ b }) {
  const sand = b.color === 'sand';
  const bg = POSTER_THEMES[b.color]?.bg || POSTER_THEMES.terracotta.bg;
  return (
    <div className="relative flex h-40 overflow-hidden rounded-2xl" style={{ background: bg, color: sand ? '#6E2417' : '#fff' }}>
      <div className="relative z-10 flex w-[60%] flex-col p-4">
        {b.eyebrow && <p className="mb-1 text-[9px] font-extrabold tracking-[.12em] opacity-85">{b.eyebrow}</p>}
        <p className="whitespace-pre-line text-[20px] font-extrabold leading-tight tracking-tight">{b.title || 'Poster title'}</p>
        {b.subtitle && <p className="mt-1.5 line-clamp-2 text-[10.5px] leading-snug opacity-85">{b.subtitle}</p>}
        {b.cta && <span className="mt-auto inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-extrabold" style={{ background: sand ? '#B9542C' : '#fff', color: sand ? '#fff' : bg }}>{b.cta} →</span>}
      </div>
      {b.imageUrl ? <img src={b.imageUrl} alt="" className="absolute inset-y-0 right-0 h-full w-[52%] object-cover" style={{ WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 38%)', maskImage: 'linear-gradient(90deg,transparent,#000 38%)' }} />
        : <span className="absolute -right-8 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full border opacity-25" style={{ borderColor: 'currentColor' }} />}
    </div>
  );
}

const move = (arr, i, d) => { const a = [...arr]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; };

/* Shared list logic for posters and services: CRUD, active toggle, reorder. */
function useOrderedList(path) {
  const toast = useToast();
  const q = useAsync(() => api.admin.get(path), [path]);
  const save = async (item) => {
    try { item._id ? await api.admin.put(`${path}/${item._id}`, item) : await api.admin.post(path, item); toast('Saved. Live in the app now.', 'success'); q.reload(); return true; } catch (err) { toast(err.message, 'error'); return false; }
  };
  const remove = async (item) => { if (!window.confirm('Delete this item? This cannot be undone.')) return; try { await api.admin.del(`${path}/${item._id}`); q.reload(); } catch (err) { toast(err.message, 'error'); } };
  const toggle = async (item) => { try { await api.admin.put(`${path}/${item._id}`, { active: !item.active }); q.reload(); } catch (err) { toast(err.message, 'error'); } };
  const reorder = async (i, d) => {
    const next = move(q.data, i, d);
    q.setData(next);
    try { await api.admin.post(`${path}/reorder`, { ids: next.map((x) => x._id) }); } catch (err) { toast(err.message, 'error'); q.reload(); }
  };
  return { ...q, save, remove, toggle, reorder };
}

const RowActions = ({ i, n, item, list, onEdit }) => (
  <div className="flex items-center gap-1">
    <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30" disabled={i === 0} onClick={() => list.reorder(i, -1)} aria-label="Move up"><ArrowUp size={15} /></button>
    <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30" disabled={i === n - 1} onClick={() => list.reorder(i, 1)} aria-label="Move down"><ArrowDown size={15} /></button>
    <button onClick={() => list.toggle(item)} className="px-1"><Badge tone={item.active ? 'green' : 'slate'}>{item.active ? 'Live' : 'Hidden'}</Badge></button>
    <Button size="sm" variant="outline" onClick={() => onEdit(item)}><Pencil size={13} /></Button>
    <Button size="sm" variant="danger" onClick={() => list.remove(item)}><Trash2 size={13} /></Button>
  </div>
);

/* ---------------- Posters ---------------- */
function Posters() {
  const list = useOrderedList('/admin/banners');
  const [edit, setEdit] = useState(null);
  const blank = { eyebrow: '', title: '', subtitle: '', cta: 'Talk now', link: '/user/astrologers', color: 'terracotta', imageUrl: '', active: true };
  const submit = async (e) => { e.preventDefault(); if (await list.save(edit)) setEdit(null); };
  return (
    <Panel title="Home posters" action={<Button size="sm" onClick={() => setEdit(blank)}><Plus size={14} /> New poster</Button>}>
      <p className="border-b border-slate-100 bg-brand-50/60 px-4 py-2.5 text-xs text-brand-800">Posters appear at the top of the user app in this order. Hidden posters stay saved but are not shown.</p>
      {list.loading && !list.data ? <PageLoader variant="cards" /> : !list.data?.length ? <p className="py-10 text-center text-sm text-slate-400">No posters yet. Add one to fill the top of the home screen.</p> : (
        <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
          {list.data.map((b, i) => (
            <div key={b._id} className={cx('rounded-2xl border border-slate-100 p-2', !b.active && 'opacity-60')}>
              <PosterPreview b={b} />
              <div className="flex items-center justify-between gap-2 px-1 pt-2">
                <span className="truncate text-xs text-slate-500">#{i + 1} · {b.link}</span>
                <RowActions i={i} n={list.data.length} item={b} list={list} onEdit={setEdit} />
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal wide open={!!edit} onClose={() => setEdit(null)} title={edit?._id ? 'Edit poster' : 'New poster'}>
        {edit && (
          <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
            <div className="space-y-3">
              <Field label="Small label (e.g. LIVE NOW, 100% FREE)" value={edit.eyebrow} onChange={(e) => setEdit({ ...edit, eyebrow: e.target.value })} maxLength={30} />
              <TextArea label="Headline (press Enter for a new line)" rows={3} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} required maxLength={60} />
              <Field label="Subtitle" value={edit.subtitle} onChange={(e) => setEdit({ ...edit, subtitle: e.target.value })} maxLength={90} />
              <Field label="Button text" value={edit.cta} onChange={(e) => setEdit({ ...edit, cta: e.target.value })} maxLength={20} />
              <LinkField value={edit.link} onChange={(link) => setEdit({ ...edit, link })} />
            </div>
            <div className="space-y-3">
              <div>
                <span className="mb-1 block text-xs font-semibold text-slate-600">Background</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(POSTER_THEMES).map(([k, t]) => (
                    <button type="button" key={k} onClick={() => setEdit({ ...edit, color: k })} className={cx('flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-semibold', edit.color === k ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600')}>
                      <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: t.bg }} />{t.label}
                    </button>
                  ))}
                </div>
              </div>
              <ImageInput label="Poster image (right side)" value={edit.imageUrl} onChange={(imageUrl) => setEdit({ ...edit, imageUrl })} aspect="aspect-square" hint="Square or portrait image works best, e.g. an astrologer photo or a puja thali. Left edge fades into the background." />
              <div><span className="mb-1 block text-xs font-semibold text-slate-600">Preview</span><PosterPreview b={edit} /></div>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Show in app</label>
              <Button type="submit" className="w-full">Save poster</Button>
            </div>
          </form>
        )}
      </Modal>
    </Panel>
  );
}

/* ---------------- Services ---------------- */
function Services() {
  const list = useOrderedList('/admin/categories');
  const [edit, setEdit] = useState(null);
  const blank = { label: '', icon: 'chat', imageUrl: '', link: '/user/astrologers', tag: '', active: true };
  const submit = async (e) => { e.preventDefault(); if (await list.save(edit)) setEdit(null); };
  return (
    <Panel title="Services row" action={<Button size="sm" onClick={() => setEdit(blank)}><Plus size={14} /> New service</Button>}>
      <p className="border-b border-slate-100 bg-brand-50/60 px-4 py-2.5 text-xs text-brand-800">Shortcut tiles under the posters. Five or six fit on screen; more scroll sideways.</p>
      {list.loading && !list.data ? <PageLoader variant="table" /> : (
        <div className="divide-y divide-slate-50">
          {list.data?.map((c, i) => (
            <div key={c._id} className={cx('flex items-center gap-3 px-4 py-3', !c.active && 'opacity-60')}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-brand-600">{c.imageUrl ? <img src={c.imageUrl} alt="" className="h-full w-full object-cover" /> : <AstroIcon n={c.icon} size={20} />}</span>
              <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900">{c.label} {c.tag && <Badge tone="violet">{c.tag}</Badge>}</p><p className="truncate text-xs text-slate-400">{c.link}</p></div>
              <RowActions i={i} n={list.data.length} item={c} list={list} onEdit={setEdit} />
            </div>
          ))}
          {!list.data?.length && <p className="py-10 text-center text-sm text-slate-400">No services yet.</p>}
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?._id ? 'Edit service' : 'New service'}>
        {edit && (
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Label" value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} required maxLength={14} />
              <Field label="Badge (optional, e.g. FREE)" value={edit.tag} onChange={(e) => setEdit({ ...edit, tag: e.target.value.toUpperCase() })} maxLength={6} />
            </div>
            <IconPicker value={edit.icon} onChange={(icon) => setEdit({ ...edit, icon })} />
            <ImageInput label="Or use an image instead of the icon" value={edit.imageUrl} onChange={(imageUrl) => setEdit({ ...edit, imageUrl })} aspect="aspect-square" />
            <LinkField value={edit.link} onChange={(link) => setEdit({ ...edit, link })} />
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Show in app</label>
            <Button type="submit" className="w-full">Save service</Button>
          </form>
        )}
      </Modal>
    </Panel>
  );
}

/* ---------------- Home layout ---------------- */
function Layout({ cfg, setCfg }) {
  const { data: astros } = useAsync(() => api.admin.get('/admin/astrologers', { status: 'approved' }));
  const set = (i, patch) => setCfg({ ...cfg, sections: cfg.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const shift = (i, d) => setCfg({ ...cfg, sections: move(cfg.sections, i, d) });
  return (
    <div className="divide-y divide-slate-100">
      {cfg.sections.map((s, i) => {
        const [name, help] = SECTION_INFO[s.key] || [s.key, ''];
        const ids = s.astrologerIds || [];
        return (
          <div key={s.key} className={cx('px-4 py-4', !s.visible && 'bg-slate-50/70')}>
            <div className="flex items-start gap-3">
              <div className="flex flex-col">
                <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" disabled={i === 0} onClick={() => shift(i, -1)} aria-label="Move up"><ArrowUp size={15} /></button>
                <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" disabled={i === cfg.sections.length - 1} onClick={() => shift(i, 1)} aria-label="Move down"><ArrowDown size={15} /></button>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-400">{i + 1}</span><p className="text-sm font-bold text-slate-900">{name}</p></div>
                <p className="text-xs text-slate-400">{help}</p>
                {s.visible && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {!['posters', 'promo'].includes(s.key) && <Field label="Section heading (leave empty to hide)" value={s.title} onChange={(e) => set(i, { title: e.target.value })} maxLength={40} />}
                    {s.key === 'astrologers' && <Select label="Which astrologers" value={s.source} onChange={(e) => set(i, { source: e.target.value })}>{ASTRO_SOURCES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>}
                    {'limit' in s && !(s.key === 'astrologers' && s.source === 'manual') && <Field label="How many cards" type="number" min={1} max={20} value={s.limit} onChange={(e) => set(i, { limit: +e.target.value })} />}
                  </div>
                )}
                {s.visible && s.key === 'astrologers' && s.source === 'manual' && (
                  <div className="mt-3 rounded-xl border border-slate-200 p-3">
                    <p className="mb-2 text-xs font-semibold text-slate-600">Tick astrologers in the order you want them shown ({ids.length} selected)</p>
                    <div className="grid max-h-56 gap-1 overflow-y-auto sm:grid-cols-2">
                      {astros?.map((a) => {
                        const pos = ids.indexOf(a._id);
                        return (
                          <label key={a._id} className={cx('flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm', pos >= 0 ? 'bg-brand-50 text-brand-800' : 'hover:bg-slate-50')}>
                            <input type="checkbox" checked={pos >= 0} onChange={() => set(i, { astrologerIds: pos >= 0 ? ids.filter((x) => x !== a._id) : [...ids, a._id] })} />
                            <span className="min-w-0 flex-1 truncate">{a.name}</span>
                            <span className="text-xs text-slate-400">{pos >= 0 ? `#${pos + 1}` : `${inr(a.pricePerMin)}/min`}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => set(i, { visible: !s.visible })} className={cx('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold', s.visible ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                {s.visible ? <><Eye size={14} /> Shown</> : <><EyeOff size={14} /> Hidden</>}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Promo card ---------------- */
function Promo({ cfg, setCfg }) {
  const p = cfg.promo;
  const set = (patch) => setCfg({ ...cfg, promo: { ...p, ...patch } });
  return (
    <div className="grid gap-5 p-4 lg:grid-cols-2">
      <div className="space-y-3">
        <Field label="Small label (e.g. ASTROVANI REWARDS)" value={p.eyebrow} onChange={(e) => set({ eyebrow: e.target.value.toUpperCase() })} maxLength={30} />
        <Field label="Title (leave empty to hide the card)" value={p.title} onChange={(e) => set({ title: e.target.value })} maxLength={60} />
        <TextArea label="Description" rows={2} value={p.subtitle} onChange={(e) => set({ subtitle: e.target.value })} maxLength={120} />
        <Field label="Button text" value={p.cta} onChange={(e) => set({ cta: e.target.value })} maxLength={20} />
        <LinkField value={p.link} onChange={(link) => set({ link })} />
      </div>
      <div className="space-y-4">
        <IconPicker value={p.icon} onChange={(icon) => set({ icon })} />
        <div>
          <span className="mb-1 block text-xs font-semibold text-slate-600">Preview</span>
          <div className="flex items-center gap-3 rounded-2xl border border-[#F0E0D3] bg-white p-3 shadow-sm">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#EBC3AC] bg-[#F8E3D7] text-[#B9542C]"><AstroIcon n={p.icon} size={20} /></span>
            <div className="min-w-0 flex-1">
              {p.eyebrow && <p className="text-[10px] font-extrabold tracking-widest text-[#7A2618]">{p.eyebrow}</p>}
              <p className="text-sm font-extrabold text-[#3A1F14]">{p.title || 'Promo title'}</p>
              {p.subtitle && <p className="text-[11px] text-[#75564A]">{p.subtitle}</p>}
            </div>
            {p.cta && <span className="shrink-0 rounded-full bg-[#B9542C] px-3 py-1.5 text-xs font-extrabold text-white">{p.cta}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Branding ---------------- */
function Branding({ cfg, setCfg }) {
  const b = cfg.brand;
  const set = (patch) => setCfg({ ...cfg, brand: { ...b, ...patch } });
  return (
    <div className="grid gap-5 p-4 lg:grid-cols-2">
      <div className="space-y-3">
        <Field label="App name" value={b.name} onChange={(e) => set({ name: e.target.value })} required maxLength={40} />
        <Field label="Tagline under the name" value={b.tagline} onChange={(e) => set({ tagline: e.target.value })} maxLength={80} />
        <Field label="Search box placeholder (astrologer list)" value={cfg.searchPlaceholder} onChange={(e) => setCfg({ ...cfg, searchPlaceholder: e.target.value })} maxLength={80} />
        <ImageInput label="Logo (optional, replaces the text name)" value={b.logoUrl} onChange={(logoUrl) => set({ logoUrl })} aspect="aspect-[3/1]" hint="Wide transparent PNG, about 480 × 120 px." />
      </div>
      <div>
        <span className="mb-1 block text-xs font-semibold text-slate-600">Header preview</span>
        <div className="flex items-center gap-2 rounded-2xl bg-[#FBF4EE] p-4">
          <div className="min-w-0 flex-1">
            {b.logoUrl ? <img src={b.logoUrl} alt="" className="h-9 max-w-[160px] object-contain" /> : <>
              <p className="truncate text-[22px] font-bold leading-none tracking-wide text-[#7A2618]" style={{ fontFamily: 'Poppins, sans-serif' }}>{b.name || 'App name'}</p>
              {b.tagline && <p className="mt-1 truncate text-[10.5px] font-semibold text-[#75564A]">{b.tagline}</p>}
            </>}
          </div>
          <span className="h-9 w-9 rounded-full border border-[#E6CDBB] bg-white" /><span className="h-9 w-9 rounded-full border border-[#E6CDBB] bg-white" />
        </div>
      </div>
    </div>
  );
}

/* ---------------- Sign-up details (customer app) ---------------- */
export const CUSTOMER_SIGNUP_ROWS = [
  ['name', 'Full name', 'Shown to astrologers in chats.', { locked: true }],
  ['email', 'Email', 'For receipts and account updates.'],
  ['gender', 'Gender', 'Used for Kundli Milan and some readings.'],
  ['dob', 'Date of birth', 'Needed for Moon sign, Kundli and the rashi reveal.'],
  ['tob', 'Time of birth', 'Gives Lagna; users can still pick "I do not know".'],
  ['pob', 'Place of birth', 'Exact location and timezone for the chart.'],
];

/* Customer sign-up: which details are asked (one screen each), plus each screen's background photo,
   heading and help text. The app shows exactly this after a new number is verified. */
function CustomerSignup({ cfg, setCfg }) {
  const c = cfg.signup?.customer || { allowSkip: true, fields: {}, steps: {} };
  const set = (patch) => setCfg({ ...cfg, signup: { ...cfg.signup, customer: { ...c, ...patch } } });
  const setStep = (k, patch) => set({ steps: { ...c.steps, [k]: { ...(c.steps?.[k] || {}), ...patch } } });
  const steps = CUSTOMER_SIGNUP_ROWS.filter(([k, , , o]) => o?.locked || c.fields?.[k]?.show);
  const [sel, setSel] = useState('name');
  const cur = steps.some(([k]) => k === sel) ? sel : steps[0]?.[0];
  const st = c.steps?.[cur] || {};
  const idx = steps.findIndex(([k]) => k === cur);
  return (
    <div className="grid gap-5 p-4 xl:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Choose what new users are asked right after they verify their mobile number. Each detail is one screen in the app. Existing users skip this and go straight to Home.</p>
        <SignupFields rows={CUSTOMER_SIGNUP_ROWS} value={c.fields} onChange={(fields) => set({ fields })} />
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3">
          <input type="checkbox" checked={c.allowSkip !== false} onChange={(e) => set({ allowSkip: e.target.checked })} className="mt-0.5 h-4 w-4 accent-orange-700" />
          <span><span className="block text-sm font-semibold text-slate-800">Allow "Skip" for optional details</span><span className="block text-xs text-slate-500">Required details always have to be filled in; optional ones can be finished later from Profile.</span></span>
        </label>

        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-bold text-slate-900">Screen design</p>
          <p className="mb-3 text-xs text-slate-400">Background photo, heading and help text for each screen.</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {steps.map(([k, label], i) => (
              <button key={k} type="button" onClick={() => setSel(k)} className={cx('flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold', k === cur ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                <span className="opacity-70">{i + 1}.</span>{label}
              </button>
            ))}
          </div>
          {cur && (
            <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
              <ImageInput label="Background photo" value={st.imageUrl || ''} onChange={(v) => setStep(cur, { imageUrl: v })} aspect="aspect-[9/14]" hint="Tall photo works best. Remove it for a plain background." />
              <div className="space-y-3">
                <Field label="Heading" value={st.title || ''} maxLength={60} onChange={(e) => setStep(cur, { title: e.target.value })} />
                <TextArea label="Help text" rows={3} value={st.help || ''} maxLength={160} onChange={(e) => setStep(cur, { help: e.target.value })} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="xl:sticky xl:top-4 xl:self-start">
        <p className="mb-2 text-center text-xs font-semibold text-slate-500">Preview · screen {idx + 1} of {steps.length}</p>
        <div className="relative mx-auto h-[500px] w-[260px] overflow-hidden rounded-[30px] border-[7px] border-slate-900 bg-[#140A06] shadow-xl">
          {st.imageUrl && <img src={st.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-0" style={{ background: st.imageUrl ? 'linear-gradient(180deg, rgba(20,10,6,.55), rgba(20,10,6,.35) 35%, rgba(20,10,6,.82))' : '#FBF4EE' }} />
          <div className="absolute inset-x-4 top-4 h-1.5 overflow-hidden rounded-full bg-white/25"><i className="block h-full rounded-full bg-orange-500" style={{ width: `${((idx + 1) / Math.max(1, steps.length)) * 100}%` }} /></div>
          <div className="absolute inset-x-4 bottom-5">
            <p className={cx('text-[9px] font-extrabold uppercase tracking-widest', st.imageUrl ? 'text-orange-200' : 'text-orange-700')}>Step {idx + 1} of {steps.length}</p>
            <p className={cx('mt-1 text-[18px] font-bold leading-tight', st.imageUrl ? 'text-white' : 'text-[#3A1F14]')}>{st.title}</p>
            {st.help && <p className={cx('mt-1 text-[10px] leading-snug', st.imageUrl ? 'text-white/85' : 'text-[#75564A]')}>{st.help}</p>}
            <div className="mt-3 h-10 rounded-xl border border-white/40 bg-white" />
            <div className="mt-3 rounded-xl bg-orange-700 py-2.5 text-center text-[11px] font-bold text-white">{idx === steps.length - 1 ? 'Finish' : 'Next'} →</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Login screen ---------------- */
const BUILT_IN_SLIDES = [['/login/zodiac.svg', 'Zodiac wheel'], ['/login/moon.svg', 'Moon phases'], ['/login/kundli.svg', 'Kundli chart'], ['/login/diya.svg', 'Diya']];

const LOGIN_PRESETS = [
  ['Terracotta', { accent: '#B9542C', hero: '#7A2A18', offerBg: '#FFD27A', offerText: '#6B3A08' }],
  ['Maroon', { accent: '#8E2A1E', hero: '#4A1410', offerBg: '#F6D7A7', offerText: '#5A1F12' }],
  ['Saffron', { accent: '#D9741F', hero: '#8A3B0F', offerBg: '#FFE3A3', offerText: '#6B3A08' }],
  ['Royal purple', { accent: '#6D3FC4', hero: '#2A1557', offerBg: '#F5D27A', offerText: '#4A2A05' }],
  ['Midnight', { accent: '#2F5BD3', hero: '#0F1B3D', offerBg: '#FFD27A', offerText: '#5A3A05' }],
  ['Emerald', { accent: '#14805E', hero: '#0B3B2E', offerBg: '#FCE7A6', offerText: '#5A4205' }],
];
const COLOR_FIELDS = [['accent', 'Button & highlights'], ['hero', 'Top background (behind images)'], ['offerBg', 'Offer badge background'], ['offerText', 'Offer badge text']];

function ColorField({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-11 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
      <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-700">{label}</span>
        <input value={value} onChange={(e) => /^#[0-9a-f]{0,6}$/i.test(e.target.value) && onChange(e.target.value)} className="w-24 font-mono text-xs uppercase text-slate-500 outline-none" /></span>
    </label>
  );
}

function AppPhoneMockup({ cfg, bonus, stats }) {
  const [screen, setScreen] = useState('login'); // 'login' | 'home'
  const [cur, setCur] = useState(0);
  const [dark, setDark] = useState(false);
  const [returning, setReturning] = useState(false);

  const l = cfg?.login || {};
  const brand = cfg?.brand || { name: 'AstroVani' };
  const fill = (x) => (x || '').replaceAll('{app}', brand.name);
  const slides = l.slides || [];
  const n = slides.length;

  useEffect(() => {
    if (n < 2) return undefined;
    const t = setInterval(() => setCur((c) => (c + 1) % n), (l.intervalSec || 4) * 1000);
    return () => clearInterval(t);
  }, [n, l.intervalSec]);

  const s = slides[cur % Math.max(1, n)];
  const o = (l.overlay || 35) / 100;
  const c = l.colors || { accent: '#B9542C', hero: '#7A2A18', offerBg: '#FFD27A', offerText: '#6B3A08' };
  const offer = l.showOffer && l.offerText && !(l.offerText.includes('{bonus}') && !(bonus > 0)) ? l.offerText.replaceAll('{bonus}', `₹${bonus}`) : '';
  const trust = l.showTrust ? resolveTrust(l.trust, stats) : [];
  const t = dark ? { card: '#241915', soft: '#2A1D18', line: '#4A362D', t1: '#F7EBE2', t2: '#CDB5A7', t3: '#92786B' } : { card: '#FFFFFF', soft: '#FCF4EE', line: '#E6CDBB', t1: '#3A1F14', t2: '#75564A', t3: '#A88B7D' };
  const mix = (a, b, p) => `color-mix(in srgb, ${a} ${p}%, ${b})`;

  return (
    <div className="w-[275px]">
      {/* Screen Toggle */}
      <div className="mb-2 flex justify-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setScreen('login')}
          className={cx('flex-1 inline-flex items-center justify-center gap-1 rounded-lg py-1 transition text-center', screen === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800')}
        >
          <Smartphone size={11} /> Login Screen
        </button>
        <button
          type="button"
          onClick={() => setScreen('home')}
          className={cx('flex-1 inline-flex items-center justify-center gap-1 rounded-lg py-1 transition text-center', screen === 'home' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800')}
        >
          <Home size={11} /> Home Screen
        </button>
      </div>

      {screen === 'login' ? (
        <>
          <div className="mb-1.5 flex justify-center gap-1 rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold">
            {[['Light', false], ['Dark', true]].map(([lbl, v]) => (
              <button key={lbl} type="button" onClick={() => setDark(v)} className={cx('flex-1 rounded-md py-0.5', dark === v ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500')}>{lbl}</button>
            ))}
          </div>
          <div className="mb-2 flex justify-center gap-1 rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold">
            {[['New User', false], ['Returning', true]].map(([lbl, v]) => (
              <button key={lbl} type="button" onClick={() => setReturning(v)} className={cx('flex-1 rounded-md py-0.5', returning === v ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500')}>{lbl}</button>
            ))}
          </div>

          {/* Login Screen Mockup */}
          <div
            className="relative mx-auto flex h-[545px] w-[265px] flex-col overflow-hidden rounded-[34px] border-[6px] border-slate-900 shadow-xl"
            style={{
              background: dark
                ? `radial-gradient(130% 55% at 50% 0%, ${mix(c.hero, '#17100D', 55)} 0%, #17100D 62%)`
                : `radial-gradient(130% 55% at 50% 0%, ${mix(c.accent, '#FBF4EE', 14)} 0%, #FBF4EE 60%)`,
              color: t.t1,
            }}
          >
            <div className="flex items-center gap-1.5 px-3 pt-3">
              {l.showLogo && <img src={brand.logoUrl || '/favicon.svg'} alt="" className={brand.logoUrl ? 'h-6 max-w-[80px] object-contain' : 'h-6 w-6 rounded-md'} />}
              <div className="min-w-0">
                <p className="truncate text-[12px] font-bold leading-none tracking-wide" style={{ fontFamily: 'Poppins, sans-serif', color: dark ? '#F7E3CF' : '#7A2618' }}>{brand.name}</p>
                {brand.tagline && <p className="truncate text-[7.5px] font-semibold" style={{ color: t.t2 }}>{brand.tagline}</p>}
              </div>
            </div>

            <div className="relative mx-auto mt-3 h-[168px] w-[72%] shrink-0">
              <span className="absolute -inset-[5px] rounded-t-full rounded-b-[18px] border" style={{ borderColor: dark ? '#E3B867' : mix('#D9A441', c.accent, 70), opacity: 0.75 }} />
              <span className="absolute -top-[12px] left-1/2 z-10 -translate-x-1/2" style={{ color: dark ? '#E3B867' : mix('#D9A441', c.accent, 70) }}><Sparkles size={10} /></span>
              <div className="absolute inset-0 overflow-hidden rounded-t-full rounded-b-[14px] text-white" style={{ background: `radial-gradient(120% 80% at 50% 20%, ${mix(c.hero, '#F59E4C', 70)}, ${c.hero} 60%, ${mix(c.hero, '#000', 55)})` }}>
                {slides.map((x, i) => (
                  <img key={i} src={x.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000" style={{ opacity: i === cur % Math.max(1, n) ? 1 : 0 }} />
                ))}
                <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(20,8,5,${o * 0.25}) 0%, rgba(20,8,5,0) 40%, rgba(20,8,5,${o + 0.35}) 100%)` }} />
                <div className="absolute inset-x-0 bottom-2 px-2 text-center">
                  {s?.title && <p className="text-[11px] font-bold leading-tight">{s.title}</p>}
                  {s?.subtitle && <p className="mt-0.5 text-[7.5px] opacity-90 leading-tight">{s.subtitle}</p>}
                </div>
              </div>
            </div>

            <div className="mt-2 flex justify-center gap-1">
              {slides.map((_, i) => (
                <span key={i} className="h-1 rounded-full transition-all" style={{ width: i === cur % Math.max(1, n) ? 12 : 4, background: i === cur % Math.max(1, n) ? c.accent : t.line }} />
              ))}
            </div>

            <div className="flex-1 px-3 pt-1.5">
              {offer && !returning && (
                <div className="mb-1.5 flex items-center rounded-lg text-[8.5px] font-semibold" style={dark ? { background: mix(c.offerBg, '#241915', 15), color: c.offerBg } : { background: c.offerBg, color: c.offerText }}>
                  <span className="border-r border-dashed px-2 py-1" style={{ borderColor: 'currentColor' }}><Gift size={10} /></span>
                  <span className="px-2 py-1 leading-tight">
                    {l.offerLabel && <span className="block text-[6.5px] font-bold tracking-widest opacity-75">{l.offerLabel}</span>}
                    {offer}
                  </span>
                </div>
              )}

              <p className="flex items-center justify-center gap-1 text-center text-[7px]" style={{ color: dark ? '#E3B867' : '#C9933A' }}>— <Star size={7} /> —</p>

              {returning ? (
                <>
                  <p className="text-center text-[7px] font-bold uppercase tracking-widest" style={{ color: c.accent }}>Namaste, Aarav</p>
                  <p className="text-center text-[12px] font-extrabold leading-tight">{fill(l.returning?.title)}</p>
                  {l.returning?.text && <p className="text-center text-[8px]" style={{ color: t.t2 }}>{fill(l.returning.text)}</p>}
                </>
              ) : (
                <>
                  <p className="text-center text-[12px] font-extrabold leading-tight">{fill(l.newUser?.title)}</p>
                  {l.newUser?.text && <p className="text-center text-[8px] leading-snug" style={{ color: t.t2 }}>{fill(l.newUser.text)}</p>}
                </>
              )}

              {l.heading && <p className="mt-1.5 text-[8px] font-semibold" style={{ color: t.t2 }}>{l.heading}</p>}
              <div className="mt-1.5 flex h-7 items-center rounded-lg border text-[9px]" style={{ background: t.card, borderColor: t.line }}>
                <span className="border-r px-1.5 font-bold" style={{ borderColor: t.line }}>
                  <span className="mr-1 inline-block h-[7px] w-[11px] rounded-[1px] align-[-1px]" style={{ background: 'linear-gradient(#FF9933 33%, #fff 33% 66%, #138808 66%)' }} />+91
                </span>
                <span className="px-2" style={{ color: returning ? t.t1 : t.t3 }}>98765 43210</span>
              </div>
              {l.subheading && <p className="mt-0.5 text-[6.5px]" style={{ color: t.t3 }}>{l.subheading}</p>}

              <div className="mt-2 rounded-lg py-1.5 text-center text-[9px] font-bold text-white shadow-xs" style={{ background: `linear-gradient(100deg, ${mix(c.accent, '#fff', 80)}, ${c.accent} 50%, ${mix(c.accent, '#000', 80)})` }}>
                Get OTP
              </div>

              {/* Same order as the app: feature boxes below the number field. */}
              {!returning && l.newUser?.points?.length > 0 && (
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {l.newUser.points.map((x, i) => (
                    <span key={i} className="flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[7px] font-semibold" style={{ borderColor: t.line, background: t.card }}>
                      <span style={{ color: c.accent }}><AstroIcon n={x.icon} size={8} /></span>{x.text}
                    </span>
                  ))}
                </div>
              )}

              {l.terms && <p className="mt-1 text-center text-[6.5px]" style={{ color: t.t3 }}>{l.terms}</p>}

              {trust.length > 0 && (
                <div className="mt-1.5 grid rounded-lg border py-1 text-center" style={{ gridTemplateColumns: `repeat(${trust.length}, 1fr)`, borderColor: t.line, background: mix(c.accent, t.card, 6) }}>
                  {trust.map((x, i) => (
                    <div key={i} className={i ? 'border-l' : ''} style={{ borderColor: t.line }}>
                      <p className="flex items-center justify-center gap-0.5 text-[9.5px] font-extrabold">
                        <span style={{ color: dark ? '#E3B867' : '#C9933A' }}><AstroIcon n={x.icon} size={8} /></span>{x.value}
                      </p>
                      <p className="text-[6px] leading-tight" style={{ color: t.t3 }}>{x.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Home Screen Mockup */
        <div className="relative mx-auto flex h-[545px] w-[265px] flex-col overflow-hidden rounded-[34px] border-[6px] border-slate-900 shadow-xl bg-[#FBF4EE] text-slate-800">
          <div className="flex items-center justify-between px-3 pt-3 pb-2 bg-white border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              {brand.logoUrl ? <img src={brand.logoUrl} alt="" className="h-5 max-w-[70px] object-contain" /> : <p className="text-[12px] font-bold text-[#7A2618]" style={{ fontFamily: 'Poppins, sans-serif' }}>{brand.name}</p>}
            </div>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-bold text-amber-900 border border-amber-200">Wallet ₹250</span>
          </div>

          <div className="px-2.5 py-1.5 bg-white border-b border-slate-100">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[8px] text-slate-400">
              <Search size={9} className="shrink-0" />
              <span className="truncate">{cfg?.searchPlaceholder || 'Search astrologers, kundli...'}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2">
            <div className="rounded-xl p-2.5 text-white shadow-xs" style={{ background: `linear-gradient(135deg, ${c.accent}, ${c.hero})` }}>
              <p className="text-[6.5px] font-bold tracking-widest opacity-85 uppercase">SPECIAL PROMO</p>
              <p className="text-[10.5px] font-extrabold leading-tight">First Consultation at ₹1/min</p>
              <span className="mt-1.5 inline-block rounded-full bg-white px-2 py-0.5 text-[7px] font-bold text-slate-900 shadow-2xs">Chat Now →</span>
            </div>

            <div className="grid grid-cols-4 gap-1 rounded-xl bg-white p-1.5 shadow-2xs border border-slate-100">
              {[['Chat', 'chat'], ['Call', 'phone'], ['Kundli', 'kundli'], ['Milan', 'match']].map(([service, ic]) => (
                <div key={service} className="text-center">
                  <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-lg bg-brand-50" style={{ color: c.accent }}><AstroIcon n={ic} size={11} /></span>
                  <p className="mt-0.5 font-bold text-slate-700 text-[6.5px]">{service}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-white p-2 shadow-2xs border border-slate-100">
              <div className="flex justify-between items-center mb-1">
                <p className="font-bold text-slate-900 text-[8px]">Top Astrologers</p>
                <span className="text-[6.5px] font-bold" style={{ color: c.accent }}>View all →</span>
              </div>
              <div className="space-y-1">
                {[
                  { name: 'Pt. Rajesh Shastri', exp: 'Vedic', price: 20 },
                  { name: 'Acharya Sunita', exp: 'Tarot', price: 25 },
                ].map((a) => (
                  <div key={a.name} className="flex items-center justify-between border-b border-slate-50 pb-1">
                    <div>
                      <p className="font-bold text-slate-800 text-[7.5px]">{a.name}</p>
                      <p className="flex items-center gap-0.5 text-[6px] text-slate-400">{a.exp} · <Star size={6} className="fill-amber-400 text-amber-400" /> 4.9</p>
                    </div>
                    <span className="rounded-full px-2 py-0.5 text-[6.5px] font-bold text-white" style={{ background: c.accent }}>₹{a.price}/m</span>
                  </div>
                ))}
              </div>
            </div>

            {cfg?.promo?.title && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-2">
                <p className="font-extrabold text-[7.5px] text-amber-900">{cfg.promo.title}</p>
                <p className="text-[6.5px] text-slate-500 line-clamp-1">{cfg.promo.subtitle}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-around border-t border-slate-200 bg-white py-1.5 text-[7px] font-bold text-slate-400">
            <span style={{ color: c.accent }}>Home</span>
            <span>Kundli</span>
            <span>Chat</span>
            <span>Wallet</span>
          </div>
        </div>
      )}
      <p className="mt-2 text-center text-[11px] text-slate-400">Live app mockup preview</p>
    </div>
  );
}

const SectionTitle = ({ children, hint }) => <div className="mb-2"><p className="text-sm font-bold text-slate-900">{children}</p>{hint && <p className="text-xs text-slate-400">{hint}</p>}</div>;

function LoginScreen({ cfg, setCfg }) {
  const l = cfg.login;
  const b = cfg.brand;
  const set = (patch) => setCfg({ ...cfg, login: { ...l, ...patch } });
  const setBrand = (patch) => setCfg({ ...cfg, brand: { ...b, ...patch } });
  const setSlide = (i, patch) => set({ slides: l.slides.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const setTrust = (i, patch) => set({ trust: l.trust.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const unused = BUILT_IN_SLIDES.filter(([u]) => !l.slides.some((x) => x.imageUrl === u));
  const { data: platform } = useAsync(() => api.admin.get('/admin/settings'));
  const { data: stats } = useAsync(() => api.public.get('/public/stats'));
  const bonus = platform ? Math.max(0, +platform.welcomeBonus || 0) : null;
  const box = 'rounded-2xl border border-slate-200 p-4';
  return (
    <div className="grid gap-6 p-4 xl:grid-cols-[1fr_290px]">
      <div className="space-y-5">
        <div className={box}>
          <SectionTitle hint="Shared with the app header (Branding tab).">Logo & name</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            <ImageInput label="Logo" value={b.logoUrl} onChange={(logoUrl) => setBrand({ logoUrl })} aspect="aspect-square" hint="Square PNG with transparent background works best. Empty = default star logo." />
            <div className="space-y-3">
              <Field label="App name" value={b.name} onChange={(e) => setBrand({ name: e.target.value })} maxLength={40} />
              <Field label="Tagline" value={b.tagline} onChange={(e) => setBrand({ tagline: e.target.value })} maxLength={80} />
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={l.showLogo} onChange={(e) => set({ showLogo: e.target.checked })} /> Show logo on the login screen</label>
            </div>
          </div>
        </div>

        <div className={box}>
          <div className="mb-2 flex items-center justify-between">
            <SectionTitle hint={`${l.slides.length}/8 slides, change automatically.`}>Top images</SectionTitle>
            <Button size="sm" variant="outline" disabled={l.slides.length >= 8} onClick={() => set({ slides: [...l.slides, { imageUrl: '', title: '', subtitle: '' }] })}><Plus size={14} /> Add slide</Button>
          </div>
          <div className="space-y-3">
            {l.slides.map((x, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-400">Slide {i + 1}</span><span className="flex-1" />
                  <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30" disabled={i === 0} onClick={() => set({ slides: move(l.slides, i, -1) })} aria-label="Move up"><ArrowUp size={15} /></button>
                  <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30" disabled={i === l.slides.length - 1} onClick={() => set({ slides: move(l.slides, i, 1) })} aria-label="Move down"><ArrowDown size={15} /></button>
                  <button className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" onClick={() => set({ slides: l.slides.filter((_, j) => j !== i) })} aria-label="Remove slide"><Trash2 size={15} /></button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <ImageInput label="Image" value={x.imageUrl} onChange={(imageUrl) => setSlide(i, { imageUrl })} aspect="aspect-[4/3]" hint="Landscape or square, about 1200 × 900 px. Keep the subject in the centre." />
                  <div className="space-y-3">
                    <Field label="Caption title" value={x.title} onChange={(e) => setSlide(i, { title: e.target.value })} maxLength={50} />
                    <TextArea label="Caption text" rows={2} value={x.subtitle} onChange={(e) => setSlide(i, { subtitle: e.target.value })} maxLength={100} />
                  </div>
                </div>
              </div>
            ))}
            {!l.slides.length && <p className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-sm text-slate-400">No slides. The top area shows the background colour only.</p>}
          </div>
          {unused.length > 0 && l.slides.length < 8 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Add a built-in illustration:</span>
              {unused.map(([u, name]) => <button key={u} onClick={() => set({ slides: [...l.slides, { imageUrl: u, title: '', subtitle: '' }] })} className="flex items-center gap-1.5 rounded-lg border border-slate-200 py-1 pl-1 pr-2 font-semibold text-slate-700 hover:bg-slate-50"><img src={u} alt="" className="h-6 w-8 rounded object-cover" />{name}</button>)}
            </div>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label={`Change every: ${l.intervalSec} seconds`} type="range" min={2} max={15} value={l.intervalSec} onChange={(e) => set({ intervalSec: +e.target.value })} />
            <Field label={`Dark overlay on images: ${l.overlay}%`} type="range" min={0} max={80} value={l.overlay} onChange={(e) => set({ overlay: +e.target.value })} />
          </div>
        </div>

        <div className={box}>
          <SectionTitle hint="Write {app} for the app name. Returning = someone who has logged in on that phone before.">Welcome text</SectionTitle>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">New user</p>
              <Field label="Title" value={l.newUser.title} onChange={(e) => set({ newUser: { ...l.newUser, title: e.target.value } })} maxLength={50} />
              <TextArea label="About the app" rows={3} value={l.newUser.text} onChange={(e) => set({ newUser: { ...l.newUser, text: e.target.value } })} maxLength={160} />
              <span className="block text-xs font-semibold text-slate-600">Highlights (up to 3)</span>
              {[0, 1, 2].map((i) => {
                const pt = l.newUser.points[i] || { icon: 'star', text: '' };
                const setPt = (patch) => { const pts = [0, 1, 2].map((j) => (j === i ? { ...pt, ...patch } : l.newUser.points[j] || { icon: 'star', text: '' })); set({ newUser: { ...l.newUser, points: pts } }); };
                return (
                  <div key={i} className="flex gap-2">
                    <select value={pt.icon} onChange={(e) => setPt({ icon: e.target.value })} className="h-[42px] rounded-xl border border-slate-200 bg-white px-2 text-sm">{SERVICE_ICONS.map((ic) => <option key={ic}>{ic}</option>)}</select>
                    <input value={pt.text} maxLength={24} placeholder={`Highlight ${i + 1}`} onChange={(e) => setPt({ text: e.target.value })} className="h-[42px] flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500" />
                  </div>
                );
              })}
            </div>
            <div className="space-y-3 rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Returning user</p>
              <Field label="Title" value={l.returning.title} onChange={(e) => set({ returning: { ...l.returning, title: e.target.value } })} maxLength={50} />
              <TextArea label="Text" rows={2} value={l.returning.text} onChange={(e) => set({ returning: { ...l.returning, text: e.target.value } })} maxLength={120} />
              <p className="text-[11px] text-slate-500">Shown with "Namaste, &lt;first name&gt;" and their number filled in. The offer badge is shown to new users only.</p>
            </div>
          </div>
        </div>

        <div className={box}>
          <SectionTitle>Form texts</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Label above the number field" value={l.heading} onChange={(e) => set({ heading: e.target.value })} maxLength={40} />
            <Field label="Hint below the number field" value={l.subheading} onChange={(e) => set({ subheading: e.target.value })} maxLength={100} />
            <Field className="sm:col-span-2" label="Terms line" value={l.terms} onChange={(e) => set({ terms: e.target.value })} maxLength={140} />
          </div>
        </div>

        <div className={box}>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-900"><input type="checkbox" checked={l.showOffer} onChange={(e) => set({ showOffer: e.target.checked })} /> Offer badge above the form</label>
          {l.showOffer && <>
            <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr]">
              <Field label="Small label" value={l.offerLabel} onChange={(e) => set({ offerLabel: e.target.value.toUpperCase() })} maxLength={24} placeholder="NEW USER OFFER" />
              <Field label="Offer text" value={l.offerText} onChange={(e) => set({ offerText: e.target.value })} maxLength={100} />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">Write <code className="rounded bg-slate-100 px-1">{'{bonus}'}</code> where the sign-up bonus should appear. It is <b>₹{bonus ?? '…'}</b> now (Price management → Customer side). With a ₹0 bonus, a badge using {'{bonus}'} hides itself.</p>
          </>}
        </div>

        <div className={box}>
          <div className="mb-2 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-900"><input type="checkbox" checked={l.showTrust} onChange={(e) => set({ showTrust: e.target.checked })} /> Badges at the bottom</label>
            {l.showTrust && <Button size="sm" variant="outline" disabled={l.trust.length >= 4} onClick={() => set({ trust: [...l.trust, { icon: 'star', source: 'custom', value: '', label: '' }] })}><Plus size={14} /> Add badge</Button>}
          </div>
          {l.showTrust && (
            <div className="space-y-2">
              {l.trust.map((x, i) => (
                <div key={i} className="grid items-end gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[auto_1fr_1fr_1fr_auto]">
                  <div>
                    <span className="mb-1 block text-xs font-semibold text-slate-600">Icon</span>
                    <select value={x.icon} onChange={(e) => setTrust(i, { icon: e.target.value })} className="h-[42px] rounded-xl border border-slate-200 px-2 text-sm">{SERVICE_ICONS.map((ic) => <option key={ic}>{ic}</option>)}</select>
                  </div>
                  <Select label="Value" value={x.source} onChange={(e) => setTrust(i, { source: e.target.value })}>{Object.entries(TRUST_SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                  {x.source === 'custom' ? <Field label="Value text (e.g. 100%)" value={x.value} onChange={(e) => setTrust(i, { value: e.target.value })} maxLength={12} /> : <div className="pb-2.5 text-xs text-slate-400">Filled automatically</div>}
                  <Field label="Label" value={x.label} onChange={(e) => setTrust(i, { label: e.target.value })} maxLength={28} />
                  <div className="flex gap-1 pb-1">
                    <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30" disabled={i === 0} onClick={() => set({ trust: move(l.trust, i, -1) })} aria-label="Move left"><ArrowUp size={15} /></button>
                    <button className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" onClick={() => set({ trust: l.trust.filter((_, j) => j !== i) })} aria-label="Remove badge"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-slate-400">Up to 4 badges. Use custom text only for claims that are true for your platform.</p>
            </div>
          )}
        </div>

        <div className={box}>
          <SectionTitle hint="Used in light mode. Dark mode tones are derived from the same colours automatically.">Colours</SectionTitle>
          <div className="mb-3 flex flex-wrap gap-2">
            {LOGIN_PRESETS.map(([name, colors]) => (
              <button key={name} type="button" onClick={() => set({ colors })} className={cx('flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-semibold', JSON.stringify(colors) === JSON.stringify(l.colors) ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                <span className="flex"><span className="h-4 w-4 rounded-full border-2 border-white" style={{ background: colors.hero }} /><span className="-ml-1.5 h-4 w-4 rounded-full border-2 border-white" style={{ background: colors.accent }} /><span className="-ml-1.5 h-4 w-4 rounded-full border-2 border-white" style={{ background: colors.offerBg }} /></span>{name}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {COLOR_FIELDS.map(([k, label]) => <ColorField key={k} label={label} value={l.colors[k]} onChange={(v) => set({ colors: { ...l.colors, [k]: v } })} />)}
          </div>
        </div>
      </div>
      <div className="xl:sticky xl:top-4 xl:self-start"><p className="mb-2 text-center text-xs font-semibold text-slate-500">Live Mockup Preview</p><AppPhoneMockup cfg={{ ...cfg, login: { ...l, slides: l.slides.filter((x) => x.imageUrl) } }} bonus={bonus || 0} stats={stats} /></div>
    </div>
  );
}

/* ---------------- Page ---------------- */
const CONFIG_TABS = ['login', 'signup', 'layout', 'promo', 'branding'];
const TABS = [
  ['login', 'Login Screen'],
  ['signup', 'Sign-up Details'],
  ['layout', 'Home Layout'],
  ['posters', 'Home Posters'],
  ['services', 'Services Row'],
  ['promo', 'Promo Offer Card'],
  ['branding', 'Branding & Search'],
];

export default function AppManagement() {
  const toast = useToast();
  // Each tab has its own sidebar entry: /admin/global/app/<tab>
  const params = useParams();
  const tab = TABS.some(([k]) => k === params.tab) ? params.tab : new URLSearchParams(window.location.search).get('tab') || 'login';
  const [cfg, setCfg] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.admin.get('/admin/app-config').then((c) => { setCfg(c); setSaved(c); }).catch((e) => toast(e.message, 'error')); }, [toast]);
  const dirty = cfg && saved && JSON.stringify(cfg) !== JSON.stringify(saved);
  const save = async () => {
    setBusy(true);
    try { const c = await api.admin.put('/admin/app-config', cfg); setCfg(c); setSaved(c); toast('Saved. Live in the app now.', 'success'); } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const titles = { login: 'Login Screen & Flow Customizer', signup: 'Sign-up Details', layout: 'Home Screen Sections & Ordering', promo: 'Highlighted Promo Offer Card', branding: 'Branding, Logo & Search Settings' };

  return (
    <>
      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Customer app</p>
        <h2 className="text-xl font-bold text-slate-900">{(TABS.find(([k]) => k === tab) || [, ''])[1]}</h2>
        <p className="text-sm text-slate-500">Changes go live in the customer app as soon as you save.</p>
      </div>
      {tab === 'posters' && <Posters />}
      {tab === 'services' && <Services />}
      {CONFIG_TABS.includes(tab) && (
        <Panel title={titles[tab]} action={<Button size="sm" onClick={save} loading={busy} disabled={!dirty}><Save size={14} /> {dirty ? 'Save changes' : 'Saved'}</Button>}>
          {!cfg ? <PageLoader variant="form" /> : tab === 'login' ? <LoginScreen cfg={cfg} setCfg={setCfg} /> : tab === 'signup' ? <CustomerSignup cfg={cfg} setCfg={setCfg} /> : tab === 'layout' ? <Layout cfg={cfg} setCfg={setCfg} /> : tab === 'promo' ? <Promo cfg={cfg} setCfg={setCfg} /> : <Branding cfg={cfg} setCfg={setCfg} />}
        </Panel>
      )}
    </>
  );
}
