import { Lock } from 'lucide-react';
import { cx } from '../../shared/ui.jsx';

/* Table of sign-up fields with "Ask" and "Required" switches.
   rows: [key, label, description, { locked }] ; value: { [key]: { show, required } } */
function Toggle({ on, onChange, disabled, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={cx('relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-40', on ? 'bg-brand-600' : 'bg-slate-300')}>
      <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}

export default function SignupFields({ rows, value = {}, onChange }) {
  const set = (k, patch) => {
    const cur = value[k] || { show: false, required: false };
    const next = { ...cur, ...patch };
    if (!next.show) next.required = false;
    onChange({ ...value, [k]: next });
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="grid grid-cols-[1fr_72px_84px] items-center gap-3 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        <span>Detail</span><span className="text-center">Ask</span><span className="text-center">Required</span>
      </div>
      {rows.map(([k, label, desc, opts = {}]) => {
        const v = opts.locked ? { show: true, required: true } : value[k] || { show: false, required: false };
        return (
          <div key={k} className={cx('grid grid-cols-[1fr_72px_84px] items-center gap-3 border-t border-slate-100 px-4 py-3', !v.show && 'bg-slate-50/50')}>
            <div className="min-w-0">
              <p className={cx('flex items-center gap-1.5 text-sm font-semibold', v.show ? 'text-slate-900' : 'text-slate-400')}>
                {label}{opts.locked && <Lock size={12} className="text-slate-400" />}
              </p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
            <div className="flex justify-center"><Toggle on={v.show} disabled={opts.locked} onChange={(show) => set(k, { show })} label={`Ask for ${label}`} /></div>
            <div className="flex justify-center"><Toggle on={v.required} disabled={opts.locked || !v.show} onChange={(required) => set(k, { required })} label={`${label} required`} /></div>
          </div>
        );
      })}
    </div>
  );
}
