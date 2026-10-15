import axios from 'axios';
import config from '../config/index.js';
import logger from './logger.js';

export const linkChecker = {
  /**
   * Check a single URL's availability and measure latency
   */
  async check(linkItem) {
    const url = linkItem.url;
    const startTime = Date.now();
    const timeout = config.crawler.requestTimeoutMs;
    const userAgent = config.crawler.userAgent;

    let status = 'UNKNOWN';
    let statusCode = null;
    let statusMessage = '';
    let redirectUrl = null;
    let contentType = null;

    try {
      // 1. Try HTTP HEAD request without automatic redirect following first
      let response;
      try {
        response = await axios.head(url, {
          headers: { 'User-Agent': userAgent },
          timeout,
          maxRedirects: 0,
          validateStatus: () => true // Allow any status code to inspect manually
        });
      } catch (headErr) {
        // If HEAD was rejected (some servers block HEAD or return 405 / 403), fallback to lightweight GET
        if (headErr.response && (headErr.response.status === 405 || headErr.response.status === 403)) {
          response = await axios.get(url, {
            headers: { 'User-Agent': userAgent },
            timeout,
            maxRedirects: 0,
            validateStatus: () => true,
            responseType: 'stream' // Don't download body
          });
          if (response.data && response.data.destroy) {
            response.data.destroy(); // Terminate stream immediately
          }
        } else {
          throw headErr;
        }
      }

      const elapsed = Date.now() - startTime;
      statusCode = response.status;
      statusMessage = response.statusText || `${statusCode}`;
      contentType = response.headers['content-type'] || 'unknown';

      // Evaluate status codes
      if (statusCode >= 200 && statusCode < 300) {
        status = 'WORKING';
      } else if (statusCode >= 300 && statusCode < 400) {
        status = 'REDIRECTED';
        redirectUrl = response.headers.location || null;
      } else if (statusCode >= 400 && statusCode < 500) {
        status = 'BROKEN'; // Dead link (404, 410, etc.)
      } else if (statusCode >= 500 && statusCode < 600) {
        status = 'SERVER_ERROR';
      } else {
        status = 'UNKNOWN';
      }

      logger.debug('WORKER', `Checked ${url} -> [${statusCode} ${status}] (${elapsed}ms)`);

      return {
        id: linkItem.id,
        url: linkItem.url,
        anchorText: linkItem.anchorText,
        parentUrl: linkItem.parentUrl,
        type: linkItem.type,
        status,
        statusCode,
        statusMessage,
        redirectUrl,
        contentType,
        responseTimeMs: elapsed,
        checkedAt: new Date().toISOString()
      };
    } catch (error) {
      const elapsed = Date.now() - startTime;

      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        status = 'TIMEOUT';
        statusMessage = `Request timed out after ${timeout}ms`;
        statusCode = 408;
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'EAI_AGAIN') {
        status = 'BROKEN';
        statusMessage = `DNS / Host unreachable (${error.code || 'Connection refused'})`;
        statusCode = 0;
      } else if (error.code === 'ERR_INVALID_URL') {
        status = 'BROKEN';
        statusMessage = 'Malformed or invalid URL syntax';
        statusCode = 0;
      } else if (error.response) {
        statusCode = error.response.status;
        statusMessage = error.response.statusText || error.message;
        status = statusCode >= 500 ? 'SERVER_ERROR' : statusCode >= 400 ? 'BROKEN' : 'UNKNOWN';
      } else {
        status = 'BROKEN';
        statusMessage = error.message || 'Network error';
        statusCode = 0;
      }

      logger.warn('WORKER', `Checked ${url} -> [${status}: ${statusMessage}] (${elapsed}ms)`);

      return {
        id: linkItem.id,
        url: linkItem.url,
        anchorText: linkItem.anchorText,
        parentUrl: linkItem.parentUrl,
        type: linkItem.type,
        status,
        statusCode,
        statusMessage,
        redirectUrl: null,
        contentType: null,
        responseTimeMs: elapsed,
        checkedAt: new Date().toISOString()
      };
    }
  }
};

export default linkChecker;
