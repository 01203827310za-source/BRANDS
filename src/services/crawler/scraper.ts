import * as cheerio from 'cheerio';
import { CrawledItem, CrawlerResult } from '@/types';
import crypto from 'crypto';

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
};

// Codes that trigger immediate Playwright fallback (no fetch retry)
const ANTI_BOT_CODES = new Set([403, 429]);
// Codes that exhaust fetch retries then fall through to Playwright
const RETRY_CODES = new Set([500, 502, 503, 504]);

const FETCH_TIMEOUT_MS = 25000;
const PLAYWRIGHT_TIMEOUT_MS = 60000;

// ─── Public entry point ───────────────────────────────────────────────────────

export async function crawlUrl(url: string, retries = 3): Promise<CrawlerResult> {
  let lastError: Error | null = null;
  let fetchStatus: number | null = null;
  let fetchAttempts = 0;

  // Phase 1: fetch — fast, stateless
  for (let attempt = 1; attempt <= retries; attempt++) {
    fetchAttempts = attempt;
    try {
      const result = await crawlWithFetch(url);
      return result;
    } catch (error: any) {
      lastError = error;
      const match = (error.message as string)?.match(/HTTP (\d+)/);
      if (match) fetchStatus = parseInt(match[1], 10);

      console.warn(
        `[Crawler] fetch attempt=${attempt}/${retries}` +
        ` status=${fetchStatus ?? 'network-error'}` +
        ` url=${url}` +
        ` reason=${error.message}`,
      );

      // Anti-bot: no point retrying fetch — skip straight to Playwright
      if (fetchStatus && ANTI_BOT_CODES.has(fetchStatus)) {
        console.log(`[Crawler] Anti-bot (${fetchStatus}) on fetch → Playwright | url=${url}`);
        break;
      }

      if (attempt < retries) await sleep(attempt * 2000);
    }
  }

  // Phase 2: Playwright — real browser, bypasses most bot protection
  const shouldPlaywright =
    !fetchStatus ||
    ANTI_BOT_CODES.has(fetchStatus) ||
    RETRY_CODES.has(fetchStatus);

  if (shouldPlaywright) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await crawlWithPlaywright(url);
        console.log(
          `[Crawler] Playwright success attempt=${attempt}` +
          ` items=${result.items.length}` +
          ` finalUrl=${result.metadata?.finalUrl ?? url}` +
          ` status=${result.metadata?.httpStatus ?? 'n/a'}`,
        );
        return result;
      } catch (error: any) {
        lastError = error;
        console.warn(
          `[Crawler] Playwright attempt=${attempt}/${retries}` +
          ` url=${url}` +
          ` reason=${error.message}`,
        );
        if (attempt < retries) await sleep(attempt * 3000);
      }
    }
  }

  return {
    success: false,
    items: [],
    error: lastError?.message ?? 'Unknown error',
    metadata: {
      url,
      fetchStatus,
      fetchAttempts,
      usedPlaywright: shouldPlaywright,
      failureReason: lastError?.message,
    },
  };
}

// ─── Fetch backend ────────────────────────────────────────────────────────────

async function crawlWithFetch(url: string): Promise<CrawlerResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: controller.signal,
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const ct = response.headers.get('content-type') ?? '';
    if (!ct.includes('text/html') && !ct.includes('application/json')) {
      throw new Error(`Unexpected content-type: ${ct}`);
    }

    const html = await response.text();
    const items = parseProductsFromHtml(html, url);

    return {
      success: true,
      items,
      metadata: { url, httpStatus: response.status, itemCount: items.length, usedPlaywright: false },
    };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Playwright backend ───────────────────────────────────────────────────────

