import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import GcpPipelineBanner from './components/GcpPipelineBanner';
import ScanInput from './components/ScanInput';
import HealthScoreCard from './components/HealthScoreCard';
import StatCards from './components/StatCards';
import StatusDistributionBar from './components/StatusDistributionBar';
import RecommendationsPanel from './components/RecommendationsPanel';
import LinksTable from './components/LinksTable';
import CloudLogsDrawer from './components/CloudLogsDrawer';
import ArchitectureModal from './components/ArchitectureModal';
import ExportModal from './components/ExportModal';
import { Activity, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Cpu, Database } from 'lucide-react';

export default function App() {
  const [systemStatus, setSystemStatus] = useState(null);
  const [activeScanId, setActiveScanId] = useState(null);
  const [scan, setScan] = useState(null);
  const [report, setReport] = useState(null);
  const [links, setLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modals state
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isArchOpen, setIsArchOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const pollTimerRef = useRef(null);

  // Fetch GCP System Status
  useEffect(() => {
    fetch('/api/system/status')
      .then((res) => res.json())
      .then((data) => setSystemStatus(data))
      .catch((err) => console.error('Failed to get system status:', err));
  }, []);

  // Poll active scan status
  useEffect(() => {
    if (!activeScanId) return;

    const pollScan = async () => {
      try {
        const res = await fetch(`/api/scans/${activeScanId}`);
        if (!res.ok) return;
        const scanData = await res.json();
        setScan(scanData);

        // Fetch links
        const linksRes = await fetch(`/api/scans/${activeScanId}/links`);
        if (linksRes.ok) {
          const linksData = await linksRes.json();
          setLinks(linksData.links || []);
        }

        // If completed or failed, fetch full report and stop polling
        if (scanData.status === 'COMPLETED' || scanData.status === 'FAILED') {
          setIsLoading(false);
          const reportRes = await fetch(`/api/scans/${activeScanId}/report`);
          if (reportRes.ok) {
            const reportData = await reportRes.json();
            setReport(reportData);
          }
        } else {
          pollTimerRef.current = setTimeout(pollScan, 1500);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    pollScan();

    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [activeScanId]);

  // Start new scan handler
  const handleStartScan = async (params) => {
    try {
      setIsLoading(true);
      setError(null);
      setReport(null);
      setLinks([]);
      setScan(null);

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit scan request');
      }

      const data = await res.json();
      setActiveScanId(data.scanId);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const progressPercentage =
    scan?.summary?.totalFound > 0
      ? Math.min(100, Math.round(((scan?.summary?.totalChecked || 0) / scan.summary.totalFound) * 100))
      : scan?.status === 'CRAWLING'
      ? 20
      : 0;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        onOpenLogs={() => setIsLogsOpen(true)}
        onOpenArch={() => setIsArchOpen(true)}
        systemStatus={systemStatus}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* GCP System Architecture Flow */}
        <GcpPipelineBanner
          scanStatus={scan?.status || 'IDLE'}
          currentStep={scan?.status}
        />

        {/* Scan Input Controller */}
        <ScanInput onStartScan={handleStartScan} isLoading={isLoading} />

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center space-x-3 text-xs">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Live Progress Bar when Scan is Active */}
        {isLoading && scan && (
          <div className="p-5 rounded-2xl bg-slate-800/90 border border-blue-500/30 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="font-bold text-white">
                  {scan.statusText || 'GCP Cloud Run processing...'}
                </span>
              </div>
              <span className="font-mono text-blue-400 font-semibold">
                {scan.summary?.totalChecked || 0} / {scan.summary?.totalFound || '?'} verified ({progressPercentage}%)
              </span>
            </div>

            <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-700/60 p-0.5">
              <div
                className="bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Task distributed to Azure Container Workers via Azure Service Bus</span>
              <span className="font-mono text-slate-500">Job ID: {activeScanId?.slice(0, 8)}</span>
            </div>
          </div>
        )}

        {/* Results & Health Report Display */}
        {scan && (
          <div className="space-y-6">
            {/* Stat Cards Breakdown */}
            <StatCards summary={scan.summary} counts={report?.counts} />

            {/* Health Score + Automated Recommendations Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HealthScoreCard
                healthAssessment={report?.healthAssessment || {
                  score: scan.summary?.healthScore || 100,
                  grade: scan.summary?.healthScore >= 90 ? 'A+' : scan.summary?.healthScore >= 75 ? 'A' : 'B',
                  gradeText: scan.statusText
                }}
                latencyMetrics={report?.latencyMetrics || {
                  avgResponseTimeMs: scan.summary?.avgResponseTimeMs || 0,
                  p95Ms: scan.summary?.avgResponseTimeMs || 0
                }}
                isCompleted={scan.status === 'COMPLETED'}
              />

              <RecommendationsPanel
                recommendations={
                  report?.recommendations || [
                    {
                      type: 'INFO',
                      title: 'Live Scan in Progress',
                      description: 'Link results are actively streamed into Azure Cosmos DB. Comprehensive report will finalize once all workers acknowledge.'
                    }
                  ]
                }
              />
            </div>

            {/* Horizontal Distribution Bar */}
            <StatusDistributionBar summary={scan.summary} />

            {/* Interactive Verified Links Table */}
            <LinksTable
              links={links}
              onExportReport={() => setIsExportOpen(true)}
            />
          </div>
        )}

        {/* Empty State Banner if no scan has been initiated yet */}
        {!scan && !isLoading && (
          <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-slate-800 bg-slate-900/30">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
              <Activity className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Ready to Monitor Website Health</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
              Enter any website URL above or click the built-in testbed preset to observe the live Azure serverless detection pipeline.
            </p>
            <button
              onClick={() => handleStartScan({ url: 'http://localhost:8080/api/test-site', maxDepth: 1, maxLinks: 20 })}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-sky-500/20 transition"
            >
              <span>Launch Demo Evaluation Scan</span>
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Cloud Computing — Review 1 | <strong>Microsoft Azure Implementation</strong>
          </span>
          <div className="flex items-center space-x-3">
            <span>Naghulan Sivamani R V (23z238)</span>
            <span>•</span>
            <span>Shreyaa S V (23z264)</span>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <CloudLogsDrawer
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
      />

      <ArchitectureModal
        isOpen={isArchOpen}
        onClose={() => setIsArchOpen(false)}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        reportData={report}
      />
    </div>
  );
}
