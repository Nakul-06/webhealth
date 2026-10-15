import React from 'react';
import { X, Layers, ArrowRight, ShieldCheck, Cpu, Database, MessageSquareQuote, Server, Globe } from 'lucide-react';

export default function ArchitectureModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full p-6 shadow-2xl relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Cloud Microservice Architecture
            </h2>
            <p className="text-xs text-slate-400">
              Decoupled, event-driven link crawling and parallel availability verification
            </p>
          </div>
        </div>

        {/* Pipeline Diagram */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 mb-6">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
            End-to-End Processing Workflow
          </span>
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-center text-xs">
            <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl w-full md:w-auto flex-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Phase 1</span>
              <span className="font-bold text-white">Web Client</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Submits URL & views live audit</p>
            </div>
            <ArrowRight className="w-4 h-4 text-sky-500 hidden md:block" />
            <div className="p-3 bg-slate-900 border border-sky-500/40 rounded-xl w-full md:w-auto flex-1">
              <span className="text-[10px] text-sky-400 uppercase font-bold block">Phase 2</span>
              <span className="font-bold text-sky-300">API & Crawler</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Discovers & extracts anchor links</p>
            </div>
            <ArrowRight className="w-4 h-4 text-sky-500 hidden md:block" />
            <div className="p-3 bg-slate-900 border border-amber-500/40 rounded-xl w-full md:w-auto flex-1">
              <span className="text-[10px] text-amber-400 uppercase font-bold block">Phase 3</span>
              <span className="font-bold text-amber-300">Message Queue</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Distributes async verification tasks</p>
            </div>
            <ArrowRight className="w-4 h-4 text-sky-500 hidden md:block" />
            <div className="p-3 bg-slate-900 border border-cyan-500/40 rounded-xl w-full md:w-auto flex-1">
              <span className="text-[10px] text-cyan-400 uppercase font-bold block">Phase 4</span>
              <span className="font-bold text-cyan-300">Parallel Workers</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Checks HTTP HEAD/GET & latency</p>
            </div>
            <ArrowRight className="w-4 h-4 text-sky-500 hidden md:block" />
            <div className="p-3 bg-slate-900 border border-orange-500/40 rounded-xl w-full md:w-auto flex-1">
              <span className="text-[10px] text-orange-400 uppercase font-bold block">Phase 5</span>
              <span className="font-bold text-orange-300">NoSQL Database</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Stores scan & link records</p>
            </div>
          </div>
        </div>

        {/* Cloud Architecture Mapping */}
        <div className="mb-6">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
            Cloud Infrastructure & Component Specifications
          </span>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-4 border-b border-slate-800">System Component</th>
                  <th className="py-2.5 px-4 border-b border-slate-800 text-sky-400">Deployed Cloud Service</th>
                  <th className="py-2.5 px-4 border-b border-slate-800 text-slate-300">Operational Role & Concurrency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                <tr>
                  <td className="py-2 px-4 font-sans font-medium text-slate-400">API & Web Crawler</td>
                  <td className="py-2 px-4 text-sky-300 font-bold">Azure App Service / Container Apps</td>
                  <td className="py-2 px-4 font-sans text-slate-400">Coordinates crawling, extracts anchor tags, strips hash anchors & dispatches jobs</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans font-medium text-slate-400">Task Message Queue</td>
                  <td className="py-2 px-4 text-sky-300 font-bold">Azure Service Bus Queue</td>
                  <td className="py-2 px-4 font-sans text-slate-400">Decouples crawling from link checks; buffers high-volume URL tasks asynchronously</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans font-medium text-slate-400">Parallel Workers</td>
                  <td className="py-2 px-4 text-sky-300 font-bold">Azure Container Workers</td>
                  <td className="py-2 px-4 font-sans text-slate-400">Executes concurrent HTTP HEAD probes with streaming GET fallbacks & latency timing</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans font-medium text-slate-400">NoSQL Document Store</td>
                  <td className="py-2 px-4 text-sky-300 font-bold">Azure Cosmos DB</td>
                  <td className="py-2 px-4 font-sans text-slate-400">Low-latency JSON store partitioned by scanId, maintaining scan records & link audit logs</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans font-medium text-slate-400">Telemetry & Audit</td>
                  <td className="py-2 px-4 text-sky-300 font-bold">Azure Monitor & App Insights</td>
                  <td className="py-2 px-4 font-sans text-slate-400">Structured real-time event streaming, error tracking, and worker latency diagnostics</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Key Architectural Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="font-bold text-white block mb-1">Non-Blocking Architecture</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Decoupling link discovery from verification eliminates gateway timeouts when scanning pages with hundreds of URLs.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="font-bold text-white block mb-1">Lightweight HTTP Probing</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Issues HTTP HEAD requests first to minimize data transfer, with automatic GET streaming fallback when required.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="font-bold text-white block mb-1">Health Score Metric</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Dynamically computes overall availability percentage and delivers automated SEO and performance remediation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
