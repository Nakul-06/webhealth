import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Terminal } from 'lucide-react';

export default function CloudLogsDrawer({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterComponent, setFilterComponent] = useState('ALL');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/system/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filterSeverity !== 'ALL' && log.severity !== filterSeverity) return false;
    if (filterComponent !== 'ALL' && log.component !== filterComponent) return false;
    return true;
  });

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'ERROR':
        return <span className="text-red-400 font-bold bg-red-500/10 px-1.5 py-0.5 rounded text-[10px]">ERROR</span>;
      case 'WARNING':
        return <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px]">WARN</span>;
      default:
        return <span className="text-sky-400 font-bold bg-sky-500/10 px-1.5 py-0.5 rounded text-[10px]">INFO</span>;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[540px] bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col font-mono">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
        <div className="flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-sky-400" />
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Audit & Telemetry Stream</h3>
            <p className="text-[11px] text-slate-400">Real-time distributed link verification logs</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <select
            value={filterComponent}
            onChange={(e) => setFilterComponent(e.target.value)}
            className="bg-slate-800 text-slate-300 border border-slate-700 rounded px-2 py-1 text-xs"
          >
            <option value="ALL">All Components</option>
            <option value="CONTAINER_APPS">API Gateway</option>
            <option value="SERVICE_BUS">Message Queue</option>
            <option value="WORKER">Worker Engine</option>
            <option value="COSMOS_DB">Database</option>
            <option value="CRAWLER">Crawler</option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-800 text-slate-300 border border-slate-700 rounded px-2 py-1 text-xs"
          >
            <option value="ALL">All Severities</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
          </select>
        </div>

        <label className="flex items-center space-x-1.5 cursor-pointer text-slate-400 text-xs select-none">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded bg-slate-800 border-slate-700 accent-sky-500"
          />
          <span>Auto-poll (3s)</span>
        </label>
      </div>

      {/* Logs Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-600">
            No logs recorded yet. Start a website scan to view the event stream.
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div
              key={index}
              className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                <div className="flex items-center space-x-1.5">
                  {getSeverityBadge(log.severity)}
                  <span className="text-sky-400 font-bold">[{log.component}]</span>
                </div>
                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-slate-200 break-words leading-relaxed text-[11px] font-sans">
                {log.message}
              </p>
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <pre className="mt-1.5 p-1.5 rounded bg-slate-900 border border-slate-800/60 text-[10px] text-slate-400 overflow-x-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950 text-[11px] text-slate-500 flex justify-between items-center">
        <span>Log sink: Central Telemetry Store</span>
        <span>Showing {filteredLogs.length} entries</span>
      </div>
    </div>
  );
}
