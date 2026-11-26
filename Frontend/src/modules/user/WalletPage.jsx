import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Landmark, CreditCard, Smartphone, Receipt, Crown, Check } from 'lucide-react';
import { api, inr, fmtDate } from '../../lib/api.js';
import { usePlatformLive } from '../../lib/live.js';
import { userAuth } from '../../lib/auth.jsx';
import { Button, Card, Empty, Field, PageLoader, useAsync, useToast, cx } from '../../shared/ui.jsx';
import { useAppData } from './av.jsx';

const METHODS = [{ k: 'UPI', icon: Smartphone }, { k: 'Card', icon: CreditCard }, { k: 'Net Banking', icon: Landmark }];
const r2 = (n) => Math.round((+n || 0) * 100) / 100;

export default function WalletPage() {
  const toast = useToast();
  const { setMe } = userAuth.useAuth();
  const { data: app } = useAppData() || {};
  const w = app?.wallet || {};
  const packs = w.packs?.length ? w.packs : [100, 200, 500, 1000];
  const payCfg = app?.payments || { online: true, methods: METHODS.map((m) => m.k) };
  const methods = METHODS.filter((m) => payCfg.methods?.includes(m.k));
  const { data, loading, error, reload } = useAsync(() => api.user.get('/user/wallet'));
  const { data: plans, reload: reloadPlans } = useAsync(() => api.user.get('/user/plans'));
  // Admin added / changed a plan: show it without a refresh.
  usePlatformLive((what) => (what === 'plans' || what === 'pricing') && reloadPlans());
  const [amount, setAmount] = useState(500);
  const [method, setMethod] = useState('UPI');
  const [busy, setBusy] = useState(false);
  const [buying, setBuying] = useState(null);

  // Same breakdown as the server (Admin > Pricing & Fees).
  const gst = r2(amount * (w.gstPct || 0) / 100), fee = r2(amount * (w.feePct || 0) / 100), total = r2(amount + gst + fee);
  const min = w.minRecharge || 1, max = w.maxRecharge || 50000;
  const okAmount = amount >= min && amount <= max;
  const pickMethod = methods.some((m) => m.k === method) ? method : methods[0]?.k;

  const recharge = async () => {
    setBusy(true);
    try {
      const r = await api.user.post('/user/wallet/recharge', { amount, method: pickMethod });
      setMe((m) => ({ ...m, walletBalance: r.balance }));
      toast(`${inr(amount)} added to your wallet`, 'success');
      reload();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const buy = async (p) => {
    setBuying(p._id);
    try {
      const r = await api.user.post(`/user/plans/${p._id}/buy`, {});
      setMe((m) => ({ ...m, walletBalance: r.balance, premium: r.premium }));
      toast(`${p.name} activated till ${fmtDate(r.premium.until)}`, 'success');
      reload(); reloadPlans();
    } catch (e) { toast(e.message, 'error'); } finally { setBuying(null); }
  };

  if (loading && !data) return <PageLoader variant="wallet" />;
  if (!data) return <div className="p-4"><Card className="p-5 text-center text-sm text-rose-600">{error?.message || 'Could not load wallet. Please try again.'}</Card></div>;
  const active = plans?.active;
  return (
    <div className="space-y-4 p-4">
      <Card className="bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
        <p className="text-xs text-brand-200">Available balance</p>
        <p className="mt-1 text-3xl font-extrabold">{inr(data.balance)}</p>
        {active && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold"><Crown size={12} />{active.name}: {active.discountPct}% off till {fmtDate(active.until)}</p>}
      </Card>

      <Card className="space-y-4 p-4">
        <h2 className="text-sm font-bold text-slate-900">Add money</h2>
        <div className="grid grid-cols-3 gap-2">
          {packs.map((p) => <button key={p} onClick={() => setAmount(p)} className={cx('rounded-xl border py-2.5 text-sm font-bold transition', amount === p ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-700')}>{inr(p)}{p === w.popular && <span className="block text-[9px] font-semibold text-brand-600">POPULAR</span>}</button>)}
        </div>
        <Field type="number" min={min} max={max} value={amount} onChange={(e) => setAmount(+e.target.value)} label="Or enter amount" hint={`Between ${inr(min)} and ${inr(max)}`} />
        {payCfg.online && methods.length > 0 ? (
          <div className={cx('grid gap-2', methods.length === 1 ? 'grid-cols-1' : methods.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
            {methods.map(({ k, icon: Icon }) => <button key={k} onClick={() => setMethod(k)} className={cx('flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[11px] font-semibold', pickMethod === k ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500')}><Icon size={18} />{k}</button>)}
          </div>
        ) : (
          <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-center text-xs font-semibold text-amber-800">Online payments are paused right now. Please try again in a little while.</p>
        )}
        {(gst > 0 || fee > 0) && (
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs">
            <div className="flex justify-between py-0.5"><span className="text-slate-500">Wallet credit</span><b>{inr(amount)}</b></div>
            {gst > 0 && <div className="flex justify-between py-0.5"><span className="text-slate-500">GST {w.gstPct}%</span><b>+ {inr(gst)}</b></div>}
            {fee > 0 && <div className="flex justify-between py-0.5"><span className="text-slate-500">Convenience fee {w.feePct}%</span><b>+ {inr(fee)}</b></div>}
            <div className="mt-1 flex justify-between border-t border-slate-200 pt-1.5 text-sm"><span className="font-bold text-slate-800">You pay</span><b className="text-brand-700">{inr(total)}</b></div>
          </div>
        )}
        <Button onClick={recharge} loading={busy} disabled={!okAmount || !payCfg.online || !pickMethod} className="w-full" size="lg" variant="gold">{total > amount ? `Pay ${inr(total)}` : `Add ${inr(amount)}`}</Button>
        <p className="text-center text-[11px] text-slate-400">Test mode: payments are simulated until a payment gateway is connected.</p>
      </Card>

      {plans?.plans?.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-900"><Crown size={15} className="text-amber-500" /> Premium plans</h2>
          <div className="space-y-2">
            {plans.plans.map((p) => {
              const mine = active && String(active.plan) === String(p._id);
              return (
                <Card key={p._id} className={cx('p-4', mine && 'ring-2 ring-amber-400')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{p.name}{mine && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Active</span>}</p>
                      {p.description && <p className="mt-0.5 text-xs text-slate-500">{p.description}</p>}
                      <ul className="mt-2 space-y-1 text-xs text-slate-700">
                        {p.discountPct > 0 && <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-600" />{p.discountPct}% off every chat & call</li>}
                        {(p.perks || []).map((x) => <li key={x} className="flex items-center gap-1.5"><Check size={12} className="text-emerald-600" />{x}</li>)}
                      </ul>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-extrabold text-slate-900">{inr(p.price)}</p>
                      <p className="text-[11px] text-slate-400">{p.durationDays} days</p>
                    </div>
                  </div>
                  <Button size="sm" className="mt-3 w-full" variant={mine ? 'outline' : 'primary'} loading={buying === p._id} onClick={() => buy(p)}>{mine ? 'Extend from wallet' : 'Buy from wallet'}</Button>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-bold text-slate-900">Transaction history</h2>
        {data.transactions.length ? (
          <Card className="divide-y divide-slate-100">
            {data.transactions.map((t) => (
              <div key={t._id} className="flex items-center gap-3 p-3">
                <span className={cx('flex h-9 w-9 items-center justify-center rounded-full', t.direction === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500')}>{t.direction === 'credit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800">{t.note || t.kind}</p>
                  <p className="text-[11px] text-slate-400">{fmtDate(t.createdAt)}{t.meta?.gst > 0 && ` · GST ${inr(t.meta.gst)}`}{t.meta?.discountPct > 0 && ` · ${t.meta.discountPct}% premium off`}</p>
                </div>
                <div className="text-right"><p className={cx('text-sm font-bold', t.direction === 'credit' ? 'text-emerald-600' : 'text-slate-800')}>{t.direction === 'credit' ? '+' : '-'}{inr(t.amount)}</p><p className="text-[10px] text-slate-400">Bal {inr(t.balanceAfter)}</p></div>
              </div>
            ))}
          </Card>
        ) : <Empty icon={Receipt} title="No transactions yet" hint="Recharge your wallet to start consulting." />}
      </section>
    </div>
  );
}
