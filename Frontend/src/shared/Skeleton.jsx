/* Global, theme-aware skeleton loading primitives and layout-matched presets. */

const cx = (...a) => a.filter(Boolean).join(' ');

export function Sk({ className = '', circle = false, style }) {
  return <div aria-hidden="true" style={style} className={cx('sk', circle && 'rounded-full!', className)} />;
}

export function SkText({ lines = 3, lastWidth = 'w-2/3', gap = 'space-y-2', className = '' }) {
  return (
    <div aria-hidden="true" className={cx(gap, className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Sk key={i} className={cx('h-3', i === lines - 1 ? lastWidth : i % 2 ? 'w-11/12' : 'w-full')} />
      ))}
    </div>
  );
}

export function SkCard({ className = '', children }) {
  return <div aria-hidden="true" className={cx('sk-card p-4 shadow-xs', className)}>{children}</div>;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SkCard key={i} className="space-y-3">
            <div className="flex items-center justify-between">
              <Sk className="h-9 w-9 rounded-xl!" />
              <Sk className="h-3 w-14" />
            </div>
            <Sk className="h-6 w-24" />
            <Sk className="h-3 w-32" />
          </SkCard>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <SkCard key={i} className="space-y-4">
            <div className="flex items-center justify-between">
              <Sk className="h-4 w-40" />
              <Sk className="h-3 w-16" />
            </div>
            <div className="flex h-36 items-end gap-2 pt-2">
              {[42, 70, 52, 88, 60, 95, 68, 50, 82, 64, 76, 90].map((h, j) => (
                <Sk key={j} className="flex-1 rounded-t-md!" style={{ height: `${h}%` }} />
              ))}
            </div>
          </SkCard>
        ))}
      </div>
      <SkCard className="space-y-3">
        <div className="flex items-center justify-between pb-1">
          <Sk className="h-4 w-44" />
          <Sk className="h-6 w-24 rounded-full!" />
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-t border-slate-100 pt-3">
            <Sk circle className="h-9 w-9 shrink-0" />
            <div className="flex-1 space-y-2"><Sk className="h-3 w-40" /><Sk className="h-2.5 w-24" /></div>
            <Sk className="h-5 w-16 rounded-full!" />
            <Sk className="h-4 w-14" />
          </div>
        ))}
      </SkCard>
    </div>
  );
}

function TableSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading list">
      <SkCard className="p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <Sk className="h-4 w-40" />
          <div className="flex gap-2">
            <Sk className="h-8 w-20 rounded-full!" />
            <Sk className="h-8 w-20 rounded-full!" />
            <Sk className="h-8 w-44 rounded-xl!" />
          </div>
        </div>
        <div className="divide-y divide-slate-100 p-4">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <Sk circle className="h-10 w-10 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <Sk className="h-3.5 w-44 max-w-[60%]" />
                <Sk className="h-2.5 w-28 max-w-[40%]" />
              </div>
              <Sk className="hidden h-3 w-24 sm:block" />
              <Sk className="h-6 w-16 rounded-full!" />
              <Sk className="h-8 w-20 rounded-xl!" />
            </div>
          ))}
        </div>
      </SkCard>
    </div>
  );
}

function CardsSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading items">
      {Array.from({ length: count }, (_, i) => (
        <SkCard key={i} className="space-y-3">
          <Sk className="h-36 w-full rounded-xl!" />
          <Sk className="h-4 w-2/3" />
          <SkText lines={2} lastWidth="w-1/2" />
          <div className="flex items-center justify-between pt-1">
            <Sk className="h-5 w-16 rounded-full!" />
            <Sk className="h-8 w-20 rounded-xl!" />
          </div>
        </SkCard>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading details">
      <Sk className="h-4 w-28" />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <SkCard className="space-y-4 p-5">
          <Sk circle className="mx-auto h-20 w-20" />
          <Sk className="mx-auto h-5 w-36" />
          <Sk className="mx-auto h-3 w-28" />
          <div className="flex justify-center gap-2"><Sk className="h-5 w-16 rounded-full!" /><Sk className="h-5 w-16 rounded-full!" /></div>
          <div className="space-y-2.5 border-t border-slate-100 pt-4">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex justify-between"><Sk className="h-3 w-20" /><Sk className="h-3 w-28" /></div>
            ))}
          </div>
        </SkCard>
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <SkCard key={i} className="space-y-2"><Sk className="h-3 w-20" /><Sk className="h-6 w-16" /></SkCard>
            ))}
          </div>
          <TableSkeleton rows={4} />
        </div>
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading settings">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2"><Sk className="h-3 w-24" /><Sk className="h-6 w-52" /></div>
        <Sk className="h-9 w-28 rounded-xl!" />
      </div>
      <SkCard className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-2"><Sk className="h-3 w-28" /><Sk className="h-10 w-full rounded-xl!" /></div>
          ))}
        </div>
        <div className="space-y-2"><Sk className="h-3 w-32" /><Sk className="h-24 w-full rounded-xl!" /></div>
        <Sk className="h-10 w-36 rounded-xl!" />
      </SkCard>
    </div>
  );
}

function SplitSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]" aria-busy="true" aria-label="Loading messages">
      <SkCard className="space-y-3">
        <Sk className="h-9 w-full rounded-xl!" />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-t border-slate-100 pt-3">
            <Sk circle className="h-9 w-9 shrink-0" />
            <div className="flex-1 space-y-1.5"><Sk className="h-3.5 w-32" /><Sk className="h-2.5 w-44" /></div>
          </div>
        ))}
      </SkCard>
      <SkCard className="flex min-h-[360px] flex-col justify-between p-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <Sk circle className="h-10 w-10" />
          <div className="space-y-1.5"><Sk className="h-4 w-36" /><Sk className="h-2.5 w-24" /></div>
        </div>
        <div className="space-y-3 py-6">
          <Sk className="h-12 w-3/5 rounded-2xl!" />
          <Sk className="ml-auto h-12 w-1/2 rounded-2xl!" />
          <Sk className="h-10 w-2/3 rounded-2xl!" />
        </div>
        <Sk className="h-11 w-full rounded-xl!" />
      </SkCard>
    </div>
  );
}

function ChatSkeleton({ mobile = false }) {
  return (
    <div className={cx('flex flex-col overflow-hidden', mobile ? 'h-full flex-1' : 'h-[calc(100dvh-10rem)] rounded-2xl sk-card')} aria-busy="true" aria-label="Loading conversation">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3" style={{ borderColor: 'var(--sk-border)' }}>
        <Sk circle className="h-10 w-10 shrink-0" />
        <div className="flex-1 space-y-1.5"><Sk className="h-3.5 w-32" /><Sk className="h-2.5 w-24" /></div>
        <Sk className="h-8 w-16 rounded-full!" />
      </div>
      <div className="flex-1 space-y-3 p-4">
        <Sk className="mx-auto h-5 w-20 rounded-full!" />
        <Sk className="h-11 w-3/5 rounded-2xl!" />
        <Sk className="ml-auto h-10 w-1/2 rounded-2xl!" />
        <Sk className="h-14 w-2/3 rounded-2xl!" />
        <Sk className="ml-auto h-10 w-2/5 rounded-2xl!" />
      </div>
      <div className="flex items-center gap-2 border-t border-slate-100 p-3" style={{ borderColor: 'var(--sk-border)' }}>
        <Sk className="h-11 flex-1 rounded-full!" />
        <Sk circle className="h-11 w-11 shrink-0" />
      </div>
    </div>
  );
}

function WalletSkeleton() {
  return (
    <div className="space-y-4 p-4" aria-busy="true" aria-label="Loading wallet">
      <Sk className="h-32 w-full rounded-2xl!" />
      <SkCard className="space-y-3">
        <Sk className="h-4 w-28" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => <Sk key={i} className="h-12 rounded-xl!" />)}
        </div>
        <Sk className="h-11 w-full rounded-xl!" />
        <Sk className="h-11 w-full rounded-xl!" />
      </SkCard>
      <SkCard className="space-y-3">
        <Sk className="h-4 w-36" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between pt-2">
            <div className="space-y-1.5"><Sk className="h-3.5 w-36" /><Sk className="h-2.5 w-24" /></div>
            <Sk className="h-4 w-14" />
          </div>
        ))}
      </SkCard>
    </div>
  );
}

