import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import logger from '../services/logger.js';
import firestoreService from '../services/firestoreService.js';
import pubsubService from '../services/pubsubService.js';
import WebsiteCrawler from '../services/crawler.js';

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
 * Start a new website dead link scan
 */
router.post('/scan', async (req, res) => {
  try {
    const { url, maxDepth = 2, maxLinks = 40 } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return res.status(400).json({ error: 'Invalid URL protocol. Please use http:// or https://' });
      }
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

    // 1. Initialize Cosmos DB document
    const scanDoc = await firestoreService.createScan(scanData);
    logger.info('CONTAINER_APPS', `Scan request received for: ${scanData.targetUrl} (Job ID: ${scanId})`, {
      scanId,
      targetUrl: scanData.targetUrl,
      options: scanData
    });

    // 2. Start crawler asynchronously so client gets immediate response
    (async () => {
      try {
        await firestoreService.updateScan(scanId, {
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

        if (discoveredLinks.length === 0) {
          logger.warn('CRAWLER', `No links found on website: ${scanData.targetUrl}`);
          await firestoreService.updateScan(scanId, {
            status: 'COMPLETED',
            statusText: 'No links found to check on the website.',
            'summary.totalFound': 0,
            completedAt: new Date().toISOString()
          });
          return;
        }

        // Update scan with total links found
        await firestoreService.updateScan(scanId, {
          status: 'CHECKING_LINKS',
          statusText: `Discovered ${discoveredLinks.length} links. Distributing tasks via Azure Service Bus...`,
          'summary.totalFound': discoveredLinks.length
        });

        logger.info('SERVICE_BUS', `Publishing ${discoveredLinks.length} link verification tasks to Azure Service Bus...`, {
          scanId,
          totalLinks: discoveredLinks.length
        });

        // Publish each link checking task to Azure Service Bus
        for (const linkItem of discoveredLinks) {
          await pubsubService.publishLinkTask(scanId, linkItem);
        }
      } catch (crawlErr) {
        logger.error('CONTAINER_APPS', `Crawling pipeline failed for scan ${scanId}: ${crawlErr.message}`, {
          error: crawlErr.stack
        });
        await firestoreService.updateScan(scanId, {
          status: 'FAILED',
          statusText: `Error during scanning: ${crawlErr.message}`,
          completedAt: new Date().toISOString()
        });
      }
    })();

    res.status(202).json({
      message: 'Scan job submitted to Azure Container Apps successfully',
      scanId,
      targetUrl: scanData.targetUrl,
      status: scanDoc.status,
      options: scanData
    });
  } catch (err) {
    logger.error('CONTAINER_APPS', `Scan creation failed: ${err.message}`);
    res.status(500).json({ error: 'Failed to initiate scan', details: err.message });
  }
});

/**
 * GET /api/scans/:id
 * Retrieve live scan status and summary metrics
 */
router.get('/scans/:id', async (req, res) => {
  try {
    const scan = await firestoreService.getScan(req.params.id);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
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
    const links = await firestoreService.getScanLinks(req.params.id, { status, type, search });
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
 * Generate comprehensive website health report
 */
router.get('/scans/:id/report', async (req, res) => {
  try {
    const scan = await firestoreService.getScan(req.params.id);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    const links = await firestoreService.getScanLinks(req.params.id);

    // Grouping
    const brokenLinks = links.filter((l) => l.status === 'BROKEN');
    const redirectedLinks = links.filter((l) => l.status === 'REDIRECTED');
    const workingLinks = links.filter((l) => l.status === 'WORKING');
    const serverErrors = links.filter((l) => l.status === 'SERVER_ERROR');
    const timedOutLinks = links.filter((l) => l.status === 'TIMEOUT');

    // Latency profiling
    const latencies = links.map((l) => l.responseTimeMs || 0).sort((a, b) => a - b);
    const p50 = latencies.length ? latencies[Math.floor(latencies.length * 0.5)] : 0;
    const p95 = latencies.length ? latencies[Math.floor(latencies.length * 0.95)] : 0;
    const slowLinks = links.filter((l) => (l.responseTimeMs || 0) > 1500);

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

    // Recommendations
    const recommendations = [];
    if (brokenLinks.length > 0) {
      recommendations.push({
        type: 'CRITICAL',
        title: `Fix ${brokenLinks.length} Broken / Dead Link(s)`,
        description: 'Dead links return 404/410 errors which negatively impact user experience and search engine SEO ranking.'
      });
    }
    if (redirectedLinks.length > 0) {
      recommendations.push({
        type: 'WARNING',
        title: `Update ${redirectedLinks.length} Redirected Link(s)`,
        description: 'Update links to their final target URLs to eliminate extra redirect round-trips and improve page load speed.'
      });
    }
    if (timedOutLinks.length > 0) {
      recommendations.push({
        type: 'WARNING',
        title: `Investigate ${timedOutLinks.length} Slow or Timed Out Target(s)`,
        description: 'Target hosts failed to respond before the timeout threshold. Check target server availability.'
      });
    }
    if (slowLinks.length > 0) {
      recommendations.push({
        type: 'INFO',
        title: `${slowLinks.length} Link(s) Responded Slower than 1.5s`,
        description: 'Consider caching or optimizing target endpoints with high latency.'
      });
    }
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'SUCCESS',
        title: 'All Discovered Links Are Operational',
        description: 'No broken links, server errors, or timeouts were detected across the scanned pages.'
      });
    }

    const report = {
      generatedAt: new Date().toISOString(),
      scanId: scan.id,
      targetUrl: scan.targetUrl,
      scanStatus: scan.status,
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
        totalFound: scan.summary?.totalFound || 0,
        totalChecked: scan.summary?.totalChecked || 0,
        working: workingLinks.length,
        broken: brokenLinks.length,
        redirected: redirectedLinks.length,
        serverError: serverErrors.length,
        timedOut: timedOutLinks.length,
        internalLinks: links.filter((l) => l.type === 'INTERNAL').length,
        externalLinks: links.filter((l) => l.type === 'EXTERNAL').length
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
 * GET /api/scans
 * List recent scans
 */
router.get('/scans', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const scans = await firestoreService.listScans(limit);
    res.json(scans);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching scan history', details: err.message });
  }
});

/**
 * GET /api/system/status
 * Microsoft Azure Platform and Services Status
 */
router.get('/system/status', (req, res) => {
  res.json({
    platform: 'Microsoft Azure',
    resourceGroup: config.azure.resourceGroup,
    isMock: config.azure.useMock,
    mode: config.azure.useMock ? 'Azure Emulation / Sandbox' : 'Production Microsoft Azure',
    services: {
      apiEntryPoint: {
        name: 'Azure Container Apps',
        role: 'REST API & Crawling Coordinator',
        status: 'ONLINE'
      },
      messageQueue: {
        name: 'Azure Service Bus',
        role: 'Asynchronous Task Distributor (Queue)',
        queue: config.azure.serviceBus.queueName,
        status: 'ONLINE'
      },
      processingWorkers: {
        name: 'Azure Container Workers',
        role: 'Parallel HTTP Link Availability & Latency Checkers',
        status: 'ONLINE'
      },
      database: {
        name: 'Azure Cosmos DB',
        role: 'NoSQL Document Store (Database: webhealth-db)',
        container: config.azure.cosmosDb.scansContainer,
        status: 'ONLINE'
      },
      monitoring: {
        name: 'Azure Monitor / App Insights',
        role: 'Centralized Structured Audit Logs and Metric Stream',
        status: 'ONLINE'
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
