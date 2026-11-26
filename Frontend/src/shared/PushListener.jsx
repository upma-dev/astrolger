import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { enablePush, onPushMessage } from '../lib/push.js';
import { playAlert } from './sound.js';
import { useToast } from './ui.jsx';

/* Mount once inside an app (inside its ToastProvider) after login.
   - registers this browser for Firebase push for `role`
   - push arriving while the app is open: plays the sound (3-second ring for requests) and shows a toast
   - tapping a system notification opens the right screen */
export default function PushListener({ role, enabled = true }) {
  const toast = useToast();
  const nav = useNavigate();

  useEffect(() => (enabled ? enablePush(role) : undefined), [role, enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    return onPushMessage((m) => {
      if (m.type === 'astro:navigate') { if (m.link?.startsWith('/')) nav(m.link); return; }
      if (m.role && m.role !== role) return;
      playAlert(m.kind, m.data?.key || m.tag);
      // Requests, chats and support replies already show up live on screen through the socket.
      const shownLive = /^(request|chat|session|ticket)-/.test(m.tag || '');
      if (m.foreground && !shownLive) toast?.(m.body ? `${m.title}: ${m.body}` : m.title, 'info');
    });
  }, [role, enabled, toast, nav]);

  return null;
}
