import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, connectSocket } from '../../lib/api.js';
import { vendorAuth } from '../../lib/auth.jsx';
import { useToast } from '../../shared/ui.jsx';
import { playAlert } from '../../shared/sound.js';

const VendorRequestsCtx = createContext({
  requests: [],
  loading: false,
  version: 0,
  busyId: '',
  reload: async () => [],
  accept: async () => {},
  reject: async () => {},
});

export const useVendorRequests = () => useContext(VendorRequestsCtx);


const requestLabel = (type) => (type === 'audio' ? 'audio call' : type === 'video' ? 'video call' : 'chat');

/**
 * Keeps incoming consultation requests synchronized across the entire vendor app
 * via the authenticated astrologer socket room (`astro:<id>`) plus background polling.
 */
export function VendorRequestsProvider({ children }) {
  const { me } = vendorAuth.useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [version, setVersion] = useState(0);
  const seenRef = useRef(null);
  const sigRef = useRef('');
  const loadedRef = useRef(false);
  const inFlightRef = useRef(null);
  const forceBumpRef = useRef(false);

  const notifyNew = useCallback((list) => {
    const nextIds = new Set(list.map((r) => String(r._id)));
    if (seenRef.current !== null) {
      const fresh = list.filter((r) => !seenRef.current.has(String(r._id)));
      if (fresh.length) {
        const first = fresh[0];
        toast(`New ${requestLabel(first.type)} request from ${first.user?.name || 'a user'}`, 'info');
        playAlert('request', `request-${first._id}`); // 3-second ring (same key as the push, so it rings once)
      }
    }
    seenRef.current = nextIds;
  }, [toast]);

  const reload = useCallback(({ silent = false, bump = false } = {}) => {
    if (!me?._id) return Promise.resolve([]);
    if (bump) forceBumpRef.current = true;
    if (inFlightRef.current) return inFlightRef.current;
    if (!silent && !loadedRef.current) setLoading(true);
    const p = api.vendor.get('/astrologer/requests')
      .then((list) => {
        const safe = Array.isArray(list) ? list : [];
        setRequests(safe);
        notifyNew(safe);
        const sig = safe.map((x) => `${x._id}:${x.status}`).join(',');
        const shouldBump = forceBumpRef.current || sig !== sigRef.current;
        forceBumpRef.current = false;
        if (sig !== sigRef.current) sigRef.current = sig;
        if (shouldBump) setVersion((v) => v + 1);
        loadedRef.current = true;
        return safe;
      })
      .catch(() => {
        forceBumpRef.current = false;
        return [];
      })
      .finally(() => {
        setLoading(false);
        if (inFlightRef.current === p) inFlightRef.current = null;
      });
    inFlightRef.current = p;
    return p;
  }, [me?._id, notifyNew]);

  useEffect(() => {
    if (!me?._id) {
      setRequests([]);
      setLoading(false);
      seenRef.current = null;
      sigRef.current = '';
      loadedRef.current = false;
      inFlightRef.current = null;
      forceBumpRef.current = false;
      return undefined;
    }
    seenRef.current = null;
    sigRef.current = '';
    loadedRef.current = false;
    reload();

    const s = connectSocket('astrologer');
    let hadConnect = false;
    let syncTimer = null;
    const scheduleSync = (bump = false) => {
      if (bump) forceBumpRef.current = true;
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => reload({ silent: true }), 120);
    };
    s.on('connect', () => {
      if (hadConnect) reload({ silent: true });
      hadConnect = true;
    });
    s.on('queue:refresh', () => scheduleSync(false));
    s.on('session:update', () => scheduleSync(true));
    s.on('session:request', (item) => {
      if (item?._id) {
        setRequests((prev) => {
          const next = prev.some((x) => String(x._id) === String(item._id)) ? prev : [...prev, item];
          notifyNew(next);
          return next;
        });
      }
      scheduleSync(false);
    });

    // Fallback poll only when the socket is disconnected and the tab is visible.
    const poll = setInterval(() => {
      if (document.hidden || s.connected) return;
      reload({ silent: true });
    }, 10000);
    const onVis = () => {
      if (document.visibilityState === 'visible' && !s.connected) reload({ silent: true });
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      clearTimeout(syncTimer);
      s.close();
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [me?._id, reload, notifyNew]);

  const accept = useCallback(async (r) => {
    setBusyId(r._id);
    try {
      await api.vendor.post(`/astrologer/sessions/${r._id}/accept`);
      setRequests((prev) => prev.filter((x) => String(x._id) !== String(r._id)));
      setVersion((v) => v + 1);
      nav(`/vendor/session/${r._id}`);
    } catch (e) {
      toast(e.message, 'error');
      reload({ silent: true });
    } finally {
      setBusyId('');
    }
  }, [nav, toast, reload]);

  const reject = useCallback(async (r) => {
    setBusyId(r._id);
    try {
      await api.vendor.post(`/astrologer/sessions/${r._id}/reject`);
      setRequests((prev) => prev.filter((x) => String(x._id) !== String(r._id)));
      setVersion((v) => v + 1);
    } catch (e) {
      toast(e.message, 'error');
      reload({ silent: true });
    } finally {
      setBusyId('');
    }
  }, [toast, reload]);

  const value = useMemo(
    () => ({ requests, loading, version, busyId, reload, accept, reject }),
    [requests, loading, version, busyId, reload, accept, reject],
  );

  return <VendorRequestsCtx.Provider value={value}>{children}</VendorRequestsCtx.Provider>;
}
