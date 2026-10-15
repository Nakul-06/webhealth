import config from '../config/index.js';
import logger from './logger.js';

// In-memory NoSQL document store for Azure Cosmos DB emulation
const cosmosStore = {
  scans: new Map(), // scanId -> scanDocument
  links: new Map()  // scanId -> Map(linkId -> linkDocument)
};

logger.info('COSMOS_DB', 'Azure Cosmos DB NoSQL engine initialized (Local Emulation Mode)');

export const databaseService = {
  isMock: () => config.azure.useMock,

  /**
   * Create a new scan document in Azure Cosmos DB
   */
  async createScan(scanData) {
    const scanId = scanData.id;
    const document = {
      id: scanId,
      targetUrl: scanData.targetUrl,
      options: {
        maxDepth: scanData.maxDepth || 2,
        maxLinks: scanData.maxLinks || 50
      },
      status: 'INITIALIZING',
      summary: {
        totalFound: 0,
        totalChecked: 0,
        working: 0,      // 2xx
        redirected: 0,   // 3xx
        broken: 0,       // 4xx (Dead links)
        serverError: 0,  // 5xx
        timedOut: 0,     // Network timeouts
        avgResponseTimeMs: 0,
        healthScore: 100 // 0 to 100%
      },
      statusText: 'Scan initialized. Starting Azure crawler...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null
    };

    cosmosStore.scans.set(scanId, document);
    cosmosStore.links.set(scanId, new Map());
    logger.info('COSMOS_DB', `Document created in container 'scans': id=${scanId}`, {
      scanId,
      targetUrl: scanData.targetUrl
    });

    return document;
  },

  /**
   * Get scan metadata and summary
   */
  async getScan(scanId) {
    return cosmosStore.scans.get(scanId) || null;
  },

  /**
   * Update scan document fields
   */
  async updateScan(scanId, updateFields) {
    const updatedAt = new Date().toISOString();
    const existing = cosmosStore.scans.get(scanId);
    if (existing) {
      cosmosStore.scans.set(scanId, { ...existing, ...updateFields, updatedAt });
    }
  },

  /**
   * Record a checked link result into Azure Cosmos DB container 'links'
   */
  async addLinkResult(scanId, linkResult) {
    const linkId = linkResult.id;
    const now = new Date().toISOString();
    const linkRecord = {
      ...linkResult,
      recordedAt: now
    };

    const scan = cosmosStore.scans.get(scanId);
    if (!scan) return;

    const linksMap = cosmosStore.links.get(scanId) || new Map();
    linksMap.set(linkId, linkRecord);
    cosmosStore.links.set(scanId, linksMap);

    const summary = scan.summary;
    summary.totalChecked += 1;
    if (linkResult.status === 'WORKING') summary.working += 1;
    else if (linkResult.status === 'REDIRECTED') summary.redirected += 1;
    else if (linkResult.status === 'BROKEN') summary.broken += 1;
    else if (linkResult.status === 'SERVER_ERROR') summary.serverError += 1;
    else if (linkResult.status === 'TIMEOUT') summary.timedOut += 1;

    const newLatency = linkResult.responseTimeMs || 0;
    summary.avgResponseTimeMs = Math.round(
      summary.avgResponseTimeMs + (newLatency - summary.avgResponseTimeMs) / summary.totalChecked
    );

    const healthyLinks = summary.working + summary.redirected;
    summary.healthScore = Math.round((healthyLinks / summary.totalChecked) * 100);

    const isDone = summary.totalChecked >= summary.totalFound && summary.totalFound > 0;
    if (isDone) {
      scan.status = 'COMPLETED';
      scan.completedAt = now;
      scan.statusText = 'Scan completed. Health report ready.';
    } else {
      scan.statusText = `Azure workers verifying links (${summary.totalChecked}/${summary.totalFound})...`;
    }
    scan.updatedAt = now;
  },

  /**
   * Get all links for a specific scan
   */
  async getScanLinks(scanId, filter = {}) {
    const linksMap = cosmosStore.links.get(scanId);
    let results = linksMap ? Array.from(linksMap.values()) : [];

    if (filter.status && filter.status !== 'ALL') {
      results = results.filter((l) => l.status === filter.status);
    }
    if (filter.type && filter.type !== 'ALL') {
      results = results.filter((l) => l.type === filter.type);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      results = results.filter(
        (l) => (l.url && l.url.toLowerCase().includes(q)) || (l.anchorText && l.anchorText.toLowerCase().includes(q))
      );
    }

    return results;
  },

  /**
   * List recent scans
   */
  async listScans(limit = 10) {
    return Array.from(cosmosStore.scans.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }
};

export const firestoreService = databaseService;
export default databaseService;
