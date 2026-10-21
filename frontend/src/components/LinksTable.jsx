import React, { useState, useMemo } from 'react';
import { Search, ExternalLink, Copy, Check, Filter, Download, ArrowUpDown } from 'lucide-react';

export default function LinksTable({ links = [], onExportReport }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [copiedId, setCopiedId] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      // Status filter
      if (statusFilter !== 'ALL' && link.status !== statusFilter) {
        return false;
      }
      // Type filter (INTERNAL/EXTERNAL)
      if (typeFilter !== 'ALL' && link.type !== typeFilter) {
        return false;
      }
      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesUrl = link.url?.toLowerCase().includes(q);
        const matchesAnchor = link.anchorText?.toLowerCase().includes(q);
        const matchesCode = link.statusCode?.toString().includes(q);
        if (!matchesUrl && !matchesAnchor && !matchesCode) {
          return false;
        }
      }
      return true;
    });
  }, [links, statusFilter, typeFilter, searchTerm]);

  const totalPages = Math.ceil(filteredLinks.length / pageSize) || 1;
  const paginatedLinks = filteredLinks.slice((page - 1) * pageSize, page * pageSize);

  const getStatusBadge = (status, code) => {
    switch (status) {
      case 'WORKING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {code || 200} Working
          </span>
        );
      case 'REDIRECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            {code || 301} Redirect
          </span>
        );
      case 'BROKEN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
            {code || 404} Dead Link
          </span>
        );
      case 'SERVER_ERROR':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {code || 500} Server Error
          </span>
        );
      case 'TIMEOUT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Timeout
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">
            {status}
          </span>
        );
    }
  };

  const counts = useMemo(() => {
    return {
      all: links.length,
      working: links.filter((l) => l.status === 'WORKING').length,
      broken: links.filter((l) => l.status === 'BROKEN').length,
      redirected: links.filter((l) => l.status === 'REDIRECTED').length,
      errors: links.filter((l) => l.status === 'SERVER_ERROR' || l.status === 'TIMEOUT').length,
      internal: links.filter((l) => l.type === 'INTERNAL').length,
      external: links.filter((l) => l.type === 'EXTERNAL').length
    };
  }, [links]);

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden mt-6">
      {/* Header & Controls */}
      <div className="p-5 border-b border-slate-700/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Discovered Links Directory</span>
              <span className="text-xs bg-slate-900 px-2 py-0.5 rounded-full text-slate-400 border border-slate-700 font-mono">
                {links.length} URLs
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Individual link availability, response latency, and HTTP status codes verified by Azure Cloud Workers.
            </p>
          </div>

          {links.length > 0 && (
            <button
              onClick={onExportReport}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg transition"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export Report</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            onClick={() => { setStatusFilter('ALL'); setPage(1); }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-700'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            onClick={() => { setStatusFilter('BROKEN'); setPage(1); }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              statusFilter === 'BROKEN'
                ? 'bg-red-600 text-white'
                : 'bg-slate-900 text-red-400 hover:bg-red-950/30 border border-red-500/30'
            }`}
          >
            Dead Links ({counts.broken})
          </button>
          <button
            onClick={() => { setStatusFilter('WORKING'); setPage(1); }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              statusFilter === 'WORKING'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-emerald-400 hover:bg-emerald-950/30 border border-emerald-500/30'
            }`}
          >
            Working ({counts.working})
          </button>
          <button
            onClick={() => { setStatusFilter('REDIRECTED'); setPage(1); }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              statusFilter === 'REDIRECTED'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-900 text-sky-400 hover:bg-sky-950/30 border border-sky-500/30'
            }`}
          >
            Redirects ({counts.redirected})
          </button>
          <button
            onClick={() => { setStatusFilter('SERVER_ERROR'); setPage(1); }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              statusFilter === 'SERVER_ERROR'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-900 text-amber-400 hover:bg-amber-950/30 border border-amber-500/30'
            }`}
          >
            Errors ({counts.errors})
          </button>

          {/* Scope Dropdown */}
          <div className="ml-auto flex items-center space-x-2">
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="bg-slate-900 text-slate-300 border border-slate-700 rounded-lg px-2.5 py-1 text-xs focus:outline-none"
            >
              <option value="ALL">Scope: All Links</option>
              <option value="INTERNAL">Internal Only ({counts.internal})</option>
              <option value="EXTERNAL">External Only ({counts.external})</option>
            </select>

            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                placeholder="Search URL or anchor..."
                className="pl-7 pr-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44 sm:w-56"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-700/60 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Target URL & Anchor</th>
              <th className="py-3 px-4">Scope</th>
              <th className="py-3 px-4">Latency</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40 font-mono">
            {paginatedLinks.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-8 text-center text-slate-500 font-sans">
                  No links match the selected filter criteria.
                </td>
              </tr>
            ) : (
              paginatedLinks.map((link) => (
                <tr key={link.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap">
                    {getStatusBadge(link.status, link.statusCode)}
                  </td>
                  <td className="py-3 px-4 max-w-md">
                    <div className="truncate font-medium text-slate-100" title={link.url}>
                      {link.url}
                    </div>
                    {link.anchorText && (
                      <div className="text-[11px] text-slate-400 truncate mt-0.5 font-sans">
                        Anchor: "{link.anchorText}"
                      </div>
                    )}
                    {link.redirectUrl && (
                      <div className="text-[11px] text-sky-400 truncate mt-0.5">
                        ↳ Redirects to: {link.redirectUrl}
                      </div>
                    )}
                    {link.statusMessage && link.status !== 'WORKING' && (
                      <div className="text-[11px] text-red-400/90 truncate mt-0.5 font-sans">
                        Reason: {link.statusMessage}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        link.type === 'INTERNAL'
                          ? 'bg-slate-800 text-slate-300 border border-slate-700'
                          : 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/20'
                      }`}
                    >
                      {link.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`font-semibold ${
                        (link.responseTimeMs || 0) > 1500
                          ? 'text-amber-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {link.responseTimeMs || 0} ms
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => handleCopy(link.id, link.url)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition"
                        title="Copy URL"
                      >
                        {copiedId === link.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded transition"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-slate-700/60 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredLinks.length)} of {filteredLinks.length}
          </span>
          <div className="flex space-x-1.5">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded border border-slate-700 transition"
            >
              Previous
            </button>
            <span className="px-2.5 py-1 font-mono text-slate-200">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded border border-slate-700 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
