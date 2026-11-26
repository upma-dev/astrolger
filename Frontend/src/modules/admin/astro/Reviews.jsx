import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Trash2 } from 'lucide-react';
import { api, fmtDate } from '../../../lib/api.js';
import { Button, PageLoader, useAsync, useToast } from '../../../shared/ui.jsx';
import { InfoGrid, Panel, Pills, Table } from '../kit.jsx';

export default function Reviews() {
  const toast = useToast();
  const [rating, setRating] = useState('');
  const { data, loading, reload } = useAsync(() => api.admin.get('/admin/reviews', { rating }), [rating]);
  const { data: astros } = useAsync(() => api.admin.get('/admin/astrologers-list', { status: 'approved', sort: 'rating' }));
  const del = async (r) => { if (!window.confirm('Delete this review? The astrologer rating is recalculated.')) return; try { await api.admin.del(`/admin/reviews/${r._id}`); toast('Review deleted', 'success'); reload(); } catch (e) { toast(e.message, 'error'); } };
  const rows = data || [];
  const avg = rows.length ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(2) : '—';
  return (
    <div className="space-y-5">
      <InfoGrid cols={3} items={[['Reviews shown', rows.length], ['Average of these', avg], ['Low ratings (1-2 stars)', rows.filter((r) => r.rating <= 2).length]]} />
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Panel title="All reviews from users" action={<Pills value={rating} onChange={setRating} options={[['', 'All'], ['5', '5 Stars'], ['4', '4 Stars'], ['3', '3 Stars'], ['2', '2 Stars'], ['1', '1 Star']]} />}>
          {loading && !data ? <PageLoader variant="table" /> : <Table rows={rows} empty="No reviews yet. They appear after users rate a consultation." cols={[
            { h: 'Date', cell: (r) => fmtDate(r.createdAt) },
            { h: 'Astrologer', cell: (r) => r.astrologer ? <Link to={`/admin/astro/view/${r.astrologer._id}`} className="font-semibold text-brand-700 hover:underline">{r.astrologer.name}</Link> : '—' },
            { h: 'User', cell: (r) => r.user ? <Link to={`/admin/users/view/${r.user._id}`} className="hover:underline">{r.user.name || r.user.phone}</Link> : '—' },
            { h: 'Rating', cell: (r) => <span className="flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={13} className={n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />)}</span> },
            { h: 'Comment', cell: (r) => <span className="text-xs text-slate-600">{r.comment || '—'}</span> },
            { h: '', right: true, cell: (r) => <Button size="sm" variant="danger" onClick={() => del(r)}><Trash2 size={13} /></Button> },
          ]} />}
        </Panel>
        <Panel title="Rating leaderboard">
          <Table rows={(astros || []).filter((a) => a.ratingCount)} empty="No rated astrologers yet" cols={[
            { h: 'Astrologer', cell: (a) => <Link to={`/admin/astro/view/${a._id}`} className="font-semibold text-slate-900 hover:text-brand-700">{a.name}</Link> },
            { h: 'Rating', right: true, cell: (a) => <span className="inline-flex items-center gap-1"><Star size={13} className="fill-amber-400 text-amber-400" />{a.rating.toFixed(2)} <span className="text-xs text-slate-400">({a.ratingCount})</span></span> },
          ]} />
        </Panel>
      </div>
    </div>
  );
}
