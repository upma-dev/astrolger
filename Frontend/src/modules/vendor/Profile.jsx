import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BadgeCheck, LifeBuoy, CalendarClock, ChevronRight, Clock3, FileText, Languages, LogOut, MessageCircle, Pencil, Phone, Plus, RotateCcw, Shield, Sparkles, Star, Trash2, Video, X } from 'lucide-react';
import { api, EXPERTISE, LANGUAGES, fmtDate } from '../../lib/api.js';
import { usePlatformLive } from '../../lib/live.js';
import { vendorAuth } from '../../lib/auth.jsx';
import { Button, Card, Field, Select, Stars, TextArea, useAsync, useToast, cx } from '../../shared/ui.jsx';
import { useLogoutPrompt } from '../../shared/SaveLoginPrompt.jsx';
import SupportButton from '../../shared/Support.jsx';

/* Astrologer profile. Opens as a read-only profile card; "Edit profile" switches to the form. */

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SERVICE_ICON = { chat: MessageCircle, audio: Phone, video: Video };
const r2 = (n) => Math.round((+n || 0) * 100) / 100;
const unit = (b) => (b === 1 ? 'min' : b === 60 ? 'hr' : `${b} min`);
const initials = (n = '?') => n.replace(/^(Pt\.|Dr\.|Acharya|Guru|Swami)\s+/i, '').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
const to12 = (t) => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); if (!m) return t || ''; const h = +m[1]; return `${h % 12 || 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`; };

