import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { usePlatformLive } from '../../lib/live.js';

/* What the admin controls for the astrologer app: on/off switch, announcement bar, rate limits and payout rules.
   Kept live: reloads the moment the admin saves (socket) or the tab comes back into view. */
const Ctx = createContext({ status: null, reload: () => {} });
export const useVendorStatus = () => useContext(Ctx);

export function VendorStatusProvider({ children }) {
  const [status, setStatus] = useState(null);
  const reload = useCallback(() => api.public.get('/public/status').then(setStatus).catch(() => {}), []);
  useEffect(() => { reload(); }, [reload]);
  usePlatformLive((what) => { if (what !== 'astrologers') reload(); });
  const value = useMemo(() => ({ status, reload }), [status, reload]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
