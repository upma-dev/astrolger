/* Service worker for Firebase push notifications (customer app, astrologer app and admin panel).
   Firebase delivers data-only messages here. If that app is open and in front, the page shows the
   alert itself (toast + sound). Otherwise a system notification is shown; an open background tab is
   still asked to play the sound (3-second ring for requests). */

const APP_PATH = { user: '/user', astrologer: '/vendor', admin: '/admin' };

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let msg = {};
  try { msg = event.data ? event.data.json() : {}; } catch { msg = { data: { title: 'Notification', body: event.data?.text() || '' } }; }
  const d = msg.data || {};
  const n = msg.notification || {};
  const title = d.title || n.title || 'AstroVani';
  const body = d.body || n.body || '';
  const kind = d.kind || 'info';
  const link = d.link || '/';
  const base = APP_PATH[d.role] || '/';

  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const mine = all.filter((c) => new URL(c.url).pathname.startsWith(base));
    const front = mine.find((c) => c.focused && c.visibilityState === 'visible');
    const payload = { type: 'astro:push', title, body, kind, link, tag: d.tag || kind, role: d.role, data: d };
    if (front) { front.postMessage({ ...payload, foreground: true }); return; }
    // App open in a background tab: let it play the ring/chat sound.
    mine.forEach((c) => c.postMessage({ ...payload, foreground: false }));
    await self.registration.showNotification(title, {
      body,
      tag: d.tag || kind,
      renotify: true,
      requireInteraction: kind === 'request',
      silent: false,
      vibrate: kind === 'request' ? [500, 200, 500, 200, 500, 200, 500] : [200],
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { link },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';
  event.waitUntil((async () => {
    const url = new URL(link, self.location.origin).href;
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const path = new URL(url).pathname.split('/')[1];
    const same = all.find((c) => new URL(c.url).pathname.split('/')[1] === path) || all[0];
    if (same) {
      await same.focus();
      same.postMessage({ type: 'astro:navigate', link });
      return;
    }
    await self.clients.openWindow(url);
  })());
});
