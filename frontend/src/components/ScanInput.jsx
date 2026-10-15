import React, { useState } from 'react';
import { Search, Play, Settings2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

export default function ScanInput({ onStartScan, isLoading }) {
  const [url, setUrl] = useState('');
  const [maxDepth, setMaxDepth] = useState(2);
  const [maxLinks, setMaxLinks] = useState(30);
  const [showOptions, setShowOptions] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    let trimmed = url.trim();
    if (!trimmed) {
      setValidationError('Please enter a website URL');
      return;
    }

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = 'https://' + trimmed;
      setUrl(trimmed);
    }

    try {
      new URL(trimmed);
    } catch {
      setValidationError('Please enter a valid URL');
      return;
    }

    onStartScan({ url: trimmed, maxDepth: Number(maxDepth), maxLinks: Number(maxLinks) });
  };

  const handleSetQuickUrl = (quickUrl, depth = 1, links = 25) => {
    setUrl(quickUrl);
    setMaxDepth(depth);
    setMaxLinks(links);
    setValidationError('');
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="mb-4">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <span>Website Health Scanner</span>
          <span className="text-xs bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full font-medium">
            Azure Container Apps
          </span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Scan any website to automatically detect dead links, redirects, and latency issues using serverless Azure workers.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-5 h-5 text-sky-400" />
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setValidationError('');
            }}
            placeholder="Enter target website URL (e.g., https://example.com or use quick preset below)"
            disabled={isLoading}
            className="w-full pl-11 pr-32 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm transition font-mono disabled:opacity-60"
          />

          <div className="absolute inset-y-1.5 right-1.5 flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
              title="Scanner configuration"
            >
              <Settings2 className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold rounded-lg shadow-md transition disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Scan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {validationError && (
          <div className="flex items-center space-x-1.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Quick Presets for Instant Demo */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-400 font-medium">Quick Presets:</span>
          <button
            type="button"
            onClick={() => handleSetQuickUrl('http://localhost:8080/api/test-site', 1, 20)}
            className="text-xs px-2.5 py-1 rounded-lg bg-sky-950/60 hover:bg-sky-900/60 border border-sky-500/30 text-sky-300 transition flex items-center space-x-1"
          >
            <Sparkles className="w-3 h-3 text-sky-400" />
            <span>Built-in Testbed (200s, 301s, 404s, 500s)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetQuickUrl('https://news.ycombinator.com', 1, 30)}
            className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition"
          >
            Hacker News
          </button>
          <button
            type="button"
            onClick={() => handleSetQuickUrl('https://azure.microsoft.com', 1, 20)}
            className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition"
          >
            Microsoft Azure Official
          </button>
        </div>

        {/* Advanced Options Drawer */}
        {showOptions && (
          <div className="pt-4 border-t border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Max Links to Check: <span className="text-sky-400 font-mono">{maxLinks}</span>
              </label>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={maxLinks}
                onChange={(e) => setMaxLinks(e.target.value)}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <span className="text-[11px] text-slate-400">Controls worker task batch size in Azure Service Bus</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Crawl Depth: <span className="text-sky-400 font-mono">Depth {maxDepth}</span>
              </label>
              <div className="flex space-x-2">
                {[1, 2, 3].map((depth) => (
                  <button
                    key={depth}
                    type="button"
                    onClick={() => setMaxDepth(depth)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition ${
                      maxDepth === depth
                        ? 'bg-sky-600 text-white border-sky-500'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    Depth {depth} {depth === 1 ? '(Single Page)' : '(Recursive)'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
