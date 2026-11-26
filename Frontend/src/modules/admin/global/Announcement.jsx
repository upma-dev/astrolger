import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Plus, Save, Trash2, ArrowUp, ArrowDown, Smartphone, Sparkles, Globe2 } from 'lucide-react';
import { Button, Field, PageLoader, cx } from '../../../shared/ui.jsx';
import AnnouncementBar from '../../../shared/AnnouncementBar.jsx';
import { Panel } from '../kit.jsx';
import useAppConfig from './useAppConfig.js';

/* Announcement bar: a thin message strip (ticker) at the very top of the customer app, astrologer app or website.
   e.g. "⚡ Superfast connect: talk to an astrologer in 60 seconds". Saving pushes it live instantly. */

const TARGETS = [
  ['user', 'Customer app', Smartphone],
  ['astrologer', 'Astrologer app', Sparkles],
  ['website', 'Website', Globe2],
];
const MODES = [
  ['scroll', 'Scrolling ticker', 'Messages move right to left, like a news ticker'],
  ['rotate', 'One by one', 'Shows each message in turn'],
  ['static', 'Fixed', 'First message only, no movement'],
];
const PRESETS = [
  ['Brand', '#7A2618', '#FFFFFF'], ['Gold', '#FFD27A', '#6B3A08'], ['Night', '#0F172A', '#FDE68A'],
  ['Royal', '#3B1F7A', '#FFFFFF'], ['Green', '#0B3B2E', '#D1FAE5'], ['Red alert', '#B91C1C', '#FFFFFF'],
];
const SAMPLES = ['Superfast connect: talk to a verified astrologer in under 60 seconds', 'First consultation offer for new users', '100% private & secure chats', 'Today\'s Panchang is live, check your auspicious time'];
const move = (arr, i, d) => { const a = [...arr]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; };

