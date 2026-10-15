import React from 'react';
import { CheckCircle2, ArrowUpRight, AlertOctagon, XCircle, Clock, Link as LinkIcon } from 'lucide-react';

export default function StatCards({ summary, counts }) {
  const cards = [
    {
      title: 'Total Discovered',
      value: summary?.totalFound || 0,
      sub: `${summary?.totalChecked || 0} checked`,
      icon: LinkIcon,
      color: 'blue',
      border: 'border-blue-500/20',
      bg: 'bg-blue-500/10',
      text: 'text-blue-400'
    },
    {
      title: 'Working Links (2xx)',
      value: summary?.working || 0,
      sub: 'Status 200-299 OK',
      icon: CheckCircle2,
      color: 'emerald',
      border: 'border-emerald-500/20',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400'
    },
    {
      title: 'Redirects (3xx)',
      value: summary?.redirected || 0,
      sub: 'Permanent & Temporary',
      icon: ArrowUpRight,
      color: 'sky',
      border: 'border-sky-500/20',
      bg: 'bg-sky-500/10',
      text: 'text-sky-400'
    },
    {
      title: 'Dead Links (4xx)',
      value: summary?.broken || 0,
      sub: '404 Not Found / 410 Gone',
      icon: XCircle,
      color: 'red',
      border: 'border-red-500/20',
      bg: 'bg-red-500/10',
      text: 'text-red-400'
    },
    {
      title: 'Server Errors / Timeouts',
      value: (summary?.serverError || 0) + (summary?.timedOut || 0),
      sub: `${summary?.serverError || 0} 5xx, ${summary?.timedOut || 0} timeouts`,
      icon: AlertOctagon,
      color: 'amber',
      border: 'border-amber-500/20',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-4 rounded-2xl bg-slate-800/80 border ${card.border} shadow-lg transition-transform hover:-translate-y-0.5`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">{card.title}</span>
              <div className={`p-1.5 rounded-lg ${card.bg} ${card.text}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-bold font-mono tracking-tight ${card.text}`}>
                {card.value}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">{card.sub}</span>
          </div>
        );
      })}
    </div>
  );
}