async function crawlWithPlaywright(url: string): Promise<CrawlerResult> {
  // Dynamic import — excluded from webpack bundle via next.config.js externals
  const { chromium } = await import('playwright');

  const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || undefined;

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-sync',
      '--no-first-run',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1366,768',
      '--lang=en-US,en',
    ],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York',
      viewport: { width: 1366, height: 768 },
      extraHTTPHeaders: {
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,' +
          'image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        Referer: 'https://www.google.com/',
        'Cache-Control': 'max-age=0',
        'Upgrade-Insecure-Requests': '1',
        'Sec-CH-UA': '"Google Chrome";v="124", "Chromium";v="124", "Not-A.Brand";v="24"',
        'Sec-CH-UA-Mobile': '?0',
        'Sec-CH-UA-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
      },
    });

    const page = await context.newPage();

    // Injected before any page JS — eliminates the most common bot-detection signals
    await page.addInitScript(() => {
      // navigator.webdriver must be undefined (not false) to pass strict checks
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

      // Real Chrome exposes plugins; headless Chromium has 0
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const arr = [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: '' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
            { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
          ];
          Object.setPrototypeOf(arr, PluginArray.prototype);
          return arr;
        },
      });

      // Languages
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });

      // chrome.runtime must exist in real Chrome
      (window as any).chrome = {
        runtime: {
          id: 'a'.repeat(32),
          onMessage: { addListener: () => {} },
          sendMessage: () => {},
        },
      };

      // Notifications permission leak (headless always returns 'denied')
      const origQuery = window.navigator.permissions?.query?.bind(window.navigator.permissions);
      if (origQuery) {
        window.navigator.permissions.query = (params: any) =>
          params.name === 'notifications'
            ? Promise.resolve({ state: 'default', onchange: null } as any)
            : origQuery(params);
      }
    });

    let httpStatus = 0;
    let finalUrl = url;

    page.on('response', response => {
      if (response.request().resourceType() === 'document') {
        httpStatus = response.status();
        finalUrl = response.url();
      }
    });

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: PLAYWRIGHT_TIMEOUT_MS });
    } catch (navError: any) {
      // networkidle times out on pages with long-polling — that is OK
      if (!String(navError.message).includes('Timeout')) throw navError;
      finalUrl = page.url();
      console.log(`[Crawler] Playwright networkidle timeout (non-fatal) | url=${url}`);
    }

    const pageTitle = await page.title().catch(() => '');
    const resolvedUrl = page.url();

    console.log(
      `[Crawler] Playwright page loaded` +
      ` | title="${pageTitle}"` +
      ` | finalUrl=${resolvedUrl}` +
      ` | httpStatus=${httpStatus || 'n/a'}`,
    );

    if (httpStatus >= 400) {
      // Capture a debug snapshot — not a crawler bug, this is an anti-bot block
      try {
        const snapshot = await page.content();
        console.warn(
          `[Crawler] Anti-bot block: HTTP ${httpStatus}` +
          ` | title="${pageTitle}"` +
          ` | finalUrl=${resolvedUrl}` +
          ` | HTML snippet (first 2000 chars):\n` +
          snapshot.slice(0, 2000),
        );
        const shot = await page.screenshot({ type: 'png', fullPage: false });
        console.warn(
          `[Crawler] Screenshot captured: ${shot.length} bytes` +
          ` — anti-bot block, not a crawler failure`,
        );
      } catch {}

      throw new Error(
        `Anti-bot block: HTTP ${httpStatus}` +
        ` | title="${pageTitle}"` +
        ` | finalUrl=${resolvedUrl}`,
      );
    }

    // Allow JS-rendered product grids a moment to populate
    await page.waitForTimeout(1500);

    const html = await page.content();
    await context.close();

    const items = parseProductsFromHtml(html, finalUrl);

    return {
      success: true,
      items,
      metadata: { url, finalUrl, pageTitle, httpStatus, itemCount: items.length, usedPlaywright: true },
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

// ─── HTML parsers (unchanged) ─────────────────────────────────────────────────

function parseProductsFromHtml(html: string, baseUrl: string): CrawledItem[] {
  const $ = cheerio.load(html);
  const items: CrawledItem[] = [];
  const seen = new Set<string>();

  // 1. JSON-LD structured data — most reliable
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '');
      for (const p of extractFromJsonLd(data, baseUrl)) {
        const key = p.url || p.name;
        if (key && !seen.has(key)) { seen.add(key); items.push(p); }
      }
    } catch {}
  });

  // 2. Open Graph / meta tags fallback
  if (items.length === 0) {
    const og = extractFromOpenGraph($, baseUrl);
    if (og?.name) items.push(og);
  }

  // 3. Product grid scraping
  for (const p of extractFromProductGrid($, baseUrl)) {
    const key = p.url || p.name;
    if (key && !seen.has(key)) { seen.add(key); items.push(p); }
  }

  return items.slice(0, 100);
}

