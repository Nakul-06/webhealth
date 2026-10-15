import https from 'https';
import axios from 'axios';
import config from '../config/index.js';
import logger from './logger.js';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

export const linkChecker = {
  /**
   * Check a single URL's availability and measure latency with high accuracy
   */
  async check(linkItem) {
    const url = linkItem.url;
    const startTime = Date.now();
    const timeout = config.crawler.requestTimeoutMs;
    const userAgent = config.crawler.userAgent;

    const requestHeaders = {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    let status = 'UNKNOWN';
    let statusCode = null;
    let statusMessage = '';
    let redirectUrl = null;
    let contentType = null;

    try {
      // 1. Try HTTP HEAD request without following redirects
      let response;
      let headSucceeded = false;

      try {
        response = await axios.head(url, {
          headers: requestHeaders,
          timeout,
          maxRedirects: 0,
          validateStatus: () => true, // Don't throw on 4xx/5xx so we inspect status directly
          httpsAgent
        });

        // If HEAD returned 2xx or 3xx, it's reliable
        if (response.status >= 200 && response.status < 400) {
          headSucceeded = true;
        }
      } catch (headErr) {
        // Network or protocol error on HEAD, will attempt GET fallback
        headSucceeded = false;
      }

      // 2. If HEAD failed or returned 4xx/5xx (many servers reject HEAD with 405, 403, or 404),
      // retry with a lightweight streaming GET
      if (!headSucceeded || (response && response.status >= 400)) {
        try {
          const getResponse = await axios.get(url, {
            headers: requestHeaders,
            timeout,
            maxRedirects: 0,
            validateStatus: () => true,
            responseType: 'stream', // Only fetch headers without reading full body into memory
            httpsAgent
          });

          // Terminate incoming stream immediately after headers received
          if (getResponse.data && typeof getResponse.data.destroy === 'function') {
            getResponse.data.destroy();
          }

          response = getResponse;
        } catch (getErr) {
          // If HEAD gave us a response and GET threw a connection error, retain HEAD
          if (!response) {
            throw getErr;
          }
        }
      }

      const elapsed = Math.max(1, Date.now() - startTime);
      statusCode = response.status;
      statusMessage = response.statusText || `HTTP ${statusCode}`;
      contentType = response.headers['content-type'] || 'unknown';

      // Evaluate status codes accurately
      if (statusCode >= 200 && statusCode < 300) {
        status = 'WORKING';
      } else if (statusCode >= 300 && statusCode < 400) {
        status = 'REDIRECTED';
        const rawLocation = response.headers.location;
        if (rawLocation) {
          try {
            redirectUrl = new URL(rawLocation, url).href;
          } catch {
            redirectUrl = rawLocation;
          }
        }
      } else if (statusCode === 404) {
        status = 'BROKEN';
        statusMessage = '404 Not Found (Dead Link)';
      } else if (statusCode === 410) {
        status = 'BROKEN';
        statusMessage = '410 Gone (Permanently Removed)';
      } else if (statusCode === 403) {
        status = 'BROKEN';
        statusMessage = '403 Forbidden';
      } else if (statusCode >= 400 && statusCode < 500) {
        status = 'BROKEN';
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
      const elapsed = Math.max(1, Date.now() - startTime);

      if (error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'))) {
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
      } else if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
        status = 'BROKEN';
        statusMessage = `SSL Certificate Error (${error.code})`;
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
