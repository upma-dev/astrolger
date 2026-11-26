import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { LogOut, History, LifeBuoy, Shield, FileText, RotateCcw, ChevronRight } from 'lucide-react';
import { api, fmtDate, inr } from '../../lib/api.js';
import { userAuth } from '../../lib/auth.jsx';
import { Badge, Button, Card, Field, Select, TextArea, statusTone, useAsync, useToast } from '../../shared/ui.jsx';
import { BirthForm, placeMissing } from './Kundli.jsx';
import { useAV } from './av.jsx';
import { useLogoutPrompt } from '../../shared/SaveLoginPrompt.jsx';
import SupportButton from '../../shared/Support.jsx';

export default function Profile() {
  const { me, setMe, logout } = userAuth.useAuth();
  const nav = useNavigate();
  // Logout asks "Save your login info?" (Instagram-style); only saved accounts show on the login screen.
  const [askLogout, logoutPrompt] = useLogoutPrompt('user', me, () => { logout(); nav('/user/login'); });
  const toast = useToast();
  const [sp] = useSearchParams();
  const [form, setForm] = useState({ name: me.name || '', gender: me.gender || '', email: me.email || '', dob: me.dob || '', tob: me.tob || '', pob: me.pob || '', lat: me.lat ?? null, lon: me.lon ?? null, tz: me.tz || null });
  const [busy, setBusy] = useState(false);
  const { data: sessions } = useAsync(() => api.user.get('/user/sessions'));
  // Support conversations (Admin > Users > Queries & support). Summary here; the full chat opens in a sheet.
  const { data: tickets } = useAsync(() => api.user.get('/user/tickets'));
  const openQueries = (tickets || []).filter((x) => x.status === 'open').length;
  const unread = (tickets || []).some((x) => x.unreadOwner);
  const { theme, setTheme } = useAV();

  const save = async (e) => {
    e.preventDefault();
    if (placeMissing(form)) return toast('Pick your birth place from the list', 'error');
    setBusy(true);
    try { setMe(await api.user.put('/user/me', form)); toast('Profile saved', 'success'); if (sp.get('welcome')) nav('/user', { replace: true }); } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 p-4">
      {sp.get('welcome') && <Card className="bg-brand-50 p-4 text-sm text-brand-800">Welcome! Add your birth details for personalised horoscope, Kundli and better astrologer readings.</Card>}
      <Card className="p-4">
        {me.zodiac && (
          <div className="mb-4 flex flex-wrap gap-1.5 text-xs">
            <Badge tone="violet">Rashi: {me.rashiCertain === false ? `${me.zodiac} (add birth time)` : me.zodiac}</Badge>
            {me.nakshatra && <Badge tone="violet">Nakshatra: {me.nakshatra}</Badge>}
            {me.lagna && <Badge tone="violet">Lagna: {me.lagna}</Badge>}
          </div>
        )}
        <h2 className="mb-3 text-sm font-bold text-slate-900">My profile {me.phone && <span className="font-normal text-slate-400">· +91 {me.phone}</span>}</h2>
        <form onSubmit={save} className="space-y-3">
          <Field label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></Select>
            <Field label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <BirthForm value={form} onChange={(v) => setForm({ ...form, ...v })} />
          <Button type="submit" loading={busy} className="w-full">Save profile</Button>
        </form>
      </Card>
      <Card className="p-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900"><History size={16} /> Consultation history</h2>
        {sessions?.length ? sessions.slice(0, 8).map((s) => (
          <div key={s._id} className="flex items-center justify-between border-t border-slate-100 py-2 text-xs first:border-0">
            <div><p className="font-semibold text-slate-800">{s.astrologer?.name}</p><p className="text-slate-400">{fmtDate(s.createdAt)} · {s.type} · {s.minutes} min</p></div>
            <div className="text-right"><Badge tone={statusTone(s.status)}>{s.status}</Badge>{s.amount > 0 && <p className="mt-0.5 font-semibold text-slate-700">{inr(s.amount)}</p>}</div>
          </div>
        )) : <p className="text-xs text-slate-400">No consultations yet.</p>}
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><LifeBuoy size={20} /></span>
          <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900">Help & support</p><p className="text-xs text-slate-500">{openQueries ? `${openQueries} open quer${openQueries > 1 ? 'ies' : 'y'}` : 'Chat with our support team'}{unread ? ' · new reply' : ''}</p></div>
          <SupportButton app="user" loggedIn className="shrink-0 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white">Open</SupportButton>
        </div>
      </Card>
      <Card className="p-4 space-y-2.5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Shield size={16} /> Legal & Policies</h2>
        <div className="divide-y divide-slate-100 text-xs">
          <Link to="/terms" className="flex items-center justify-between py-2 text-slate-700 hover:text-brand-600 transition">
            <span className="flex items-center gap-2"><FileText size={14} className="text-slate-400" /> Terms of Service</span>
            <ChevronRight size={14} className="text-slate-400" />
          </Link>
          <Link to="/privacy" className="flex items-center justify-between py-2 text-slate-700 hover:text-brand-600 transition">
            <span className="flex items-center gap-2"><Shield size={14} className="text-slate-400" /> Privacy Policy</span>
            <ChevronRight size={14} className="text-slate-400" />
          </Link>
          <Link to="/refund" className="flex items-center justify-between py-2 text-slate-700 hover:text-brand-600 transition">
            <span className="flex items-center gap-2"><RotateCcw size={14} className="text-slate-400" /> Refund & Cancellation Policy</span>
            <ChevronRight size={14} className="text-slate-400" />
          </Link>
        </div>
      </Card>

      <Card className="flex items-center justify-between p-4">
        <div><h2 className="text-sm font-bold text-slate-900">Dark mode</h2><p className="text-xs text-slate-400">Easier on the eyes at night</p></div>
        <button type="button" role="switch" aria-checked={theme === 'dark'} aria-label="Dark mode" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="relative h-7 w-12 rounded-full transition" style={{ background: theme === 'dark' ? 'var(--accent)' : 'var(--track2)' }}>
          <span className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: theme === 'dark' ? 24 : 4 }} />
        </button>
      </Card>
      <Button variant="outline" className="w-full" onClick={askLogout}><LogOut size={16} /> Logout</Button>
      {logoutPrompt}
    </div>
  );
}
