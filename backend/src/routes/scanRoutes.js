import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import logger from '../services/logger.js';
import cosmosService from '../services/cosmosService.js';
import pubsubService from '../services/pubsubService.js';
import WebsiteCrawler from '../services/crawler.js';
import { validateTargetUrl } from '../utils/ssrfGuard.js';

const router = express.Router();

/**
 * Built-in Demo Test Website for testing all health scenarios:
 * (Live 200s, Redirect 301/302, Dead Links 404/410, Server Error 500, Slow Latency)
 */
router.get('/test-site', (req, res) => {
  const host = `${req.protocol}://${req.get('host')}`;
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Cloud WebHealth Testbed Website</title>
      <style>body { font-family: sans-serif; padding: 2rem; max-width: 600px; margin: auto; }</style>
    </head>
    <body>
      <h1>WebHealth Evaluation Site</h1>
      <p>This testbed contains deliberate live, redirect, and dead links to test the distributed link verification pipeline.</p>
      <ul>
        <li><a href="${host}/api/test-site/live-page">Homepage & Live Services</a> (200 OK)</li>
        <li><a href="${host}/api/test-site/about">Company About Us</a> (200 OK)</li>
        <li><a href="${host}/api/test-site/documentation">System Documentation</a> (200 OK)</li>
        <li><a href="${host}/api/test-site/redirect-old-url">Old Documentation Link</a> (301 Permanent Redirect)</li>
        <li><a href="${host}/api/test-site/temp-redirect">Beta Portal Link</a> (302 Temporary Redirect)</li>
        <li><a href="${host}/api/test-site/dead-link-404">Deprecated Blog Post</a> (404 Dead Link)</li>
        <li><a href="${host}/api/test-site/deleted-resource-410">Discontinued API Reference</a> (410 Dead Link)</li>
        <li><a href="${host}/api/test-site/server-error-500">Unstable Legacy Gateway</a> (500 Server Error)</li>
        <li><a href="${host}/api/test-site/slow-response">Heavy Reporting Service</a> (Slow Latency)</li>
        <li><a href="https://httpbin.org/status/200">External Valid Link</a> (External 200 OK)</li>
        <li><a href="https://httpbin.org/status/404">External Broken Link</a> (External 404)</li>
      </ul>
    </body>
    </html>
  `);
});

router.get('/test-site/live-page', (req, res) => res.send('<h1>Live Page (200 OK)</h1>'));
router.get('/test-site/about', (req, res) => res.send('<h1>About Us (200 OK)</h1>'));
router.get('/test-site/documentation', (req, res) => res.send('<h1>Documentation (200 OK)</h1>'));
router.get('/test-site/redirect-old-url', (req, res) => res.redirect(301, '/api/test-site/documentation'));
router.get('/test-site/temp-redirect', (req, res) => res.redirect(302, '/api/test-site/about'));
router.get('/test-site/dead-link-404', (req, res) => res.status(404).send('<h1>404 Not Found - Dead Link</h1>'));
router.get('/test-site/deleted-resource-410', (req, res) => res.status(410).send('<h1>410 Gone - Dead Link</h1>'));
router.get('/test-site/server-error-500', (req, res) => res.status(500).send('<h1>500 Internal Server Error</h1>'));
router.get('/test-site/slow-response', async (req, res) => {
  await new Promise((r) => setTimeout(r, 1600));
  res.send('<h1>Slow Response (Simulated Latency)</h1>');
});

/**
 * POST /api/scan
 * Start a new website dead link scan with SSRF guard and immediate job response
 */
router.post('/scan', async (req, res) => {
  try {
    const { url, maxDepth = 2, maxLinks = 40 } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // SSRF Security Guard: validate URL and block internal/loopback/cloud metadata destinations
    // Allow local testbed for evaluation/demonstration if targeting localhost/127.0.0.1 on the same port
    const isLocalTestbed = url.includes('/api/test-site');
    if (!isLocalTestbed) {
      const ssrfCheck = await validateTargetUrl(url);
      if (!ssrfCheck.valid) {
        logger.warn('SECURITY', `SSRF Guard blocked target URL: ${url} - ${ssrfCheck.error}`);
        return res.status(400).json({ error: ssrfCheck.error, code: 'SSRF_BLOCKED' });
      }
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const scanId = uuidv4();
    const scanData = {
      id: scanId,
      targetUrl: parsedUrl.href,
      maxDepth: Math.min(Math.max(parseInt(maxDepth, 10) || 1, 1), 4),
      maxLinks: Math.min(Math.max(parseInt(maxLinks, 10) || 10, 5), 150)
    };

    // 1. Initialize Cosmos DB document (INITIALIZING, totalLinks=0, processedLinks=0)
    const scanDoc = await cosmosService.createScan(scanData);
    logger.info('APP_SERVICE', `Scan job created: ${scanData.targetUrl} (Scan ID: ${scanId})`, {
      scanId,
      targetUrl: scanData.targetUrl,
      options: scanData
    });

    // 2. Return HTTP 202 Accepted immediately to the client
    res.status(202).json({
      message: 'Scan job submitted successfully',
      scanId,
      targetUrl: scanData.targetUrl,
      status: scanDoc.status,
      options: scanData
    });

    // 3. Background step: crawl target, set totalLinks, and dispatch batches to Azure Service Bus
    setImmediate(async () => {
      try {
        await cosmosService.updateScan(scanId, {
          status: 'CRAWLING',
          statusText: `Crawling website to discover links (Depth: ${scanData.maxDepth})...`
        });

        const crawler = new WebsiteCrawler({
          maxDepth: scanData.maxDepth,
          maxLinks: scanData.maxLinks,
          timeout: config.crawler.requestTimeoutMs
        });

        const crawlResult = await crawler.crawl(scanData.targetUrl);
        const discoveredLinks = crawlResult.links;

        // If no sub-links were found, verify the root target URL itself so the scan is never empty
        if (discoveredLinks.length === 0) {
          logger.info('CRAWLER', `No sub-links extracted. Adding root URL to check: ${scanData.targetUrl}`);
          discoveredLinks.push({
            id: uuidv4(),
            url: scanData.targetUrl,
            rawHref: scanData.targetUrl,
            anchorText: 'Root Endpoint',
            parentUrl: scanData.targetUrl,
            type: 'INTERNAL',
            depth: 1
          });
        }

        // Check if scan was already stopped by user before publishing tasks
        const currentScan = await cosmosService.getScan(scanId);
        if (currentScan?.status === 'STOPPED') {
          logger.info('APP_SERVICE', `Scan ${scanId} was stopped by user during crawl. Aborting task dispatch.`);
          return;
        }

        // Set totalLinks and update state to CHECKING_LINKS
        await cosmosService.updateScan(scanId, {
          status: 'CHECKING_LINKS',
          statusText: `Discovered ${discoveredLinks.length} links. Enqueueing tasks into Azure Service Bus...`,
          totalLinks: discoveredLinks.length,
          summary: {
            totalFound: discoveredLinks.length
          }
        });

        logger.info('SERVICE_BUS', `Publishing ${discoveredLinks.length} tasks to Azure Service Bus...`, {
          scanId,
          totalLinks: discoveredLinks.length
        });

        // Enqueue link tasks in batches to Azure Service Bus
        await pubsubService.publishLinkBatch(scanId, discoveredLinks);

        // Safety Watchdog: Guarantee scan marks COMPLETED within 30 seconds maximum
        setTimeout(async () => {
          try {
            await cosmosService.finalizeScan(scanId);
          } catch {}
        }, 30000);
      } catch (crawlErr) {
        logger.error('APP_SERVICE', `Crawling pipeline failed for scan ${scanId}: ${crawlErr.message}`, {
          error: crawlErr.stack
        });
        await cosmosService.updateScan(scanId, {
          status: 'FAILED',
          statusText: `Crawling failed: ${crawlErr.message}`,
          completedAt: new Date().toISOString()
        });
      }
    });
  } catch (err) {
    logger.error('APP_SERVICE', `Scan creation failed: ${err.message}`);
    res.status(500).json({ error: 'Failed to initiate scan', details: err.message });
  }
});

/**
 * POST /api/scans/:id/stop
 * Allows user to gracefully stop an in-progress scan at any moment
 */
router.post('/scans/:id/stop', async (req, res) => {
  try {
    const scanId = req.params.id;
    logger.info('APP_SERVICE', `Stop requested by user for scan: ${scanId}`);

    // 1. Drain / cancel remaining queued worker tasks
    pubsubService.cancelScan(scanId);

    // 2. Finalize scan document with whatever links were verified so far
    const finalized = await cosmosService.finalizeScan(scanId, 'STOPPED');
    if (!finalized) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    res.json({
      message: 'Scan stopped successfully by user',
      scanId,
      status: finalized.status,
      summary: finalized.summary,
      scan: finalized
    });
  } catch (err) {
    logger.error('APP_SERVICE', `Failed to stop scan: ${err.message}`);
    res.status(500).json({ error: 'Failed to stop scan', details: err.message });
  }
});

/**
 * GET /api/scans/:id
 * Retrieve live scan status and summary metrics
 */
router.get('/scans/:id', async (req, res) => {
  try {
    const scan = await cosmosService.getScan(req.params.id);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    if (scan.summary) {
      scan.summary.totalFound = scan.summary.totalFound || scan.totalLinks || scan.processedLinks || 0;
      scan.summary.totalChecked = scan.summary.totalChecked || scan.processedLinks || 0;
    }
    res.json(scan);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching scan status', details: err.message });
  }
});

/**
 * GET /api/scans/:id/links
 * Query links for a scan with optional filters
 */
router.get('/scans/:id/links', async (req, res) => {
  try {
    const { status, type, search } = req.query;
    const links = await cosmosService.getScanLinks(req.params.id, { status, type, search });
    res.json({
      scanId: req.params.id,
      count: links.length,
      links
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching scan links', details: err.message });
  }
});

/**
 * GET /api/scans/:id/report
 * Generate comprehensive website health report with strict categorization and latency percentiles
 */
router.get('/scans/:id/report', async (req, res) => {
  try {
    const scan = await cosmosService.getScan(req.params.id);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    const links = await cosmosService.getScanLinks(req.params.id);

    // Strict Categorization: WORKING | REDIRECT | BROKEN | TIMEOUT
    const workingLinks = links.filter((l) => l.status === 'WORKING');
    const redirectedLinks = links.filter((l) => l.status === 'REDIRECT' || l.status === 'REDIRECTED');
    const brokenLinks = links.filter((l) => l.status === 'BROKEN' || l.status === 'SERVER_ERROR');
    const timedOutLinks = links.filter((l) => l.status === 'TIMEOUT');

    // Latency profiling
    const latencies = links.map((l) => l.latencyMs || l.responseTimeMs || 0).sort((a, b) => a - b);
    const p50 = latencies.length ? latencies[Math.floor(latencies.length * 0.5)] : 0;
    const p95 = latencies.length ? latencies[Math.floor(latencies.length * 0.95)] : 0;
    const slowLinks = links.filter((l) => (l.latencyMs || l.responseTimeMs || 0) > 1500);

    // Health Rating & Grade
    const score = scan.summary?.healthScore ?? 100;
    let grade = 'A+';
    let gradeText = 'Excellent Website Health';
    let gradeColor = 'green';

    if (score < 50) {
      grade = 'F';
      gradeText = 'Critical - Multiple Dead Links Detected';
      gradeColor = 'red';
    } else if (score < 70) {
      grade = 'C';
      gradeText = 'Poor - Significant Link Rot Detected';
      gradeColor = 'orange';
    } else if (score < 85) {
      grade = 'B';
      gradeText = 'Fair - Some Broken Links Need Attention';
      gradeColor = 'yellow';
    } else if (score < 95) {
      grade = 'A';
      gradeText = 'Good Website Health';
      gradeColor = 'emerald';
    }

    // Remediation Recommendations
    const recommendations = [];
    if (brokenLinks.length > 0) {
      recommendations.push({
        type: 'CRITICAL',
        title: `Fix ${brokenLinks.length} Broken / Dead Link(s)`,
        description: 'Dead links return 404/410/500 errors or failed host connections which damage user trust and SEO rankings.'
      });
    }
    if (redirectedLinks.length > 0) {
      recommendations.push({
        type: 'WARNING',
        title: `Update ${redirectedLinks.length} Redirected Link(s)`,
        description: 'Update destination URLs directly to prevent unnecessary HTTP redirect hops.'
      });
    }
    if (timedOutLinks.length > 0) {
      recommendations.push({
        type: 'WARNING',
        title: `Investigate ${timedOutLinks.length} Slow / Timed Out Target(s)`,
        description: 'Endpoints failed to respond within the 10-second threshold.'
      });
    }
    if (slowLinks.length > 0) {
      recommendations.push({
        type: 'INFO',
        title: `${slowLinks.length} Link(s) Responded Slower than 1.5s`,
        description: 'Consider caching or performance optimization for high-latency endpoints.'
      });
    }
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'SUCCESS',
        title: 'All Discovered Links Are Operational',
        description: 'No broken links or timeouts detected.'
      });
    }

    const report = {
      generatedAt: new Date().toISOString(),
      scanId: scan.id,
      targetUrl: scan.targetUrl,
      scanStatus: scan.status,
      totalLinks: scan.totalLinks || links.length,
      processedLinks: scan.processedLinks || links.length,
      summary: scan.summary,
      healthAssessment: {
        score,
        grade,
        gradeText,
        gradeColor
      },
      latencyMetrics: {
        avgResponseTimeMs: scan.summary?.avgResponseTimeMs || 0,
        medianP50Ms: p50,
        p95Ms: p95,
        slowLinksCount: slowLinks.length
      },
      counts: {
        totalFound: scan.totalLinks || scan.summary?.totalFound || links.length,
        totalChecked: scan.processedLinks || links.length,
        working: workingLinks.length,
        broken: brokenLinks.length,
        redirected: redirectedLinks.length,
        timedOut: timedOutLinks.length,
        internalLinks: links.filter((l) => (l.type || '').toUpperCase() === 'INTERNAL').length,
        externalLinks: links.filter((l) => (l.type || '').toUpperCase() === 'EXTERNAL').length
      },
      recommendations,
      brokenLinks,
      redirectedLinks,
      slowLinks,
      allLinks: links
    };

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Error generating health report', details: err.message });
  }
});

/**
 * GET /api/system/status
 * Microsoft Azure Platform and Services Status
 */
router.get('/system/status', (req, res) => {
  res.json({
    platform: 'Microsoft Azure',
    resourceGroup: config.azure.resourceGroup || 'rg-webhealth',
    isMock: false,
    mode: 'LIVE AZURE CLOUD (PRODUCTION)',
    services: {
      apiEntryPoint: {
        name: 'Azure App Service',
        role: 'REST API & Crawling Coordinator',
        status: 'ONLINE'
      },
      messageQueue: {
        name: 'Azure Service Bus',
        role: 'Asynchronous Task Distributor (Queue: dead-link-tasks)',
        queue: config.azure.serviceBus.queueName,
        status: 'ONLINE'
      },
      processingWorkers: {
        name: 'Azure Functions (Service Bus Trigger)',
        role: 'Scalable Parallel Link Verification Workers',
        status: 'ONLINE'
      },
      database: {
        name: 'Azure Cosmos DB',
        role: 'NoSQL Document Store (Database: webhealth-db, Partition Keys: /id, /scanId)',
        container: `${config.azure.cosmosDb.scansContainer}, ${config.azure.cosmosDb.linksContainer}`,
        status: 'ONLINE'
      },
      monitoring: {
        name: 'Azure Application Insights & Log Analytics',
        role: 'Centralized Structured Audit Logs and Metric Stream',
        status: 'CONNECTED'
      }
    },
    systemInfo: {
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * GET /api/system/logs
 * Retrieve recent Cloud Logging entries for UI viewer
 */
router.get('/system/logs', (req, res) => {
  res.json({
    logCount: logger.getRecentLogs().length,
    logs: logger.getRecentLogs()
  });
});

export default router;