export default function Announcement() {
  const { target: raw } = useParams();
  const nav = useNavigate();
  // Stay in the section the admin came from (Astrologers / Users / Global).
  const base = useLocation().pathname.split('/announcement')[0];
  const target = TARGETS.some(([k]) => k === raw) ? raw : 'user';
  const { cfg, setCfg, dirty, save, busy } = useAppConfig();
  if (!cfg) return <PageLoader variant="form" />;
  const a = cfg.announcement[target];
  const set = (patch) => setCfg({ ...cfg, announcement: { ...cfg.announcement, [target]: { ...a, ...patch } } });
  const setMsg = (i, patch) => set({ messages: a.messages.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  const linkHint = target === 'user' ? 'e.g. /user/astrologers or https://…' : target === 'astrologer' ? 'e.g. /vendor/earnings or https://…' : 'e.g. /user or https://…';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Customization</p>
          <h2 className="text-xl font-bold text-slate-900">Announcement bar</h2>
          <p className="text-sm text-slate-500">A message strip at the top of the screen. Goes live in open apps the moment you save.</p>
        </div>
        <Button onClick={save} loading={busy} disabled={!dirty}><Save size={14} /> {dirty ? 'Save & publish' : 'Saved'}</Button>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
        {TARGETS.map(([k, l, I]) => (
          <button key={k} type="button" onClick={() => nav(`${base}/announcement/${k}`)} className={cx('flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition', target === k ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}>
            <I size={15} />{l}
            <span className={cx('h-2 w-2 rounded-full', cfg.announcement[k].show ? 'bg-emerald-400' : 'bg-slate-300')} />
          </button>
        ))}
      </div>

      {/* live preview */}
      <Panel title="Preview">
        <div className="space-y-3 bg-slate-50 p-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <AnnouncementBar cfg={{ ...a, show: true }} preview />
            <div className="flex items-center justify-between px-4 py-3"><span className="text-sm font-bold text-slate-800">{cfg.brand?.name || 'AstroVani'}{target === 'astrologer' && ' Pro'}</span><span className="h-6 w-20 rounded-full bg-slate-100" /></div>
          </div>
          {!a.show && <p className="text-center text-xs font-semibold text-amber-700">The bar is switched off for the {TARGETS.find(([k]) => k === target)[1].toLowerCase()}. Turn it on below to show it.</p>}
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Panel title="Messages" action={<Button size="sm" variant="outline" disabled={a.messages.length >= 5} onClick={() => set({ messages: [...a.messages, { text: '', link: '' }] })}><Plus size={14} /> Add message</Button>}>
          <div className="space-y-3 p-4">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
              <span><span className="block text-sm font-bold text-slate-900">Show announcement bar</span><span className="text-xs text-slate-500">On the {TARGETS.find(([k]) => k === target)[1].toLowerCase()}</span></span>
              <button type="button" role="switch" aria-checked={a.show} onClick={() => set({ show: !a.show })} className={cx('relative h-7 w-[52px] shrink-0 rounded-full transition', a.show ? 'bg-emerald-500' : 'bg-slate-300')}>
                <span className={cx('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all', a.show ? 'left-[26px]' : 'left-0.5')} />
              </button>
            </label>
            {a.messages.map((m, i) => (
              <div key={i} className="grid items-end gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_220px_auto]">
                <Field label={`Message ${i + 1}`} value={m.text} maxLength={160} onChange={(e) => setMsg(i, { text: e.target.value })} placeholder="Superfast connect in 60 seconds" />
                <Field label="Link (optional)" value={m.link} maxLength={300} onChange={(e) => setMsg(i, { link: e.target.value })} placeholder={linkHint} />
                <div className="flex gap-0.5 pb-1">
                  <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30" disabled={i === 0} onClick={() => set({ messages: move(a.messages, i, -1) })} aria-label="Move up"><ArrowUp size={15} /></button>
                  <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30" disabled={i === a.messages.length - 1} onClick={() => set({ messages: move(a.messages, i, 1) })} aria-label="Move down"><ArrowDown size={15} /></button>
                  <button type="button" className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" onClick={() => set({ messages: a.messages.filter((_, j) => j !== i) })} aria-label="Remove"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
            {!a.messages.length && <p className="py-4 text-center text-xs text-slate-400">No messages yet. Add one or pick a sample below.</p>}
            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-500">Quick samples</p>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLES.map((t) => <button key={t} type="button" disabled={a.messages.length >= 5} onClick={() => set({ messages: [...a.messages, { text: t, link: '' }] })} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-40">+ {t}</button>)}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Style">
          <div className="space-y-4 p-4">
            <div className="space-y-1.5">
              {MODES.map(([k, l, h]) => (
                <button key={k} type="button" onClick={() => set({ mode: k })} className={cx('block w-full rounded-xl border p-2.5 text-left', a.mode === k ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:bg-slate-50')}>
                  <span className="block text-sm font-semibold text-slate-800">{l}</span><span className="text-[11px] text-slate-500">{h}</span>
                </button>
              ))}
            </div>
            {a.mode !== 'static' && (
              <label className="block">
                <span className="mb-1 flex justify-between text-xs font-semibold text-slate-600"><span>Speed</span><span>{['', 'Very slow', 'Slow', 'Normal', 'Fast', 'Superfast'][a.speed]}</span></span>
                <input type="range" min={1} max={5} value={a.speed} onChange={(e) => set({ speed: +e.target.value })} className="w-full accent-brand-600" />
              </label>
            )}
            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-600">Colours</p>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {PRESETS.map(([n, bg, color]) => (
                  <button key={n} type="button" onClick={() => set({ bg, color })} className={cx('rounded-lg border px-2.5 py-1 text-[11px] font-bold', a.bg.toLowerCase() === bg.toLowerCase() && a.color.toLowerCase() === color.toLowerCase() ? 'ring-2 ring-brand-500 ring-offset-1' : 'border-transparent')} style={{ background: bg, color }}>{n}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[['bg', 'Background'], ['color', 'Text']].map(([k, l]) => (
                  <label key={k} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
                    <input type="color" value={a[k]} onChange={(e) => set({ [k]: e.target.value })} className="h-8 w-9 cursor-pointer rounded border-0 bg-transparent p-0" />
                    <span className="text-xs"><span className="block font-semibold text-slate-700">{l}</span><span className="font-mono uppercase text-slate-400">{a[k]}</span></span>
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={a.dismissible} onChange={(e) => set({ dismissible: e.target.checked })} /> Users can close it (comes back when the message changes)</label>
          </div>
        </Panel>
      </div>
    </div>
  );
}
