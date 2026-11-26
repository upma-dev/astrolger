import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';

/* Message strip at the top of an app / the website. Configured in Admin > Global > Announcement bar.
   mode: scroll = ticker that moves right-to-left, rotate = one message at a time, static = first message only.
   `storageKey` remembers a dismiss per message set, so a new message shows again. */

const isExternal = (l = '') => /^https?:\/\//.test(l);
const SCROLL_SEC = [0, 40, 30, 22, 15, 9]; // speed 1..5 -> seconds per loop
const ROTATE_SEC = [0, 7, 5.5, 4, 3, 2];

export default function AnnouncementBar({ cfg, storageKey = 'ann', onNavigate, preview = false, className = '' }) {
  const msgs = (cfg?.messages || []).filter((m) => m.text);
  const sig = `${storageKey}:${msgs.map((m) => m.text).join('|')}`;
  const [hidden, setHidden] = useState(() => { if (preview) return false; try { return sessionStorage.getItem(sig) === '1'; } catch { return false; } });
  const [i, setI] = useState(0);
  useEffect(() => { if (!preview) { try { setHidden(sessionStorage.getItem(sig) === '1'); } catch { /* storage unavailable */ } } }, [sig, preview]);
  useEffect(() => {
    setI(0);
    if (cfg?.mode !== 'rotate' || msgs.length < 2) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % msgs.length), ROTATE_SEC[cfg.speed || 3] * 1000);
    return () => clearInterval(t);
  }, [cfg?.mode, cfg?.speed, msgs.length]);

  if (!cfg?.show || !msgs.length || hidden) return null;

  const go = (link) => {
    if (!link || preview) return;
    if (isExternal(link)) window.open(link, '_blank', 'noopener');
    else if (onNavigate) onNavigate(link);
    else window.location.assign(link);
  };
  const item = (m, k) => (
    <span key={k} onClick={() => go(m.link)} className={m.link ? 'cursor-pointer underline-offset-2 hover:underline' : ''} role={m.link ? 'link' : undefined}>
      {m.text}
    </span>
  );
  const dismiss = () => { setHidden(true); try { sessionStorage.setItem(sig, '1'); } catch { /* storage unavailable */ } };

  return (
    <div className={`ann-bar relative flex items-center overflow-hidden text-[12.5px] font-semibold leading-none ${className}`} style={{ background: cfg.bg, color: cfg.color }} role="status">
      <div className="min-w-0 flex-1 overflow-hidden py-2">
        {cfg.mode === 'scroll' ? (
          <div className="ann-track flex w-max whitespace-nowrap" style={{ animationDuration: `${SCROLL_SEC[cfg.speed || 3] * Math.max(1, msgs.length * 0.6)}s` }}>
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
                {msgs.map((m, k) => <span key={k} className="flex items-center">{item(m, k)}<Sparkles size={11} className="mx-6 opacity-60" aria-hidden="true" /></span>)}
              </div>
            ))}
          </div>
        ) : (
          <div key={i} className="ann-fade truncate px-3 text-center">{item(cfg.mode === 'rotate' ? msgs[i % msgs.length] : msgs[0], i)}</div>
        )}
      </div>
      {cfg.dismissible && (
        <button type="button" onClick={dismiss} aria-label="Close announcement" className="mr-1.5 shrink-0 rounded-full p-1 opacity-70 hover:opacity-100" style={{ color: cfg.color }}>
          <X size={13} />
        </button>
      )}
    </div>
  );
}