function extractFromJsonLd(data: any, baseUrl: string): CrawledItem[] {
  const items: CrawledItem[] = [];

  const process = (node: any) => {
    if (!node) return;
    if (Array.isArray(node)) { node.forEach(process); return; }

    const type = node['@type'];
    if (type === 'Product') {
      const item = mapJsonLdProduct(node, baseUrl);
      if (item) items.push(item);
    } else if (type === 'ItemList' && node.itemListElement) {
      const elements = Array.isArray(node.itemListElement) ? node.itemListElement : [node.itemListElement];
      for (const el of elements) {
        const item = el.item || el;
        if (item['@type'] === 'Product') {
          const mapped = mapJsonLdProduct(item, baseUrl);
          if (mapped) items.push(mapped);
        }
      }
    }
    if (node['@graph']) process(node['@graph']);
  };

  process(data);
  return items;
}

function mapJsonLdProduct(node: any, baseUrl: string): CrawledItem | null {
  const name = node.name;
  if (!name) return null;

  let url = node.url || node['@id'] || '';
  if (url && !url.startsWith('http')) {
    try { url = new URL(url, baseUrl).href; } catch {}
  }

  let price: number | undefined;
  let salePrice: number | undefined;
  let currency: string | undefined;

  const offers = node.offers;
  if (offers) {
    const offerList = Array.isArray(offers) ? offers : [offers];
    const first = offerList[0];
    if (first) {
      price = parseFloat(first.price) || undefined;
      currency = first.priceCurrency;
      if (offerList.length > 1) {
        salePrice = Math.min(...offerList.map((o: any) => parseFloat(o.price) || Infinity));
        if (salePrice === Infinity) salePrice = undefined;
      }
    }
  }

  return {
    name: String(name),
    url,
    imageUrls: extractImages(node.image, baseUrl),
    price,
    salePrice,
    currency,
    description: node.description ? String(node.description).substring(0, 500) : undefined,
    color: node.color,
    category: node.category,
    tags: node.keywords ? String(node.keywords).split(',').map((k: string) => k.trim()) : [],
  };
}

function extractImages(img: any, baseUrl: string): string[] {
  if (!img) return [];
  return (Array.isArray(img) ? img : [img])
    .map((i: any) => {
      const src = typeof i === 'string' ? i : i.url || i.contentUrl || '';
      if (!src) return '';
      if (src.startsWith('http')) return src;
      try { return new URL(src, baseUrl).href; } catch { return ''; }
    })
    .filter(Boolean);
}

function extractFromOpenGraph($: cheerio.CheerioAPI, baseUrl: string): CrawledItem | null {
  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="og:title"]').attr('content') ||
    $('title').text();
  if (!title) return null;

  return {
    name: title.trim(),
    url: $('meta[property="og:url"]').attr('content') || baseUrl,
    imageUrls: [$('meta[property="og:image"]').attr('content') || ''].filter(Boolean),
    description: ($('meta[property="og:description"]').attr('content') || '').substring(0, 500),
  };
}

function extractFromProductGrid($: cheerio.CheerioAPI, baseUrl: string): CrawledItem[] {
  const items: CrawledItem[] = [];

  const selectors = [
    '[data-testid="product-card"]',
    '[data-component="product-card"]',
    '.product-card',
    '.product-item',
    '.product-tile',
    '.product-grid-item',
    '.ProductCard',
    '.ProductItem',
    '[class*="product-card"]',
    '[class*="ProductCard"]',
    '[class*="product_card"]',
    'article[class*="product"]',
    'li[class*="product"]',
    '.grid-item',
    '.item-product',
  ];

  let $products = $();
  for (const sel of selectors) {
    const found = $(sel);
    if (found.length > 2) { $products = found; break; }
  }
  if ($products.length === 0) return items;

  $products.each((_, el) => {
    const $el = $(el);

    const name =
      $el.find('h2, h3, h4, [class*="title"], [class*="name"], [class*="product-name"]').first().text().trim() ||
      $el.find('a').first().attr('title') || '';
    if (!name) return;

    let href = $el.find('a').first().attr('href') || '';
    if (href && !href.startsWith('http')) {
      try { href = new URL(href, baseUrl).href; } catch {}
    }

    const imgEl = $el.find('img').first();
    const imgSrc = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-lazy-src') || '';
    const imageUrls = imgSrc
      ? [imgSrc.startsWith('http') ? imgSrc : (() => { try { return new URL(imgSrc, baseUrl).href; } catch { return ''; } })()]
      : [];

    const priceText = $el.find('[class*="price"]').first().text().replace(/[^0-9.]/g, '');

    items.push({ name, url: href || baseUrl, imageUrls: imageUrls.filter(Boolean), price: parseFloat(priceText) || undefined });
  });

  return items;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function hashItems(items: CrawledItem[]): string {
  return hashContent(items.map(i => `${i.name}|${i.url}`).sort().join('\n'));
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
