import { Link } from 'react-router-dom';
import { CreditCard, Landmark, Smartphone, Truck, Wallet } from 'lucide-react';
import { inr } from '../../../lib/api.js';
import { PageLoader, cx } from '../../../shared/ui.jsx';
import { Card, NumField, PageHead, SaveBar, Switch, usePricing } from './shared.jsx';

/* How customers pay: online gateway methods for wallet recharge, and cash on delivery for remedy / puja orders.
   Consultations are always paid from the wallet. */
const METHODS = [['upi', 'UPI', Smartphone], ['card', 'Debit / credit card', CreditCard], ['netbanking', 'Net banking', Landmark]];

export default function PaymentModes() {
  const { p, dirty, busy, save, discard, setPart } = usePricing();
  if (!p) return <PageLoader variant="form" />;
  const pm = p.payments;
  const set = (patch) => setPart('payments', patch);
  const onCount = METHODS.filter(([k]) => pm[k]).length;
  return (
    <>
      <PageHead title="Payment Modes" crumbs={['Payment Modes']}>
        <SaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={discard} />
      </PageHead>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card title="Online payment (wallet recharge)">
            <div className="space-y-4 p-6">
              <Switch on={pm.online} onChange={(v) => set({ online: v })} label="Accept online payments" hint={pm.online ? 'Customers can add money to the wallet' : 'Wallet recharge is paused in the app'} />
              <div className={cx('grid gap-3 sm:grid-cols-3', !pm.online && 'pointer-events-none opacity-50')}>
                {METHODS.map(([k, l, I]) => (
                  <button key={k} type="button" onClick={() => set({ [k]: !pm[k] })} className={cx('flex items-center gap-3 rounded-xl border p-3 text-left transition', pm[k] ? 'border-indigo-300 bg-indigo-50/60' : 'border-gray-200 bg-white hover:bg-slate-50')}>
                    <span className={cx('flex h-9 w-9 items-center justify-center rounded-lg', pm[k] ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400')}><I size={17} /></span>
                    <span className="min-w-0 flex-1"><span className="block text-[13px] font-bold text-slate-800">{l}</span><span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">{pm[k] ? 'Enabled' : 'Disabled'}</span></span>
                  </button>
                ))}
              </div>
              {pm.online && onCount === 0 && <p className="rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Turn on at least one method, otherwise recharge stays paused.</p>}
            </div>
          </Card>
          <Card title="Cash on delivery (remedy & puja orders)">
            <div className="space-y-4 p-6">
              <Switch on={pm.cod} onChange={(v) => set({ cod: v })} label="Allow cash on delivery" hint="Shown on physical remedy / puja items in the store. Reports and consultations always use the wallet." />
              <div className={cx('grid grid-cols-1 gap-6 md:grid-cols-2', !pm.cod && 'pointer-events-none opacity-50')}>
                <NumField label="Maximum order value for COD" value={pm.codMax} onChange={(v) => set({ codMax: v })} prefix="₹" hint="0 = no limit" />
                <NumField label="COD handling charge" value={pm.codFee} onChange={(v) => set({ codFee: v })} prefix="₹" hint="Added to the amount collected" />
              </div>
              <Link to="/admin/users/orders" className="inline-block text-sm font-bold text-indigo-600 hover:underline">View COD orders →</Link>
            </div>
          </Card>
        </div>
        <div className="xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 text-sm">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-800">What customers see now</h3>
            <div className="space-y-2">
              <p className="flex items-start gap-2"><Wallet size={16} className="mt-0.5 text-indigo-600" /><span><b>Add money:</b> {pm.online && onCount ? METHODS.filter(([k]) => pm[k]).map(([, l]) => l).join(' · ') : <span className="font-bold text-amber-700">paused</span>}</span></p>
              <p className="flex items-start gap-2"><Truck size={16} className="mt-0.5 text-indigo-600" /><span><b>Store:</b> Wallet{pm.cod ? ` · Cash on delivery${pm.codMax ? ` up to ${inr(pm.codMax)}` : ''}${pm.codFee ? ` (+${inr(pm.codFee)})` : ''}` : ''}</span></p>
              <p className="flex items-start gap-2"><CreditCard size={16} className="mt-0.5 text-indigo-600" /><span><b>Chat / call / video:</b> wallet balance</span></p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