const Chips = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-1.5">{options.map((o) => { const on = value.includes(o); return <button type="button" key={o} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])} className={cx('rounded-full border px-3 py-1.5 text-xs font-semibold transition', on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600')}>{o}</button>; })}</div>
);
const Tags = ({ items, empty }) => (items?.length
  ? <div className="flex flex-wrap gap-1.5">{items.map((x) => <span key={x} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">{x}</span>)}</div>
  : <p className="text-xs text-slate-400">{empty}</p>);
const Section = ({ title, icon: I, action, children }) => (
  <Card className="p-4">
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">{I && <I size={16} className="text-brand-600" />}{title}</h2>
      {action}
    </div>
    {children}
  </Card>
);

function Avatar({ src, name, size = 76 }) {
  const [bad, setBad] = useState(false);
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 text-2xl font-bold text-white ring-4 ring-white/30" style={{ width: size, height: size }}>
      {src && !bad ? <img src={src} alt="" className="h-full w-full object-cover" onError={() => setBad(true)} /> : initials(name)}
    </span>
  );
}

/* Read-only price cards: my rate, duration/auto-end rule, what the customer pays, what I take home. */
function PriceCards({ pricing }) {
  if (!pricing) return <p className="text-xs text-slate-400">Loading…</p>;
  const list = pricing.services.filter((x) => x.enabled);
  return (
    <div className="grid gap-2.5 sm:grid-cols-3">
      {list.map((x) => {
        const I = SERVICE_ICON[x.key] || MessageCircle;
        const u = unit(x.block);
        return (
          <div key={x.key} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><I size={14} className="text-brand-600" />{x.label}</p>
            <p className="mt-1 text-xl font-extrabold text-slate-900">₹{r2(x.rate * x.block)}<span className="text-xs font-medium text-slate-400">/{u}</span></p>
            {x.maxMinutes > 0 && <p className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Auto-ends at {x.maxMinutes} min</p>}
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-[11px]">
              <span className="text-slate-500">You earn</span><b className="text-emerald-600">₹{x.earnPerBlock}/{u}</b>
            </div>
            <div className="flex justify-between text-[11px]"><span className="text-slate-500">Customer pays</span><b className="text-slate-700">₹{x.userPerBlock}/{u}</b></div>
          </div>
        );
      })}
    </div>
  );
}

/* Editable prices + custom duration & auto-cut per service, stacked for phones. */
function PriceEditor({ pricing, rates, setRates }) {
  if (!pricing) return null;
  const edit = pricing.allowRateEdit;
  return (
    <div className="space-y-2.5">
      {!edit && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Your prices are set by the admin.</p>}
      {pricing.services.filter((x) => x.enabled).map((x) => {
        const I = SERVICE_ICON[x.key] || MessageCircle;
        const entry = rates[x.key] || {};
        const dur = entry.duration !== undefined ? entry.duration : x.block;
        const durNum = Math.max(1, Math.min(240, Math.round(+dur) || 1));
        const value = entry.price !== undefined ? entry.price : r2(x.rate * durNum);
        const autoCut = entry.autoCut !== undefined ? entry.autoCut : !!x.autoCut;
        const u = unit(durNum);
        const lo = r2(x.minRate * durNum), hi = r2(x.maxRate * durNum);
        const bad = edit && (+value < lo - 1e-6 || +value > hi + 1e-6);
        const patch = (p) => setRates((s) => ({ ...s, [x.key]: { price: value, duration: dur, autoCut, ...s[x.key], ...p } }));
        return (
          <div key={x.key} className="rounded-2xl border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><I size={15} className="text-brand-600" />{x.label}</p>
              <span className="text-[11px] text-slate-400">{durNum === 1 ? 'Per minute' : durNum === 60 ? 'Hourly' : `Per ${u}`}</span>
            </div>
            <div className="mt-2 grid grid-cols-[1fr_110px] gap-2">
              <div className={cx('flex items-center rounded-xl border bg-white', bad ? 'border-rose-300' : 'border-slate-200', !edit && 'opacity-60')}>
                <span className="pl-3 text-sm text-slate-400">₹</span>
                <input type="number" step="any" min={lo} max={hi} disabled={!edit} value={value} onChange={(e) => patch({ price: e.target.value })} className="w-full min-w-0 bg-transparent px-2 py-2.5 text-base font-bold outline-none" />
                <span className="pr-3 text-xs text-slate-400">/{u}</span>
              </div>
              <div className={cx('flex items-center rounded-xl border border-slate-200 bg-white', !edit && 'opacity-60')}>
                <input type="number" min={1} max={240} disabled={!edit} value={dur} onChange={(e) => {
                  const nextDur = Math.max(1, Math.min(240, Math.round(+e.target.value) || 1));
                  patch({ duration: e.target.value, autoCut: nextDur > 1 ? true : entry.autoCut ?? !!x.autoCut });
                }} className="w-full min-w-0 bg-transparent px-2.5 py-2.5 text-base font-bold outline-none" aria-label={`${x.label} time in minutes`} />
                <span className="pr-3 text-xs text-slate-400">min</span>
              </div>
            </div>
            <label className={cx('mt-2 flex items-center gap-2 text-xs font-medium text-slate-700', edit ? 'cursor-pointer' : 'opacity-60')}>
              <input type="checkbox" disabled={!edit} checked={autoCut} onChange={(e) => patch({ autoCut: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
              Auto-end {x.label.toLowerCase()} when {durNum} min finishes
            </label>
            <p className={cx('mt-1 text-[11px]', bad ? 'text-rose-600' : 'text-slate-400')}>Allowed ₹{lo} – ₹{hi} for {durNum} min · admin commission {x.commissionType === 'percent' ? `${x.commission}%` : `₹${x.commission}/min`}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function Profile() {
  const { me, setMe, logout } = vendorAuth.useAuth();
  const nav = useNavigate();
  const [askLogout, logoutPrompt] = useLogoutPrompt('astrologer', me, () => { logout(); nav('/vendor/login'); });
  const toast = useToast();
  const { data: reviews } = useAsync(() => api.vendor.get('/astrologer/reviews'));
  // Support conversations (Admin > Astrologers > Support queries).
  const { data: tickets } = useAsync(() => api.vendor.get('/astrologer/tickets'));
  const openQueries = (tickets || []).filter((x) => x.status === 'open').length;
  const unread = (tickets || []).some((x) => x.unreadOwner);
  // My prices per service (rate, what the customer pays, what I earn). Reloads when the admin changes the rules.
  const { data: pricing, reload: reloadPricing } = useAsync(() => api.vendor.get('/astrologer/pricing'));
  usePlatformLive((what) => (what === 'pricing' || what === 'system' || what === 'focus') && reloadPricing(true));
  const fromMe = () => ({ name: me.name, bio: me.bio || '', experience: me.experience ?? '', expertise: me.expertise || [], languages: me.languages || [], slots: me.slots || [], avatar: me.avatar || '' });
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState(fromMe);
  const [rates, setRates] = useState({}); // edited values, in the service's unit (₹/min or ₹/hr)
  const [busy, setBusy] = useState(false);

  const startEdit = () => { setF(fromMe()); setRates({}); setEditing(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const cancel = () => { setEditing(false); setRates({}); };
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const body = { ...f, experience: +f.experience || 0 };
    if (pricing?.allowRateEdit && Object.keys(rates).length) {
      const durFor = (x) => Math.max(1, Math.min(240, Math.round(+(rates[x.key]?.duration ?? x.block)) || 1));
      body.durations = Object.fromEntries(pricing.services.map((x) => [x.key, durFor(x)]));
      body.autoCut = Object.fromEntries(pricing.services.map((x) => [x.key, rates[x.key]?.autoCut !== undefined ? !!rates[x.key].autoCut : !!x.autoCut]));
      body.rates = Object.fromEntries(pricing.services.map((x) => {
        const d = durFor(x);
        const price = rates[x.key]?.price !== undefined ? +rates[x.key].price : r2(x.rate * d);
        return [x.key, price / d];
      }));
    }
    try {
      setMe(await api.vendor.put('/astrologer/me', body));
      setRates({}); reloadPricing(); setEditing(false);
      toast('Profile updated', 'success');
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const setSlot = (i, patch) => setF((s) => ({ ...s, slots: s.slots.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));

  /* ---------------- Edit mode ---------------- */
  if (editing) return (
    <form onSubmit={save} className="space-y-4 pb-24 lg:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">Edit profile</h1>
        <button type="button" onClick={cancel} className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100"><X size={16} /> Cancel</button>
      </div>
      <Section title="Basic details">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-lg font-bold text-white">{f.avatar ? <img src={f.avatar} alt="" className="h-full w-full object-cover" /> : initials(f.name)}</span>
            <Field label="Photo URL" placeholder="https://…" value={f.avatar} onChange={(e) => setF({ ...f, avatar: e.target.value })} className="flex-1" />
          </div>
          <Field label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          <Field label="Experience (years)" type="number" min={0} max={80} value={f.experience} onChange={(e) => setF({ ...f, experience: e.target.value })} />
          <TextArea label="About you" rows={4} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} maxLength={600} />
        </div>
      </Section>
      <Section title="My prices"><PriceEditor pricing={pricing} rates={rates} setRates={setRates} /></Section>
      <Section title="Expertise"><Chips options={EXPERTISE} value={f.expertise} onChange={(v) => setF({ ...f, expertise: v })} /></Section>
      <Section title="Languages"><Chips options={LANGUAGES} value={f.languages} onChange={(v) => setF({ ...f, languages: v })} /></Section>
      <Section title="Availability" action={<Button type="button" size="sm" variant="outline" onClick={() => setF({ ...f, slots: [...f.slots, { day: 'Mon', from: '10:00', to: '18:00' }] })}><Plus size={14} /> Add slot</Button>}>
        {f.slots.length === 0 && <p className="text-xs text-slate-400">No slots set. You can still go online any time.</p>}
        <div className="space-y-2">
          {f.slots.map((sl, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <Select value={sl.day} onChange={(e) => setSlot(i, { day: e.target.value })} className="flex-1">{DAYS.map((d) => <option key={d}>{d}</option>)}</Select>
                <button type="button" onClick={() => setF({ ...f, slots: f.slots.filter((_, j) => j !== i) })} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" aria-label="Remove slot"><Trash2 size={16} /></button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Field label="From" type="time" value={sl.from} onChange={(e) => setSlot(i, { from: e.target.value })} />
                <Field label="To" type="time" value={sl.to} onChange={(e) => setSlot(i, { to: e.target.value })} />
              </div>
            </div>
          ))}
        </div>
      </Section>
      {/* Save bar: sits above the bottom tabs on phones */}
      <div className="fixed inset-x-0 bottom-[62px] z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0">
        <div className="mx-auto flex max-w-4xl gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={cancel}>Cancel</Button>
          <Button type="submit" loading={busy} className="flex-[2]">Save changes</Button>
        </div>
      </div>
    </form>
  );

  /* ---------------- View mode ---------------- */
  const reviewCount = me.ratingCount ?? reviews?.length ?? 0;
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-amber-600 p-5 text-white shadow-lg">
        <div className="flex items-start gap-4">
          <Avatar src={me.avatar} name={me.name} />
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-1.5 truncate text-lg font-bold">{me.name}{me.status === 'approved' && <BadgeCheck size={18} className="shrink-0 text-sky-200" />}</h1>
            <p className="truncate text-xs text-white/80">{(me.expertise || []).slice(0, 3).join(' · ') || 'Astrologer'}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
              <span className="rounded-full bg-white/20 px-2 py-0.5">Profile: {me.status}</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5">KYC: {me.kyc?.status || 'pending'}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 divide-x divide-white/20 rounded-2xl bg-white/10 py-2.5 text-center">
          <div><p className="flex items-center justify-center gap-1 text-base font-bold"><Star size={14} className="fill-current" />{me.rating ? (+me.rating).toFixed(1) : '—'}</p><p className="text-[10.5px] text-white/75">{reviewCount} reviews</p></div>
          <div><p className="text-base font-bold">{me.experience || 0}+</p><p className="text-[10.5px] text-white/75">Years exp.</p></div>
          <div><p className="text-base font-bold">{Math.round(me.totalMinutes || 0).toLocaleString('en-IN')}</p><p className="text-[10.5px] text-white/75">Minutes</p></div>
        </div>
        <button type="button" onClick={startEdit} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-brand-700 shadow active:scale-[.99]"><Pencil size={15} /> Edit profile</button>
      </div>

      <Section title="My prices" icon={Sparkles} action={pricing?.allowRateEdit && <button type="button" onClick={startEdit} className="text-xs font-bold text-brand-700">Change</button>}>
        <PriceCards pricing={pricing} />
      </Section>

      <Section title="About" icon={FileText}>
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{me.bio || <span className="text-slate-400">Add a short introduction so customers know you.</span>}</p>
      </Section>

      <Section title="Expertise & languages" icon={Languages}>
        <div className="space-y-3">
          <Tags items={me.expertise} empty="No expertise added yet." />
          <Tags items={me.languages} empty="No languages added yet." />
        </div>
      </Section>

      <Section title="Availability" icon={CalendarClock}>
        {me.slots?.length ? (
          <ul className="divide-y divide-slate-100">
            {me.slots.map((s, i) => <li key={i} className="flex items-center justify-between py-2 text-sm"><span className="font-semibold text-slate-700">{s.day}</span><span className="flex items-center gap-1.5 text-slate-500"><Clock3 size={13} />{to12(s.from)} – {to12(s.to)}</span></li>)}
          </ul>
        ) : <p className="text-xs text-slate-400">No fixed slots. You can go online any time.</p>}
      </Section>

      <Section title="Reviews" icon={Star}>
        {reviews?.length ? reviews.map((r) => (
          <div key={r._id} className="border-t border-slate-100 py-2.5 text-xs first:border-0 first:pt-0">
            <div className="flex justify-between"><b className="text-slate-800">{r.user?.name || 'User'}</b><Stars value={r.rating} size={12} /></div>
            {r.comment && <p className="mt-0.5 text-slate-600">{r.comment}</p>}
            <p className="text-[10px] text-slate-400">{fmtDate(r.createdAt)}</p>
          </div>
        )) : <p className="text-xs text-slate-400">No reviews yet.</p>}
      </Section>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><LifeBuoy size={20} /></span>
          <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900">Help & support</p><p className="text-xs text-slate-500">{openQueries ? `${openQueries} open quer${openQueries > 1 ? 'ies' : 'y'}` : 'Payouts, KYC, account: talk to our team'}{unread ? ' · new reply' : ''}</p></div>
          <SupportButton app="astrologer" loggedIn className="shrink-0 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white">Open</SupportButton>
        </div>
      </Card>

      <Section title="Guidelines & policies" icon={Shield}>
        <div className="divide-y divide-slate-100 text-sm">
          {[['/terms', 'Astrologer Terms of Service', FileText], ['/privacy', 'Privacy Policy', Shield], ['/refund', 'Refund & dispute rules', RotateCcw]].map(([to, l, I]) => (
            <Link key={to} to={to} className="flex items-center justify-between py-2.5 text-slate-700 hover:text-brand-600"><span className="flex items-center gap-2"><I size={15} className="text-slate-400" />{l}</span><ChevronRight size={15} className="text-slate-400" /></Link>
          ))}
        </div>
      </Section>

      <Button variant="outline" className="w-full lg:hidden" onClick={askLogout}><LogOut size={16} /> Logout</Button>
      {logoutPrompt}
    </div>
  );
}
