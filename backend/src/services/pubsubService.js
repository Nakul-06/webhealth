import { ServiceBusClient } from '@azure/service-bus';
import config from '../config/index.js';
import logger from './logger.js';
import linkChecker from './linkChecker.js';
import databaseService from './cosmosService.js';

let liveSbClient = null;
let liveSbSender = null;

// Initialize Live Azure Service Bus if connection string is configured
if (config.azure.serviceBus.connectionString) {
  try {
    liveSbClient = new ServiceBusClient(config.azure.serviceBus.connectionString);
    liveSbSender = liveSbClient.createSender(config.azure.serviceBus.queueName);
    logger.info('SERVICE_BUS', `Connected to live Azure Service Bus (Queue: ${config.azure.serviceBus.queueName})`);
  } catch (err) {
    logger.warn('SERVICE_BUS', `Could not initialize live Azure Service Bus (${err.message}). Using sandbox worker queue.`);
  }
} else {
  logger.info('SERVICE_BUS', `Azure Service Bus running in SANDBOX EMULATION MODE (Queue: ${config.azure.serviceBus.queueName})`);
}

/**
 * Sandbox Parallel Worker Queue (Only active when live Azure Service Bus is not configured)
 */
class AzureWorkerQueue {
  constructor(concurrency = 6) {
    this.concurrency = concurrency;
    this.activeWorkers = 0;
    this.queue = [];
  }

  enqueue(task) {
    this.queue.push(task);
    this.processNext();
  }

  cancelTasksForScan(scanId) {
    const initial = this.queue.length;
    this.queue = this.queue.filter((t) => t.scanId !== scanId);
    return initial - this.queue.length;
  }

  async processNext() {
    if (this.activeWorkers >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.activeWorkers++;
    const task = this.queue.shift();

    try {
      await this.executeTask(task);
    } catch (err) {
      logger.error('WORKER', `Worker execution error: ${err.message}`);
    } finally {
      this.activeWorkers--;
      this.processNext();
    }
  }

  async executeTask(task) {
    const { scanId, linkItem } = task;
    logger.info('WORKER', `[Azure Worker] Verifying link: ${linkItem.url}`, {
      scanId,
      linkId: linkItem.id,
      type: linkItem.type
    });

    try {
      const result = await linkChecker.check(linkItem);
      await databaseService.addLinkResult(scanId, result);

      logger.info('COSMOS_DB', `Saved verification result: ${linkItem.url} -> [${result.status}]`, {
        scanId,
        status: result.status,
        latency: result.responseTimeMs
      });
    } catch (err) {
      logger.error('WORKER', `Worker failed on ${linkItem.url}: ${err.message}`);
      await databaseService.addLinkResult(scanId, {
        id: linkItem.id,
        scanId,
        url: linkItem.url,
        anchorText: linkItem.anchorText || '',
        parentUrl: linkItem.parentUrl || '',
        type: linkItem.type || 'internal',
        status: 'TIMEOUT',
        statusCode: 408,
        statusMessage: `Worker error: ${err.message}`,
        latencyMs: 6000,
        responseTimeMs: 6000,
        checkedAt: new Date().toISOString()
      });
    }

    // Auto-finalize when queue is drained
    if (this.queue.length === 0 && this.activeWorkers <= 1) {
      setTimeout(() => {
        databaseService.finalizeScan(scanId).catch(() => {});
      }, 800);
    }
  }
}

const workerQueue = new AzureWorkerQueue(10);

export const queueService = {
  isMock: () => !liveSbSender,

  /**
   * Send link-checking messages into Azure Service Bus Queue in batches (or locally in sandbox)
   */
  async publishLinkBatch(scanId, linkItems) {
    if (!linkItems || linkItems.length === 0) return;

    if (liveSbSender) {
      try {
        const messages = linkItems.map((item) => ({
          body: {
            scanId,
            url: item.url,
            type: item.type,
            anchorText: item.anchorText || '',
            parentUrl: item.parentUrl || '',
            enqueuedAt: new Date().toISOString()
          },
          contentType: 'application/json',
          subject: 'link-verification-task'
        }));

        // Send in batches of 10 to Azure Service Bus
        const BATCH_SIZE = 10;
        for (let i = 0; i < messages.length; i += BATCH_SIZE) {
          const chunk = messages.slice(i, i + BATCH_SIZE);
          let batch = await liveSbSender.createMessageBatch();
          for (const msg of chunk) {
            if (!batch.tryAddMessage(msg)) {
              await liveSbSender.sendMessages(batch);
              batch = await liveSbSender.createMessageBatch();
              batch.tryAddMessage(msg);
            }
          }
          if (batch.count > 0) {
            await liveSbSender.sendMessages(batch);
          }
        }

        logger.info('SERVICE_BUS', `Dispatched ${linkItems.length} messages to live Azure Service Bus (${config.azure.serviceBus.queueName})`, {
          scanId,
          total: linkItems.length
        });
        return;
      } catch (err) {
        logger.warn('SERVICE_BUS', `Live Service Bus dispatch failed: ${err.message}. Falling back to sandbox queue.`);
      }
    }

    // Sandbox / Emulation fallback
    for (const item of linkItems) {
      workerQueue.enqueue({
        scanId,
        linkItem: item,
        enqueuedAt: new Date().toISOString()
      });
    }
  },

  async publishLinkTask(scanId, linkItem) {
    return this.publishLinkBatch(scanId, [linkItem]);
  },

  cancelScan(scanId) {
    return workerQueue.cancelTasksForScan(scanId);
  }
};

export const pubsubService = queueService;
export default queueService;
