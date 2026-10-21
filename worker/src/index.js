import { app } from '@azure/functions';
import appInsights from 'applicationinsights';
import { verifyLink } from './linkVerifier.js';
import { recordLinkResult } from './cosmosService.js';

// Initialize Azure Application Insights if configured
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  appInsights
    .setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true)
    .start();
}

app.serviceBusQueue('linkVerificationWorker', {
  connection: 'AZURE_SERVICE_BUS_CONNECTION_STRING',
  queueName: process.env.AZURE_QUEUE_NAME || 'dead-link-tasks',
  handler: async (message, context) => {
    let task = message;
    if (typeof message === 'string') {
      try {
        task = JSON.parse(message);
      } catch {
        task = { url: message };
      }
    }

    const { scanId, linkItem, url, type = 'internal', anchorText = '' } = task;
    const targetItem = linkItem || { scanId, url, type, anchorText };

    if (!targetItem.url || !targetItem.scanId) {
      context.error('[WORKER] Invalid link verification task payload:', message);
      return;
    }

    context.log(`[WORKER] Processing verification: ${targetItem.url} (Scan: ${targetItem.scanId})`);

    // 1. Issue HTTP probe (HEAD with fallback GET)
    const result = await verifyLink(targetItem);

    // 2. Persist to Cosmos DB idempotently & update atomic counters
    await recordLinkResult(result);

    context.log(`[WORKER] Finished: ${targetItem.url} -> Status: [${result.status}], Code: ${result.statusCode}, Latency: ${result.latencyMs}ms`);
  }
});
