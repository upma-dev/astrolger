import { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';
import { useToast } from '../../../shared/ui.jsx';

/* Loads the shared app config, tracks unsaved edits and saves the whole object. */
export default function useAppConfig() {
  const toast = useToast();
  const [cfg, setCfg] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.admin.get('/admin/app-config').then((c) => { setCfg(c); setSaved(c); }).catch((e) => toast(e.message, 'error')); }, [toast]);
  const dirty = !!cfg && JSON.stringify(cfg) !== JSON.stringify(saved);
  const save = async () => {
    setBusy(true);
    try { const c = await api.admin.put('/admin/app-config', cfg); setCfg(c); setSaved(c); toast('Saved. Live now.', 'success'); } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return { cfg, setCfg, dirty, save, busy };
}
