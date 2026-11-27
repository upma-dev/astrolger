import { useState } from 'react';
import { ArrowLeft, Calculator, Edit2, MessageCircle, Phone, Video } from 'lucide-react';
import { inr } from '../../../lib/api.js';
import { PageLoader, cx } from '../../../shared/ui.jsx';
import { BLOCKS, Card, NumField, PageHead, Row, SERVICES, SaveBar, Switch, TypeValue, blockLabel, fromUnit, inputClass, labelClass, quote, r2, toUnit, unitOf, usePricing } from './shared.jsx';

/* Service pricing (like Eqosy "Set Prices"): one price rule per consultation type.
   Listing → edit a rule → billing unit (per minute / hourly / packs), rate limits, admin commission,
   platform fee, GST, minimum balance. The live example uses the server's maths. */

const ICON = { chat: MessageCircle, audio: Phone, video: Video };

const F = ({ label, value, onChange, suffix }) => (
  <label className="block">
    <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
    <span className="flex items-center rounded-lg border border-slate-200 bg-white px-3">
      <input type="number" min="0" value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent py-2 text-sm font-semibold text-slate-900 outline-none" />
      <span className="text-[11px] font-bold text-slate-400">{suffix}</span>
    </span>
  </label>
);

function FarePreview({ rule }) {
  const [rate, setRate] = useState(() => toUnit(rule.defaultRate, rule.block));
  const [minutes, setMinutes] = useState(rule.block === 60 ? 60 : 15);
  const [discount, setDiscount] = useState(0);
  const perMin = (+rate || 0) / rule.block;
  const q = quote(rule, perMin, { minutes, discountPct: discount });
  const u = unitOf(rule.block);
  const quick = [5, 15, 30, 60, 90].map((m) => ({ m, ...quote(rule, perMin, { minutes: m, discountPct: discount }) }));
  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Calculator size={18} className="text-indigo-600" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Live price example</h3>
        <span className="text-[11px] font-medium text-slate-500">Updates as you change the rule</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <F label={`Astrologer rate`} value={rate} onChange={setRate} suffix={`₹/${u}`} />
        <F label="Duration" value={minutes} onChange={setMinutes} suffix="min" />
        <F label="Premium discount" value={discount} onChange={setDiscount} suffix="%" />
      </div>
      <div className="mt-4 rounded-xl bg-white px-4 py-2">
        <Row label={`${blockLabel(rule.block)} × ${q.blocks}`} hint={rule.block > 1 ? `Charged at the start of every ${unitOf(rule.block)}` : 'Charged every minute'} value={inr(r2(q.userBlock * q.blocks))} />
        {q.feeTotal > 0 && <Row label="Platform fee" hint={rule.feeType === 'percent' ? `${rule.fee}% on every charge` : 'Once per consultation'} value={`+ ${inr(q.feeTotal)}`} />}
        {q.gstTotal > 0 && <Row label={`GST ${rule.gstPct}%`} value={`+ ${inr(q.gstTotal)}`} />}
        <Row label="Customer pays" value={inr(q.userTotal)} strong />
        <Row label={`Astrologer earns (${r2(100 - q.commissionPct)}%)`} value={inr(q.astroTotal)} tone="green" />
        <Row label="Admin keeps" hint="Commission + platform fee (GST is not income)" value={inr(q.platform)} tone={q.platform < 0 ? 'red' : 'brand'} />
        <Row label="Balance needed to start" value={inr(q.minBalance)} />
        <Row label="Auto-cut time limit" hint="Chat/call ends automatically when reached" value={q.maxMinutes > 0 ? `${q.maxMinutes} min` : 'Wallet balance only'} />
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {quick.map((x) => (
          <div key={x.m} className="rounded-lg border border-slate-200 bg-white p-2 text-center">
            <p className="text-[10px] font-bold uppercase text-slate-400">{x.m} min</p>
            <p className="text-sm font-bold text-slate-900">{inr(x.userTotal)}</p>
            <p className="text-[10px] font-semibold text-emerald-600">{inr(x.astroTotal)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RuleForm({ k, ctx, onBack }) {
  const { p, setService, dirty, busy, save, discard } = ctx;
  const r = p.services[k];
  const set = (patch) => setService(k, patch);
  const u = unitOf(r.block);
  // Rates are kept per minute; changing the billing unit keeps the per-minute value.
  const rate = (field) => ({ value: toUnit(r[field], r.block), onChange: (v) => set({ [field]: fromUnit(v, r.block) }), prefix: '₹', suffix: `/ ${u}` });
  return (
    <>
      <PageHead title={`Edit · ${r.label}`} crumbs={['Service Pricing', r.label]}>
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 rounded px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"><ArrowLeft size={14} /> Back</button>
        <SaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={discard} />
      </PageHead>
      <div className="grid gap-6 2xl:grid-cols-[1fr_460px]">
        <div className="space-y-6 rounded-md border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
          <Switch on={r.enabled} onChange={(v) => set({ enabled: v })} label={`${r.label} available in the app`} hint={r.enabled ? 'Customers can start this consultation' : 'Hidden from the customer app'} />

          <section>
            <h2 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-[#1E293B]">Billing &amp; session time limit</h2>
            <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
              <div>
                <label className={labelClass}>Billing / pack duration (minutes) <span className="text-rose-500">*</span></label>
                <div className="flex gap-2">
                  <select value={BLOCKS.some(([b]) => b === r.block) ? r.block : 'custom'} onChange={(e) => e.target.value !== 'custom' && set({ block: +e.target.value })} className={inputClass}>
                    {BLOCKS.map(([b, l]) => <option key={b} value={b}>{l}</option>)}
                    <option value="custom">Custom minutes</option>
                  </select>
                  <div className="flex w-28 shrink-0 items-center overflow-hidden rounded-md border border-gray-200 bg-white focus-within:border-indigo-500">
                    <input type="number" min={1} max={240} value={r.block} onChange={(e) => set({ block: Math.max(1, Math.min(240, Math.round(+e.target.value) || 1)) })} className="w-full min-w-0 px-3 py-3 text-sm font-semibold text-gray-800 outline-none" />
                    <span className="pr-2.5 text-[11px] font-bold text-slate-400">min</span>
                  </div>
                </div>
                <p className="mt-1 text-[10.5px] font-medium text-slate-400">{r.block === 1 ? 'Charged every minute, stops the moment the session ends.' : `A full ${u} is charged at the start of every ${u}. Prices show as ₹/${u} in the app.`}</p>
              </div>
              <NumField label="Minimum balance to start" required value={r.minMinutes} onChange={(v) => set({ minMinutes: v })} suffix="min" hint="Customer needs money for this many minutes (+ fees) in the wallet" />
              <div className="md:col-span-2 grid grid-cols-1 gap-6 md:grid-cols-2">
                <Switch on={!!r.autoCut} onChange={(v) => set({ autoCut: v })} label="Auto-end chat after 1 unit" hint={r.autoCut ? `Session automatically cuts off at ${r.block} min` : 'Continues past 1 unit while wallet has balance'} />
                <NumField label="Max session time limit (0 = no fixed cap)" value={r.maxMinutes ?? 0} onChange={(v) => set({ maxMinutes: v === '' ? 0 : Math.max(0, Math.min(240, Math.round(+v) || 0)) })} suffix="min" hint="Hard cap in minutes (e.g. 2 min). Chat automatically ends when reached." />
              </div>
            </div>
          </section>

          <section className="border-t border-gray-100 pt-6">
            <h2 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-[#1E293B]">Astrologer rate</h2>
            <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-3">
              <NumField label="Lowest rate" required {...rate('minRate')} />
              <NumField label="Highest rate" required {...rate('maxRate')} />
              <NumField label="Default rate (new astrologers)" required {...rate('defaultRate')} />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Each astrologer's own rate is set in Astrologer Pricing (or by the astrologer, if allowed), always inside these limits.</p>
          </section>

          <section className="border-t border-gray-100 pt-6">
            <h2 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-[#1E293B]">Admin commission & fees</h2>
            <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
              <TypeValue label="Admin commission from astrologer" required type={r.commissionType} onType={(v) => set({ commissionType: v, commission: v === 'percent' ? 30 : 2 })} value={r.commission} onValue={(v) => set({ commission: v })}
                options={[['percent', 'Percentage', '%'], ['fixed', 'Fixed', '₹ / min']]} hint={r.commissionType === 'percent' ? 'Share of the astrologer rate kept by admin' : 'Admin keeps this many ₹ for every minute'} />
              <TypeValue label="Platform fee from customer" type={r.feeType} onType={(v) => set({ feeType: v, fee: 0 })} value={r.fee} onValue={(v) => set({ fee: v })}
                options={[['fixed', 'Fixed', '₹ / consult'], ['percent', 'Percentage', '% / charge']]} hint={r.feeType === 'fixed' ? 'Charged once when the consultation starts. 0 = off' : 'Added on top of every charge. 0 = off'} />
              <NumField label="GST on consultation" value={r.gstPct} onChange={(v) => set({ gstPct: v })} suffix="%" max={28} hint="Usually 0: GST is already collected on wallet recharge (Customer Pricing)" />
            </div>
          </section>
        </div>
        <div className="2xl:sticky 2xl:top-4 2xl:self-start"><FarePreview key={`${k}-${r.block}`} rule={r} /></div>
      </div>
    </>
  );
}

export default function ServicePricing() {
  const ctx = usePricing();
  const [edit, setEdit] = useState(null);
  const { p, dirty, busy, save, discard, setService } = ctx;
  if (!p) return <PageLoader />;
  if (!p) return <PageLoader variant="table" />;
  if (edit) return <RuleForm k={edit} ctx={ctx} onBack={() => setEdit(null)} />;
  return (
    <>
      <PageHead title="Service Pricing" crumbs={['Service Pricing']}>
        <SaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={discard} />
      </PageHead>
      <Card title="Price rules · chat, call & video">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-[#FBFCFF]">
              <tr className="border-b border-gray-100 text-[11px] font-black uppercase tracking-[0.1em] text-slate-800">
                <th className="px-6 py-4">Service</th><th className="px-4 py-4">Billing</th><th className="px-4 py-4">Rate range</th><th className="px-4 py-4">Admin commission</th>
                <th className="px-4 py-4">Platform fee</th><th className="px-4 py-4">GST</th><th className="px-4 py-4">Min. balance</th><th className="px-4 py-4">Status</th><th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {SERVICES.map(([k]) => {
                const r = p.services[k];
                const I = ICON[k];
                const u = unitOf(r.block);
                const q = quote(r, r.defaultRate);
                return (
                  <tr key={k} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-5"><span className="flex items-center gap-3 text-sm font-bold text-slate-800"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><I size={17} /></span>{r.label}</span></td>
                    <td className="px-4 py-5 text-sm font-medium text-slate-600">{blockLabel(r.block)}{(r.autoCut || r.maxMinutes > 0) && <span className="block text-[11px] font-semibold text-amber-600">Auto-ends at {r.autoCut ? (r.maxMinutes > 0 ? Math.min(r.block, r.maxMinutes) : r.block) : r.maxMinutes} min</span>}</td>
                    <td className="px-4 py-5 text-sm font-semibold text-slate-700">{inr(toUnit(r.minRate, r.block))} – {inr(toUnit(r.maxRate, r.block))}<span className="text-slate-400">/{u}</span><span className="block text-[11px] font-medium text-slate-400">Default {inr(toUnit(r.defaultRate, r.block))}/{u}</span></td>
                    <td className="px-4 py-5 text-sm font-semibold text-slate-700">{r.commissionType === 'percent' ? `${r.commission}%` : `${inr(r.commission)}/min`}</td>
                    <td className="px-4 py-5 text-sm text-slate-600">{r.fee ? (r.feeType === 'percent' ? `${r.fee}% per charge` : `${inr(r.fee)} per consult`) : '—'}</td>
                    <td className="px-4 py-5 text-sm text-slate-600">{r.gstPct ? `${r.gstPct}%` : '—'}</td>
                    <td className="px-4 py-5 text-sm text-slate-600">{inr(q.minBalance)}<span className="block text-[11px] text-slate-400">{r.minMinutes} min at default rate</span></td>
                    <td className="px-4 py-5">
                      <button type="button" onClick={() => setService(k, { enabled: !r.enabled })} className={cx('rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider', r.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500')}>{r.enabled ? 'Active' : 'Inactive'}</button>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button type="button" onClick={() => setEdit(k)} className="inline-flex h-8 w-8 items-center justify-center rounded bg-[#FFF7ED] text-[#F97316] transition hover:bg-orange-100" aria-label={`Edit ${r.label}`}><Edit2 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {SERVICES.map(([k]) => {
          const r = p.services[k]; const q = quote(r, r.defaultRate, { minutes: r.block === 60 ? 60 : 10 });
          return (
            <div key={k} className="rounded-md border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{r.label} · {q.blocks * q.block} min at default rate</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div><p className="text-[10px] font-bold uppercase text-slate-400">Customer</p><p className="text-base font-bold text-slate-900">{inr(q.userTotal)}</p></div>
                <div><p className="text-[10px] font-bold uppercase text-slate-400">Astrologer</p><p className="text-base font-bold text-emerald-600">{inr(q.astroTotal)}</p></div>
                <div><p className="text-[10px] font-bold uppercase text-slate-400">Admin</p><p className="text-base font-bold text-indigo-600">{inr(q.platform)}</p></div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
