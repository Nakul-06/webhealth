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
              Microsoft Azure Decoupled Architecture
            </h2>
            <p className="text-xs text-slate-400">
              Event-driven link crawling and parallel availability verification using Azure App Service, Service Bus & Functions
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
              <span className="font-bold text-white">Web Frontend</span>
              <p className="text-[10px] text-slate-400 mt-0.5">React SPA on App Service</p>
            </div>
            <ArrowRight className="w-4 h-4 text-sky-500 hidden md:block" />
            <div className="p-3 bg-slate-900 border border-sky-500/40 rounded-xl w-full md:w-auto flex-1">
              <span className="text-[10px] text-sky-400 uppercase font-bold block">Phase 2</span>
              <span className="font-bold text-sky-300">API & Crawler</span>
              <p className="text-[10px] text-slate-400 mt-0.5">SSRF Guard + Cheerio Crawler</p>
            </div>
            <ArrowRight className="w-4 h-4 text-sky-500 hidden md:block" />
            <div className="p-3 bg-slate-900 border border-amber-500/40 rounded-xl w-full md:w-auto flex-1">
              <span className="text-[10px] text-amber-400 uppercase font-bold block">Phase 3</span>
              <span className="font-bold text-amber-300">Azure Service Bus</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Queue: dead-link-tasks (DLQ=5)</p>
            </div>
            <ArrowRight className="w-4 h-4 text-sky-500 hidden md:block" />
            <div className="p-3 bg-slate-900 border border-cyan-500/40 rounded-xl w-full md:w-auto flex-1">
              <span className="text-[10px] text-cyan-400 uppercase font-bold block">Phase 4</span>
              <span className="font-bold text-cyan-300">Azure Functions</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Service Bus Trigger Workers</p>
            </div>
            <ArrowRight className="w-4 h-4 text-sky-500 hidden md:block" />
            <div className="p-3 bg-slate-900 border border-orange-500/40 rounded-xl w-full md:w-auto flex-1">
              <span className="text-[10px] text-orange-400 uppercase font-bold block">Phase 5</span>
              <span className="font-bold text-orange-300">Azure Cosmos DB</span>
              <p className="text-[10px] text-slate-400 mt-0.5">PK: /id & /scanId (NoSQL)</p>
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
                  <th className="py-2.5 px-4 border-b border-slate-800 text-slate-300">Operational Role & Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                <tr>
                  <td className="py-2 px-4 font-sans font-medium text-slate-400">API & Web Crawler</td>
                  <td className="py-2 px-4 text-sky-300 font-bold">Azure App Service (Linux Node 20)</td>
                  <td className="py-2 px-4 font-sans text-slate-400">Hosts React UI & API; validates target URLs with SSRF Guard, crawls internal pages & creates scan jobs</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans font-medium text-slate-400">Task Message Queue</td>
                  <td className="py-2 px-4 text-sky-300 font-bold">Azure Service Bus</td>
                  <td className="py-2 px-4 font-sans text-slate-400">Queue: <code>dead-link-tasks</code>. Max delivery count: 5 with Dead-Letter Queue (DLQ) enabled for unhandled errors</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans font-medium text-slate-400">Parallel Workers</td>
                  <td className="py-2 px-4 text-sky-300 font-bold">Azure Functions (Consumption)</td>
                  <td className="py-2 px-4 font-sans text-slate-400">Independent serverless worker triggered by Service Bus; probes HTTP HEAD/GET, captures latency, upserts idempotently</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans font-medium text-slate-400">Database Engine</td>
                  <td className="py-2 px-4 text-sky-300 font-bold">Azure Cosmos DB (NoSQL API)</td>
                  <td className="py-2 px-4 font-sans text-slate-400">Database: <code>webhealth-db</code>. Container <code>scans</code> (PK: <code>/id</code>) & container <code>links</code> (PK: <code>/scanId</code>)</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans font-medium text-slate-400">Telemetry & Logs</td>
                  <td className="py-2 px-4 text-sky-300 font-bold">Azure Application Insights & Log Analytics</td>
                  <td className="py-2 px-4 font-sans text-slate-400">End-to-end telemetry, custom dimensions (<code>scanId</code>, <code>latencyMs</code>), alert on dead-letter count &gt; 0</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans font-medium text-slate-400">Secrets Management</td>
                  <td className="py-2 px-4 text-sky-300 font-bold">Azure Key Vault</td>
                  <td className="py-2 px-4 font-sans text-slate-400">Stores Cosmos DB keys and Service Bus connection strings securely via Key Vault references</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Cloud Comparison Table */}
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
            Multi-Cloud Architectural Mapping
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <span className="text-sky-400 font-bold block mb-1">Microsoft Azure (Current)</span>
              <ul className="text-[11px] text-slate-400 space-y-1">
                <li>• API: Azure App Service</li>
                <li>• Compute: Azure Functions (Workers)</li>
                <li>• Queue: Azure Service Bus</li>
                <li>• Database: Azure Cosmos DB</li>
                <li>• Logs: Application Insights</li>
              </ul>
            </div>
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <span className="text-amber-400 font-bold block mb-1">Amazon Web Services (AWS)</span>
              <ul className="text-[11px] text-slate-400 space-y-1">
                <li>• API: API Gateway / App Runner</li>
                <li>• Compute: AWS Lambda Workers</li>
                <li>• Queue: Amazon SQS (Dead-Letter)</li>
                <li>• Database: Amazon DynamoDB</li>
                <li>• Logs: Amazon CloudWatch</li>
              </ul>
            </div>
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <span className="text-emerald-400 font-bold block mb-1">Google Cloud Platform (GCP)</span>
              <ul className="text-[11px] text-slate-400 space-y-1">
                <li>• API: Cloud Run (Web API)</li>
                <li>• Compute: Cloud Run Workers</li>
                <li>• Queue: Cloud Pub/Sub</li>
                <li>• Database: Cloud Firestore</li>
                <li>• Logs: Cloud Logging</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
