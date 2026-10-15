import axios from 'axios';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import logger from './logger.js';

export class WebsiteCrawler {
  constructor(options = {}) {
    this.maxDepth = options.maxDepth || config.crawler.defaultMaxDepth;
    this.maxLinks = options.maxLinks || config.crawler.defaultMaxLinks;
    this.timeout = options.timeout || config.crawler.requestTimeoutMs;
    this.userAgent = config.crawler.userAgent;
    this.visitedUrls = new Set();
    this.discoveredLinks = new Map(); // normalizedUrl -> linkObject
  }

  /**
   * Normalize and validate URL
   */
  normalizeUrl(rawUrl, baseUrl) {
    try {
      if (!rawUrl) return null;
      const trimmed = rawUrl.trim();

      // Skip anchors, javascript, mailto, tel, ftp, data URLs
      if (
        trimmed.startsWith('#') ||
        trimmed.startsWith('javascript:') ||
        trimmed.startsWith('mailto:') ||
        trimmed.startsWith('tel:') ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('ftp:')
      ) {
        return null;
      }

      const resolved = new URL(trimmed, baseUrl);
      // Only http and https
      if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
        return null;
      }

      // Remove trailing slash for consistency (unless root '/')
      let cleanUrl = resolved.href;
      if (cleanUrl.endsWith('/') && resolved.pathname !== '/') {
        cleanUrl = cleanUrl.slice(0, -1);
      }
      return cleanUrl;
    } catch {
      return null;
    }
  }

  isInternalLink(targetUrl, rootOrigin) {
    try {
      const parsed = new URL(targetUrl);
      return parsed.origin === rootOrigin;
    } catch {
      return false;
    }
  }

  /**
   * Crawl a single page and extract all <a> links
   */
  async extractLinksFromPage(pageUrl, rootOrigin, currentDepth) {
    if (this.visitedUrls.has(pageUrl)) return [];
    this.visitedUrls.add(pageUrl);

    logger.info('CRAWLER', `Crawling page: ${pageUrl} (depth: ${currentDepth})`);

    try {
      const response = await axios.get(pageUrl, {
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: this.timeout,
        maxRedirects: 5
      });

      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('text/html')) {
        logger.debug('CRAWLER', `Skipping non-HTML page (${contentType}): ${pageUrl}`);
        return [];
      }

      const $ = cheerio.load(response.data);
      const linksOnPage = [];

      $('a[href]').each((_, el) => {
        const rawHref = $(el).attr('href');
        const anchorText = $(el).text().replace(/\s+/g, ' ').trim() || '(No anchor text)';
        const normalized = this.normalizeUrl(rawHref, pageUrl);

        if (normalized && !this.discoveredLinks.has(normalized)) {
          const isInternal = this.isInternalLink(normalized, rootOrigin);
          const linkItem = {
            id: uuidv4(),
            url: normalized,
            rawHref,
            anchorText: anchorText.slice(0, 120),
            parentUrl: pageUrl,
            type: isInternal ? 'INTERNAL' : 'EXTERNAL',
            depth: currentDepth
          };

          this.discoveredLinks.set(normalized, linkItem);
          linksOnPage.push(linkItem);

          if (this.discoveredLinks.size >= this.maxLinks) {
            return false; // Break cheerio loop
          }
        }
      });

      return linksOnPage;
    } catch (err) {
      logger.warn('CRAWLER', `Failed to crawl page ${pageUrl}: ${err.message}`);
      return [];
    }
  }

  /**
   * Execute full crawl up to maxDepth and maxLinks
   */
  async crawl(seedUrl) {
    const startTime = Date.now();
    logger.info('CRAWLER', `Starting crawler for ${seedUrl} (maxLinks: ${this.maxLinks}, maxDepth: ${this.maxDepth})`);

    const parsedSeed = new URL(seedUrl);
    const rootOrigin = parsedSeed.origin;

    // Queue of pages to crawl: [{ url, depth }]
    const crawlQueue = [{ url: seedUrl, depth: 1 }];

    while (crawlQueue.length > 0 && this.discoveredLinks.size < this.maxLinks) {
      const current = crawlQueue.shift();
      if (!current || current.depth > this.maxDepth) continue;

      const pageLinks = await this.extractLinksFromPage(current.url, rootOrigin, current.depth);

      // If we haven't reached maxDepth, enqueue internal links for further crawling
      if (current.depth < this.maxDepth) {
        for (const link of pageLinks) {
          if (link.type === 'INTERNAL' && !this.visitedUrls.has(link.url)) {
            crawlQueue.push({ url: link.url, depth: current.depth + 1 });
            if (this.discoveredLinks.size >= this.maxLinks) break;
          }
        }
      }
    }

    const elapsed = Date.now() - startTime;
    const allLinks = Array.from(this.discoveredLinks.values());

    logger.info('CRAWLER', `Discovered ${allLinks.length} unique links across ${this.visitedUrls.size} pages in ${elapsed}ms`);
    return {
      pagesVisited: Array.from(this.visitedUrls),
      links: allLinks,
      crawlDurationMs: elapsed
    };
  }
}

export default WebsiteCrawler;
