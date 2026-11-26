import { useState } from 'react';
import TimePicker12 from '../../shared/TimePicker12.jsx';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { userAuth } from '../../lib/auth.jsx';
import KundliChart from '../../shared/KundliChart.jsx';
import PlaceSearch from './PlaceSearch.jsx';
import { Badge, Button, Card, Field, useToast, cx } from '../../shared/ui.jsx';

/* Birth details with real place lookup: lat/long and timezone are filled from the chosen place. */
export const placeMissing = (v) => !!v.pob && v.lat == null;

export const BirthForm = ({ value, onChange }) => (
  <div className="grid grid-cols-2 gap-3">
    <Field label="Date of birth" type="date" max={new Date().toISOString().slice(0, 10)} value={value.dob || ''} onChange={(e) => onChange({ ...value, dob: e.target.value })} required />
    <TimePicker12 label="Time of birth" value={value.tob || ''} onChange={(v) => onChange({ ...value, tob: v })} />
    <div className="col-span-2"><PlaceSearch value={value} onChange={onChange} /></div>
    {!value.tob && <p className="col-span-2 -mt-1 text-[11px] text-slate-400">Without a birth time the Lagna and houses can't be exact.</p>}
  </div>
);

const TABS = ['Chart', 'Planets', 'Dosha', 'Dasha'];

export default function Kundli() {
  const { me } = userAuth.useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ dob: me.dob || '', tob: me.tob || '', pob: me.pob || '', lat: me.lat ?? null, lon: me.lon ?? null, tz: me.tz || null });
  const [k, setK] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('Chart');

  const run = async (e) => {
    e.preventDefault();
    if (form.pob && form.lat == null) return toast('Pick your birth place from the list so the chart uses its exact location', 'error');
    setBusy(true);
    try { setK(await api.public.post('/public/kundli', form)); setTab('Chart'); } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-bold text-slate-900">Free Kundli</h1>
      <Card className="p-4">
        <form onSubmit={run} className="space-y-3">
          <BirthForm value={form} onChange={setForm} />
          <Button type="submit" loading={busy} className="w-full">Generate Kundli</Button>
        </form>
      </Card>
      {k && (
        <>
          <Card className="grid grid-cols-3 divide-x divide-slate-100 p-3 text-center text-xs">
            <div><p className="text-slate-400">Lagna</p><p className="font-bold text-slate-900">{k.ascendant.sign}</p></div>
            <div><p className="text-slate-400">Moon sign</p><p className="font-bold text-slate-900">{k.rashi}</p></div>
            <div><p className="text-slate-400">Nakshatra</p><p className="font-bold text-slate-900">{k.nakshatra}</p></div>
          </Card>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={cx('rounded-full px-4 py-1.5 text-xs font-semibold', tab === t ? 'bg-brand-600 text-white' : 'bg-white text-slate-600')}>{t}</button>)}
          </div>
          <Card className="p-4">
            {tab === 'Chart' && <KundliChart kundli={k} />}
            {tab === 'Planets' && (
              <div className="overflow-x-auto"><table className="w-full text-xs">
                <thead><tr className="text-left text-slate-400"><th className="pb-2">Planet</th><th>Sign</th><th>Deg</th><th>House</th><th>Nakshatra</th></tr></thead>
                <tbody>{k.planets.map((p) => <tr key={p.name} className="border-t border-slate-100"><td className="py-2 font-semibold text-slate-800">{p.name}</td><td>{p.sign}</td><td>{p.degree}°</td><td>{p.house}</td><td>{p.nakshatra} ({p.pada})</td></tr>)}</tbody>
              </table></div>
            )}
            {tab === 'Dosha' && (
              <div className="space-y-3">
                {k.doshas.map((d) => (
                  <div key={d.name} className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-900">{d.name}</p><Badge tone={d.present ? 'red' : 'green'}>{d.present ? 'Present' : 'Not present'}</Badge></div>
                    <p className="mt-1 text-xs text-slate-600">{d.detail}</p>
                    {d.present && <p className="mt-1 text-xs text-brand-700"><b>Remedy:</b> {d.remedy}</p>}
                  </div>
                ))}
                <Link to="/user/astrologers" className="block text-center text-xs font-semibold text-brand-600">Discuss with an astrologer →</Link>
              </div>
            )}
            {tab === 'Dasha' && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Vimshottari Mahadasha sequence</p>
                {k.dasha.map((d, i) => <div key={`${d.lord}-${i}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs"><b className="text-slate-800">{d.lord}</b><span className="text-slate-500">{d.from} → {d.to}</span></div>)}
              </div>
            )}
          </Card>
          <p className="text-center text-[11px] text-slate-400">Calculations use Lahiri ayanamsa and whole-sign houses. Planet positions are approximate; consult an astrologer for detailed analysis.</p>
        </>
      )}
    </div>
  );
}
