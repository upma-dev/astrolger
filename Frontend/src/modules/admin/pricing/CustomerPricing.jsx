import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Star, X } from 'lucide-react';
import { inr } from '../../../lib/api.js';
import { PageLoader, cx } from '../../../shared/ui.jsx';
import { Card, NumField, PageHead, Row, SERVICES, SaveBar, blockLabel, quote, r2, toUnit, unitOf, usePricing, useRulesLink } from './shared.jsx';

/* Customer pricing: everything the user pays — wallet recharge (GST, gateway fee, limits, quick amounts),
   sign-up bonus, and a read-out of what each consultation costs under the current service rules. */
export default function CustomerPricing() {
  const { p, s, setS, dirty, busy, save, discard, setPart } = usePricing();
  const rulesLink = useRulesLink();
  const [add, setAdd] = useState('');
  const [amount, setAmount] = useState(500);
  if (!p || !s) return <PageLoader variant="form" />;
  const packs = [...s.rechargePacks].sort((a, b) => a - b);
  const gst = r2(amount * p.recharge.gstPct / 100), fee = r2(amount * p.recharge.feePct / 100);

  return (
    <>
      <PageHead title="Customer Pricing" crumbs={['Customer Pricing']}>
        <SaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={discard} />
      </PageHead>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card title="Wallet recharge">
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 p-6 md:grid-cols-2">
              <NumField label="GST on recharge" required value={p.recharge.gstPct} onChange={(v) => setPart('recharge', { gstPct: v })} suffix="%" max={28} hint="Added on top of the amount the customer adds" />
              <NumField label="Gateway / convenience fee" value={p.recharge.feePct} onChange={(v) => setPart('recharge', { feePct: v })} suffix="%" max={10} hint="0 = absorbed by you" />
              <NumField label="Minimum recharge" required value={p.recharge.min} onChange={(v) => setPart('recharge', { min: v })} prefix="₹" />
              <NumField label="Maximum recharge" required value={p.recharge.max} onChange={(v) => setPart('recharge', { max: v })} prefix="₹" />
              <div className="md:col-span-2">
                <p className="mb-2.5 text-[13px] font-semibold text-gray-700">Quick amounts in the app <span className="inline-flex items-center gap-0.5 font-medium text-slate-400">(<Star size={12} className="fill-amber-500 text-amber-500" /> = shown as "Popular")</span></p>
                <div className="flex flex-wrap gap-2">
                  {packs.map((v) => (
                    <span key={v} className={cx('flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-bold', s.popularPack === v ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-slate-700')}>
                      <button type="button" title="Mark popular" onClick={() => setS({ ...s, popularPack: v })}><Star size={14} className={s.popularPack === v ? 'fill-amber-500 text-amber-500' : 'text-slate-400'} /></button>{inr(v)}
                      <button type="button" aria-label="Remove" onClick={() => setS({ ...s, rechargePacks: packs.filter((x) => x !== v) })} className="text-slate-400 hover:text-rose-500"><X size={13} /></button>
                    </span>
                  ))}
                  {packs.length < 6 && (
                    <form onSubmit={(e) => { e.preventDefault(); const v = Math.round(+add); if (v >= 10 && !packs.includes(v)) setS({ ...s, rechargePacks: [...packs, v] }); setAdd(''); }} className="flex gap-1">
                      <input value={add} onChange={(e) => setAdd(e.target.value.replace(/\D/g, ''))} placeholder="Amount" className="w-24 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-indigo-500" />
                      <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 text-slate-600 hover:bg-slate-50" aria-label="Add amount"><Plus size={14} /></button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Offers">
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 p-6 md:grid-cols-2">
              <NumField label="Sign-up bonus for new customers" value={s.welcomeBonus} onChange={(v) => setS({ ...s, welcomeBonus: v })} prefix="₹" hint="Credited to the wallet after OTP. 0 = off" />
              <div className="flex flex-col justify-center rounded-md bg-slate-50 p-4 text-sm text-slate-600">
                <p>Premium plans give customers a % off every chat & call (paid by admin's share).</p>
                <Link to="/admin/users/plans" className="mt-1 font-bold text-indigo-600 hover:underline">Manage customer plans →</Link>
              </div>
            </div>
          </Card>

          <Card title="What a consultation costs the customer" action={<Link to={rulesLink} className="text-[12px] font-bold text-indigo-600 hover:underline">Edit service rules →</Link>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-[#FBFCFF]"><tr className="border-b border-gray-100 text-[11px] font-black uppercase tracking-[0.1em] text-slate-800"><th className="px-6 py-3">Service</th><th className="px-4 py-3">Billed</th><th className="px-4 py-3">Price range</th><th className="px-4 py-3">Platform fee</th><th className="px-4 py-3">GST</th><th className="px-4 py-3">Min. balance</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {SERVICES.map(([k]) => {
                    const r = p.services[k]; const u = unitOf(r.block);
                    return (
                      <tr key={k} className={cx(!r.enabled && 'opacity-50')}>
                        <td className="px-6 py-4 font-bold text-slate-800">{r.label}{!r.enabled && <span className="ml-2 text-[10px] font-black uppercase text-rose-500">off</span>}</td>
                        <td className="px-4 py-4 text-slate-600">{blockLabel(r.block)}</td>
                        <td className="px-4 py-4 font-semibold text-slate-700">{inr(toUnit(r.minRate, r.block))} – {inr(toUnit(r.maxRate, r.block))}/{u}</td>
                        <td className="px-4 py-4 text-slate-600">{r.fee ? (r.feeType === 'percent' ? `${r.fee}%` : inr(r.fee)) : '—'}</td>
                        <td className="px-4 py-4 text-slate-600">{r.gstPct ? `${r.gstPct}%` : '—'}</td>
                        <td className="px-4 py-4 text-slate-600">{inr(quote(r, r.defaultRate).minBalance)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-800">Recharge example</h3>
            <NumField label="Customer adds" value={amount} onChange={(v) => setAmount(+v || 0)} prefix="₹" />
            <div className="mt-3 rounded-xl bg-white px-4 py-2">
              <Row label="Wallet credit" value={inr(amount)} />
              <Row label={`GST ${p.recharge.gstPct}%`} value={`+ ${inr(gst)}`} />
              <Row label={`Fee ${p.recharge.feePct}%`} value={`+ ${inr(fee)}`} />
              <Row label="Customer pays" value={inr(r2(amount + gst + fee))} strong />
            </div>
            {(amount < p.recharge.min || amount > p.recharge.max) && <p className="mt-2 text-[11px] font-semibold text-rose-600">Outside the allowed range ({inr(p.recharge.min)} – {inr(p.recharge.max)})</p>}
          </div>
        </div>
      </div>
    </>
  );
}
