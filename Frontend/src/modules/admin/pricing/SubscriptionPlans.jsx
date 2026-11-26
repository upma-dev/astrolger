import { useState } from 'react';
import { ArrowLeft, Check, Crown, Edit2, Plus, Power, Sparkles, Trash2 } from 'lucide-react';
import { api, fmtDate, inr } from '../../../lib/api.js';
import { usePlatformLive } from '../../../lib/live.js';
import { Badge, PageLoader, useAsync, useToast, cx } from '../../../shared/ui.jsx';
import { Card, NumField, PageHead, Row, Switch, inputClass, labelClass, r2 } from './shared.jsx';

/* Subscription plans, one audience per page (Eqosy "Set Prices" style: listing → create / edit form):
   - Users > Price Management > Subscription Plans      → customer plans (discount on every consultation, paid from wallet)
   - Astrologers > Price Management > Subscription Plans → astrologer plans (lower commission, featured listing; GST on top)
   Benefits are applied by the server pricing engine; saving goes live in the apps at once. */

const COPY = {
  user: { title: 'Customer Subscription Plans', who: 'customer', icon: Crown, sample: 'Gold', perks: 'Priority support\nPremium badge', blank: { audience: 'user', name: '', description: '', price: 199, durationDays: 30, discountPct: 10, perks: [], active: true, order: 0 } },
  astrologer: { title: 'Astrologer Subscription Plans', who: 'astrologer', icon: Sparkles, sample: 'Pro Astrologer', perks: 'Profile highlight\nPriority in search', blank: { audience: 'astrologer', name: '', description: '', price: 499, durationDays: 30, commissionCut: 5, featured: true, perks: [], active: true, order: 0 } },
};

