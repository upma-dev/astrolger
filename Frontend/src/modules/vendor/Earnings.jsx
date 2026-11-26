import { useState } from 'react';
import { Banknote, Check, Sparkles } from 'lucide-react';
import { api, fmtDate, inr } from '../../lib/api.js';
import { usePlatformLive } from '../../lib/live.js';
import { vendorAuth } from '../../lib/auth.jsx';
import { Badge, Button, Card, Field, PageLoader, statusTone, useAsync, useToast, cx } from '../../shared/ui.jsx';

const r2 = (n) => Math.round((+n || 0) * 100) / 100;

export default function Earnings() {
  const toast = useToast();
  const { refresh } = vendorAuth.useAuth();
  const { data, loading, error, reload } = useAsync(() => api.vendor.get('/astrologer/earnings'));
  const { data: plans, reload: reloadPlans } = useAsync(() => api.vendor.get('/astrologer/plans'));
  // Admin added / changed a plan: show it without a refresh.
  usePlatformLive((what) => (what === 'plans' || what === 'pricing') && reloadPlans());
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [buying, setBuying] = useState(null);

  const withdraw = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await api.vendor.post('/astrologer/withdraw', { amount }); toast('Withdrawal requested', 'success'); setAmount(''); reload(); refresh(); } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const buy = async (p) => {
    setBuying(p._id);
    try { const r = await api.vendor.post(`/astrologer/plans/${p._id}/buy`, {}); toast(`${p.name} active till ${fmtDate(r.plan.until)}`, 'success'); reload(); reloadPlans(); refresh(); } catch (err) { toast(err.message, 'error'); } finally { setBuying(null); }
  };
  if (loading && !data) return <PageLoader variant="vendor-earnings" />;
  if (!data) return <Card className="p-5 text-center text-sm text-rose-600">{error?.message || 'Could not load earnings. Please try again.'}</Card>;

  // Same maths as the server (Admin > Pricing & Fees > payouts).
  const amt = +amount || 0;
  const tds = r2(amt * (data.tdsPct || 0) / 100);
  const fee = r2(Math.min(data.payoutFee || 0, Math.max(0, amt - tds)));
  const net = r2(amt - tds - fee);
  const gstPct = plans?.gstPct || 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="bg-gradient-to-br from-brand-700 to-brand-900 p-5 text-white">
          <p className="text-xs text-brand-200">Withdrawable balance</p>
          <p className="mt-1 text-3xl font-extrabold">{inr(data.balance)}</p>
          <p className="mt-2 text-xs text-brand-200">
            Platform commission: <b className="text-white">{data.effectiveCommissionPct}%</b> per session (already deducted)
            {data.plan && <> · {data.plan.name} plan saves you {r2(data.commissionPct - data.effectiveCommissionPct)} points till {fmtDate(data.plan.until)}</>}
          </p>
        </Card>
        <Card className="p-4">
          <form onSubmit={withdraw} className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><Banknote size={16} /> Request withdrawal</p>
            <Field type="number" min={data.minWithdraw} placeholder={`Min ${inr(data.minWithdraw)}`} value={amount} onChange={(e) => setAmount(e.target.value)} required />
            {amt > 0 && (
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs">
                <div className="flex justify-between py-0.5"><span className="text-slate-500">Requested</span><b>{inr(amt)}</b></div>
                <div className="flex justify-between py-0.5"><span className="text-slate-500">TDS {data.tdsPct}%</span><b>− {inr(tds)}</b></div>
                {data.payoutFee > 0 && <div className="flex justify-between py-0.5"><span className="text-slate-500">Payout fee</span><b>− {inr(fee)}</b></div>}
                <div className="mt-1 flex justify-between border-t border-slate-200 pt-1.5 text-sm"><span className="font-bold">To your bank</span><b className="text-emerald-600">{inr(net)}</b></div>
              </div>
            )}
            <Button type="submit" loading={busy} className="w-full">Withdraw to bank</Button>
          </form>
        </Card>
      </div>

      {plans?.plans?.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><Sparkles size={16} className="text-brand-600" /> Grow with a plan</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plans.plans.map((p) => {
              const mine = plans.active && String(plans.active.plan) === String(p._id);
              const gst = r2(p.price * gstPct / 100);
              return (
                <div key={p._id} className={cx('flex flex-col rounded-2xl border p-4', mine ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-200')}>
                  <p className="text-sm font-bold text-slate-900">{p.name}{mine && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">Active</span>}</p>
                  {p.description && <p className="mt-0.5 text-xs text-slate-500">{p.description}</p>}
                  <p className="mt-2 text-xl font-extrabold text-slate-900">{inr(p.price)}<span className="text-xs font-medium text-slate-400"> + GST {inr(gst)} · {p.durationDays} days</span></p>
                  <ul className="mt-2 flex-1 space-y-1 text-xs text-slate-700">
                    {p.commissionCut > 0 && <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-600" />Commission {data.commissionPct}% → {r2(Math.max(0, data.commissionPct - p.commissionCut))}%</li>}
                    {p.featured && <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-600" />Featured: shown first to customers</li>}
                    {(p.perks || []).map((x) => <li key={x} className="flex items-center gap-1.5"><Check size={12} className="text-emerald-600" />{x}</li>)}
                  </ul>
                  <Button size="sm" className="mt-3 w-full" variant={mine ? 'outline' : 'primary'} loading={buying === p._id} onClick={() => buy(p)}>{mine ? 'Extend' : 'Buy'} · {inr(r2(p.price + gst))} from earnings</Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="mb-2 text-sm font-bold text-slate-900">Withdrawals</h2>
        {data.withdrawals.length ? data.withdrawals.map((w) => (
          <div key={w._id} className="flex items-center justify-between gap-2 border-t border-slate-100 py-2.5 text-xs first:border-0">
            <span className="text-slate-500">{fmtDate(w.createdAt)}</span>
            <span className="text-right"><b className="text-slate-800">{inr(w.amount)}</b>{w.net != null && w.net !== w.amount && <span className="block text-[10px] text-slate-400">{inr(w.net)} to bank · TDS {inr(w.tds)}{w.fee ? ` · fee ${inr(w.fee)}` : ''}</span>}</span>
            <Badge tone={statusTone(w.status)}>{w.status}</Badge>
          </div>
        )) : <p className="text-xs text-slate-400">No withdrawals yet.</p>}
      </Card>
      <Card className="p-4">
        <h2 className="mb-2 text-sm font-bold text-slate-900">Earnings ledger</h2>
        {data.transactions.length ? data.transactions.map((t) => (
          <div key={t._id} className="flex items-center justify-between border-t border-slate-100 py-2.5 text-xs first:border-0">
            <div><p className="font-semibold text-slate-800">{t.note || t.kind}</p><p className="text-slate-400">{fmtDate(t.createdAt)}</p></div>
            <div className="text-right"><p className={cx('font-bold', t.direction === 'credit' ? 'text-emerald-600' : 'text-rose-500')}>{t.direction === 'credit' ? '+' : '-'}{inr(t.amount)}</p><p className="text-[10px] text-slate-400">Bal {inr(t.balanceAfter)}</p></div>
          </div>
        )) : <p className="text-xs text-slate-400">No earnings yet.</p>}
      </Card>
    </div>
  );
}
