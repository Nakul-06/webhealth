import https from 'https';
import axios from 'axios';
import config from '../config/index.js';
import logger from './logger.js';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

export const linkChecker = {
  /**
   * Check a single URL's availability with a strict 6-second hard-timeout race
   */
  async check(linkItem, maxWaitMs = 6000) {
    let timer;
    const timeoutPromise = new Promise((resolve) => {
      timer = setTimeout(() => {
        resolve({
          id: linkItem.id,
          scanId: linkItem.scanId,
          url: linkItem.url,
          anchorText: linkItem.anchorText || '',
          parentUrl: linkItem.parentUrl || '',
          type: linkItem.type || 'internal',
          status: 'TIMEOUT',
          statusCode: 408,
          statusMessage: `Probe hard-timeout exceeded (${maxWaitMs}ms)`,
          redirectUrl: null,
          contentType: null,
          latencyMs: maxWaitMs,
          responseTimeMs: maxWaitMs,
          checkedAt: new Date().toISOString()
        });
      }, maxWaitMs);
    });

    try {
      const result = await Promise.race([this.performCheck(linkItem), timeoutPromise]);
      clearTimeout(timer);
      return result;
    } catch (err) {
      clearTimeout(timer);
      return {
        id: linkItem.id,
        scanId: linkItem.scanId,
        url: linkItem.url,
        anchorText: linkItem.anchorText || '',
        parentUrl: linkItem.parentUrl || '',
        type: linkItem.type || 'internal',
        status: 'BROKEN',
        statusCode: 0,
        statusMessage: err.message || 'Connection error',
        redirectUrl: null,
        contentType: null,
        latencyMs: 1000,
        responseTimeMs: 1000,
        checkedAt: new Date().toISOString()
      };
    }
  },

  /**
   * Internal probe routine
   */
  async performCheck(linkItem) {
    const url = linkItem.url;
    const startTime = Date.now();
    const timeout = config.crawler.requestTimeoutMs || 10000;
    const userAgent = config.crawler.userAgent;

    const requestHeaders = {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    let status = 'BROKEN';
    let statusCode = 0;
    let statusMessage = '';
    let redirectUrl = null;
    let contentType = null;

    try {
      // 1. Try HTTP HEAD request first
      let response;
      let headSucceeded = false;

      try {
        response = await axios.head(url, {
          headers: requestHeaders,
          timeout,
          maxRedirects: 0,
          validateStatus: () => true,
          httpsAgent
        });

        // 2xx or 3xx on HEAD is generally valid
        if (response.status >= 200 && response.status < 400) {
          headSucceeded = true;
        }
      } catch {
        headSucceeded = false;
      }

      // 2. Fallback to GET if HEAD was blocked/rejected (405, 403, etc.) or network failed
      if (!headSucceeded || (response && (response.status === 405 || response.status === 403 || response.status >= 500))) {
        try {
          const getResponse = await axios.get(url, {
            headers: requestHeaders,
            timeout,
            maxRedirects: 0,
            validateStatus: () => true,
            responseType: 'stream',
            httpsAgent
          });

          if (getResponse.data && typeof getResponse.data.destroy === 'function') {
            getResponse.data.destroy();
          }

          response = getResponse;
        } catch (getErr) {
          if (!response) {
            throw getErr;
          }
        }
      }

      const elapsed = Math.max(1, Date.now() - startTime);
      statusCode = response.status;
      statusMessage = response.statusText || `HTTP ${statusCode}`;
      contentType = response.headers['content-type'] || 'unknown';

      // Strict Classification: WORKING | BROKEN | REDIRECT | TIMEOUT
      if (statusCode >= 200 && statusCode < 300) {
        status = 'WORKING';
      } else if (statusCode >= 300 && statusCode < 400) {
        status = 'REDIRECT';
        const rawLocation = response.headers.location;
        if (rawLocation) {
          try {
            redirectUrl = new URL(rawLocation, url).href;
          } catch {
            redirectUrl = rawLocation;
          }
        }
      } else {
        // 4xx, 5xx are all broken endpoints
        status = 'BROKEN';
        if (statusCode === 404) statusMessage = '404 Not Found (Dead Link)';
        else if (statusCode === 410) statusMessage = '410 Gone (Permanently Removed)';
        else if (statusCode === 403) statusMessage = '403 Forbidden';
        else if (statusCode >= 500) statusMessage = `HTTP ${statusCode} (Server Error)`;
      }

      logger.debug('WORKER', `Checked ${url} -> [${statusCode} ${status}] (${elapsed}ms)`);

      return {
        id: linkItem.id,
        scanId: linkItem.scanId,
        url: linkItem.url,
        anchorText: linkItem.anchorText || '',
        parentUrl: linkItem.parentUrl || '',
        type: linkItem.type || 'internal',
        status,
        statusCode,
        statusMessage,
        redirectUrl,
        contentType,
        latencyMs: elapsed,
        responseTimeMs: elapsed,
        checkedAt: new Date().toISOString()
      };
    } catch (error) {
      const elapsed = Math.max(1, Date.now() - startTime);

      if (error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'))) {
        status = 'TIMEOUT';
        statusMessage = `Request timed out after ${timeout}ms`;
        statusCode = 408;
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'EAI_AGAIN') {
        status = 'BROKEN';
        statusMessage = `Host unreachable (${error.code || 'Connection refused'})`;
        statusCode = 0;
      } else if (error.code === 'CERT_HAS_EXPIRED' || error.code?.includes('CERT')) {
        status = 'BROKEN';
        statusMessage = `SSL Certificate Error (${error.code})`;
        statusCode = 0;
      } else if (error.response) {
        statusCode = error.response.status;
        statusMessage = error.response.statusText || error.message;
        status = 'BROKEN';
      } else {
        status = 'BROKEN';
        statusMessage = error.message || 'Network error';
        statusCode = 0;
      }

      logger.warn('WORKER', `Checked ${url} -> [${status}: ${statusMessage}] (${elapsed}ms)`);

      return {
        id: linkItem.id,
        scanId: linkItem.scanId,
        url: linkItem.url,
        anchorText: linkItem.anchorText || '',
        parentUrl: linkItem.parentUrl || '',
        type: linkItem.type || 'internal',
        status,
        statusCode,
        statusMessage,
        redirectUrl: null,
        contentType: null,
        latencyMs: elapsed,
        responseTimeMs: elapsed,
        checkedAt: new Date().toISOString()
      };
    }
  }
};

export default linkChecker;
