import React from 'react';

export default function StatusDistributionBar({ summary }) {
  const total = summary?.totalChecked || 0;
  if (total === 0) return null;

  const working = summary?.working || 0;
  const redirected = summary?.redirected || 0;
  const broken = summary?.broken || 0;
  const serverError = summary?.serverError || 0;
  const timedOut = summary?.timedOut || 0;

  const pct = (val) => Math.round((val / total) * 100);

  const segments = [
    { label: 'Working (2xx)', count: working, pct: pct(working), bg: 'bg-emerald-500', text: 'text-emerald-400' },
    { label: 'Redirected (3xx)', count: redirected, pct: pct(redirected), bg: 'bg-sky-500', text: 'text-sky-400' },
    { label: 'Dead / Broken (4xx)', count: broken, pct: pct(broken), bg: 'bg-red-500', text: 'text-red-400' },
    { label: 'Server Error (5xx)', count: serverError, pct: pct(serverError), bg: 'bg-amber-500', text: 'text-amber-400' },
    { label: 'Timeout', count: timedOut, pct: pct(timedOut), bg: 'bg-purple-500', text: 'text-purple-400' }
  ].filter((s) => s.count > 0);

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg my-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-300">Link Health Distribution</span>
        <span className="text-xs text-slate-400 font-mono">{total} Verified Links</span>
      </div>

      {/* Multi-segmented distribution bar */}
      <div className="h-3.5 w-full bg-slate-900 rounded-full overflow-hidden flex p-0.5 border border-slate-700">
        {segments.map((seg, idx) => (
          <div
            key={idx}
            style={{ width: `${Math.max(seg.pct, 2)}%` }}
            className={`h-full ${seg.bg} first:rounded-l-full last:rounded-r-full transition-all duration-500 hover:opacity-90`}
            title={`${seg.label}: ${seg.count} (${seg.pct}%)`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3 pt-2 text-xs">
        {segments.map((seg, idx) => (
          <div key={idx} className="flex items-center space-x-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${seg.bg}`}></span>
            <span className="text-slate-400">{seg.label}:</span>
            <span className={`font-semibold font-mono ${seg.text}`}>{seg.count} ({seg.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
