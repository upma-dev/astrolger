import { useEffect, useState } from 'react';
import { Bell, Send, Trash2, Users, Sparkles, Globe, Megaphone, Clock, CheckCircle2, AlertTriangle, Gift } from 'lucide-react';
import { api, fmtDate } from '../../lib/api.js';
import { Badge, Button, PageLoader, useToast, cx } from '../../shared/ui.jsx';

const TARGETS = [
  { id: 'all', label: 'All Users & Astrologers', icon: Globe, hint: 'Broadcast to everyone registered on the platform' },
  { id: 'user', label: 'Customers Only', icon: Users, hint: 'Send alert/offer to all user accounts' },
  { id: 'astrologer', label: 'Astrologers Only', icon: Sparkles, hint: 'Send guidelines, platform updates or payout info' },
];

const TYPES = [
  { id: 'broadcast', label: 'Broadcast', icon: Megaphone, tone: 'brand' },
  { id: 'offer', label: 'Special Offer', icon: Gift, tone: 'amber' },
  { id: 'system', label: 'System Alert', icon: AlertTriangle, tone: 'rose' },
];

export default function NotificationManager({ defaultTarget = 'all' }) {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    title: '',
    message: '',
    target: defaultTarget,
    type: 'broadcast',
    link: '',
  });

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await api.admin.get('/admin/notifications');
      setList(data);
    } catch (err) {
      toast(err.message || 'Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      return toast('Please enter a title and message', 'error');
    }
    try {
      setSending(true);
      await api.admin.post('/admin/notifications', form);
      toast('Notification broadcasted successfully', 'success');
      setForm({
        title: '',
        message: '',
        target: defaultTarget,
        type: 'broadcast',
        link: '',
      });
      fetchNotifications();
    } catch (err) {
      toast(err.message || 'Broadcast failed', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this notification record?')) return;
    try {
      await api.admin.del(`/admin/notifications/${id}`);
      toast('Notification deleted', 'success');
      fetchNotifications();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Bell size={20} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Notifications & Broadcast Manager</h2>
            <p className="text-xs text-slate-500">Send instant in-app alerts, push notifications and promotional broadcasts directly to users and astrologers.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Send Broadcast Form */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Megaphone size={16} className="text-brand-600" />
              <h3 className="text-sm font-bold text-slate-900">Create New Broadcast</h3>
            </div>

            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Target Audience</label>
                <div className="space-y-1.5">
                  {TARGETS.map((t) => {
                    const Icon = t.icon;
                    const selected = form.target === t.id;
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => setForm({ ...form, target: t.id })}
                        className={cx(
                          'flex w-full items-center gap-2.5 rounded-xl border p-2 text-left transition',
                          selected ? 'border-brand-500 bg-brand-50/50' : 'border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        <span className={cx('flex h-7 w-7 items-center justify-center rounded-lg', selected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500')}>
                          <Icon size={14} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 leading-tight">{t.label}</p>
                          <p className="truncate text-[10px] text-slate-400">{t.hint}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Notification Type</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {TYPES.map((tp) => (
                    <button
                      type="button"
                      key={tp.id}
                      onClick={() => setForm({ ...form, type: tp.id })}
                      className={cx(
                        'flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-semibold transition',
                        form.type === tp.id ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      <tp.icon size={12} /> {tp.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Notification Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Free Kundli Milan & Special Diwali Offer"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Message Body *</label>
                <textarea
                  rows={4}
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Write clear, engaging notification content..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Action Link (Optional)</label>
                <input
                  type="text"
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="e.g. /user/astrologers or /user/kundli"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand-500"
                />
              </div>

              <Button type="submit" loading={sending} className="w-full gap-2">
                <Send size={14} /> Send Broadcast Now
              </Button>
            </form>
          </div>
        </div>

        {/* Sent History Table */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-slate-400" />
                <h3 className="text-sm font-bold text-slate-900">Broadcast History ({list.length})</h3>
              </div>
              <span className="text-xs text-slate-400">Recent 100 alerts</span>
            </div>

            {loading ? (
              <PageLoader variant="table" />
            ) : list.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No broadcast notifications sent yet. Use the form on the left to send your first message.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {list.map((n) => (
                  <div key={n._id} className="flex items-start justify-between gap-4 py-3.5 hover:bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <span className={cx(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        n.type === 'offer' ? 'bg-amber-100 text-amber-700' : n.type === 'system' ? 'bg-rose-100 text-rose-700' : 'bg-brand-50 text-brand-600'
                      )}>
                        <Bell size={15} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-xs text-slate-900">{n.title}</p>
                          <Badge tone={n.target === 'astrologer' ? 'violet' : n.target === 'user' ? 'blue' : 'slate'}>
                            {n.target}
                          </Badge>
                          <span className="text-[10px] text-slate-400">{fmtDate(n.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">{n.message}</p>
                        {n.link && <p className="mt-1 font-mono text-[10px] text-brand-600">Link: {n.link}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(n._id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
