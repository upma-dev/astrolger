import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Image as ImageIcon, Search as SearchIcon, Upload } from 'lucide-react';
import { api } from '../../lib/api.js';
import Glyph from '../../shared/AstroIcon.jsx';
import { cx, Card, useToast } from '../../shared/ui.jsx';

export function Table({ cols, rows, empty = 'No records', rowKey = '_id', onRowClick }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-xs">
        <thead>
          <tr className="border-b border-slate-100 bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {cols.map((c) => (
              <th key={c.h} className={cx('px-5 py-3.5', c.right && 'text-right')}>
                {c.h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows?.length ? (
            rows.map((r, i) => (
              <tr
                key={r[rowKey] ?? i}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={cx('transition-colors hover:bg-slate-50/80', onRowClick && 'cursor-pointer')}
              >
                {cols.map((c) => (
                  <td key={c.h} className={cx('px-5 py-4 text-slate-700 leading-relaxed', c.right && 'text-right')}>
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={cols.length} className="px-5 py-14 text-center text-xs text-slate-400">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export const Panel = ({ title, action, children, className }) => (
  <Card className={cx('overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs', className)}>
    {(title || action) && (
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h2 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h2>
        {action}
      </div>
    )}
    {children}
  </Card>
);

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm">
      {tabs.map(([k, l]) => <button key={k} onClick={() => onChange(k)} className={cx('shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition', value === k ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100')}>{l}</button>)}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, sub, tone = 'bg-brand-50 text-brand-600', to, onClick }) {
  const interactive = Boolean(to || onClick);
  const inner = (
    <Card className={cx('flex items-center gap-4 p-4 transition', interactive && 'cursor-pointer hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md')}>
      <span className={cx('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', tone)}><Icon size={22} /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xl font-extrabold text-slate-900">{value}</p>
        <p className="truncate text-xs text-slate-400">{label}</p>
        {sub && <p className="text-[11px] font-semibold text-amber-600">{sub}</p>}
      </div>
      {interactive && <ChevronRight size={16} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />}
    </Card>
  );
  if (to) return <Link to={to} className="group block focus:outline-none">{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className="group block w-full text-left focus:outline-none">{inner}</button>;
  return inner;
}

// Minimal dependency-free bar chart
export function BarChart({ data, color = '#b9542c', format = (v) => v, height = 140 }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1.5 px-4 pb-3 pt-4" style={{ height }}>
      {data.map((d) => (
        <div key={d.date || d.label} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.date || d.label}: ${format(d.value)}`}>
          <div className="w-full rounded-t-md transition-all group-hover:opacity-80" style={{ height: `${Math.max(2, (d.value / max) * 100)}%`, background: color }} />
          <span className="mt-1 truncate text-center text-[9px] text-slate-400">{(d.date || d.label).slice(-5)}</span>
        </div>
      ))}
    </div>
  );
}

/* Image field: paste a URL or upload a file (stored by the API under /uploads). */
export function ImageInput({ label = 'Image', value, onChange, hint, aspect = 'aspect-[16/9]', fallback }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return toast('Use a PNG, JPG, WEBP or GIF image', 'error');
    if (file.size > 4 * 1024 * 1024) return toast('Image must be under 4 MB', 'error');
    setBusy(true);
    try {
      const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
      const { url } = await api.admin.post('/admin/upload', { dataUrl });
      onChange(url);
      toast('Image uploaded', 'success');
    } catch (err) { toast(err.message || 'Upload failed', 'error'); } finally { setBusy(false); }
  };
  return (
    <div>
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      <div className="flex flex-wrap items-start gap-3">
        <div className={cx('relative w-24 shrink-0 overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50', aspect)}>
          {value || fallback
            ? <img src={value || fallback} alt="" className="absolute inset-0 h-full w-full object-cover" />
            : <span className="absolute inset-0 flex items-center justify-center text-slate-300"><ImageIcon size={22} /></span>}
          {!value && fallback && <span className="absolute inset-x-1 bottom-1 rounded-md bg-slate-900/70 py-0.5 text-center text-[9.5px] font-semibold text-white">Built-in</span>}
        </div>
        <div className="min-w-[180px] flex-1 space-y-2">
          <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="https://… or upload" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
          <div className="flex flex-wrap gap-2">
            <label className={cx('inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50', busy && 'pointer-events-none opacity-60')}>
              <Upload size={13} /> {busy ? 'Uploading…' : 'Upload'}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={pickFile} />
            </label>
            {value && <button type="button" onClick={() => onChange('')} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">Remove</button>}
          </div>
          {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

/* Renders one of the shared astro icons by key. */
export const AstroIcon = ({ n, size = 20, className }) => <span className={cx('inline-flex', className)}><Glyph n={n} size={size} /></span>;

/* Search input used in list toolbars. */
export function SearchBox({ value, onChange, placeholder = 'Search' }) {
  return (
    <label className="relative block">
      <SearchIcon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-56 rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-brand-500" />
    </label>
  );
}

/* Small label/value tiles for profile pages. */
export function InfoGrid({ items, cols = 3 }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {items.map(([k, v]) => <div key={k} className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-semibold text-slate-400">{k}</p><p className="mt-0.5 truncate text-sm font-bold text-slate-900">{v ?? '—'}</p></div>)}
    </div>
  );
}

/* Pill filter row. */
export function Pills({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([k, l]) => <button key={k} onClick={() => onChange(k)} className={cx('rounded-full border px-3 py-1 text-xs font-semibold transition', value === k ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>{l}</button>)}
    </div>
  );
}
