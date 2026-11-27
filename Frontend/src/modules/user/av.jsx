import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { AppDataCtx, AVCtx } from './avContext.js';
import { api, inr } from '../../lib/api.js';
import { FALLBACK_PUBLIC_APP, isValidPublicApp, readCachedApp, writeCachedApp } from '../../lib/publicApp.js';
import { usePlatformLive } from '../../lib/live.js';
import { userAuth } from '../../lib/auth.jsx';
import { ToastCtx } from '../../shared/ui.jsx';
import AstroIcon from '../../shared/AstroIcon.jsx';
import './av.css';

export const vibrate = () => { try { navigator.vibrate?.(8); } catch { /* unsupported */ } };

/* ---------------- Icons (shared with the admin panel) ---------------- */
export const Icon = ({ n, s = 20, style, className }) => <AstroIcon n={n} s={s} style={style} className={className} />;
// Verified tick: Lucide BadgeCheck (filled green), same icon library as everything else.
export const Verified = () => <BadgeCheck size={16} strokeWidth={2.2} fill="#2F8A57" color="#fff" aria-label="Verified" />;
export const initials = (n = '?') => n.replace(/^(Pt\.|Dr\.|Acharya|Guru|Swami)\s+/i, '').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

/* Avatar with status ring, as in the prototype */
export function AstroPhoto({ a }) {
  const [bad, setBad] = useState(false);
  const state = !a?.online ? 'offline' : a.busy ? 'busy' : 'online';
  return (
    <div className={`av-ph ${state}`}>
      <div className="av-av">{initials(a?.name)}{a?.avatar && !bad && <img src={a.avatar} alt="" loading="lazy" onError={() => setBad(true)} />}</div>
      <span className="av-st" />
    </div>
  );
}

/* ---------------- Reveal on scroll ---------------- */
export function useInView() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen];
}
export function Rv({ as: Tag = 'div', className = '', delay = 0, style, children, ...p }) {
  const [ref, seen] = useInView();
  return <Tag ref={ref} className={`av-rv${seen ? ' in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms`, ...style }} {...p}>{children}</Tag>;
}

/* ---------------- Admin theme (Global > Theme & colours) -> CSS variables ---------------- */
const HEX = /^#[0-9a-f]{6}$/i;
const mixc = (a, b, p) => `color-mix(in srgb, ${a} ${p}%, ${b})`;
export function themeVars(t, mode) {
  const base = { display: 'contents' };
  if (!t || !HEX.test(t.accent || '')) return base;
  if (mode === 'dark') {
    const a = HEX.test(t.darkAccent || '') ? t.darkAccent : t.accent;
    return { ...base, '--accent': a, '--accent-dk': mixc(a, '#000', 82), '--accent-soft': mixc(a, '#241915', 18), '--accent-line': mixc(a, '#241915', 40), '--cta-grad': a,
      '--brand': mixc(a, '#fff', 55), '--price': mixc(a, '#fff', 55), '--glyph': mixc(a, '#fff', 60), '--glyph-bg': mixc(a, '#241915', 22), '--skill-text': mixc(a, '#fff', 60),
      '--color-brand-600': a, '--color-brand-500': a, '--poster': t.accent, '--poster-dk': mixc(t.accent, '#000', 78) };
  }
  const a = t.accent, b = HEX.test(t.brand || '') ? t.brand : a, bg = HEX.test(t.background || '') ? t.background : '#FBF4EE';
  return { ...base, '--accent': a, '--accent-dk': mixc(a, '#000', 82), '--accent-soft': mixc(a, '#fff', 14), '--accent-line': mixc(a, '#fff', 38), '--cta-grad': a,
    '--brand': b, '--price': b, '--bg': bg, '--glyph': a, '--glyph-bg': mixc(a, '#fff', 14), '--skill-text': mixc(a, '#000', 80), '--skill-bg': mixc(a, '#fff', 9), '--skill-line': mixc(a, '#fff', 25),
    '--color-brand-600': a, '--color-brand-500': mixc(a, '#fff', 85), '--color-brand-700': mixc(a, '#000', 85), '--color-brand-50': mixc(a, '#fff', 7), '--color-brand-100': mixc(a, '#fff', 14),
    '--poster': a, '--poster-dk': mixc(a, '#000', 78) };
}

