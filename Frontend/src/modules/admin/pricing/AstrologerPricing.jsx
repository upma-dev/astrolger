import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Radio, RotateCcw, Search } from 'lucide-react';
import { api, inr } from '../../../lib/api.js';
import { usePlatformLive } from '../../../lib/live.js';
import { Button, PageLoader, useAsync, useToast, cx } from '../../../shared/ui.jsx';
import { Card, NumField, PageHead, Row, SERVICES, SaveBar, Switch, fromUnit, quote, r2, toUnit, unitOf, usePricing, useRulesLink } from './shared.jsx';

/* Astrologer pricing: what astrologers charge and earn.
   - who sets rates, payout rules (TDS, fee, minimum), plan GST
   - every approved astrologer's chat / call / video rate and commission (rule or custom %), saved per row, live at once. */

const rateOf = (a, k) => +a.rates?.[k] > 0 ? +a.rates[k] : +a.pricePerMin || 0;
const durOf = (a, k, p) => { const v = Math.round(+a.durations?.[k] || 0); return v >= 1 && v <= 240 ? v : (p.services[k].block || 1); };
const cutOf = (a, k, p) => (typeof a.autoCut?.[k] === 'boolean' ? a.autoCut[k] : !!p.services[k].autoCut);

function RatesTable({ p }) {
  const toast = useToast();
  const { data, reload } = useAsync(() => api.admin.get('/admin/astrologers', { status: 'approved' }));
  usePlatformLive((what) => (what === 'astrologers' || what === 'focus') && reload(true));
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState({});
  const [saving, setSaving] = useState(null);
  const rows = (data || []).filter((a) => !q || a.name?.toLowerCase().includes(q.toLowerCase()) || a.phone?.includes(q));
  const e = (a) => edit[a._id] || {};
  const set = (a, patch) => setEdit((x) => ({ ...x, [a._id]: { ...x[a._id], ...patch } }));
  const durUnit = (a, k) => {
    const v = e(a)[`${k}Dur`];
    return v !== undefined ? Math.max(1, Math.min(240, Math.round(+v) || 1)) : durOf(a, k, p);
  };
  const cutUnit = (a, k) => (e(a)[`${k}Cut`] !== undefined ? e(a)[`${k}Cut`] : cutOf(a, k, p));
  const rateUnit = (a, k) => (e(a)[k] !== undefined ? e(a)[k] : toUnit(rateOf(a, k), durUnit(a, k)));
  const custom = (a) => (e(a).custom !== undefined ? e(a).custom : !!a.commissionCustom);
  const pct = (a) => (e(a).pct !== undefined ? e(a).pct : a.commissionPct);
  const changed = (a) => Object.keys(e(a)).length > 0;
  const outOf = (a, k) => { const s = p.services[k]; const v = (+rateUnit(a, k) || 0) / durUnit(a, k); return v < s.minRate - 1e-6 || v > s.maxRate + 1e-6; };

  const saveRow = async (a) => {
    setSaving(a._id);
    try {
      const body = {
        rates: Object.fromEntries(SERVICES.map(([k]) => [k, fromUnit(rateUnit(a, k), durUnit(a, k))])),
        durations: Object.fromEntries(SERVICES.map(([k]) => [k, durUnit(a, k)])),
        autoCut: Object.fromEntries(SERVICES.map(([k]) => [k, cutUnit(a, k)])),
      };
      if (custom(a)) body.commissionPct = +pct(a) || 0; else if (a.commissionCustom) body.commissionCustom = false;
      await api.admin.put(`/admin/astrologers/${a._id}`, body);
      setEdit(({ [a._id]: _, ...rest }) => rest);
      toast(`${a.name}: prices & durations updated. Live in the app now.`, 'success');
      reload(true);
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(null); }
  };

  return (
    <Card title={`Astrologer rates & commission (${data?.length ?? '…'})`} action={
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Search astrologer" className="w-52 rounded border border-gray-200 py-1.5 pl-8 pr-2 text-xs outline-none focus:border-indigo-500" />
      </div>
    }>
      {!data ? <PageLoader variant="table" /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="bg-[#FBFCFF]">
              <tr className="border-b border-gray-100 text-[11px] font-black uppercase tracking-[0.1em] text-slate-800">
                <th className="px-6 py-4">Astrologer</th>
                {SERVICES.map(([k, l]) => <th key={k} className="px-3 py-4">{l}<span className="block text-[10px] font-semibold normal-case tracking-normal text-slate-400">₹ / time (min)</span></th>)}
                <th className="px-3 py-4">Admin commission</th>
                <th className="px-3 py-4">Earns on chat</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((a) => {
                const chat = p.services.chat;
                const chatDur = durUnit(a, 'chat');
                const cq = quote({ ...chat, block: chatDur }, (+rateUnit(a, 'chat') || 0) / chatDur, { minutes: chatDur, customCommission: custom(a) ? pct(a) : null });
                return (
                  <tr key={a._id} className={cx('transition-colors', changed(a) ? 'bg-amber-50/60' : 'hover:bg-slate-50/50')}>
                    <td className="px-6 py-3">
                      <Link to={`/admin/astro/view/${a._id}`} className="text-sm font-bold text-slate-800 hover:text-indigo-600">{a.name}</Link>
                      <p className="flex items-center gap-1 text-[11px] text-slate-400">{a.online && <Radio size={10} className="text-emerald-500" />}{a.online ? 'Online' : 'Offline'} · {a.phone}</p>
                    </td>
                    {SERVICES.map(([k]) => {
                      const dVal = e(a)[`${k}Dur`] !== undefined ? e(a)[`${k}Dur`] : durOf(a, k, p);
                      const cut = cutUnit(a, k);
                      return (
                        <td key={k} className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <div className={cx('flex w-20 items-center rounded border bg-white', outOf(a, k) ? 'border-rose-300' : 'border-gray-200')}>
                              <span className="pl-1.5 text-slate-400">₹</span>
                              <input type="number" min={0} step="any" value={rateUnit(a, k)} onChange={(ev) => set(a, { [k]: ev.target.value })} className="w-full min-w-0 bg-transparent px-1 py-1.5 text-xs font-semibold outline-none" />
                            </div>
                            <span className="text-slate-400">/</span>
                            <div className="flex w-16 items-center rounded border border-gray-200 bg-white">
                              <input type="number" min={1} max={240} value={dVal} onChange={(ev) => { const d = Math.max(1, Math.min(240, Math.round(+ev.target.value) || 1)); set(a, { [`${k}Dur`]: ev.target.value, ...(d > 1 && e(a)[`${k}Cut`] === undefined ? { [`${k}Cut`]: true } : {}) }); }} className="w-full min-w-0 bg-transparent px-1.5 py-1.5 text-xs font-semibold outline-none" />
                              <span className="pr-1 text-[10px] text-slate-400">m</span>
                            </div>
                          </div>
                          <label className="mt-1 flex cursor-pointer items-center gap-1 text-[10px] font-medium text-slate-500">
                            <input type="checkbox" checked={cut} onChange={(ev) => set(a, { [`${k}Cut`]: ev.target.checked })} className="h-3 w-3 rounded border-gray-300 text-indigo-600" />
                            Auto-end
                          </label>
                          {outOf(a, k) && <p className="mt-0.5 text-[10px] text-rose-600">Outside limits</p>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <select value={custom(a) ? 'custom' : 'rule'} onChange={(ev) => set(a, { custom: ev.target.value === 'custom', ...(ev.target.value === 'custom' && pct(a) == null ? { pct: 30 } : {}) })} className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-[11px] font-bold outline-none">
                          <option value="rule">As per rule</option>
                          <option value="custom">Custom %</option>
                        </select>
                        {custom(a) && (
                          <div className="flex w-16 items-center rounded border border-gray-200 bg-white">
                            <input type="number" min={0} max={90} value={pct(a) ?? ''} onChange={(ev) => set(a, { pct: ev.target.value })} className="w-full min-w-0 bg-transparent px-2 py-1.5 text-xs font-semibold outline-none" />
                            <span className="pr-1.5 text-slate-400">%</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-semibold text-emerald-600">{inr(cq.astroBlock)}<span className="text-slate-400">/{unitOf(chatDur)}</span><span className="block text-[10px] font-medium text-slate-400">{r2(100 - cq.commissionPct)}% of rate</span></td>
                    <td className="px-6 py-3 text-right">
                      {changed(a) && (
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => setEdit(({ [a._id]: _, ...rest }) => rest)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Undo"><RotateCcw size={14} /></button>
                          <Button size="sm" loading={saving === a._id} onClick={() => saveRow(a)}><Check size={13} /> Save</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">No approved astrologers</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function AstrologerPricing({ part = 'all' }) {
  const { p, dirty, busy, save, discard, setPart } = usePricing();
  const rulesLink = useRulesLink();
  const [withdraw, setWithdraw] = useState(1000);
  if (!p) return <PageLoader />;
  if (!p) return <PageLoader variant="form" />;
  const tds = r2(withdraw * p.payout.tdsPct / 100), fee = r2(Math.min(p.payout.feeFlat, withdraw - tds));
  return (
    <>
      <PageHead title={part === 'rates' ? 'Astrologer Rates' : part === 'payouts' ? 'Payout & TDS Settings' : 'Astrologer Pricing'} crumbs={[part === 'rates' ? 'Astrologer Rates' : part === 'payouts' ? 'Payout & TDS Settings' : 'Astrologer Pricing']}>
        <SaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={discard} />
      </PageHead>
      <div className="space-y-6">
        <div className={cx('grid gap-6', part !== 'rates' && 'xl:grid-cols-[1fr_380px]')}>
          <div className="space-y-6">
            {part !== 'payouts' && <Card title="Who sets the rates">
              <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
                <Switch on={p.astrologerRate.allowEdit} onChange={(v) => setPart('astrologerRate', { allowEdit: v })} label="Astrologers set their own rates" hint={p.astrologerRate.allowEdit ? 'From their app, inside the limits of each service' : 'Only admin can change rates (table below)'} />
                <div className="rounded-md bg-slate-50 p-4 text-[12px] text-slate-600">
                  <p className="font-bold text-slate-800">Current limits</p>
                  {SERVICES.map(([k]) => { const s = p.services[k]; const u = unitOf(s.block); return <p key={k}>{s.label}: {inr(toUnit(s.minRate, s.block))} – {inr(toUnit(s.maxRate, s.block))}/{u} · commission {s.commissionType === 'percent' ? `${s.commission}%` : `${inr(s.commission)}/min`}</p>; })}
                  <Link to={rulesLink} className="mt-1 inline-block font-bold text-indigo-600 hover:underline">Edit service rules →</Link>
                </div>
              </div>
            </Card>}
            {part !== 'rates' && <Card title="Payouts & plans">
              <div className="grid grid-cols-1 gap-x-8 gap-y-6 p-6 md:grid-cols-2">
                <NumField label="Minimum withdrawal" required value={p.payout.minWithdraw} onChange={(v) => setPart('payout', { minWithdraw: v })} prefix="₹" />
                <NumField label="TDS on payout" value={p.payout.tdsPct} onChange={(v) => setPart('payout', { tdsPct: v })} suffix="%" max={30} hint="Withheld and shown to the astrologer" />
                <NumField label="Payout processing fee" value={p.payout.feeFlat} onChange={(v) => setPart('payout', { feeFlat: v })} prefix="₹" hint="Flat, per withdrawal" />
                <NumField label="GST on astrologer plans" value={p.plans.astrologerGstPct} onChange={(v) => setPart('plans', { astrologerGstPct: v })} suffix="%" max={28} hint="Plans are paid from earnings" />
              </div>
            </Card>}
          </div>
          {part !== 'rates' && <div className="xl:sticky xl:top-4 xl:self-start">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-800">Withdrawal example</h3>
              <NumField label="Astrologer withdraws" value={withdraw} onChange={(v) => setWithdraw(+v || 0)} prefix="₹" />
              <div className="mt-3 rounded-xl bg-white px-4 py-2">
                <Row label={`TDS ${p.payout.tdsPct}%`} value={`− ${inr(tds)}`} />
                <Row label="Payout fee" value={`− ${inr(fee)}`} />
                <Row label="Reaches bank" value={inr(r2(withdraw - tds - fee))} strong tone="green" />
              </div>
              {withdraw < p.payout.minWithdraw && <p className="mt-2 text-[11px] font-semibold text-rose-600">Below the minimum withdrawal of {inr(p.payout.minWithdraw)}</p>}
            </div>
          </div>}
        </div>
        {part !== 'payouts' && <RatesTable p={p} />}
      </div>
    </>
  );
}
