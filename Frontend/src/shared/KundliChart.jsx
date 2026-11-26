import { useState } from 'react';
import { SIGN_SYMBOL } from '../lib/api.js';

const ABBR = { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke' };

// North Indian: fixed houses (diamond), sign numbers rotate with lagna.
// Each house: [label x, label y (planets), sign-number x, y]
const NORTH = [
  [200, 90, 200, 30], [100, 40, 110, 20], [40, 100, 20, 110], [100, 200, 70, 200],
  [40, 300, 20, 290], [100, 360, 110, 380], [200, 310, 200, 370], [300, 360, 290, 380],
  [360, 300, 380, 290], [300, 200, 330, 200], [360, 100, 380, 110], [300, 40, 290, 20],
];

function North({ kundli }) {
  const lagna = kundli.ascendant.signIndex;
  return (
    <svg viewBox="0 0 400 400" className="w-full">
      <rect x="2" y="2" width="396" height="396" fill="#fffbeb" stroke="#92400e" strokeWidth="2.5" rx="6" />
      <path d="M2 2L398 398M398 2L2 398M200 2L2 200L200 398L398 200Z" stroke="#92400e" strokeWidth="1.8" fill="none" />
      {kundli.houses.map((h, i) => {
        const [px, py, sx, sy] = NORTH[i];
        return (
          <g key={h.house}>
            <text x={sx} y={sy} textAnchor="middle" fontSize="13" fill="#b45309" fontWeight="700">{h.signIndex + 1}</text>
            {h.planets.map((p, j) => (
              <text key={p} x={px} y={py + (j - (h.planets.length - 1) / 2) * 16 + 4} textAnchor="middle" fontSize="14" fontWeight="700" fill="#7c2d12">{ABBR[p]}</text>
            ))}
          </g>
        );
      })}
      <text x="200" y="165" textAnchor="middle" fontSize="11" fill="#92400e" opacity=".7">Lagna: {kundli.ascendant.sign}</text>
      {lagna === undefined && null}
    </svg>
  );
}

// South Indian: fixed signs (4x4 grid, centre empty), lagna marked.
const SOUTH_POS = [[1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [0, 3], [0, 2], [0, 1], [0, 0]]; // Aries..Pisces -> [col,row]

function South({ kundli }) {
  const size = 100;
  return (
    <svg viewBox="0 0 400 400" className="w-full">
      <rect x="2" y="2" width="396" height="396" fill="#fffbeb" stroke="#92400e" strokeWidth="2.5" rx="6" />
      {SOUTH_POS.map(([c, r], s) => {
        const ps = kundli.planets.filter((p) => p.signIndex === s);
        const isLagna = kundli.ascendant.signIndex === s;
        return (
          <g key={s}>
            <rect x={c * size} y={r * size} width={size} height={size} fill={isLagna ? '#ffedd5' : 'none'} stroke="#92400e" strokeWidth="1.5" />
            {isLagna && <line x1={c * size} y1={r * size} x2={c * size + 24} y2={r * size} stroke="#c2410c" strokeWidth="3" />}
            <text x={c * size + 6} y={r * size + 14} fontSize="11" fill="#b45309">{SIGN_SYMBOL[s]}{isLagna ? ' Asc' : ''}</text>
            {ps.map((p, j) => (
              <text key={p.name} x={c * size + 8 + (j % 2) * 44} y={r * size + 38 + Math.floor(j / 2) * 18} fontSize="14" fontWeight="700" fill="#7c2d12">{ABBR[p.name]}</text>
            ))}
          </g>
        );
      })}
      <text x="200" y="205" textAnchor="middle" fontSize="15" fill="#92400e" fontWeight="700">Rashi Chart</text>
    </svg>
  );
}

export default function KundliChart({ kundli }) {
  const [style, setStyle] = useState('north');
  return (
    <div>
      <div className="mb-3 inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
        {[['north', 'North Indian'], ['south', 'South Indian']].map(([k, l]) => (
          <button key={k} onClick={() => setStyle(k)} className={`rounded-lg px-3 py-1.5 transition ${style === k ? 'bg-white text-brand-700 shadow' : 'text-slate-500'}`}>{l}</button>
        ))}
      </div>
      <div className="mx-auto max-w-sm">{style === 'north' ? <North kundli={kundli} /> : <South kundli={kundli} />}</div>
    </div>
  );
}
