import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Shield, FileText, RotateCcw, ArrowLeft, Calendar, CheckCircle2, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api.js';
import { PageLoader, cx } from '../../shared/ui.jsx';

const POLICIES = [
  { key: 'terms_of_service', label: 'Terms of Service', icon: FileText, desc: 'Rules and terms for using the platform, consultations and billing.' },
  { key: 'privacy_policy', label: 'Privacy Policy', icon: Shield, desc: 'How your birth details, Kundli charts and chat records are protected.' },
  { key: 'refund_policy', label: 'Refund & Cancellation', icon: RotateCcw, desc: 'Call drops, technical failures and recharge refund guidelines.' },
];

export default function PolicyPage({ initialKey }) {
  const { key: paramKey } = useParams();
  const nav = useNavigate();
  const [activeKey, setActiveKey] = useState(initialKey || paramKey || 'terms_of_service');
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState(null);

  useEffect(() => {
    if (paramKey && ['terms_of_service', 'privacy_policy', 'refund_policy'].includes(paramKey)) {
      setActiveKey(paramKey);
    }
  }, [paramKey]);

  useEffect(() => {
    api.public.get('/public/app').then(setApp).catch(() => {});
  }, []);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    api.public
      .get(`/public/policies/${activeKey}`)
      .then((data) => {
        if (!cancel) setPolicy(data);
      })
      .catch(() => {
        if (!cancel) {
          setPolicy({
            title: activeKey.replace(/_/g, ' ').toUpperCase(),
            content: 'Policy details will be updated shortly.',
            lastUpdated: new Date().toISOString().slice(0, 10),
          });
        }
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [activeKey]);

  const brand = app?.config?.brand || { name: 'AstroVani' };
  const logo = brand.logoUrl || '/favicon.svg';

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5 font-display text-lg font-bold text-slate-900">
            <img src={logo} alt="" className="h-7 w-7 object-contain" />
            <span>{brand.name}</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => nav(-1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <Link
              to="/user"
              className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition"
            >
              Open App
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-5xl px-4 py-8 lg:py-12">
        {/* Page Title */}
        <div className="mb-6 text-center sm:text-left">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-600">Legal & Transparency</span>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">Platform Policies & Terms</h1>
          <p className="mt-1.5 text-xs text-slate-500 max-w-xl">
            Read our verified policies regarding Vedic astrology guidance, per-minute billing, user privacy, and refund resolutions.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="mb-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {POLICIES.map((p) => {
            const Icon = p.icon;
            const active = activeKey === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setActiveKey(p.key)}
                className={cx(
                  'flex items-start gap-3 rounded-2xl border p-4 text-left transition',
                  active
                    ? 'border-brand-500 bg-white shadow-sm ring-1 ring-brand-500/20'
                    : 'border-slate-200/90 bg-white/70 hover:bg-white hover:border-slate-300'
                )}
              >
                <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500')}>
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cx('text-xs font-bold leading-tight', active ? 'text-brand-900' : 'text-slate-800')}>
                    {p.label}
                  </p>
                  <p className="mt-1 line-clamp-1 text-[11px] text-slate-400">{p.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Policy Document Body */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs sm:p-10">
          {loading ? (
            <PageLoader variant="policy" />
          ) : (
            <div className="space-y-6">
              {/* Header inside document */}
              <div className="flex flex-col gap-2 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{policy?.title || 'Policy Document'}</h2>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar size={13} />
                    <span>Effective & Last Updated: {policy?.lastUpdated || 'Current'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 size={13} /> Official Platform Terms
                </div>
              </div>

              {/* Formatted Markdown Content */}
              <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
                {policy?.content ? (
                  policy.content.split('\n\n').map((block, idx) => {
                    if (block.startsWith('### ')) {
                      return (
                        <h3 key={idx} className="mt-6 mb-2 text-sm font-bold text-slate-900 first:mt-0 tracking-tight">
                          {block.replace('### ', '')}
                        </h3>
                      );
                    }
                    if (block.startsWith('## ')) {
                      return (
                        <h2 key={idx} className="mt-8 mb-3 text-base font-bold text-slate-900 first:mt-0 tracking-tight">
                          {block.replace('## ', '')}
                        </h2>
                      );
                    }
                    if (block.startsWith('- ')) {
                      const items = block.split('\n- ');
                      return (
                        <ul key={idx} className="my-2 list-disc space-y-1.5 pl-5 text-slate-600">
                          {items.map((it, i) => (
                            <li key={i}>{it.replace(/^- /, '')}</li>
                          ))}
                        </ul>
                      );
                    }
                    return (
                      <p key={idx} className="my-2 text-slate-600 leading-normal">
                        {block}
                      </p>
                    );
                  })
                ) : (
                  <p className="text-slate-400">No content available for this policy.</p>
                )}
              </div>

              {/* Footer inside document */}
              <div className="mt-10 border-t border-slate-100 pt-6 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p>Have questions regarding these policies? Submit a query through the App Support section.</p>
                <span className="font-semibold text-slate-600">&copy; {brand.name} 2026</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
