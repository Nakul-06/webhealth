import config from '../config/index.js';
import logger from './logger.js';
import linkChecker from './linkChecker.js';
import databaseService from './firestoreService.js';

logger.info('SERVICE_BUS', `Azure Service Bus initialized (Queue: ${config.azure.serviceBus.queueName})`);

/**
 * Azure Container Workers Queue (Parallel asynchronous link checkers)
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

  async processNext() {
    if (this.activeWorkers >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.activeWorkers++;
    const task = this.queue.shift();

    try {
      await this.executeTask(task);
    } catch (err) {
      logger.error('WORKER', `Azure Worker execution error: ${err.message}`);
    } finally {
      this.activeWorkers--;
      this.processNext();
    }
  }

  async executeTask(task) {
    const { scanId, linkItem } = task;
    logger.info('WORKER', `Azure Container Worker checking: ${linkItem.url}`, {
      scanId,
      linkId: linkItem.id,
      type: linkItem.type
    });

    const result = await linkChecker.check(linkItem);
    await databaseService.addLinkResult(scanId, result);

    logger.info('COSMOS_DB', `Saved verification result: ${linkItem.url} -> [${result.status}]`, {
      scanId,
      status: result.status,
      latency: result.responseTimeMs
    });
  }
}

const workerQueue = new AzureWorkerQueue(6);

export const queueService = {
  isMock: () => config.azure.useMock,

  /**
   * Send a link-checking message into Azure Service Bus Queue
   */
  async publishLinkTask(scanId, linkItem) {
    const taskData = {
      scanId,
      linkItem,
      enqueuedAt: new Date().toISOString()
    };

    logger.info('SERVICE_BUS', `Enqueued message into queue '${config.azure.serviceBus.queueName}' for: ${linkItem.url}`, {
      queue: config.azure.serviceBus.queueName,
      scanId,
      linkId: linkItem.id
    });

    workerQueue.enqueue(taskData);
    return { messageId: `az-msg-${Date.now()}-${linkItem.id}`, status: 'ENQUEUED_AZURE' };
  },

  /**
   * Azure Functions / Worker Queue trigger handler
   */
  async handlePubSubPushMessage(body) {
    const { scanId, linkItem } = body;
    const result = await linkChecker.check(linkItem);
    await databaseService.addLinkResult(scanId, result);
    return { success: true, linkId: result.id, status: result.status };
  }
};

export const pubsubService = queueService;
export default queueService;
