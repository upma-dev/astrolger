import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useToast, cx } from '../../../shared/ui.jsx';

/* Shared pieces for Price Management (Eqosy "Set Prices" look): load/save hook, the same maths as the server, form inputs. */

export const r2 = (n) => Math.round((+n || 0) * 100) / 100;
const r4 = (n) => Math.round((+n || 0) * 10000) / 10000;
export const SERVICES = [['chat', 'Chat'], ['audio', 'Audio call'], ['video', 'Video call']];
export const BLOCKS = [[1, 'Per minute'], [2, 'Per 2 minutes'], [5, 'Per 5 minutes'], [10, 'Per 10 minutes'], [15, 'Per 15 minutes'], [30, 'Per 30 minutes'], [60, 'Hourly']];
export const unitOf = (block) => (block === 1 ? 'min' : block === 60 ? 'hr' : `${block} min`);
export const blockLabel = (block) => (BLOCKS.find(([b]) => b === block)?.[1] || `Per ${block} minutes`);
// Rates are stored per minute; the admin types them per billing unit (per hour for hourly).
export const toUnit = (perMin, block) => r2(perMin * block);
export const fromUnit = (v, block) => (v === '' ? '' : r4(+v / block));

/* Same as sessionRates() + billMinute() in Backend/src/services/pricing.js & wallet.js. */
export function quote(rule, perMin, { minutes = 10, discountPct = 0, customCommission = null, cut = 0 } = {}) {
  const block = rule.block || 1;
  const blocks = Math.max(1, Math.ceil((+minutes || 1) / block));
  const listedBlock = r2(perMin * block);
  const userBlock = r2(listedBlock * (1 - (+discountPct || 0) / 100));
  let type = rule.commissionType, c = +rule.commission || 0;
  if (customCommission !== null && customCommission !== undefined && customCommission !== '') { type = 'percent'; c = +customCommission; }
  const astroBlock = type === 'percent' ? r2(listedBlock * (1 - Math.max(0, c - (+cut || 0)) / 100)) : r2(Math.max(0, listedBlock - c * block));
  const feePct = rule.feeType === 'percent' ? +rule.fee || 0 : 0;
  const fixedFee = rule.feeType === 'fixed' ? +rule.fee || 0 : 0;
  const gst = +rule.gstPct || 0;
  const feeOnBlock = r2(userBlock * feePct / 100);
  const gstOnBlock = r2((userBlock + feeOnBlock) * gst / 100);
  const charge = r2(userBlock + feeOnBlock + gstOnBlock);
  const fixedTotal = r2(fixedFee * (1 + gst / 100));
  const userTotal = r2(charge * blocks + fixedTotal);
  const gstTotal = r2(gstOnBlock * blocks + (fixedTotal - fixedFee));
  const astroTotal = r2(astroBlock * blocks);
  const svcMax = +rule.maxMinutes || 0;
  const maxMinutes = rule.autoCut ? (svcMax > 0 ? Math.min(block, svcMax) : block) : svcMax;
  const effMin = maxMinutes > 0 ? Math.min(rule.minMinutes || 1, maxMinutes) : (rule.minMinutes || 1);
  return {
    block, blocks, maxMinutes, listedBlock, userBlock, astroBlock, feeOnBlock, gstOnBlock, charge, fixedFee, fixedTotal,
    userTotal, gstTotal, astroTotal, feeTotal: r2(feeOnBlock * blocks + fixedFee), platform: r2(userTotal - gstTotal - astroTotal),
    commissionPct: listedBlock ? r2((1 - astroBlock / listedBlock) * 100) : 0,
    minBalance: r2(charge * Math.max(1, Math.ceil(effMin / block)) + fixedTotal),
  };
}

/* Loads pricing + the few settings that live outside it (packs, bonus); tracks unsaved edits; saves both. */
export function usePricing() {
  const toast = useToast();
  const [p, setP] = useState(null);
  const [saved, setSaved] = useState(null);
  const [s, setS] = useState(null);
  const [savedS, setSavedS] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    Promise.all([api.admin.get('/admin/pricing'), api.admin.get('/admin/settings')])
      .then(([pr, st]) => {
        const x = { rechargePacks: st.rechargePacks || [100, 200, 500], popularPack: st.popularPack ?? 200, welcomeBonus: st.welcomeBonus ?? 0 };
        setP(pr); setSaved(pr); setS(x); setSavedS(x);
      })
      .catch((e) => toast(e.message, 'error'));
  }, [toast]);
  const dirty = !!p && (JSON.stringify(p) !== JSON.stringify(saved) || JSON.stringify(s) !== JSON.stringify(savedS));
  const setPart = (part, patch) => setP((x) => ({ ...x, [part]: { ...x[part], ...patch } }));
  const setService = (k, patch) => setP((x) => ({ ...x, services: { ...x.services, [k]: { ...x.services[k], ...patch } } }));
  const discard = () => { setP(saved); setS(savedS); };
  const save = async (next) => {
    setBusy(true);
    try {
      const pr = await api.admin.put('/admin/pricing', next || p);
      await api.admin.put('/admin/settings', { rechargePacks: s.rechargePacks, popularPack: s.popularPack, welcomeBonus: s.welcomeBonus });
      setP(pr); setSaved(pr); setSavedS(s);
      toast('Prices saved. Live in the customer and astrologer apps now.', 'success');
      return true;
    } catch (e) { toast(e.message, 'error'); return false; } finally { setBusy(false); }
  };
  return { p, setP, saved, s, setS, dirty, busy, save, discard, setPart, setService };
}

