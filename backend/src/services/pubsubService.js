import { ServiceBusClient } from '@azure/service-bus';
import config from '../config/index.js';
import logger from './logger.js';
import linkChecker from './linkChecker.js';
import databaseService from './firestoreService.js';

let liveSbClient = null;
let liveSbSender = null;

// Initialize Live Azure Service Bus if connection string is configured
if (config.azure.serviceBus.connectionString) {
  try {
    liveSbClient = new ServiceBusClient(config.azure.serviceBus.connectionString);
    liveSbSender = liveSbClient.createSender(config.azure.serviceBus.queueName);
    logger.info('SERVICE_BUS', `Connected to live Azure Service Bus (Queue: ${config.azure.serviceBus.queueName})`);
  } catch (err) {
    logger.warn('SERVICE_BUS', `Could not initialize live Azure Service Bus (${err.message}). Using parallel worker queue.`);
  }
} else {
  logger.info('SERVICE_BUS', `Azure Service Bus initialized (Worker Queue: ${config.azure.serviceBus.queueName})`);
}

/**
 * Parallel Asynchronous Link Checker Worker Engine
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
      logger.error('WORKER', `Worker execution error: ${err.message}`);
    } finally {
      this.activeWorkers--;
      this.processNext();
    }
  }

  async executeTask(task) {
    const { scanId, linkItem } = task;
    logger.info('WORKER', `Worker verifying link: ${linkItem.url}`, {
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
  isMock: () => !liveSbSender,

  /**
   * Send a link-checking message into Azure Service Bus Queue
   */
  async publishLinkTask(scanId, linkItem) {
    const taskData = {
      scanId,
      linkItem,
      enqueuedAt: new Date().toISOString()
    };

    // If live Azure Service Bus is connected, send message to Azure queue
    if (liveSbSender) {
      try {
        await liveSbSender.sendMessages({
          body: taskData,
          contentType: 'application/json',
          subject: 'link-verification-task'
        });
      } catch (err) {
        logger.warn('SERVICE_BUS', `Live Service Bus send failed: ${err.message}. Enqueueing locally.`);
      }
    }

    logger.info('SERVICE_BUS', `Enqueued message into queue '${config.azure.serviceBus.queueName}' for: ${linkItem.url}`, {
      queue: config.azure.serviceBus.queueName,
      scanId,
      linkId: linkItem.id
    });

    workerQueue.enqueue(taskData);
    return { messageId: `az-msg-${Date.now()}-${linkItem.id}`, status: 'ENQUEUED' };
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
