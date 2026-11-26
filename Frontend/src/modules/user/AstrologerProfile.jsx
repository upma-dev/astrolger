import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Phone, Video, BadgeCheck, Clock } from 'lucide-react';
import { api, inr, fmtDate } from '../../lib/api.js';
import { userAuth } from '../../lib/auth.jsx';
import { usePlatformLive } from '../../lib/live.js';
import { Avatar, Badge, Button, Card, PageLoader, Stars, useAsync, useToast } from '../../shared/ui.jsx';
import { priceOf, startCost, useAppData } from './av.jsx';

export default function AstrologerProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { me } = userAuth.useAuth();
  const { data: a, loading, reload } = useAsync(() => api.public.get(`/public/astrologers/${id}`), [id]);
  usePlatformLive((what) => (what === 'astrologers' || what === 'pricing' || what === 'focus') && reload(true));
  const [busy, setBusy] = useState('');
  const { data: app } = useAppData() || {};

  if (loading) return <PageLoader variant="astro-profile" />;
  if (!a) return <p className="p-6 text-center text-sm text-slate-500">Astrologer not found.</p>;
  const services = app?.services;
  const types = [['chat', 'Chat', MessageCircle, 'primary'], ['audio', 'Call', Phone, 'gold'], ['video', 'Video', Video, 'outline']].filter(([k]) => priceOf(a, k, services).enabled);
  const costs = Object.fromEntries(types.map(([k]) => [k, startCost(a, me, app?.wallet, k, services)]));
  const cheapest = types.length ? Math.min(...types.map(([k]) => costs[k].need)) : 0;
  const low = types.length > 0 && me.walletBalance < cheapest;
  const short = (k) => me.walletBalance < costs[k].need;

  const start = async (type) => {
    setBusy(type);
    try {
      const s = await api.user.post('/user/sessions', { astrologerId: a._id, type });
      nav(`/user/session/${s._id}`);
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); }
  };

  return (
    <div>
      <div className="bg-brand-800 px-4 pb-14 pt-3 text-white">
        <button onClick={() => nav(-1)} className="mb-2 flex items-center gap-1 text-xs font-semibold text-brand-100"><ArrowLeft size={14} /> Back</button>
        <div className="flex items-center gap-3">
          <Avatar name={a.name} src={a.avatar} size={72} className="ring-4 ring-white/30" />
          <div>
            <h1 className="flex items-center gap-1 text-lg font-bold">{a.name} <BadgeCheck size={18} className="text-sky-300" /></h1>
            <p className="text-xs text-brand-100">{(a.expertise || []).join(' · ')}</p>
            <div className="mt-1 flex items-center gap-2 text-xs"><Stars value={a.rating || 0} /><span>{(a.rating || 0).toFixed(1)} ({a.ratingCount || 0})</span></div>
          </div>
        </div>
      </div>
      <div className="-mt-9 space-y-4 px-4 pb-6">
        <Card className="grid grid-cols-3 divide-x divide-slate-100 p-3 text-center">
          <div><p className="text-base font-bold text-slate-900">{a.experience}+</p><p className="text-[11px] text-slate-400">Years exp.</p></div>
          <div><p className="text-base font-bold text-slate-900">{Math.round(a.totalMinutes || 0).toLocaleString()}</p><p className="text-[11px] text-slate-400">Minutes</p></div>
          <div><p className="text-base font-bold text-brand-700">{a.ratingCount || 0}</p><p className="text-[11px] text-slate-400">Reviews</p></div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-bold text-slate-900">Consultation charges</h2>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, types.length)}, minmax(0, 1fr))` }}>
            {types.map(([k, l, I]) => {
              const c = costs[k];
              return (
                <div key={k} className="rounded-xl bg-slate-50 p-2.5 text-center">
                  <I size={16} className="mx-auto text-brand-600" />
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">{l}</p>
                  <p className="text-sm font-bold text-slate-900">{c.discountPct > 0 && <span className="mr-1 text-[10px] font-medium text-slate-400 line-through">{inr(c.listed)}</span>}{inr(c.rate)}<span className="text-[10px] font-medium text-slate-400">/{c.unit}</span></p>
                  {c.maxMinutes > 0 ? <p className="text-[10px] font-semibold text-amber-700">Auto-ends at {c.maxMinutes} min</p> : c.block > 1 && <p className="text-[10px] text-slate-400">Charged per {c.unit}</p>}
                </div>
              );
            })}
          </div>
          {types.length > 0 && <p className="mt-2 text-[11px] text-slate-400">Minimum to start{Object.values(costs).some((c) => c.fee > 0 || c.charge > c.rate) ? ' (incl. platform fee / GST)' : ''}: {types.map(([k, l]) => `${l} ${inr(costs[k].need)}`).join(' · ')}</p>}
        </Card>
        <Card className="p-4">
          <h2 className="mb-1 text-sm font-bold text-slate-900">About</h2>
          <p className="text-sm leading-relaxed text-slate-600">{a.bio || 'Experienced astrologer.'}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{(a.languages || []).map((l) => <Badge key={l} tone="violet">{l}</Badge>)}</div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-bold text-slate-900">Reviews</h2>
          {a.reviews?.length ? a.reviews.map((r) => (
            <div key={r._id} className="border-t border-slate-100 py-2.5 first:border-0 first:pt-0">
              <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-800">{r.user}</span><Stars value={r.rating} size={12} /></div>
              {r.comment && <p className="mt-0.5 text-xs text-slate-600">{r.comment}</p>}
              <p className="mt-0.5 text-[10px] text-slate-400">{fmtDate(r.createdAt)}</p>
            </div>
          )) : <p className="text-xs text-slate-400">No reviews yet.</p>}
        </Card>
      </div>
      <div className="safe-bottom sticky bottom-0 border-t border-slate-200 bg-white p-3">
        {!a.online && <p className="mb-2 flex items-center justify-center gap-1 text-xs text-slate-500"><Clock size={13} /> Currently offline — try again later</p>}
        {low && a.online && <p className="mb-2 text-center text-xs text-amber-700">Minimum balance {inr(cheapest)} needed. <Link to="/user/wallet" className="font-bold underline">Recharge</Link></p>}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, types.length)}, minmax(0, 1fr))` }}>
          {types.map(([k, l, I, v]) => <Button key={k} variant={v} disabled={!a.online || short(k)} loading={busy === k} onClick={() => start(k)}><I size={16} /> {l}</Button>)}
        </div>
      </div>
    </div>
  );
}
