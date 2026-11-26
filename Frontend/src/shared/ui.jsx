import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Loader2, X, CheckCircle2, AlertCircle, Star } from 'lucide-react';
import { PageSkeleton, Sk, SkCard, SkText } from './Skeleton.jsx';

export { PageSkeleton, Sk, SkCard, SkText };

export const cx = (...a) => a.filter(Boolean).join(' ');

/* ---------- Toasts ---------- */
export const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type = 'info') => {
    const id = Math.random();
    setItems((s) => [...s, { id, message, type }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div key={t.id} className={cx('pointer-events-auto flex max-w-sm items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg', t.type === 'error' ? 'bg-rose-600' : t.type === 'success' ? 'bg-emerald-600' : 'bg-slate-800')}>
            {t.type === 'error' ? <AlertCircle size={16} /> : t.type === 'success' ? <CheckCircle2 size={16} /> : null}
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Primitives ---------- */
export function Spinner({ className = '' }) {
  return <Loader2 className={cx('animate-spin', className)} size={20} />;
}
export function PageLoader({ variant = 'default' }) {
  return <PageSkeleton variant={variant} />;
}

export function Button({ variant = 'primary', size = 'md', loading, className, children, ...p }) {
  const v = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/30',
    gold: 'bg-gradient-to-r from-gold-500 to-amber-400 text-slate-900 hover:brightness-105',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  }[variant];
  const s = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3.5 text-base' }[size];
  return (
    <button {...p} disabled={p.disabled || loading} className={cx('inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50', v, s, className)}>
      {loading && <Spinner className="h-4 w-4" />}{children}
    </button>
  );
}

export const Card = ({ className, children, ...p }) => <div {...p} className={cx('rounded-2xl border border-slate-100 bg-white shadow-sm', className)}>{children}</div>;

export function Field({ label, hint, className, ...p }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>}
      <input {...p} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}
export function Select({ label, className, children, ...p }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>}
      <select {...p} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100">{children}</select>
    </label>
  );
}
export function TextArea({ label, className, ...p }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>}
      <textarea {...p} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
    </label>
  );
}

export function Badge({ tone = 'slate', children }) {
  const t = { slate: 'bg-slate-100 text-slate-600', green: 'bg-emerald-50 text-emerald-700', red: 'bg-rose-50 text-rose-700', amber: 'bg-amber-50 text-amber-700', violet: 'bg-brand-50 text-brand-700', blue: 'bg-sky-50 text-sky-700' }[tone];
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize', t)}>{children}</span>;
}
export const statusTone = (s) => ({ approved: 'green', verified: 'green', paid: 'green', completed: 'green', active: 'green', resolved: 'green', pending: 'amber', requested: 'amber', open: 'amber', rejected: 'red', blocked: 'red', cancelled: 'red', missed: 'red' }[s] || 'slate');

export function Empty({ icon: Icon, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      {Icon && <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Icon size={22} /></div>}
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {hint && <p className="max-w-xs text-xs text-slate-400">{hint}</p>}
      {action}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={cx('max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stars({ value = 0, size = 14 }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400" aria-label={`${value} stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} strokeWidth={2} className={i <= Math.round(value) ? 'fill-current' : ''} aria-hidden="true" />
      ))}
    </span>
  );
}

export function Avatar({ name = '?', size = 48, className, src }) {
  const [bad, setBad] = useState(false);
  if (src && !bad) return <img src={src} alt={name} width={size} height={size} loading="lazy" onError={() => setBad(true)} style={{ width: size, height: size }} className={cx('shrink-0 rounded-full object-cover', className)} />;
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 40 + 255;
  const initials = name.replace(/^(Pt\.|Dr\.|Acharya|Guru|Swami)\s+/i, '').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return <div style={{ width: size, height: size, background: `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${hue + 25} 75% 60%))`, fontSize: size * 0.38 }} className={cx('flex shrink-0 items-center justify-center rounded-full font-bold text-white', className)}>{initials}</div>;
}

export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    if (!value) { setDebounced(value); return undefined; }
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const reload = useCallback((silent = false) => {
    const quiet = silent === true;
    setState((s) => (quiet && s.data !== null ? { ...s, error: null } : { ...s, loading: true, error: null }));
    return fn()
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => setState((s) => (quiet && s.data !== null ? { ...s, loading: false, error } : { data: null, loading: false, error })));
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload, setData: (data) => setState((s) => ({ ...s, data })) };
}