function StoreSkeleton() {
  return (
    <div className="space-y-4 p-4" aria-busy="true" aria-label="Loading store">
      <Sk className="h-5 w-44" />
      <Sk className="h-10 w-full rounded-xl!" />
      {[0, 1, 2].map((i) => (
        <SkCard key={i} className="flex gap-3 p-4">
          <Sk className="h-20 w-20 shrink-0 rounded-xl!" />
          <div className="flex-1 space-y-2">
            <Sk className="h-4 w-3/4" />
            <Sk className="h-3 w-full" />
            <div className="flex items-center justify-between pt-1">
              <Sk className="h-4 w-16" />
              <Sk className="h-8 w-20 rounded-xl!" />
            </div>
          </div>
        </SkCard>
      ))}
    </div>
  );
}

function AstroProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading astrologer profile">
      <div className="px-4 pt-4 pb-14">
        <Sk className="mb-3 h-3 w-14" />
        <div className="flex items-center gap-3">
          <Sk circle className="h-[72px] w-[72px] shrink-0" />
          <div className="flex-1 space-y-2"><Sk className="h-5 w-40" /><Sk className="h-3 w-48" /><Sk className="h-3 w-28" /></div>
        </div>
      </div>
      <div className="-mt-8 space-y-4 px-4 pb-6">
        <SkCard className="grid grid-cols-3 gap-3 p-3">
          {[0, 1, 2].map((i) => <div key={i} className="space-y-1.5"><Sk className="mx-auto h-5 w-12" /><Sk className="mx-auto h-2.5 w-14" /></div>)}
        </SkCard>
        <SkCard className="space-y-3">
          <Sk className="h-4 w-36" />
          <div className="grid grid-cols-3 gap-2">{[0, 1, 2].map((i) => <Sk key={i} className="h-20 rounded-xl!" />)}</div>
        </SkCard>
        <SkCard className="space-y-3">
          <Sk className="h-4 w-20" />
          <SkText lines={3} />
        </SkCard>
      </div>
    </div>
  );
}

function VendorDashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
      <SkCard className="flex items-center justify-between p-5">
        <div className="space-y-2"><Sk className="h-3 w-24" /><Sk className="h-6 w-40" /><Sk className="h-3 w-52" /></div>
        <Sk circle className="h-14 w-14 shrink-0" />
      </SkCard>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <SkCard key={i} className="space-y-2.5">
            <Sk className="h-9 w-9 rounded-xl!" />
            <Sk className="h-6 w-20" />
            <Sk className="h-3 w-24" />
          </SkCard>
        ))}
      </div>
    </div>
  );
}

function VendorRequestsSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading requests">
      <div className="space-y-3">
        <Sk className="h-4 w-40" />
        {[0, 1].map((i) => (
          <SkCard key={i} className="space-y-3">
            <div className="flex items-start gap-3">
              <Sk circle className="h-11 w-11 shrink-0" />
              <div className="flex-1 space-y-2"><Sk className="h-4 w-36" /><Sk className="h-3 w-48" /></div>
              <Sk className="h-5 w-16 rounded-full!" />
            </div>
            <div className="grid grid-cols-2 gap-2"><Sk className="h-10 rounded-xl!" /><Sk className="h-10 rounded-xl!" /></div>
          </SkCard>
        ))}
      </div>
      <SkCard className="space-y-3">
        <Sk className="h-4 w-32" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between border-t border-slate-100 pt-3">
            <div className="space-y-1.5"><Sk className="h-3.5 w-32" /><Sk className="h-2.5 w-40" /></div>
            <Sk className="h-5 w-16 rounded-full!" />
          </div>
        ))}
      </SkCard>
    </div>
  );
}

function VendorEarningsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading earnings">
      <div className="grid gap-3 sm:grid-cols-2">
        <Sk className="h-36 rounded-2xl!" />
        <SkCard className="space-y-3"><Sk className="h-4 w-36" /><Sk className="h-10 w-full rounded-xl!" /><Sk className="h-10 w-full rounded-xl!" /></SkCard>
      </div>
      <TableSkeleton rows={4} />
    </div>
  );
}

function AuthSkeleton() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4" aria-busy="true" aria-label="Loading login">
      <SkCard className="w-full max-w-md space-y-4 p-6">
        <div className="flex items-center gap-3">
          <Sk className="h-11 w-11 rounded-xl!" />
          <div className="space-y-1.5"><Sk className="h-4 w-32" /><Sk className="h-3 w-24" /></div>
        </div>
        <Sk className="h-40 w-full rounded-2xl!" />
        <Sk className="h-12 w-full rounded-xl!" />
        <Sk className="h-12 w-full rounded-xl!" />
      </SkCard>
    </div>
  );
}

