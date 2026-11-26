import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { Icon } from './av.jsx';

/* Birth-place search. Picks real coordinates + timezone from the API so Kundli and Rashi are computed correctly.
   value: { pob, lat, lon, tz }   onChange(nextValue) */
export default function PlaceSearch({ value, onChange, autoFocus, onFocus, label = 'Place of birth' }) {
  const [q, setQ] = useState(value?.pob || '');
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('idle'); // idle | loading | error | empty
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');
  const seq = useRef(0);
  const picked = value?.pob && value?.lat != null && value?.tz && q === value.pob;

  useEffect(() => { setQ(value?.pob || ''); }, [value?.pob]);
  useEffect(() => {
    const term = q.trim();
    if (picked || term.length < 2) { setRows([]); setState('idle'); return undefined; }
    const id = ++seq.current;
    setState('loading');
    const t = setTimeout(async () => {
      try {
        const r = await api.public.get('/public/places', { q: term });
        if (id !== seq.current) return;
        setRows(r); setState(r.length ? 'idle' : 'empty'); setOpen(true);
      } catch (e) { if (id === seq.current) { setErr(e.message); setState('error'); } }
    }, 300);
    return () => clearTimeout(t);
  }, [q, picked]);

  const choose = (p) => { onChange({ ...value, pob: p.label, lat: p.lat, lon: p.lon, tz: p.tz }); setQ(p.label); setOpen(false); setRows([]); };

  return (
    <div className="av-place">
      {label && <span className="av-place-l">{label}</span>}
      <div className={`av-place-box${picked ? ' ok' : ''}`}>
        <Icon n={picked ? 'star' : 'search'} s={16} />
        <input value={q} autoFocus={autoFocus} placeholder="Type your city or town" aria-label={label} autoComplete="off"
          onFocus={(e) => { setOpen(true); onFocus?.(e); }} onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => { setQ(e.target.value); if (value?.lat != null) onChange({ ...value, pob: e.target.value, lat: null, lon: null, tz: null }); }} />
        {state === 'loading' && <span className="av-place-spin" aria-label="Searching" />}
      </div>
      {open && rows.length > 0 && (
        <ul className="av-place-list" role="listbox">
          {rows.map((p) => (
            <li key={`${p.lat},${p.lon}`}><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(p)}>
              <b>{p.name}</b><small>{[p.region, p.country].filter(Boolean).join(', ')}</small>
            </button></li>
          ))}
        </ul>
      )}
      {picked && <p className="av-place-meta">{Math.abs(value.lat).toFixed(2)}°{value.lat >= 0 ? 'N' : 'S'}, {Math.abs(value.lon).toFixed(2)}°{value.lon >= 0 ? 'E' : 'W'} · {value.tz}</p>}
      {state === 'empty' && <p className="av-place-meta">No place found. Try the nearest bigger town.</p>}
      {state === 'error' && <p className="av-place-meta err">{err}</p>}
    </div>
  );
}
