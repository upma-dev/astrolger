import { useEffect, useRef } from 'react';
import { connectSocket } from './api.js';

// Single shared guest socket bus for the whole tab so mounting multiple live hooks
// (or React StrictMode double-mounts) never opens duplicate sockets or spams reloads.
const bus = { sock: null, subs: new Set(), closeTimer: null, hiddenAt: 0, hadConnect: false, cleanup: null };

function emitAll(what) {
  bus.subs.forEach((fn) => fn(what));
}

function attachBus() {
  if (bus.sock) return;
  const s = connectSocket(null);
  bus.sock = s;
  bus.hadConnect = false;
  bus.hiddenAt = 0;

  s.on('connect', () => {
    if (bus.hadConnect) emitAll('focus');
    bus.hadConnect = true;
  });
  s.on('platform:updated', (e) => emitAll(e?.what));

  const vis = () => {
    if (document.visibilityState === 'hidden') {
      bus.hiddenAt = Date.now();
      return;
    }
    if (document.visibilityState === 'visible') {
      const sleptLong = bus.hiddenAt > 0 && Date.now() - bus.hiddenAt > 60_000;
      bus.hiddenAt = 0;
      if (!s.connected || sleptLong) emitAll('focus');
    }
  };
  const maint = () => emitAll('system');
  document.addEventListener('visibilitychange', vis);
  window.addEventListener('astro:maintenance', maint);

  bus.cleanup = () => {
    s.disconnect();
    document.removeEventListener('visibilitychange', vis);
    window.removeEventListener('astro:maintenance', maint);
    bus.sock = null;
    bus.cleanup = null;
    bus.hadConnect = false;
  };
}

/* Real-time settings: the server emits "platform:updated" whenever the admin saves pricing, theme,
   announcement, system switches, posters etc. Every open app calls `onUpdate(what)` and reloads.
   Also refreshes when returning after a long background pause/disconnect, or on maintenance. */
export function usePlatformLive(onUpdate) {
  const cb = useRef(onUpdate);
  cb.current = onUpdate;
  useEffect(() => {
    clearTimeout(bus.closeTimer);
    bus.closeTimer = null;
    attachBus();

    let t;
    const fire = (what) => { clearTimeout(t); t = setTimeout(() => cb.current?.(what), 150); };
    bus.subs.add(fire);

    return () => {
      clearTimeout(t);
      bus.subs.delete(fire);
      if (bus.subs.size === 0) {
        bus.closeTimer = setTimeout(() => {
          if (bus.subs.size === 0) bus.cleanup?.();
        }, 200);
      }
    };
  }, []);
}
