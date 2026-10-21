import axios from 'axios';
import https from 'https';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 WebHealth/2.0';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

/**
 * Validates a single link by issuing a lightweight HEAD probe,
 * falling back to streaming GET on failures or 405/403.
 */
export async function verifyLink(linkItem) {
  const { url, scanId, type = 'internal', anchorText = '' } = linkItem;
  const startTime = Date.now();

  const standardHeaders = {
    'User-Agent': DEFAULT_USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
  };

  try {
    // 1. First probe: HTTP HEAD
    const headRes = await axios.head(url, {
      timeout: 10000,
      headers: standardHeaders,
      maxRedirects: 5,
      validateStatus: () => true, // Don't throw on HTTP status codes
      httpsAgent
    });

    const latencyMs = Date.now() - startTime;
    const statusCode = headRes.status;

    // Check if HEAD was rejected or challenged
    if (statusCode === 405 || statusCode === 403 || statusCode === 400) {
      return await fallbackGetProbe(url, scanId, type, anchorText, startTime, standardHeaders);
    }

    // Determine redirect
    let redirectUrl = null;
    let finalStatus = 'WORKING';

    if (statusCode >= 300 && statusCode < 400) {
      finalStatus = 'REDIRECT';
      redirectUrl = headRes.headers['location'] || null;
    } else if (statusCode >= 400) {
      finalStatus = 'BROKEN';
    } else {
      finalStatus = 'WORKING';
    }

    return {
      scanId,
      url,
      type,
      anchorText,
      status: finalStatus,
      statusCode,
      latencyMs,
      redirectUrl,
      errorMsg: finalStatus === 'BROKEN' ? `HTTP ${statusCode}` : null,
      checkedAt: new Date().toISOString()
    };
  } catch (headErr) {
    // If HEAD failed with network error or timeout, attempt GET probe before declaring failure
    return await fallbackGetProbe(url, scanId, type, anchorText, startTime, standardHeaders, headErr);
  }
}

/**
 * Fallback probe: HTTP GET with desktop browser headers and abort after headers
 */
async function fallbackGetProbe(url, scanId, type, anchorText, startTime, standardHeaders, previousErr = null) {
  try {
    const getRes = await axios.get(url, {
      timeout: 10000,
      headers: standardHeaders,
      maxRedirects: 5,
      responseType: 'stream',
      validateStatus: () => true,
      httpsAgent
    });

    // Close the stream immediately to avoid downloading entire payload
    if (getRes.data && typeof getRes.data.destroy === 'function') {
      getRes.data.destroy();
    }

    const latencyMs = Date.now() - startTime;
    const statusCode = getRes.status;
    let finalStatus = 'WORKING';
    let redirectUrl = null;

    if (statusCode >= 300 && statusCode < 400) {
      finalStatus = 'REDIRECT';
      redirectUrl = getRes.headers['location'] || null;
    } else if (statusCode >= 400) {
      finalStatus = 'BROKEN';
    } else {
      finalStatus = 'WORKING';
    }

    return {
      scanId,
      url,
      type,
      anchorText,
      status: finalStatus,
      statusCode,
      latencyMs,
      redirectUrl,
      errorMsg: finalStatus === 'BROKEN' ? `HTTP ${statusCode}` : null,
      checkedAt: new Date().toISOString()
    };
  } catch (getErr) {
    const latencyMs = Date.now() - startTime;
    const isTimeout = getErr.code === 'ECONNABORTED' || getErr.message?.toLowerCase().includes('timeout');

    return {
      scanId,
      url,
      type,
      anchorText,
      status: isTimeout ? 'TIMEOUT' : 'BROKEN',
      statusCode: getErr.response?.status || 0,
      latencyMs,
      redirectUrl: null,
      errorMsg: isTimeout ? 'Request timed out (10s threshold)' : (getErr.code || getErr.message),
      checkedAt: new Date().toISOString()
    };
  }
}

export default { verifyLink };
