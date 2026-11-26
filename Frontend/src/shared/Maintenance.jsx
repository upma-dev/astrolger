import { Wrench } from 'lucide-react';

/* Full-screen notice shown while the admin has switched an app off (Global > System settings). */
export default function Maintenance({ info, brand, dark = false, compact = false }) {
  const title = info?.title || 'We will be back soon';
  return (
    <div className={`flex ${compact ? 'h-full' : 'min-h-[100dvh]'} flex-col items-center justify-center px-6 py-12 text-center ${dark ? 'bg-slate-950 text-white' : 'bg-gradient-to-b from-amber-50 to-white text-slate-900'}`}>
      <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${dark ? 'bg-white/10' : 'bg-amber-100 text-amber-700'}`}><Wrench size={30} /></div>
      {brand && <p className="mt-5 text-xs font-bold uppercase tracking-[.2em] opacity-60">{brand}</p>}
      <h1 className="mt-2 max-w-sm text-2xl font-bold">{title}</h1>
      {info?.message && <p className={`mt-3 max-w-sm text-sm leading-relaxed ${dark ? 'text-white/70' : 'text-slate-600'}`}>{info.message}</p>}
      {info?.eta && <p className={`mt-4 rounded-full px-3 py-1 text-xs font-semibold ${dark ? 'bg-white/10' : 'bg-amber-100 text-amber-800'}`}>Expected back: {info.eta}</p>}
      <button type="button" onClick={() => window.location.reload()} className={`mt-6 rounded-xl px-4 py-2 text-sm font-semibold ${dark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>Try again</button>
    </div>
  );
}
