import { useState } from 'react';
import { api } from '../../lib/api.js';
import { Button, Card, useToast } from '../../shared/ui.jsx';
import { BirthForm, placeMissing } from './Kundli.jsx';

export default function Matching() {
  const toast = useToast();
  const [boy, setBoy] = useState({});
  const [girl, setGirl] = useState({});
  const [r, setR] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async (e) => {
    e.preventDefault();
    if (placeMissing(boy) || placeMissing(girl)) return toast('Pick each birth place from the list so the charts use exact locations', 'error');
    setBusy(true);
    try { setR(await api.public.post('/public/match', { boy, girl })); } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const pct = r ? (r.total / r.max) * 100 : 0;

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-bold text-slate-900">Kundli Milan</h1>
      <form onSubmit={run} className="space-y-4">
        <Card className="p-4"><h2 className="mb-3 text-sm font-bold text-sky-700">Groom's details</h2><BirthForm value={boy} onChange={setBoy} /></Card>
        <Card className="p-4"><h2 className="mb-3 text-sm font-bold text-rose-600">Bride's details</h2><BirthForm value={girl} onChange={setGirl} /></Card>
        <Button type="submit" loading={busy} className="w-full" size="lg">Match Horoscopes</Button>
      </form>
      {r && (
        <Card className="p-5">
          <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full" style={{ background: `conic-gradient(var(--color-brand-600) ${pct * 3.6}deg, var(--color-brand-100) 0deg)` }}>
            <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-[#12102e]">
              <span className="text-3xl font-extrabold text-brand-700">{r.total}</span><span className="text-xs text-slate-400">out of {r.max}</span>
            </div>
          </div>
          <p className="mt-3 text-center text-sm font-bold text-slate-900">{r.verdict}</p>
          <p className="text-center text-xs text-slate-500">Groom: {r.boy.rashi} / {r.boy.nakshatra} · Bride: {r.girl.rashi} / {r.girl.nakshatra}</p>
          <div className="mt-4 space-y-2.5">
            {r.parts.map((p) => (
              <div key={p.name}>
                <div className="mb-0.5 flex justify-between text-xs"><span className="font-semibold text-slate-700">{p.name}</span><span className="text-slate-500">{p.score}/{p.max}</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(p.score / p.max) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
