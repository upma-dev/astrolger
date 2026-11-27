import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, FileText, Flame, Truck } from 'lucide-react';
import { api, inr } from '../../lib/api.js';
import { userAuth } from '../../lib/auth.jsx';
import { Badge, Button, Card, Field, Modal, PageLoader, TextArea, useAsync, useToast, cx } from '../../shared/ui.jsx';
import { useAppData } from './av.jsx';

export default function Store() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') === 'remedies' ? 'remedies' : 'reports';
  const toast = useToast();
  const { me, setMe } = userAuth.useAuth();
  const { data: app } = useAppData() || {};
  const pay = app?.payments || {};
  const [cod, setCod] = useState(null); // item being ordered with cash on delivery
  const [addr, setAddr] = useState({ address: '', phone: '' });
  const [placing, setPlacing] = useState(false);
  const codOk = (it) => tab === 'remedies' && pay.cod && (!pay.codMax || it.price <= pay.codMax);
  const placeCod = async (e) => {
    e.preventDefault();
    setPlacing(true);
    try {
      await api.user.post(`/user/${tab}/${cod._id}/buy`, { payment: 'cod', address: addr.address, phone: addr.phone || me?.phone });
      toast('Order placed. Pay in cash when it is delivered.', 'success');
      setCod(null); reload();
    } catch (err) { toast(err.message, 'error'); } finally { setPlacing(false); }
  };
  const { data: items, loading } = useAsync(() => api.public.get(`/public/${tab}`), [tab]);
  const { data: bought, reload } = useAsync(() => api.user.get('/user/purchases'));

  const buy = async (it) => {
    if (!window.confirm(`Buy "${it.title}" for ${inr(it.price)} from your wallet?`)) return;
    try {
      const r = await api.user.post(`/user/${tab}/${it._id}/buy`);
      setMe((m) => ({ ...m, walletBalance: r.balance }));
      toast('Purchased! Our team will share it with you shortly.', 'success');
      reload();
    } catch (e) { toast(e.message, 'error'); }
  };
  const order = (id) => bought?.find((p) => String(p.item) === String(id) && p.status !== 'cancelled');
  const owned = (id) => !!order(id);

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-bold text-slate-900">Reports & Remedies</h1>
      <div className="flex rounded-xl bg-slate-200/70 p-1 text-sm font-semibold">
        {['reports', 'remedies'].map((t) => <button key={t} onClick={() => setSp({ tab: t })} className={cx('flex-1 rounded-lg py-2 capitalize transition', tab === t ? 'bg-white text-brand-700 shadow' : 'text-slate-500')}>{t}</button>)}
      </div>
      {loading ? <PageLoader variant="store" /> : (
        <div className="space-y-3">
          {items?.map((it) => (
            <Card key={it._id} className="p-4">
              <div className="flex items-start gap-3">
                {/* Image set by the admin (Horoscopes & Content); a plain tile when there is none. */}
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-brand-50">
                  {it.imageUrl ? <img src={it.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-brand-600">{tab === 'remedies' ? <Flame size={26} /> : <FileText size={26} />}</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Badge tone="violet">{it.category}</Badge>
                    <p className="text-base font-extrabold text-brand-700">{inr(it.price)}</p>
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-slate-900">{it.title}</h3>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{it.description}</p>
                </div>
              </div>
              <div className="mt-3">{owned(it._id) ? (
                order(it._id).status === 'cod_pending'
                  ? <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-600"><Truck size={15} /> Ordered · pay cash on delivery</p>
                  : <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><CheckCircle2 size={15} /> Purchased</p>
              ) : (
                <div className={cx('grid gap-2', codOk(it) && 'grid-cols-2')}>
                  <Button size="sm" className="w-full" onClick={() => buy(it)}>Buy with wallet</Button>
                  {codOk(it) && <Button size="sm" variant="outline" className="w-full" onClick={() => { setCod(it); setAddr({ address: '', phone: me?.phone || '' }); }}><Truck size={14} /> Cash on delivery</Button>}
                </div>
              )}</div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={!!cod} onClose={() => setCod(null)} title="Cash on delivery">
        {cod && (
          <form onSubmit={placeCod} className="space-y-3">
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">{cod.title}</span><b>{inr(cod.price)}</b></div>
              {pay.codFee > 0 && <div className="mt-1 flex justify-between"><span className="text-slate-600">COD charge</span><b>+ {inr(pay.codFee)}</b></div>}
              <div className="mt-1.5 flex justify-between border-t border-slate-200 pt-1.5"><span className="font-bold">Pay on delivery</span><b className="text-brand-700">{inr(cod.price + (pay.codFee || 0))}</b></div>
            </div>
            <TextArea label="Delivery address" rows={3} required minLength={10} value={addr.address} onChange={(e) => setAddr({ ...addr, address: e.target.value })} placeholder="House no, street, city, PIN code" />
            <Field label="Contact number" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} />
            <Button type="submit" className="w-full" loading={placing}>Place order</Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
