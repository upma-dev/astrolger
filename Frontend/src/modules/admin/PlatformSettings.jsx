import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Power, Save, RotateCcw, Smartphone, Sparkles, Globe2, UserPlus, AlertTriangle, IndianRupee, Megaphone, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api.js';
import { Button, Field, PageLoader, TextArea, useToast, cx } from '../../shared/ui.jsx';
import Maintenance from '../../shared/Maintenance.jsx';
import { Panel } from './kit.jsx';

/* Global switches. Turning an app off blocks it (login included) immediately for everyone who has it open;
   the admin panel keeps working. */
const APPS = [
  ['user', 'Customer app', 'The /user app: chat, call, wallet, Kundli', Smartphone, '/user'],
  ['astrologer', 'Astrologer app', 'The /vendor partner app. Online astrologers are taken offline.', Sparkles, '/vendor'],
  ['website', 'Website', 'The public landing page', Globe2, '/'],
];

function Switch({ on, onChange, danger }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={cx('relative h-7 w-[52px] shrink-0 rounded-full transition', on ? 'bg-emerald-500' : danger ? 'bg-rose-500' : 'bg-slate-300')}>
      <span className={cx('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all', on ? 'left-[26px]' : 'left-0.5')} />
    </button>
  );
}

export default function PlatformSettings() {
  const toast = useToast();
  const [s, setS] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState('user');
  useEffect(() => { api.admin.get('/admin/system').then((x) => { setS(x); setSaved(x); }).catch((e) => toast(e.message, 'error')); }, [toast]);
  if (!s) return <PageLoader variant="form" />;
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);
  const setApp = (k, patch) => setS({ ...s, [k]: { ...s[k], ...patch } });

  const save = async () => {
    const turningOff = APPS.filter(([k]) => saved[k].enabled && !s[k].enabled).map(([, l]) => l);
    if (turningOff.length && !window.confirm(`Turn OFF: ${turningOff.join(', ')}?\n\nEveryone using it will see the maintenance screen right away.`)) return;
    setBusy(true);
    try { const x = await api.admin.put('/admin/system', s); setS(x); setSaved(x); toast('Saved. Applied to all open apps now.', 'success'); } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const offCount = APPS.filter(([k]) => !saved[k].enabled).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">System</p>
          <h2 className="text-xl font-bold text-slate-900">System settings</h2>
          <p className="text-sm text-slate-500">Switch apps on or off (maintenance mode) and pause new sign-ups. Applies instantly.</p>
        </div>
        <div className="flex gap-2">
          {dirty && <Button variant="outline" onClick={() => setS(saved)}><RotateCcw size={14} /> Discard</Button>}
          <Button onClick={save} loading={busy} disabled={!dirty}><Save size={14} /> {dirty ? 'Save & apply' : 'Saved'}</Button>
        </div>
      </div>

      {offCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertTriangle size={18} className="shrink-0" />
          <p><b>{APPS.filter(([k]) => !saved[k].enabled).map(([, l]) => l).join(', ')}</b> {offCount > 1 ? 'are' : 'is'} switched off right now. Users see the maintenance screen.</p>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Panel title={<span className="flex items-center gap-2"><Power size={16} /> App on / off</span>}>
            <div className="divide-y divide-slate-100">
              {APPS.map(([k, label, hint, I, href]) => {
                const a = s[k];
                return (
                  <div key={k} className="p-4">
                    <div className="flex items-center gap-3">
                      <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', a.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}><I size={19} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm font-bold text-slate-900">{label}
                          <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', a.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>{a.enabled ? 'Live' : 'Off'}</span>
                          <a href={href} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-700" aria-label={`Open ${label}`}><ExternalLink size={13} /></a>
                        </p>
                        <p className="text-xs text-slate-500">{hint}</p>
                      </div>
                      <Switch on={a.enabled} onChange={(v) => { setApp(k, { enabled: v }); setPreview(k); }} danger />
                    </div>
                    {!a.enabled && (
                      <div className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
                        <Field label="Title" value={a.title} maxLength={60} onChange={(e) => setApp(k, { title: e.target.value })} onFocus={() => setPreview(k)} />
                        <Field label="Expected back (optional)" value={a.eta} maxLength={40} placeholder="e.g. 6:00 PM today" onChange={(e) => setApp(k, { eta: e.target.value })} onFocus={() => setPreview(k)} />
                        <TextArea className="sm:col-span-2" label="Message" rows={2} maxLength={300} value={a.message} onChange={(e) => setApp(k, { message: e.target.value })} onFocus={() => setPreview(k)} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title={<span className="flex items-center gap-2"><UserPlus size={16} /> New sign-ups</span>}>
            <div className="divide-y divide-slate-100">
              {[['user', 'New customers can sign up', 'Existing customers can still log in.'], ['astrologer', 'New astrologers can apply', 'Existing astrologers can still log in.']].map(([k, label, hint]) => (
                <div key={k} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800">{label}</p><p className="text-xs text-slate-500">{hint}</p></div>
                  <Switch on={s.signups[k]} onChange={(v) => setS({ ...s, signups: { ...s.signups, [k]: v } })} />
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link to="/admin/users/pricing/recharge" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300">
              <IndianRupee size={18} className="text-brand-600" /><span className="text-sm"><b className="block text-slate-900">Price management</b><span className="text-xs text-slate-500">Recharge, GST, commission, payouts, COD / online</span></span>
            </Link>
            <Link to="/admin/global/announcement/user" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300">
              <Megaphone size={18} className="text-brand-600" /><span className="text-sm"><b className="block text-slate-900">Announcement bar</b><span className="text-xs text-slate-500">Message strip at the top of each app</span></span>
            </Link>
          </div>
        </div>

        <div className="xl:sticky xl:top-4 xl:self-start">
          <Panel title="Maintenance screen preview" action={
            <select value={preview} onChange={(e) => setPreview(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs">{APPS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          }>
            <div className="h-[460px] overflow-hidden">
              <Maintenance info={s[preview]} brand={preview === 'astrologer' ? 'Astrologer app' : 'AstroVani'} dark={preview === 'astrologer'} compact />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