/* ---------- Eqosy-style building blocks ---------- */
export const inputClass = 'w-full rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition-all focus:border-indigo-500';
export const labelClass = 'mb-2.5 block text-[13px] font-semibold text-gray-700';

export function PageHead({ title, crumbs = [], children }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
      <div>
        <h1 className="text-sm font-bold uppercase tracking-[0.15em] text-[#1E293B]">{title}</h1>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          {['Price Management', ...crumbs].map((c, i, a) => (
            <span key={c} className="flex items-center gap-1.5">
              <span className={i === a.length - 1 ? 'font-bold text-slate-800' : ''}>{c}</span>
              {i < a.length - 1 && <ChevronRight size={10} className="text-slate-300" />}
            </span>
          ))}
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export const Card = ({ title, action, children, className }) => (
  <div className={cx('overflow-hidden rounded-md border border-gray-100 bg-white shadow-sm', className)}>
    {(title || action) && (
      <div className="flex items-center justify-between border-b border-gray-50 px-6 py-4">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#1E293B]">{title}</h2>
        {action}
      </div>
    )}
    {children}
  </div>
);

export function NumField({ label, value, onChange, suffix, prefix, hint, required, step = 'any', min = 0, max, disabled }) {
  return (
    <div>
      {label && <label className={labelClass}>{label}{required && <span className="text-rose-500"> *</span>}</label>}
      <div className={cx('flex items-center overflow-hidden rounded-md border border-gray-200 bg-white focus-within:border-indigo-500', disabled && 'opacity-50')}>
        {prefix && <span className="border-r border-gray-100 bg-gray-50 px-3 py-3 text-[12px] font-black text-slate-500">{prefix}</span>}
        <input type="number" step={step} min={min} max={max} disabled={disabled} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : +e.target.value)} className="w-full min-w-0 px-4 py-3 text-sm text-gray-800 outline-none" />
        {suffix && <span className="pr-4 text-[12px] font-bold text-slate-400">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-[10.5px] font-medium text-slate-400">{hint}</p>}
    </div>
  );
}

/* Select (type) + number (value) in one box, like Eqosy's "Admin commission type / value". */
export function TypeValue({ label, type, onType, value, onValue, options, hint, required }) {
  const sfx = options.find(([k]) => k === type)?.[2] || '';
  return (
    <div>
      <label className={labelClass}>{label}{required && <span className="text-rose-500"> *</span>}</label>
      <div className="flex overflow-hidden rounded-md border border-gray-200 focus-within:border-indigo-500">
        <select value={type} onChange={(e) => onType(e.target.value)} className="cursor-pointer border-r border-gray-200 bg-gray-50 px-3 text-[11px] font-black uppercase outline-none">
          {options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input type="number" step="any" min={0} value={value ?? ''} onChange={(e) => onValue(e.target.value === '' ? '' : +e.target.value)} className="min-w-0 flex-1 px-4 py-3 text-sm outline-none" />
        <span className="flex items-center pr-4 text-[12px] font-bold text-slate-400">{sfx}</span>
      </div>
      {hint && <p className="mt-1 text-[10.5px] font-medium text-slate-400">{hint}</p>}
    </div>
  );
}

export function Switch({ on, onChange, label, hint, disabled }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!on)} className={cx('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition disabled:opacity-50', on ? 'border-emerald-200 bg-emerald-50/60' : 'border-gray-200 bg-white hover:bg-slate-50')}>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold text-slate-800">{label}</span>
        {hint && <span className="block text-[11px] font-medium text-slate-500">{hint}</span>}
      </span>
      <span className={cx('relative h-6 w-11 shrink-0 rounded-full transition', on ? 'bg-emerald-500' : 'bg-slate-300')}>
        <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  );
}

export function SaveBar({ dirty, busy, onSave, onDiscard, label = 'Save & publish' }) {
  return (
    <>
      {dirty && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">Unsaved changes</span>}
      {dirty && <button type="button" onClick={onDiscard} className="rounded px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">Discard</button>}
      <button type="button" onClick={() => onSave()} disabled={!dirty || busy} className="flex items-center gap-2 rounded bg-[#00BFA5] px-6 py-2 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40">
        {busy ? 'Saving…' : dirty ? label : 'Saved'}
      </button>
    </>
  );
}

export const Row = ({ label, hint, value, strong, tone }) => (
  <div className={cx('flex items-start justify-between gap-4 py-1.5 text-sm', strong && 'border-t border-slate-200 pt-2.5')}>
    <span><span className={strong ? 'font-bold text-slate-900' : 'text-slate-600'}>{label}</span>{hint && <span className="block text-[11px] text-slate-400">{hint}</span>}</span>
    <span className={cx('shrink-0 font-semibold', strong && 'text-base font-bold', tone === 'green' && 'text-emerald-600', tone === 'brand' && 'text-indigo-600', tone === 'red' && 'text-rose-600', !tone && 'text-slate-900')}>{value}</span>
  </div>
);

// Link to the chat / call / video rules inside the section the admin is in (Astrologers / Users / Global).
export function useRulesLink() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin/astro')) return '/admin/astro/pricing/rules';
  if (pathname.startsWith('/admin/users')) return '/admin/users/pricing/charges';
  return '/admin/users/pricing/charges';
}