/* Per-service prices (Admin > Price Management > Service pricing & astrologer's custom time). Rates are stored per minute. */
const r2 = (n) => Math.round((+n || 0) * 100) / 100;
export const unitLabel = (block = 1) => (block === 1 ? 'min' : block === 60 ? 'hr' : `${block} min`);
export const rateFor = (a, type) => (+a?.rates?.[type] > 0 ? +a.rates[type] : +a?.pricePerMin || 0);
export const durationFor = (a, type, svc) => {
  const v = Math.round(+a?.durations?.[type] || 0);
  return v >= 1 && v <= 240 ? v : (svc?.block || 1);
};
export const maxMinutesFor = (a, type, svc, block) => {
  const autoCut = typeof a?.autoCut?.[type] === 'boolean' ? a.autoCut[type] : !!svc?.autoCut;
  const svcMax = svc?.maxMinutes || 0;
  const rawMax = autoCut ? block : svcMax;
  return svcMax > 0 && rawMax > 0 ? Math.min(rawMax, svcMax) : (rawMax || 0);
};
export function priceOf(a, type = 'chat', services) {
  const svc = services?.[type] || { block: 1, enabled: true };
  const block = durationFor(a, type, svc);
  const maxMinutes = maxMinutesFor(a, type, svc, block);
  return { block, maxMinutes, unit: unitLabel(block), enabled: svc.enabled !== false, label: svc.label, perUnit: r2(rateFor(a, type) * block) };
}

/* What a user needs in the wallet to start. Mirrors sessionRates() on the server: premium discount,
   billing block, auto-end duration limit, minimum minutes, platform fee (fixed or %) and GST. */
export function startCost(a, me, wallet = {}, type = 'chat', services) {
  const svc = services?.[type];
  const prem = me?.premium?.until && new Date(me.premium.until) > new Date() ? +me.premium.discountPct || 0 : 0;
  const block = durationFor(a, type, svc);
  const maxMinutes = maxMinutesFor(a, type, svc, block);
  const listed = r2(rateFor(a, type) * block);
  const userBlock = r2(listed * (100 - prem) / 100);
  const gst = svc?.gstPct || 0;
  const feePct = svc?.feeType === 'percent' ? svc.fee || 0 : 0;
  const fixed = svc ? (svc.feeType === 'fixed' ? svc.fee || 0 : 0) : wallet.sessionFee || 0;
  const fee = r2(userBlock * feePct / 100);
  const charge = r2(userBlock + fee + r2((userBlock + fee) * gst / 100));
  const rawMinutes = svc?.minMinutes || wallet.minMinutes || 2;
  const minutes = maxMinutes > 0 ? Math.min(rawMinutes, maxMinutes) : rawMinutes;
  const need = r2(charge * Math.max(1, Math.ceil(minutes / block)) + fixed * (1 + gst / 100));
  return { rate: userBlock, listed, unit: unitLabel(block), block, maxMinutes, charge, discountPct: prem, minutes, fee: fixed, need };
}

/* ---------------- App data: everything the admin manages for the home screen ---------------- */
export const useAppData = () => useContext(AppDataCtx);
export function AppDataProvider({ children }) {
  const [state, setState] = useState(() => {
    const cached = readCachedApp();
    return { data: cached, loading: !cached };
  });
  const reload = useCallback(() => {
    const timer = setTimeout(() => {
      setState((s) => (s.data ? s : { data: FALLBACK_PUBLIC_APP, loading: false }));
    }, 2500);
    return api.public.get('/public/app').then((data) => {
      if (!isValidPublicApp(data)) throw new Error('Invalid app config');
      writeCachedApp(data);
      setState({ data, loading: false });
    }).catch(() => setState((s) => ({ data: s.data || FALLBACK_PUBLIC_APP, loading: false })))
      .finally(() => clearTimeout(timer));
  }, []);
  useEffect(() => { reload(); }, [reload]);
  // Admin saved something (theme, pricing, posters, on/off switch…): refresh without a page reload.
  usePlatformLive(reload);
  const value = useMemo(() => ({ ...state, reload }), [state, reload]);
  const { theme } = useAV() || {};
  return <AppDataCtx.Provider value={value}><div style={themeVars(state.data?.config?.theme, theme)}>{children}</div></AppDataCtx.Provider>;
}

/* ---------------- Context: theme, toast, add-money sheet ---------------- */
export const useAV = () => useContext(AVCtx);

export function AVProvider({ children }) {
  const [theme, setThemeState] = useState(() => { try { return localStorage.getItem('av-theme') || 'light'; } catch { return 'light'; } });
  const [toastState, setToastState] = useState({ msg: '', show: false, type: 'info' });
  const [sheet, setSheet] = useState({ open: false, msg: '', onDone: null });
  const tt = useRef();

  const setTheme = useCallback((th) => {
    setThemeState(th);
    try { localStorage.setItem('av-theme', th); } catch { /* storage unavailable */ }
  }, []);
  const toast = useCallback((msg, type = 'info') => {
    setToastState({ msg, show: true, type });
    clearTimeout(tt.current);
    tt.current = setTimeout(() => setToastState((t) => ({ ...t, show: false })), 2400);
  }, []);
  const openSheet = useCallback((msg, onDone) => setSheet({ open: true, msg: msg || 'Recharge once, chat or call any astrologer instantly.', onDone: onDone || null }), []);
  const closeSheet = useCallback(() => setSheet((s) => ({ ...s, open: false })), []);

  const value = useMemo(() => ({ theme, setTheme, toast, toastState, sheet, openSheet, closeSheet }), [theme, setTheme, toast, toastState, sheet, openSheet, closeSheet]);
  return (
    <AVCtx.Provider value={value}>
      <ToastCtx.Provider value={toast}>
        <div className="av-root" data-theme={theme}>
          <div className="av-page">
            <div className="av-demo-switch" role="group" aria-label="Theme">
              <button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')}>Light</button>
              <button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')}>Dark</button>
            </div>
            {children}
          </div>
        </div>
      </ToastCtx.Provider>
    </AVCtx.Provider>
  );
}

