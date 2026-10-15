import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, CheckCircle2, Clock, Zap } from 'lucide-react';

export default function HealthScoreCard({ healthAssessment, latencyMetrics, isCompleted }) {
  const score = healthAssessment?.score ?? 100;
  const grade = healthAssessment?.grade ?? 'A+';
  const gradeText = healthAssessment?.gradeText ?? 'Optimal Website Health';

  // SVG circular gauge calculations
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreTheme = (score) => {
    if (score >= 90) return { stroke: '#10b981', text: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    if (score >= 75) return { stroke: '#3b82f6', text: 'text-blue-400', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
    if (score >= 60) return { stroke: '#f59e0b', text: 'text-amber-400', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    return { stroke: '#ef4444', text: 'text-red-400', badge: 'bg-red-500/10 text-red-400 border-red-500/30' };
  };

  const theme = getScoreTheme(score);

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Overall Health Index
          </span>
          <h3 className="text-lg font-bold text-white mt-0.5">Website Health Score</h3>
        </div>
        <div className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${theme.badge}`}>
          Grade {grade}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-around my-4 gap-6">
        {/* Circular Gauge */}
        <div className="relative flex items-center justify-center">
          <svg className="w-36 h-36 transform -rotate-90">
            {/* Background Track */}
            <circle
              cx="72"
              cy="72"
              r={radius}
              stroke="currentColor"
              strokeWidth="10"
              fill="transparent"
              className="text-slate-700/40"
            />
            {/* Progress Stroke */}
            <circle
              cx="72"
              cy="72"
              r={radius}
              stroke={theme.stroke}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className={`text-4xl font-extrabold font-mono tracking-tight ${theme.text}`}>
              {score}%
            </span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">Health</span>
          </div>
        </div>

        {/* Breakdown Summary */}
        <div className="space-y-3 flex-1 max-w-xs">
          <div>
            <span className="text-xs text-slate-400 font-medium">Evaluation Verdict</span>
            <p className={`text-sm font-semibold mt-0.5 ${theme.text}`}>
              {gradeText}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/60">
            <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
                <Clock className="w-3 h-3 text-blue-400" />
                <span>Avg Latency</span>
              </div>
              <p className="text-sm font-mono font-bold text-slate-200 mt-0.5">
                {latencyMetrics?.avgResponseTimeMs || 0} ms
              </p>
            </div>

            <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>95th Percentile</span>
              </div>
              <p className="text-sm font-mono font-bold text-slate-200 mt-0.5">
                {latencyMetrics?.p95Ms || 0} ms
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-700/60 flex items-center justify-between">
        <span>Calculated from live HTTP status verification</span>
        <span className="text-slate-500 font-mono">Distributed Cloud Engine</span>
      </div>
    </div>
  );
}
