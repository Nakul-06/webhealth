import React from 'react';
import { Globe, Server, MessageSquareQuote, Cpu, Database, Activity } from 'lucide-react';

export default function PipelineBanner({ scanStatus }) {
  const steps = [
    {
      id: 'FRONTEND',
      name: 'Web Client',
      sub: 'User Interface',
      icon: Globe
    },
    {
      id: 'API_GATEWAY',
      name: 'API & Crawler',
      sub: 'Site Parser Gateway',
      icon: Server
    },
    {
      id: 'MESSAGE_QUEUE',
      name: 'Message Queue',
      sub: 'Async Task Bus',
      icon: MessageSquareQuote
    },
    {
      id: 'WORKERS',
      name: 'Link Workers',
      sub: 'Parallel Verification',
      icon: Cpu
    },
    {
      id: 'DATABASE',
      name: 'NoSQL Database',
      sub: 'Audit Store',
      icon: Database
    },
    {
      id: 'REPORT',
      name: 'Health Report',
      sub: 'Analytics & Export',
      icon: Activity
    }
  ];

  const getStepState = (stepId) => {
    if (scanStatus === 'COMPLETED') return 'completed';
    if (scanStatus === 'FAILED') return 'idle';

    if (scanStatus === 'INITIALIZING' && (stepId === 'FRONTEND' || stepId === 'API_GATEWAY')) return 'active';
    if (scanStatus === 'CRAWLING' && stepId === 'API_GATEWAY') return 'active';
    if (scanStatus === 'CHECKING_LINKS' && (stepId === 'MESSAGE_QUEUE' || stepId === 'WORKERS' || stepId === 'DATABASE')) return 'active';

    return 'idle';
  };

  return (
    <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 my-6 shadow-sm">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Cloud Asynchronous Processing Pipeline
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-500/20 font-mono">
            Decoupled Architecture
          </span>
        </div>
        {scanStatus && scanStatus !== 'IDLE' && (
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Status:</span>
            <span className="font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
              {scanStatus}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {steps.map((s) => {
          const state = getStepState(s.id);
          const Icon = s.icon;
          const isActive = state === 'active';
          const isCompleted = state === 'completed';

          return (
            <div key={s.id} className="relative flex flex-col">
              <div
                className={`p-3 rounded-xl border transition-all flex flex-col items-center text-center ${
                  isActive
                    ? 'bg-sky-950/40 border-sky-500 shadow-md shadow-sky-500/10 ring-1 ring-sky-500/30'
                    : isCompleted
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400'
                }`}
              >
                <div
                  className={`p-2 rounded-lg mb-2 ${
                    isActive
                      ? 'bg-sky-600 text-white animate-pulse'
                      : isCompleted
                      ? 'bg-emerald-600/20 text-emerald-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-xs font-bold leading-tight ${isActive ? 'text-white' : isCompleted ? 'text-emerald-300' : 'text-slate-300'}`}>
                  {s.name}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">{s.sub}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
