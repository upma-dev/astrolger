import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Shield, RotateCcw, Check, Save, ExternalLink, Calendar, Eye, Edit3 } from 'lucide-react';
import { api } from '../../lib/api.js';
import { Button, PageLoader, useToast, cx } from '../../shared/ui.jsx';

const POLICY_META = [
  { key: 'terms_of_service', label: 'Terms of Service', icon: FileText, desc: 'User & astrologer service agreements, platform usage rules and liability.' },
  { key: 'privacy_policy', label: 'Privacy Policy', icon: Shield, desc: 'Data collection, birth detail confidentiality and Kundli storage safety.' },
  { key: 'refund_policy', label: 'Refund Policy', icon: RotateCcw, desc: 'Call drop credits, technical failure refunds and recharge balance terms.' },
];

export default function PoliciesManager() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTab = searchParams.get('tab');
  const [activeKey, setActiveKey] = useState(paramTab || 'terms_of_service');
  const [policies, setPolicies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (paramTab && ['terms_of_service', 'privacy_policy', 'refund_policy'].includes(paramTab)) {
      setActiveKey(paramTab);
    }
  }, [paramTab]);

  const selectTab = (k) => {
    setActiveKey(k);
    setSearchParams({ tab: k });
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const data = await api.admin.get('/admin/policies');
      setPolicies(data);
    } catch (err) {
      toast(err.message || 'Failed to load policies', 'error');
    } finally {
      setLoading(false);
    }
  };

  const current = policies?.[activeKey] || { title: '', content: '', lastUpdated: '' };

  const handleChange = (field, val) => {
    setPolicies((prev) => ({
      ...prev,
      [activeKey]: {
        ...prev[activeKey],
        [field]: val,
      },
    }));
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    try {
      setSaving(true);
      await api.admin.put(`/admin/policies/${activeKey}`, {
        title: current.title,
        content: current.content,
      });
      toast(`${current.title} saved successfully`, 'success');
      fetchPolicies();
    } catch (err) {
      toast(err.message || 'Failed to save policy', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !policies) return <PageLoader variant="form" />;

  return (
    <div className="space-y-6">
      {/* Top Header Card in Eqosy Style */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Shield size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Legal & Policy Management</h2>
              <p className="text-xs text-slate-500">Manage Terms of Service, Privacy Policy and Refund terms displayed across web & mobile apps.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreview(!preview)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
            >
              {preview ? <><Edit3 size={14} /> Edit Markdown</> : <><Eye size={14} /> Preview Live</>}
            </button>
            <Button onClick={handleSave} loading={saving} size="sm" className="gap-1.5">
              <Save size={14} /> Save Changes
            </Button>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {POLICY_META.map((tab) => {
            const Icon = tab.icon;
            const active = activeKey === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => selectTab(tab.key)}
                className={cx(
                  'flex items-start gap-3 rounded-xl border p-3.5 text-left transition',
                  active
                    ? 'border-brand-500 bg-brand-50/50 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                )}
              >
                <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500')}>
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className={cx('text-xs font-bold', active ? 'text-brand-900' : 'text-slate-900')}>{tab.label}</p>
                    {active && <Check size={14} className="text-brand-600" />}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{tab.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor & Details */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Document Editor</span>
                <h3 className="text-base font-bold text-slate-900">{current.title || 'Policy Content'}</h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar size={13} />
                <span>Last updated: {current.lastUpdated || 'Today'}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Document Title</label>
                <input
                  type="text"
                  value={current.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  placeholder="e.g. Terms of Service"
                />
              </div>

              {preview ? (
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Live Rendered Preview</label>
                  <div className="min-h-[380px] max-h-[600px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-5 text-sm leading-relaxed text-slate-700">
                    {current.content.split('\n\n').map((block, idx) => {
                      if (block.startsWith('### ')) {
                        return <h4 key={idx} className="mt-4 mb-1.5 text-sm font-bold text-slate-900 first:mt-0">{block.replace('### ', '')}</h4>;
                      }
                      if (block.startsWith('## ')) {
                        return <h3 key={idx} className="mt-5 mb-2 text-base font-bold text-slate-900 first:mt-0">{block.replace('## ', '')}</h3>;
                      }
                      if (block.startsWith('- ')) {
                        const items = block.split('\n- ');
                        return (
                          <ul key={idx} className="my-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
                            {items.map((it, i) => <li key={i}>{it.replace(/^- /, '')}</li>)}
                          </ul>
                        );
                      }
                      return <p key={idx} className="my-2 text-xs text-slate-600 leading-normal">{block}</p>;
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">Policy Content (Markdown supported)</label>
                    <span className="text-[11px] text-slate-400">Headings with ###, bullets with -</span>
                  </div>
                  <textarea
                    rows={16}
                    value={current.content}
                    onChange={(e) => handleChange('content', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3.5 font-mono text-xs text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    placeholder="Write or paste policy contents here..."
                  />
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-400">Updates take effect immediately on public web and user applications.</p>
                <Button onClick={handleSave} loading={saving} size="sm">
                  Save Policy
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info & Shortcuts */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Policy Checklist</h4>
            <div className="mt-3 space-y-2.5 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check size={11} strokeWidth={2.8} /></span>
                <span>Astrology guidance disclaimer (non-medical / non-legal).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check size={11} strokeWidth={2.8} /></span>
                <span>Wallet per-minute billing transparency.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check size={11} strokeWidth={2.8} /></span>
                <span>Refund resolution window (24-48 hrs).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check size={11} strokeWidth={2.8} /></span>
                <span>Birth chart data encryption and privacy.</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">API Endpoint Link</h4>
            <p className="mt-1 text-xs text-slate-500">Public direct JSON access for frontend integration:</p>
            <div className="mt-2.5 rounded-lg bg-slate-50 p-2 font-mono text-[11px] text-slate-700 select-all border border-slate-200">
              /api/public/policies/{activeKey}
            </div>
            <a
              href={`/api/public/policies/${activeKey}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline"
            >
              Test JSON in new tab <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
