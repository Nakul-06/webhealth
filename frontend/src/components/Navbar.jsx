import React from 'react';
import { Cloud, Terminal, Layers, FileText } from 'lucide-react';

export default function Navbar({ onOpenLogs, onOpenArch, systemStatus }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 p-2 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Cloud className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-white tracking-tight">Cloud WebHealth</span>
              <span className="px-2 py-0.5 text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full">
                Microsoft Azure
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Dead Link Detection & Website Health Monitor</p>
          </div>
        </div>

        {/* Status & Navigation Actions */}
        <div className="flex items-center space-x-3">
          {/* Cloud Status Pill */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            <span className="text-slate-300 font-mono">
              {systemStatus?.mode || 'Azure Pipeline Active'}
            </span>
          </div>

          {/* Architecture Modal Trigger */}
          <button
            onClick={onOpenArch}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
            title="View Azure Cloud Architecture"
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Architecture</span>
          </button>

          {/* Cloud Logs Drawer Trigger */}
          <button
            onClick={onOpenLogs}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
            title="Inspect Azure Monitor & Application Insights"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Azure Monitor</span>
          </button>

          {/* Student attribution */}
          <div className="hidden lg:flex items-center pl-2 border-l border-slate-800 text-xs text-slate-400">
            <span className="font-medium text-slate-300">Naghulan</span>
            <span className="mx-1 text-slate-600">&</span>
            <span className="font-medium text-slate-300">Shreyaa</span>
          </div>
        </div>
      </div>
    </header>
  );
}
