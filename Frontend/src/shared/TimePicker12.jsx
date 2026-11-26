import { useEffect, useState } from 'react';

/* 12-hour time picker: hour (1–12) · minute (00–59) · AM / PM.
   Reads and writes 24-hour "HH:MM" (what the server stores), e.g. 2:05 PM ⇄ "14:05".
   Calls onChange('') until hour and minute are both picked. */

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

const parse = (v) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v || '');
  if (!m) return { h: '', min: '', ap: 'AM' };
  const H = +m[1];
  return { h: String(H % 12 || 12), min: m[2], ap: H >= 12 ? 'PM' : 'AM' };
};
const to24 = ({ h, min, ap }) => {
  if (!h || min === '') return '';
  const H = (+h % 12) + (ap === 'PM' ? 12 : 0);
  return `${String(H).padStart(2, '0')}:${min}`;
};

export default function TimePicker12({ value, onChange, disabled, variant = 'field', label }) {
  const [t, setT] = useState(() => parse(value));
  // Follow outside changes (e.g. profile loaded later), but don't wipe a half-picked time.
  useEffect(() => { if (value && value !== to24(t)) setT(parse(value)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (patch) => { const next = { ...t, ...patch }; setT(next); onChange(to24(next)); };

  const big = variant === 'wl';
  const sel = big
    ? 'h-14 min-w-0 flex-1 appearance-none rounded-2xl border-[1.5px] border-[var(--line2)] bg-[var(--card)] px-3 text-center text-lg font-bold text-[var(--t1)] outline-none focus:border-[var(--accent)]'
    : 'h-[42px] min-w-0 flex-1 appearance-none rounded-xl border border-slate-200 bg-white px-2 text-center text-sm font-semibold text-slate-900 outline-none focus:border-brand-500';
  const seg = (on) => (big
    ? `flex-1 rounded-xl text-[15px] font-bold transition ${on ? 'bg-[var(--accent)] text-white shadow' : 'text-[var(--t2)]'}`
    : `flex-1 rounded-lg text-xs font-bold transition ${on ? 'bg-brand-600 text-white' : 'text-slate-500'}`);

  return (
    <div className={disabled ? 'pointer-events-none opacity-45' : ''}>
      {label && <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>}
      <div className="flex items-center gap-2">
        <select aria-label="Hour" className={sel} value={t.h} disabled={disabled} onChange={(e) => set({ h: e.target.value })}>
          <option value="" disabled>HH</option>
          {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className={big ? 'av-tp-colon text-xl font-bold' : 'font-bold text-slate-400'}>:</span>
        <select aria-label="Minute" className={sel} value={t.min} disabled={disabled} onChange={(e) => set({ min: e.target.value })}>
          <option value="" disabled>MM</option>
          {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <div role="radiogroup" aria-label="AM or PM" className={big ? 'flex h-14 w-[118px] shrink-0 gap-1 rounded-2xl border-[1.5px] border-[var(--line2)] bg-[var(--card)] p-1' : 'flex h-[42px] w-[96px] shrink-0 gap-1 rounded-xl border border-slate-200 bg-white p-1'}>
          {['AM', 'PM'].map((x) => <button key={x} type="button" role="radio" aria-checked={t.ap === x} disabled={disabled} onClick={() => set({ ap: x })} className={seg(t.ap === x)}>{x}</button>)}
        </div>
      </div>
    </div>
  );
}
