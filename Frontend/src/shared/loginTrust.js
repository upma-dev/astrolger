// Turns the admin's login trust badges into what is displayed. Live sources read real platform stats;
// a live badge with no data yet (e.g. 0 consultations) is hidden rather than showing a misleading number.
export const TRUST_SOURCE_LABELS = {
  astrologers: 'Live: verified astrologers',
  online: 'Live: astrologers online now',
  consultations: 'Live: completed consultations',
  rating: 'Live: average review rating',
  reviews: 'Live: number of reviews',
  custom: 'Custom text',
};

const n = (v) => Number(v).toLocaleString('en-IN');

export function resolveTrust(items = [], stats) {
  return items.map((t) => {
    let value = t.value;
    if (t.source !== 'custom') {
      if (!stats) return null;
      const v = { astrologers: stats.astrologers, online: stats.online, consultations: stats.consultations, rating: stats.reviews ? stats.rating : 0, reviews: stats.reviews }[t.source];
      if (!v) return null;
      value = t.source === 'rating' ? (+v).toFixed(1) : n(v);
    }
    return value || t.label ? { icon: t.icon, value, label: t.label } : null;
  }).filter(Boolean);
}