function PolicySkeleton() {
  return (
    <div className="space-y-5 py-2" aria-busy="true" aria-label="Loading policy">
      <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2"><Sk className="h-6 w-52" /><Sk className="h-3 w-40" /></div>
        <Sk className="h-6 w-36 rounded-full!" />
      </div>
      <SkText lines={4} lastWidth="w-4/5" />
      <Sk className="h-4 w-44 pt-2" />
      <SkText lines={5} lastWidth="w-3/5" />
    </div>
  );
}

export function SupportListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading queries">
      <Sk className="h-11 w-full rounded-xl!" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
          <div className="flex-1 space-y-1.5"><Sk className="h-3.5 w-36" /><Sk className="h-2.5 w-48" /></div>
          <Sk className="h-5 w-14 rounded-full!" />
        </div>
      ))}
    </div>
  );
}

export function UserShellSkeleton() {
  return (
    <div className="flex h-full flex-col justify-between p-4" aria-busy="true" aria-label="Loading app">
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 pt-1">
          <div className="flex-1 space-y-1.5"><Sk className="h-5 w-28" /><Sk className="h-2.5 w-20" /></div>
          <Sk className="h-9 w-24 rounded-full!" />
          <Sk circle className="h-9 w-9" />
          <Sk circle className="h-9 w-9" />
        </div>
        <Sk className="h-14 w-full rounded-2xl!" />
        <Sk className="h-48 w-full rounded-[22px]!" />
        <Sk className="h-[86px] w-full rounded-[20px]!" />
        <div className="flex gap-2.5 overflow-hidden">
          {[0, 1, 2].map((i) => <Sk key={i} className="h-48 w-36 shrink-0 rounded-[18px]!" />)}
        </div>
      </div>
      <Sk className="h-[68px] w-full rounded-[24px]!" />
    </div>
  );
}

export function VendorShellSkeleton() {
  return (
    <div className="flex min-h-[100dvh] bg-slate-100" aria-busy="true" aria-label="Loading astrologer panel">
      <aside className="hidden w-60 shrink-0 flex-col gap-4 bg-slate-900 p-4 lg:flex">
        <div className="mb-4 flex items-center gap-2.5"><Sk className="h-8 w-8 rounded-xl! opacity-20" /><Sk className="h-4 w-28 opacity-20" /></div>
        {Array.from({ length: 4 }, (_, i) => <Sk key={i} className="h-10 w-full rounded-xl! opacity-15" />)}
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between bg-white px-4 py-3 shadow-xs">
          <div className="space-y-1.5"><Sk className="h-4 w-32" /><Sk className="h-2.5 w-24" /></div>
          <Sk className="h-6 w-20 rounded-full!" />
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 p-4"><VendorDashboardSkeleton /></main>
      </div>
    </div>
  );
}

export function AdminShellSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]" aria-busy="true" aria-label="Loading admin panel">
      <aside className="hidden w-[300px] shrink-0 flex-col gap-4 bg-neutral-950 p-4 lg:flex">
        <div className="flex items-center gap-2.5 pb-2"><Sk className="h-9 w-9 rounded-xl! opacity-20" /><Sk className="h-4 w-32 opacity-20" /></div>
        <Sk className="h-10 w-full rounded-xl! opacity-15" />
        <div className="space-y-2.5 pt-2">
          {Array.from({ length: 7 }, (_, i) => <Sk key={i} className="h-9 w-full rounded-lg! opacity-15" />)}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <Sk className="h-5 w-40" />
          <Sk className="h-9 w-72 rounded-full!" />
          <div className="flex items-center gap-3"><Sk circle className="h-9 w-9" /><Sk className="h-9 w-36 rounded-full!" /></div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8"><DashboardSkeleton /></main>
      </div>
    </div>
  );
}

