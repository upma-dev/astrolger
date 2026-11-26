import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from './api.js';
import { disablePush } from './push.js';

// One auth context per role (user / astrologer / admin) so sessions never mix.
export function makeAuth(role, apiRole, mePath) {
  const Ctx = createContext(null);

  function Provider({ children }) {
    const [me, setMe] = useState(null);
    const [loading, setLoading] = useState(!!getToken(role));

    const refresh = useCallback(async () => {
      if (!getToken(role)) { setMe(null); setLoading(false); return null; }
      try { const m = await api[apiRole].get(mePath); setMe(m); return m; } catch { setMe(null); return null; } finally { setLoading(false); }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);
    useEffect(() => {
      const h = (e) => e.detail === role && setMe(null);
      window.addEventListener('astro:logout', h);
      return () => window.removeEventListener('astro:logout', h);
    }, []);

    const value = useMemo(() => ({
      me, loading, refresh, setMe,
      login: (token, profile) => { setToken(role, token); setMe(profile); },
      logout: () => { disablePush(role); setToken(role, null); setMe(null); },
    }), [me, loading, refresh]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
  }
  return { Provider, useAuth: () => useContext(Ctx) };
}

export const userAuth = makeAuth('user', 'user', '/user/me');
export const vendorAuth = makeAuth('astrologer', 'vendor', '/astrologer/me');
export const adminAuth = makeAuth('admin', 'admin', '/admin/me');
