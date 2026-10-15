import express from 'express';
import pubsubService from '../services/pubsubService.js';
import logger from '../services/logger.js';

const router = express.Router();

/**
 * POST /api/worker/pubsub-push
 * Worker Endpoint triggered by Queue Webhook / Push Event
 * Body format: { message: { data: "<base64>", messageId: "..." } }
 */
router.post('/worker/pubsub-push', async (req, res) => {
  try {
    const result = await pubsubService.handlePubSubPushMessage(req.body);
    // Return HTTP 200 to acknowledge receipt of message to Pub/Sub
    res.status(200).json({ status: 'ACK', ...result });
  } catch (err) {
    logger.error('WORKER', `Failed to process Pub/Sub push message: ${err.message}`, { error: err.stack });
    // If invalid format, return 400 so Pub/Sub doesn't infinite loop retry bad syntax, or 500 for transient
    res.status(400).json({ status: 'NACK', error: err.message });
  }
});

export default router;
