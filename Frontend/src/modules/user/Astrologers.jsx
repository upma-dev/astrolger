import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, inr, LANGUAGES, EXPERTISE } from '../../lib/api.js';
import { userAuth } from '../../lib/auth.jsx';
import { usePlatformLive } from '../../lib/live.js';
import { useAsync, useDebouncedValue } from '../../shared/ui.jsx';
import { AstroPhoto, Icon, Rv, Verified, priceOf, startCost, useAV, useAppData, vibrate } from './av.jsx';

/* Start a chat/call. If the wallet can't cover the minimum (Admin > Pricing & Fees), open the add-money sheet and continue after payment. */
export function useStartSession() {
  const nav = useNavigate();
  const { toast, openSheet } = useAV();
  const { me } = userAuth.useAuth();
  const { data: appData } = useAppData() || {};
  const go = async (a, type) => {
    try {
      const s = await api.user.post('/user/sessions', { astrologerId: a._id, type });
      nav(`/user/session/${s._id}`);
    } catch (e) { toast(e.message, 'error'); }
  };
  return (a, type) => {
    vibrate();
    const { need, minutes } = startCost(a, me, appData?.wallet, type, appData?.services);
    if ((me?.walletBalance || 0) < need) {
      openSheet(`You need at least ${inr(need)} (${minutes} min) to ${type === 'chat' ? 'chat' : type === 'video' ? 'video call' : 'call'} with ${a.name}. Add money to start instantly.`,
        (bal) => (bal >= need ? go(a, type) : toast(`Add a little more — ${inr(need)} needed`, 'error')));
      return;
    }
    go(a, type);
  };
}

export function AstroCard({ a, start, delay = 0 }) {
  const nav = useNavigate();
  const { data: app } = useAppData() || {};
  const chat = priceOf(a, 'chat', app?.services), call = priceOf(a, 'audio', app?.services);
  const state = !a.online ? 'offline' : a.busy ? 'busy' : 'online';
  const sline = state === 'online' ? 'Online now' : state === 'busy' ? 'Busy, in another session' : 'Offline';
  return (
    <Rv as="article" className="av-ast" delay={delay}>
      <div className="av-ast-top" role="link" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => nav(`/user/astrologers/${a._id}`)} onKeyDown={(e) => e.key === 'Enter' && nav(`/user/astrologers/${a._id}`)}>
        <AstroPhoto a={a} />
        <div className="av-ai">
          <div className="av-an">{a.name} <Verified />{a.sponsored ? <span className="av-feat">SPONSORED</span> : a.featured && <span className="av-feat">FEATURED</span>}</div>
          <div className="av-skills">{a.expertise?.slice(0, 3).map((s) => <span key={s}>{s}</span>)}</div>
          <div className="av-meta"><span className="av-star inline-flex items-center gap-0.5"><Icon n="star" s={11} className="fill-current" /> {a.rating?.toFixed(1)}</span>({(a.ratingCount || 0).toLocaleString('en-IN')})<span className="av-sep" />{a.experience} yrs exp<span className="av-sep" />{a.languages?.join(', ')}</div>
          <div className={`av-sline ${state}`}>{sline}</div>
        </div>
      </div>
      <div className="av-ast-bot">
        <div className="av-price">
          <b>{inr(chat.enabled ? chat.perUnit : call.perUnit)}</b><small>/{chat.enabled ? chat.unit : call.unit}</small>
          {chat.enabled && call.enabled && <small className="av-price-sub">Call {inr(call.perUnit)}/{call.unit}</small>}
        </div>
        <div className="av-acts">
          {state === 'online' ? (
            <>
              {call.enabled && <button className="av-btn-ghost" onClick={() => start(a, 'audio')}><Icon n="phone" s={14} /> Call</button>}
              {chat.enabled && <button className="av-btn-gold" onClick={() => start(a, 'chat')}><Icon n="chat" s={14} /> Chat</button>}
            </>
          ) : (
            <span className="av-btn-dis" aria-disabled="true"><Icon n={state === 'busy' ? 'chat' : 'bell'} s={14} /> {state === 'busy' ? 'Busy' : 'Offline'}</span>
          )}
        </div>
      </div>
    </Rv>
  );
}

export function AstroSkeleton({ n = 3 }) {
  return Array.from({ length: n }, (_, i) => (
    <div className="av-ast" key={i}>
      <div className="av-ast-top">
        <div className="av-sk" style={{ width: 64, height: 64, borderRadius: '50%' }} />
        <div style={{ flex: 1 }}><div className="av-sk" style={{ height: 14, width: '70%', margin: '6px 0 10px' }} /><div className="av-sk" style={{ height: 10, width: '90%', marginBottom: 8 }} /><div className="av-sk" style={{ height: 10, width: '55%' }} /></div>
      </div>
      <div className="av-sk" style={{ height: 34, marginTop: 14, borderRadius: 99 }} />
    </div>
  ));
}

const SORTS = [['rating', 'Top rated'], ['price', 'Lowest price'], ['experience', 'Most experienced']];

export default function Astrologers() {
  const [f, setF] = useState({ q: '', language: '', expertise: '', sort: 'rating', online: '' });
  const dq = useDebouncedValue(f.q, 300);
  const { data, loading, reload } = useAsync(() => api.public.get('/public/astrologers', { ...f, q: dq }), [dq, f.language, f.expertise, f.sort, f.online]);
  usePlatformLive((what) => (what === 'astrologers' || what === 'pricing' || what === 'focus') && reload(true));
  const start = useStartSession();
  const { data: app } = useAppData();
  const set = (k, v) => { vibrate(); setF((s) => ({ ...s, [k]: v })); };
  return (
    <div>
      <div className="av-title"><h1>Talk to Astrologer</h1><p>Connect with verified &amp; experienced astrologers.</p></div>
      <label className="av-search"><Icon n="search" s={18} /><input value={f.q} onChange={(e) => setF((s) => ({ ...s, q: e.target.value }))} placeholder={app?.config?.searchPlaceholder || 'Search astrologer…'} aria-label="Search astrologers" /></label>
      <div className="av-fchips">
        <button className={`av-fchip${f.online === '1' ? ' on' : ''}`} onClick={() => set('online', f.online === '1' ? '' : '1')}>Online now</button>
        {SORTS.map(([k, l]) => <button key={k} className={`av-fchip${f.sort === k ? ' on' : ''}`} onClick={() => set('sort', k)}>{l}</button>)}
      </div>
      <div className="av-fchips" style={{ paddingTop: 8 }}>
        <select className="av-fsel" value={f.language} onChange={(e) => set('language', e.target.value)} aria-label="Language"><option value="">All languages</option>{LANGUAGES.map((l) => <option key={l}>{l}</option>)}</select>
        <select className="av-fsel" value={f.expertise} onChange={(e) => set('expertise', e.target.value)} aria-label="Expertise"><option value="">All expertise</option>{EXPERTISE.map((l) => <option key={l}>{l}</option>)}</select>
      </div>
      <div style={{ marginTop: 14 }}>
        {loading ? <AstroSkeleton /> : data?.length ? data.map((a, i) => <AstroCard key={a._id} a={a} start={start} delay={Math.min(i, 4) * 70} />) : <div className="av-card"><p className="av-empty">No astrologers match these filters.</p></div>}
      </div>
    </div>
  );
}
