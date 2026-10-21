import { CosmosClient } from '@azure/cosmos';
import crypto from 'crypto';
import config from '../config/index.js';
import logger from './logger.js';

// In-memory NoSQL document store for high-performance caching & sandbox emulation
const memoryCosmosStore = {
  scans: new Map(), // scanId -> scanDocument
  links: new Map()  // scanId -> Map(linkId -> linkDocument)
};

let liveCosmosClient = null;
let liveScansContainer = null;
let liveLinksContainer = null;

// Initialize Live Azure Cosmos DB if credentials are configured
if (config.azure.cosmosDb.endpoint && config.azure.cosmosDb.key) {
  try {
    liveCosmosClient = new CosmosClient({
      endpoint: config.azure.cosmosDb.endpoint,
      key: config.azure.cosmosDb.key
    });
    const database = liveCosmosClient.database(config.azure.cosmosDb.databaseName);
    liveScansContainer = database.container(config.azure.cosmosDb.scansContainer);
    liveLinksContainer = database.container(config.azure.cosmosDb.linksContainer);
    logger.info('COSMOS_DB', `Connected to live Azure Cosmos DB: ${config.azure.cosmosDb.endpoint} (Database: ${config.azure.cosmosDb.databaseName})`);
  } catch (err) {
    logger.warn('COSMOS_DB', `Could not initialize live Azure Cosmos DB (${err.message}). Engaging Sandbox Emulation mode.`);
  }
} else {
  logger.info('COSMOS_DB', 'Azure Cosmos DB initialized in SANDBOX EMULATION MODE (No Azure credentials detected)');
}

export function generateLinkId(scanId, url) {
  return crypto.createHash('sha256').update(`${scanId}|${url}`).digest('hex');
}

