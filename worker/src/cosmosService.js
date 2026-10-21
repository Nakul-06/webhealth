import { CosmosClient } from '@azure/cosmos';
import crypto from 'crypto';

const endpoint = process.env.AZURE_COSMOS_ENDPOINT || null;
const key = process.env.AZURE_COSMOS_KEY || null;
const databaseName = process.env.AZURE_DATABASE_NAME || 'webhealth-db';

let cosmosClient = null;
let scansContainer = null;
let linksContainer = null;

if (endpoint && key) {
  try {
    cosmosClient = new CosmosClient({ endpoint, key });
    const database = cosmosClient.database(databaseName);
    scansContainer = database.container('scans');
    linksContainer = database.container('links');
  } catch (err) {
    console.error('Failed to initialize Cosmos DB in worker:', err.message);
  }
}

export function generateLinkId(scanId, url) {
  return crypto.createHash('sha256').update(`${scanId}|${url}`).digest('hex');
}

/**
 * Persists verified link result idempotently and updates scan progress.
 */
export async function recordLinkResult(linkResult) {
  const { scanId, url } = linkResult;
  const linkId = generateLinkId(scanId, url);

  const linkDocument = {
    id: linkId,
    scanId, // Partition key
    ...linkResult,
    updatedAt: new Date().toISOString()
  };

  if (!linksContainer || !scansContainer) {
    console.warn('[WORKER] Live Cosmos DB not connected. Processed link in-memory:', url, linkResult.status);
    return linkDocument;
  }

  // 1. Idempotent upsert into 'links' container
  await linksContainer.items.upsert(linkDocument);

  // 2. Fetch scan document to update counters atomically
  try {
    const { resource: scanDoc } = await scansContainer.item(scanId, scanId).read();
    if (!scanDoc) {
      console.warn(`[WORKER] Scan ${scanId} not found in Cosmos DB.`);
      return linkDocument;
    }

    scanDoc.summary = scanDoc.summary || {
      totalFound: 0,
      totalChecked: 0,
      working: 0,
      redirected: 0,
      broken: 0,
      timedOut: 0,
      avgResponseTimeMs: 0,
      healthScore: 100
    };

    scanDoc.processedLinks = (scanDoc.processedLinks || 0) + 1;
    scanDoc.summary.totalChecked = scanDoc.processedLinks;

    if (linkResult.status === 'WORKING') scanDoc.summary.working++;
    else if (linkResult.status === 'REDIRECT') scanDoc.summary.redirected++;
    else if (linkResult.status === 'BROKEN') scanDoc.summary.broken++;
    else if (linkResult.status === 'TIMEOUT') scanDoc.summary.timedOut++;

    const totalLinks = scanDoc.totalLinks || scanDoc.summary.totalFound || scanDoc.processedLinks;

    // Calculate score: working / total * 100
    scanDoc.summary.healthScore = totalLinks > 0
      ? Math.round((scanDoc.summary.working / totalLinks) * 100)
      : 100;

    // Update status to COMPLETED if all links are verified
    if (scanDoc.processedLinks >= totalLinks && scanDoc.status !== 'FAILED') {
      scanDoc.status = 'COMPLETED';
      scanDoc.statusText = `Scan complete. Successfully verified ${scanDoc.processedLinks} of ${totalLinks} links.`;
      scanDoc.completedAt = new Date().toISOString();
    } else {
      scanDoc.status = 'CHECKING_LINKS';
      scanDoc.statusText = `Verifying links (${scanDoc.processedLinks} of ${totalLinks} processed)...`;
    }

    scanDoc.updatedAt = new Date().toISOString();
    await scansContainer.items.upsert(scanDoc);
  } catch (err) {
    console.error(`[WORKER] Error updating scan progress in Cosmos DB: ${err.message}`);
  }

  return linkDocument;
}

export default { generateLinkId, recordLinkResult };