/* ---------------- Add-money sheet ---------------- */
function Sheet() {
  const { sheet, closeSheet, toast } = useAV();
  const auth = userAuth.useAuth();
  const { data: appData } = useAppData();
  const packs = appData?.wallet?.packs?.length ? appData.wallet.packs : [100, 200, 500];
  const popular = appData?.wallet?.popular ?? packs[1] ?? packs[0];
  const [amt, setAmt] = useState(popular);
  useEffect(() => { setAmt(popular); }, [popular]);
  const [busy, setBusy] = useState(false);
  // Same breakdown the server charges: wallet credit + GST + convenience fee (Admin > Pricing & Fees).
  const w = appData?.wallet || {};
  const pay_ = appData?.payments || { online: true, methods: ['UPI'] };
  const methods = pay_.methods || [];
  const [method, setMethod] = useState(methods[0] || 'UPI');
  useEffect(() => { if (methods.length && !methods.includes(method)) setMethod(methods[0]); }, [methods.join(), method]); // eslint-disable-line react-hooks/exhaustive-deps
  const gst = Math.round(amt * (w.gstPct || 0)) / 100, fee = Math.round(amt * (w.feePct || 0)) / 100;
  const total = Math.round((amt + gst + fee) * 100) / 100;
  const pay = async () => {
    if (!auth?.me) return;
    setBusy(true);
    try {
      const r = await api.user.post('/user/wallet/recharge', { amount: amt, method });
      auth.setMe((m) => ({ ...m, walletBalance: r.balance }));
      closeSheet();
      toast(`${inr(amt)} added to wallet`);
      const done = sheet.onDone;
      if (done) setTimeout(() => done(r.balance), 350);
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <>
      <div className={`av-sheet-bg${sheet.open ? ' show' : ''}`} onClick={closeSheet} />
      <div className={`av-sheet${sheet.open ? ' show' : ''}`} role="dialog" aria-label="Add money" aria-hidden={!sheet.open}>
        <div className="av-handle" />
        <h3>Add money to wallet</h3>
        <p>{sheet.msg}</p>
        <div className="av-amts">
          {packs.map((v) => (
            <button key={v} className={`av-amt${amt === v ? ' on' : ''}`} onClick={() => { setAmt(v); vibrate(); }}>
              {v === popular && <span className="av-pop">POPULAR</span>}₹{v}
            </button>
          ))}
        </div>
        {(gst > 0 || fee > 0) && (
          <div className="av-breakup">
            <span><small>Wallet credit</small>₹{amt}</span>
            {gst > 0 && <span><small>GST {w.gstPct}%</small>+ ₹{gst}</span>}
            {fee > 0 && <span><small>Fee {w.feePct}%</small>+ ₹{fee}</span>}
            <span className="tot"><small>You pay</small>₹{total}</span>
          </div>
        )}
        {pay_.online && methods.length > 1 && (
          <div className="av-methods" role="radiogroup" aria-label="Payment method">
            {methods.map((m) => <button key={m} type="button" role="radio" aria-checked={method === m} className={method === m ? 'on' : ''} onClick={() => setMethod(m)}>{m}</button>)}
          </div>
        )}
        {pay_.online ? (
          <>
            <button className="av-btn-gold" disabled={busy} onClick={pay}>{busy ? 'Processing…' : total > amt ? `Pay ₹${total}` : `Add ₹${amt}`}</button>
            <p className="av-note">Test mode: payments are simulated until a gateway is connected.</p>
          </>
        ) : <p className="av-note av-note-warn">Online payments are paused right now. Please try again in a little while.</p>}
      </div>
    </>
  );
}

/* ---------------- Phone frame ---------------- */
export function Phone({ children, nav, bare = false, scrollRef: externalRef }) {
  const { toastState } = useAV();
  const innerRef = useRef(null);
  const scrollRef = externalRef || innerRef;
  return (
    <div className="av-phone">
      <main className={`av-scroll${bare ? ' av-bare' : ''}`} ref={scrollRef}>{children}</main>
      {nav}
      <Sheet />
      <div className={`av-toast${toastState.show ? ' show' : ''}${toastState.type === 'error' ? ' error' : ''}`} role="status">{toastState.msg}</div>
    </div>
  );
}
