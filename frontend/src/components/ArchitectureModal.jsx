import React from 'react';
import { X, Layers, UserCheck, ArrowRight } from 'lucide-react';

export default function ArchitectureModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
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
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Microsoft Azure Implementation Architecture
            </h2>
            <p className="text-xs text-slate-400">
              Decoupled cloud architecture powered by Azure Container Apps, Service Bus, and Cosmos DB
            </p>
          </div>
        </div>

        {/* Pipeline Diagram */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 mb-6">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
            System Flow (Azure Cloud Architecture)
          </span>
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-center text-xs">
            <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl w-full md:w-auto flex-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Step 1</span>
              <span className="font-bold text-white">Web Frontend</span>
              <p className="text-[10px] text-slate-400 mt-0.5">User inputs URL & monitors scan</p>
            </div>
            <ArrowRight className="w-4 h-4 text-sky-500 hidden md:block" />
            <div className="p-3 bg-slate-900 border border-sky-500/40 rounded-xl w-full md:w-auto flex-1">
              <span className="text-[10px] text-sky-400 uppercase font-bold block">Step 2 (Naghulan)</span>
              <span className="font-bold text-sky-300">Azure Container Apps</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Crawls site & extracts links</p>
            </div>
            <ArrowRight className="w-4 h-4 text-sky-500 hidden md:block" />
            <div className="p-3 bg-slate-900 border border-amber-500/40 rounded-xl w-full md:w-auto flex-1">
              <span className="text-[10px] text-amber-400 uppercase font-bold block">Step 3 (Shreyaa)</span>
              <span className="font-bold text-amber-300">Azure Service Bus</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Asynchronous task queue</p>
            </div>
            <ArrowRight className="w-4 h-4 text-sky-500 hidden md:block" />
            <div className="p-3 bg-slate-900 border border-cyan-500/40 rounded-xl w-full md:w-auto flex-1">
              <span className="text-[10px] text-cyan-400 uppercase font-bold block">Step 4 (Naghulan)</span>
              <span className="font-bold text-cyan-300">Azure Workers</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Parallel HTTP check & latency</p>
            </div>
            <ArrowRight className="w-4 h-4 text-sky-500 hidden md:block" />
            <div className="p-3 bg-slate-900 border border-orange-500/40 rounded-xl w-full md:w-auto flex-1">
              <span className="text-[10px] text-orange-400 uppercase font-bold block">Step 5 (Shreyaa)</span>
              <span className="font-bold text-orange-300">Azure Cosmos DB</span>
              <p className="text-[10px] text-slate-400 mt-0.5">NoSQL link & health store</p>
            </div>
          </div>
        </div>

        {/* Service Mapping Comparison (Slide 7 Extended) */}
        <div className="mb-6">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
            Cloud Platforms and Services Comparison
          </span>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-4 border-b border-slate-800">Purpose</th>
                  <th className="py-2.5 px-4 border-b border-slate-800 text-amber-400">AWS (Other Team)</th>
                  <th className="py-2.5 px-4 border-b border-slate-800 text-sky-400">Microsoft Azure (Our Platform)</th>
                  <th className="py-2.5 px-4 border-b border-slate-800 text-slate-400">Google Cloud</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                <tr>
                  <td className="py-2 px-4 font-sans font-medium text-slate-400">API / Entry Point</td>
                  <td className="py-2 px-4">API Gateway</td>
                  <td className="py-2 px-4 text-sky-300 font-bold">Azure Container Apps</td>
                  <td className="py-2 px-4 text-slate-400">Cloud Run</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans font-medium text-slate-400">Serverless Compute</td>
                  <td className="py-2 px-4">Lambda</td>
                  <td className="py-2 px-4 text-sky-300 font-bold">Azure Container Apps</td>
                  <td className="py-2 px-4 text-slate-400">Cloud Run</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans font-medium text-slate-400">Message Queue</td>
                  <td className="py-2 px-4">Amazon SQS</td>
                  <td className="py-2 px-4 text-sky-300 font-bold">Azure Service Bus</td>
                  <td className="py-2 px-4 text-slate-400">Pub/Sub</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans font-medium text-slate-400">Processing Workers</td>
                  <td className="py-2 px-4">Lambda Workers</td>
                  <td className="py-2 px-4 text-sky-300 font-bold">Azure Container Workers</td>
                  <td className="py-2 px-4 text-slate-400">Cloud Run Workers</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans font-medium text-slate-400">Database</td>
                  <td className="py-2 px-4">DynamoDB</td>
                  <td className="py-2 px-4 text-sky-300 font-bold">Azure Cosmos DB</td>
                  <td className="py-2 px-4 text-slate-400">Firestore</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans font-medium text-slate-400">Monitoring</td>
                  <td className="py-2 px-4">CloudWatch</td>
                  <td className="py-2 px-4 text-sky-300 font-bold">Azure Monitor / App Insights</td>
                  <td className="py-2 px-4 text-slate-400">Cloud Logging</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Team Responsibilities */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-500/30">
            <div className="flex items-center space-x-2 text-sky-400 font-bold text-sm mb-1">
              <UserCheck className="w-4 h-4" />
              <span>Naghulan (23z238)</span>
            </div>
            <p className="text-xs text-slate-300">
              Primary Responsibility: <strong>Azure Container Apps, workers and link-processing logic</strong>
            </p>
            <ul className="text-[11px] text-slate-400 mt-2 space-y-1 list-disc list-inside">
              <li>Engineered Azure Container Apps REST API & HTML crawler</li>
              <li>Developed concurrent HTTP link checker & latency profiler</li>
              <li>Engineered dead link status classifiers (404, 301, 500, timeout)</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30">
            <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm mb-1">
              <UserCheck className="w-4 h-4" />
              <span>Shreyaa (23z264)</span>
            </div>
            <p className="text-xs text-slate-300">
              Primary Responsibility: <strong>Azure Service Bus, Cosmos DB, Azure Monitor & testing</strong>
            </p>
            <ul className="text-[11px] text-slate-400 mt-2 space-y-1 list-disc list-inside">
              <li>Configured Azure Service Bus queue messaging & worker dispatch</li>
              <li>Engineered Azure Cosmos DB NoSQL schema for scans and link documents</li>
              <li>Integrated Azure Monitor for centralized audit telemetry</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