export const cosmosService = {
  isMock: () => !liveScansContainer,

  /**
   * Create a new scan document in Azure Cosmos DB
   * Partition key: /id
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
      totalLinks: 0,
      processedLinks: 0,
      summary: {
        totalFound: 0,
        totalChecked: 0,
        working: 0,      // 2xx
        redirected: 0,   // 3xx
        broken: 0,       // 4xx, 5xx, network failures
        timedOut: 0,     // Network timeouts
        avgResponseTimeMs: 0,
        healthScore: 100 // 0 to 100%
      },
      statusText: 'Scan initialized. Starting crawler...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null
    };

    memoryCosmosStore.scans.set(scanId, document);
    memoryCosmosStore.links.set(scanId, new Map());

    // Persist to live Cosmos DB if available
    if (liveScansContainer) {
      try {
        await liveScansContainer.items.upsert(document);
        logger.info('COSMOS_DB', `Successfully saved scan ${scanId} to live Azure Cosmos DB container 'scans'.`);
      } catch (err) {
        logger.warn('COSMOS_DB', `Live Cosmos DB scan creation upsert failed: ${err.message}`);
      }
    }

    logger.info('COSMOS_DB', `Scan document created in container 'scans': id=${scanId}`, {
      scanId,
      targetUrl: scanData.targetUrl
    });

    return document;
  },

  /**
   * Get scan metadata and summary
   */
  async getScan(scanId) {
    if (liveScansContainer) {
      try {
        const { resource } = await liveScansContainer.item(scanId, scanId).read();
        if (resource) {
          memoryCosmosStore.scans.set(scanId, resource);
          return resource;
        }
      } catch (err) {
        // Fall back to memory cache
      }
    }
    return memoryCosmosStore.scans.get(scanId) || null;
  },

  /**
   * Update scan document fields
   */
  async updateScan(scanId, updateFields) {
    const updatedAt = new Date().toISOString();
    const existing = memoryCosmosStore.scans.get(scanId) || {};
    const updated = { ...existing, ...updateFields, updatedAt };
    memoryCosmosStore.scans.set(scanId, updated);

    if (liveScansContainer) {
      try {
        await liveScansContainer.items.upsert(updated);
      } catch (err) {
        logger.warn('COSMOS_DB', `Cosmos DB update failed: ${err.message}`);
      }
    }

    return updated;
  },

  /**
   * Add a verified link result idempotently (id = sha256(scanId + url))
   * Partition key: /scanId
   */
  async addLinkResult(scanId, linkResult) {
    const linkId = generateLinkId(scanId, linkResult.url);
    const linkDocument = {
      id: linkId,
      scanId, // Partition key
      ...linkResult,
      updatedAt: new Date().toISOString()
    };

    // Store in memory
    const scanLinksMap = memoryCosmosStore.links.get(scanId) || new Map();
    const isNewLink = !scanLinksMap.has(linkId);
    scanLinksMap.set(linkId, linkDocument);
    memoryCosmosStore.links.set(scanId, scanLinksMap);

    // Update scan progress in memory
    const scan = memoryCosmosStore.scans.get(scanId);
    if (scan && isNewLink) {
      scan.processedLinks = (scan.processedLinks || 0) + 1;
      scan.summary.totalChecked = scan.processedLinks;

      if (linkResult.status === 'WORKING') scan.summary.working++;
      else if (linkResult.status === 'REDIRECT') scan.summary.redirected++;
      else if (linkResult.status === 'BROKEN') scan.summary.broken++;
      else if (linkResult.status === 'TIMEOUT') scan.summary.timedOut++;

      // Recalculate average response time
      const allLinks = Array.from(scanLinksMap.values());
      const validLatencies = allLinks.filter((l) => typeof l.latencyMs === 'number').map((l) => l.latencyMs);
      if (validLatencies.length > 0) {
        scan.summary.avgResponseTimeMs = Math.round(
          validLatencies.reduce((sum, v) => sum + v, 0) / validLatencies.length
        );
      }

      // Calculate health score: working / total * 100
      const total = scan.totalLinks || scan.summary.totalFound || scan.processedLinks;
      scan.summary.healthScore = total > 0 ? Math.round((scan.summary.working / total) * 100) : 100;

      // Completion check
      if (scan.processedLinks >= total || scanLinksMap.size >= total) {
        scan.status = 'COMPLETED';
        scan.statusText = `Scan complete. Successfully verified ${scanLinksMap.size} of ${total} links.`;
        scan.completedAt = new Date().toISOString();
      } else {
        scan.status = 'CHECKING_LINKS';
        scan.statusText = `Verifying links (${scanLinksMap.size} of ${total} processed)...`;
      }

      scan.updatedAt = new Date().toISOString();
    }

    // Persist to live Cosmos DB if connected
    if (liveLinksContainer) {
      try {
        await liveLinksContainer.items.upsert(linkDocument);
        logger.info('COSMOS_DB', `Successfully saved link ${linkDocument.url} to live Azure Cosmos DB container 'links'.`);
      } catch (err) {
        logger.warn('COSMOS_DB', `Cosmos DB link upsert failed: ${err.message}`);
      }
    }

    if (liveScansContainer && scan) {
      try {
        await liveScansContainer.items.upsert(scan);
      } catch (err) {
        logger.warn('COSMOS_DB', `Cosmos DB scan counter upsert failed: ${err.message}`);
      }
    }

    return linkDocument;
  },

  /**
   * Get all links for a scan with optional filters
   */
  async getScanLinks(scanId, filters = {}) {
    let links = [];

    if (liveLinksContainer) {
      try {
        const querySpec = {
          query: 'SELECT * FROM c WHERE c.scanId = @scanId',
          parameters: [{ name: '@scanId', value: scanId }]
        };
        const { resources } = await liveLinksContainer.items.query(querySpec, { partitionKey: scanId }).fetchAll();
        if (resources && resources.length > 0) {
          links = resources;
        }
      } catch (err) {
        // Fall back to memory cache
      }
    }

    if (links.length === 0) {
      const scanLinksMap = memoryCosmosStore.links.get(scanId);
      links = scanLinksMap ? Array.from(scanLinksMap.values()) : [];
    }

    // Apply filtering
    if (filters.status) {
      const s = filters.status.toUpperCase();
      links = links.filter((l) => l.status === s);
    }

    if (filters.type) {
      const t = filters.type.toUpperCase();
      links = links.filter((l) => (l.type || '').toUpperCase() === t);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      links = links.filter(
        (l) => (l.url && l.url.toLowerCase().includes(q)) || (l.anchorText && l.anchorText.toLowerCase().includes(q))
      );
    }

    return links;
  },

  /**
   * Finalize a scan if workers have completed or if watchdog timeout fires
   */
  async finalizeScan(scanId) {
    const scan = memoryCosmosStore.scans.get(scanId);
    if (!scan) return null;

    if (scan.status !== 'COMPLETED' && scan.status !== 'FAILED') {
      const scanLinksMap = memoryCosmosStore.links.get(scanId) || new Map();
      const actualCount = scanLinksMap.size;
      const allLinks = Array.from(scanLinksMap.values());

      scan.totalLinks = actualCount;
      scan.processedLinks = actualCount;
      scan.summary.totalFound = actualCount;
      scan.summary.totalChecked = actualCount;

      const workingCount = allLinks.filter((l) => l.status === 'WORKING').length;
      scan.summary.working = workingCount;
      scan.summary.broken = allLinks.filter((l) => l.status === 'BROKEN').length;
      scan.summary.redirected = allLinks.filter((l) => l.status === 'REDIRECT').length;
      scan.summary.timedOut = allLinks.filter((l) => l.status === 'TIMEOUT').length;

      scan.summary.healthScore = actualCount > 0 ? Math.round((workingCount / actualCount) * 100) : 100;
      scan.status = 'COMPLETED';
      scan.statusText = `Scan complete. Successfully verified all ${actualCount} discovered links.`;
      scan.completedAt = new Date().toISOString();
      scan.updatedAt = new Date().toISOString();

      if (liveScansContainer) {
        liveScansContainer.items.upsert(scan).catch(() => {});
      }

      logger.info('COSMOS_DB', `Watchdog finalized scan ${scanId} to COMPLETED (${actualCount} links).`);
    }

    return scan;
  },

  /**
   * List recent scans from Azure Cosmos DB
   */
  async listScans(limit = 10) {
    if (liveScansContainer) {
      try {
        const querySpec = {
          query: 'SELECT TOP @limit * FROM c ORDER BY c._ts DESC',
          parameters: [{ name: '@limit', value: limit }]
        };
        const { resources } = await liveScansContainer.items.query(querySpec).fetchAll();
        if (resources && resources.length > 0) {
          return resources;
        }
      } catch (err) {
        // Fall back to memory
      }
    }
    return Array.from(memoryCosmosStore.scans.values()).slice(-limit).reverse();
  }
};

export default cosmosService;