function PlanForm({ value, audience, gstPct, onBack, onSaved }) {
  const toast = useToast();
  const c = COPY[audience];
  const isUser = audience === 'user';
  const [f, setF] = useState({ ...value, perks: (value.perks || []).join('\n') });
  const [busy, setBusy] = useState(false);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const gst = isUser ? 0 : r2((+f.price || 0) * gstPct / 100);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const body = { ...f, audience, perks: f.perks.split('\n').map((x) => x.trim()).filter(Boolean) };
    try {
      await (f._id ? api.admin.put(`/admin/plans/${f._id}`, body) : api.admin.post('/admin/plans', body));
      toast('Plan saved. Live in the app now.', 'success');
      onSaved();
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={save}>
      <PageHead title={f._id ? 'Edit plan' : 'Create plan'} crumbs={[c.title, f._id ? 'Edit' : 'Create']}>
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 rounded px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"><ArrowLeft size={14} /> Back</button>
        <button type="submit" disabled={busy} className="rounded bg-[#00BFA5] px-6 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50">{busy ? 'Saving…' : 'Save plan'}</button>
      </PageHead>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6 rounded-md border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
          <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
            <div>
              <label className={labelClass}>Plan name <span className="text-rose-500">*</span></label>
              <input className={inputClass} value={f.name} onChange={(e) => set({ name: e.target.value })} required maxLength={40} placeholder={c.sample} />
            </div>
            <NumField label="Display order" value={f.order} onChange={(v) => set({ order: v })} hint="Lower shows first" />
            <div className="md:col-span-2">
              <label className={labelClass}>Short description</label>
              <input className={inputClass} value={f.description} onChange={(e) => set({ description: e.target.value })} maxLength={160} />
            </div>
            <NumField label="Price" required prefix="₹" value={f.price} onChange={(v) => set({ price: v })} hint={isUser ? 'Paid from the wallet (GST already paid on recharge)' : `GST ${gstPct}% is added on top (Payout & TDS Settings)`} />
            <NumField label="Validity" required suffix="days" min={1} value={f.durationDays} onChange={(v) => set({ durationDays: v })} />
            {isUser
              ? <NumField label="Discount on every consultation" suffix="%" max={90} value={f.discountPct} onChange={(v) => set({ discountPct: v })} hint="Comes out of admin's share; astrologers earn the same" />
              : <NumField label="Commission reduction" suffix="points" max={90} value={f.commissionCut} onChange={(v) => set({ commissionCut: v })} hint="e.g. 30% commission − 5 = 25% (percentage rules)" />}
            {!isUser && <div className="md:pt-7"><Switch on={!!f.featured} onChange={(v) => set({ featured: v })} label="Featured listing" hint="Shown first to customers" /></div>}
            <div className="md:col-span-2">
              <label className={labelClass}>Extra perks shown in the app <span className="font-medium text-slate-400">(one per line)</span></label>
              <textarea rows={3} className={inputClass} value={f.perks} onChange={(e) => set({ perks: e.target.value })} placeholder={c.perks} />
            </div>
            <div className="md:col-span-2"><Switch on={!!f.active} onChange={(v) => set({ active: v })} label="Active" hint={f.active ? `Visible in the ${c.who} app` : 'Hidden from the app'} /></div>
          </div>
        </div>
        <div className="xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-800">How it looks in the app</h3>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-base font-bold text-slate-900">{f.name || 'Plan name'}</p>
              {f.description && <p className="text-xs text-slate-500">{f.description}</p>}
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{inr(+f.price || 0)}<span className="text-xs font-medium text-slate-400"> / {f.durationDays || 0} days</span></p>
              <ul className="mt-2 space-y-1 text-xs text-slate-700">
                {isUser && +f.discountPct > 0 && <li className="flex items-center gap-1.5"><Check size={12} className="shrink-0 text-emerald-600" /> {f.discountPct}% off every chat & call</li>}
                {!isUser && +f.commissionCut > 0 && <li className="flex items-center gap-1.5"><Check size={12} className="shrink-0 text-emerald-600" /> Commission −{f.commissionCut} points</li>}
                {!isUser && f.featured && <li className="flex items-center gap-1.5"><Check size={12} className="shrink-0 text-emerald-600" /> Featured listing</li>}
                {f.perks.split('\n').map((x) => x.trim()).filter(Boolean).map((x) => <li key={x} className="flex items-center gap-1.5"><Check size={12} className="shrink-0 text-emerald-600" /> {x}</li>)}
              </ul>
            </div>
            <div className="mt-3 rounded-xl bg-white px-4 py-2">
              <Row label="Plan price" value={inr(+f.price || 0)} />
              {!isUser && <Row label={`GST ${gstPct}%`} value={`+ ${inr(gst)}`} />}
              <Row label={isUser ? 'Customer pays (from wallet)' : 'Astrologer pays (from earnings)'} value={inr(r2((+f.price || 0) + gst))} strong />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

export default function SubscriptionPlans({ audience = 'user' }) {
  const toast = useToast();
  const c = COPY[audience];
  const [tab, setTab] = useState('plans');
  const [edit, setEdit] = useState(null);
  const { data: plans, loading, reload } = useAsync(() => api.admin.get('/admin/plans', { audience }), [audience]);
  const { data: subs, reload: reloadSubs } = useAsync(() => api.admin.get('/admin/subscriptions', { ownerType: audience }), [audience]);
  const { data: pricing } = useAsync(() => api.admin.get('/admin/pricing'));
  usePlatformLive((what) => (what === 'plans' || what === 'focus') && (reload(), reloadSubs()));
  if (loading) return <PageLoader variant="cards" />;
  const gstPct = pricing?.plans?.astrologerGstPct ?? 18;
  if (edit) return <PlanForm value={edit} audience={audience} gstPct={gstPct} onBack={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />;

  const list = plans || [];
  const update = async (p, body) => { try { await api.admin.put(`/admin/plans/${p._id}`, body); reload(); } catch (e) { toast(e.message, 'error'); } };
  const remove = async (p) => { if (window.confirm(`Remove "${p.name}"? Current subscribers keep it until it expires.`)) update(p, { active: false }); };
  const activeSubs = (subs || []).filter((s) => s.active);
  const I = c.icon;

  return (
    <>
      <PageHead title={c.title} crumbs={[c.title]}>
        {tab === 'plans' && <button type="button" onClick={() => setEdit(c.blank)} className="flex items-center gap-2 rounded bg-[#44516F] px-6 py-2 text-sm font-bold text-white shadow-sm"><Plus size={15} /> Add plan</button>}
      </PageHead>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[['Active plans', list.filter((p) => p.active).length], ['Active subscribers', activeSubs.length], ['Plan revenue', inr(r2(list.reduce((s, p) => s + p.revenue, 0)))]].map(([l, v]) => (
          <div key={l} className="rounded-md border border-gray-100 bg-white p-4 shadow-sm"><p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{l}</p><p className="mt-1 text-2xl font-bold text-slate-900">{v}</p></div>
        ))}
      </div>

      <div className="mb-4 flex gap-1 rounded-md border border-gray-100 bg-white p-1 shadow-sm sm:w-fit">
        {[['plans', 'Plans'], ['subs', 'Subscribers']].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cx('rounded px-5 py-2 text-sm font-bold transition', tab === k ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}>{l}</button>
        ))}
      </div>

      {tab === 'plans' ? (
        <Card title="Listing">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="bg-[#FBFCFF]">
                <tr className="border-b border-gray-100 text-[11px] font-black uppercase tracking-[0.1em] text-slate-800">
                  <th className="px-6 py-4">Plan</th><th className="px-4 py-4">Price</th><th className="px-4 py-4">Validity</th><th className="px-4 py-4">Benefit</th>
                  <th className="px-4 py-4">Subscribers</th><th className="px-4 py-4">Status</th><th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {list.length ? list.map((p) => (
                  <tr key={p._id} className={cx('transition-colors hover:bg-slate-50/50', !p.active && 'opacity-60')}>
                    <td className="px-6 py-5"><span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><I size={16} /></span><span><span className="block text-sm font-bold text-slate-800">{p.name}</span>{p.description && <span className="block max-w-[260px] truncate text-[11px] text-slate-400">{p.description}</span>}</span></span></td>
                    <td className="px-4 py-5 text-sm font-bold text-slate-800">{inr(p.price)}{audience === 'astrologer' && <span className="block text-[11px] font-medium text-slate-400">+ GST {gstPct}%</span>}</td>
                    <td className="px-4 py-5 text-sm text-slate-600">{p.durationDays} days</td>
                    <td className="px-4 py-5 text-sm text-slate-700">
                      {audience === 'user' ? `${p.discountPct || 0}% off consultations` : [p.commissionCut > 0 && `Commission −${p.commissionCut} pts`, p.featured && 'Featured'].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="px-4 py-5 text-sm text-slate-700"><b>{p.activeSubscribers}</b> active<span className="block text-[11px] text-slate-400">{p.sold} sold · {inr(p.revenue)}</span></td>
                    <td className="px-4 py-5"><button type="button" onClick={() => update(p, { active: !p.active })} className={cx('rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider', p.active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500')}>{p.active ? 'Active' : 'Inactive'}</button></td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => setEdit(p)} className="flex h-8 w-8 items-center justify-center rounded bg-[#FFF7ED] text-[#F97316] hover:bg-orange-100" aria-label="Edit"><Edit2 size={14} /></button>
                        <button type="button" onClick={() => update(p, { active: !p.active })} className="flex h-8 w-8 items-center justify-center rounded bg-[#F0FDFA] text-[#14B8A6] hover:bg-emerald-100" aria-label={p.active ? 'Deactivate' : 'Activate'}><Power size={14} /></button>
                        {p.active && <button type="button" onClick={() => remove(p)} className="flex h-8 w-8 items-center justify-center rounded bg-[#FEF2F2] text-[#EF4444] hover:bg-red-100" aria-label="Remove"><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="py-16 text-center">
                    <p className="text-sm font-semibold text-slate-600">No {c.who} plans yet</p>
                    <button type="button" onClick={() => setEdit(c.blank)} className="mt-3 inline-flex items-center gap-2 rounded bg-[#44516F] px-5 py-2 text-sm font-bold text-white"><Plus size={14} /> Add plan</button>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card title="Subscribers">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-[#FBFCFF]"><tr className="border-b border-gray-100 text-[11px] font-black uppercase tracking-[0.1em] text-slate-800"><th className="px-6 py-4">{audience === 'user' ? 'Customer' : 'Astrologer'}</th><th className="px-4 py-4">Plan</th><th className="px-4 py-4">Paid</th><th className="px-4 py-4">Started</th><th className="px-4 py-4">Valid till</th><th className="px-6 py-4 text-right">Status</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {(subs || []).length ? subs.map((s) => (
                  <tr key={s._id}>
                    <td className="px-6 py-4"><p className="font-semibold text-slate-800">{s.who?.name || '—'}</p><p className="text-xs text-slate-400">{s.who?.phone}</p></td>
                    <td className="px-4 py-4 text-slate-700">{s.name}</td>
                    <td className="px-4 py-4 text-slate-700">{inr(s.total ?? s.price)}{s.gst > 0 && <span className="block text-[11px] text-slate-400">incl. GST {inr(s.gst)}</span>}</td>
                    <td className="px-4 py-4 text-slate-500">{fmtDate(s.startsAt || s.createdAt)}</td>
                    <td className="px-4 py-4 text-slate-500">{fmtDate(s.endsAt)}</td>
                    <td className="px-6 py-4 text-right"><Badge tone={s.active ? 'green' : 'slate'}>{s.active ? 'Active' : 'Expired'}</Badge></td>
                  </tr>
                )) : <tr><td colSpan={6} className="py-14 text-center text-slate-400">No subscriptions yet</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
