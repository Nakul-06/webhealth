import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

export default function RecommendationsPanel({ recommendations = [] }) {
  if (!recommendations || recommendations.length === 0) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'CRITICAL':
        return <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />;
      case 'INFO':
        return <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />;
      case 'SUCCESS':
      default:
        return <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />;
    }
  };

  const getStyle = (type) => {
    switch (type) {
      case 'CRITICAL':
        return 'bg-red-500/10 border-red-500/20 text-red-200';
      case 'WARNING':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-200';
      case 'INFO':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-200';
      case 'SUCCESS':
      default:
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200';
    }
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Automated Audit Insights
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700 font-mono">
            {recommendations.length} Action Items
          </span>
        </div>
        <h3 className="text-lg font-bold text-white mb-4">Health Recommendations</h3>

        <div className="space-y-3">
          {recommendations.map((item, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border flex items-start space-x-3 ${getStyle(item.type)}`}
            >
              {getIcon(item.type)}
              <div className="flex-1">
                <h4 className="text-xs font-bold text-white">{item.title}</h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[11px] text-slate-400 pt-4 mt-4 border-t border-slate-700/60">
        Recommendations automatically prioritized based on SEO impact and user accessibility.
      </div>
    </div>
  );
}
