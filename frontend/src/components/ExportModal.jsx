import React from 'react';
import { X, Download, FileJson, FileSpreadsheet, Printer } from 'lucide-react';

export default function ExportModal({ isOpen, onClose, reportData }) {
  if (!isOpen || !reportData) return null;

  const downloadJSON = () => {
    const jsonStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webhealth-report-${reportData.scanId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const links = reportData.allLinks || [];
    if (links.length === 0) return;

    const headers = ['URL', 'Status', 'HTTP_Code', 'Latency_ms', 'Scope', 'Anchor_Text', 'Redirect_Target', 'Reason'];
    const rows = links.map((l) => [
      `"${(l.url || '').replace(/"/g, '""')}"`,
      l.status,
      l.statusCode || '',
      l.responseTimeMs || 0,
      l.type,
      `"${(l.anchorText || '').replace(/"/g, '""')}"`,
      `"${(l.redirectUrl || '').replace(/"/g, '""')}"`,
      `"${(l.statusMessage || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webhealth-links-${reportData.scanId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-bold text-white mb-2">Export Health Audit Report</h3>
        <p className="text-xs text-slate-400 mb-6">
          Download report data for documentation, academic submission, or offline analysis.
        </p>

        <div className="space-y-3">
          <button
            onClick={downloadJSON}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-left transition hover:border-blue-500/50"
          >
            <div className="flex items-center space-x-3">
              <FileJson className="w-5 h-5 text-indigo-400" />
              <div>
                <span className="text-sm font-bold text-white block">Download JSON Report</span>
                <span className="text-xs text-slate-400">Complete scan metadata, latency stats, and recommendations</span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={downloadCSV}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-left transition hover:border-emerald-500/50"
          >
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-sm font-bold text-white block">Export CSV Spreadsheet</span>
                <span className="text-xs text-slate-400">All {reportData.counts?.totalChecked || 0} links formatted for Excel or Sheets</span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-left transition hover:border-slate-500"
          >
            <div className="flex items-center space-x-3">
              <Printer className="w-5 h-5 text-blue-400" />
              <div>
                <span className="text-sm font-bold text-white block">Print / Save as PDF</span>
                <span className="text-xs text-slate-400">Browser print formatted health dashboard</span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