export function LandingSkeleton({ themeVars }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-lp-bg" style={themeVars} aria-busy="true" aria-label="Loading website">
      <div className="lp-hero-bg pb-24 pt-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 animate-pulse rounded-xl bg-white/20" />
            <div className="h-5 w-28 animate-pulse rounded-lg bg-white/20" />
          </div>
          <div className="hidden gap-6 lg:flex">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-3.5 w-20 animate-pulse rounded-full bg-white/20" />)}
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-10 animate-pulse rounded-full bg-white/20" />
            <div className="h-10 w-10 animate-pulse rounded-full bg-white/20" />
          </div>
        </div>
        <div className="mx-auto mt-14 grid max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="min-w-0 space-y-5">
            <div className="h-7 w-48 max-w-full animate-pulse rounded-full bg-white/20" />
            <div className="h-12 w-full max-w-md animate-pulse rounded-2xl bg-white/20" />
            <div className="h-12 w-4/5 animate-pulse rounded-2xl bg-white/15" />
            <div className="h-4 w-3/4 animate-pulse rounded-lg bg-white/15" />
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="h-12 w-40 animate-pulse rounded-full bg-white/25" />
              <div className="h-12 w-36 animate-pulse rounded-full bg-white/15" />
            </div>
          </div>
          <div className="mx-auto h-[330px] w-[200px] animate-pulse rounded-[36px] bg-white/15 sm:h-[420px] sm:w-[240px]" />
        </div>
      </div>
      <div className="relative z-10 -mt-12 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <SkCard key={i} className="flex items-center gap-3.5 p-5">
              <Sk className="h-12 w-12 shrink-0 rounded-2xl!" />
              <div className="flex-1 space-y-2"><Sk className="h-6 w-20" /><Sk className="h-3 w-32" /></div>
            </SkCard>
          ))}
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <SkCard key={i} className="space-y-3 p-6">
              <Sk className="h-14 w-14 rounded-2xl!" />
              <Sk className="h-5 w-40" />
              <SkText lines={2} />
            </SkCard>
          ))}
        </div>
      </div>
    </div>
  );
}

function DefaultSkeleton() {
  return (
    <div className="space-y-4 p-2" aria-busy="true" aria-label="Loading">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2"><Sk className="h-5 w-44" /><Sk className="h-3 w-64 max-w-[70%]" /></div>
        <Sk className="h-9 w-24 rounded-xl!" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SkCard className="space-y-3"><Sk className="h-4 w-32" /><SkText lines={3} /></SkCard>
        <SkCard className="space-y-3"><Sk className="h-4 w-28" /><SkText lines={3} /></SkCard>
      </div>
      <SkCard className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 border-t border-slate-100 pt-3 first:border-0 first:pt-0">
            <Sk circle className="h-10 w-10 shrink-0" />
            <div className="flex-1 space-y-1.5"><Sk className="h-3.5 w-40" /><Sk className="h-2.5 w-28" /></div>
            <Sk className="h-6 w-16 rounded-full!" />
          </div>
        ))}
      </SkCard>
    </div>
  );
}

const VARIANTS = {
  default: DefaultSkeleton,
  dashboard: DashboardSkeleton,
  table: TableSkeleton,
  cards: CardsSkeleton,
  detail: DetailSkeleton,
  form: FormSkeleton,
  split: SplitSkeleton,
  chat: () => <ChatSkeleton />,
  'chat-mobile': () => <ChatSkeleton mobile />,
  wallet: WalletSkeleton,
  store: StoreSkeleton,
  'astro-profile': AstroProfileSkeleton,
  'vendor-dash': VendorDashboardSkeleton,
  'vendor-requests': VendorRequestsSkeleton,
  'vendor-earnings': VendorEarningsSkeleton,
  auth: AuthSkeleton,
  policy: PolicySkeleton,
  'user-shell': UserShellSkeleton,
  'vendor-shell': VendorShellSkeleton,
  'admin-shell': AdminShellSkeleton,
};

export function PageSkeleton({ variant = 'default' }) {
  const View = VARIANTS[variant] || DefaultSkeleton;
  return <View />;
}

export function RouteSkeleton() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  if (path.startsWith('/admin')) return <AdminShellSkeleton />;
  if (path.startsWith('/vendor')) return <VendorShellSkeleton />;
  if (path.startsWith('/user')) return <div className="mx-auto max-w-[400px] min-h-[100dvh] bg-[#FBF4EE]"><UserShellSkeleton /></div>;
  return <LandingSkeleton />;
}
