import * as cheerio from 'cheerio';
import { CrawledItem, CrawlerResult } from '@/types';
import crypto from 'crypto';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

const TIMEOUT_MS = 20000;

export async function crawlUrl(url: string, retries = 3): Promise<CrawlerResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await crawlWithFetch(url);
      return result;
    } catch (error: any) {
      lastError = error;
      console.warn(`[Crawler] Attempt ${attempt}/${retries} failed for ${url}: ${error.message}`);
      if (attempt < retries) {
        await sleep(attempt * 2000);
      }
    }
  }

  return {
    success: false,
    items: [],
    error: lastError?.message || 'Unknown error',
  };
}

async function crawlWithFetch(url: string): Promise<CrawlerResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/json')) {
      throw new Error(`Unexpected content type: ${contentType}`);
    }

    const html = await response.text();
    const items = parseProductsFromHtml(html, url);

    return { success: true, items, metadata: { url, itemCount: items.length } };
  } finally {
    clearTimeout(timeout);
  }
}

function parseProductsFromHtml(html: string, baseUrl: string): CrawledItem[] {
  const $ = cheerio.load(html);
  const items: CrawledItem[] = [];
  const seen = new Set<string>();

  // Try structured data (JSON-LD) first — most reliable
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html() || '';
      const data = JSON.parse(raw);
      const products = extractFromJsonLd(data, baseUrl);
      for (const p of products) {
        const key = p.url || p.name;
        if (key && !seen.has(key)) {
          seen.add(key);
          items.push(p);
        }
      }
    } catch {}
  });

  // Try Open Graph / meta tags if no structured data
  if (items.length === 0) {
    const ogItem = extractFromOpenGraph($, baseUrl);
    if (ogItem?.name) {
      items.push(ogItem);
    }
  }

  // Scrape product grids
  const gridItems = extractFromProductGrid($, baseUrl);
  for (const p of gridItems) {
    const key = p.url || p.name;
    if (key && !seen.has(key)) {
      seen.add(key);
      items.push(p);
    }
  }

  return items.slice(0, 100); // cap at 100 items per page
}

function extractFromJsonLd(data: any, baseUrl: string): CrawledItem[] {
  const items: CrawledItem[] = [];

  const process = (node: any) => {
    if (!node) return;

    if (Array.isArray(node)) {
      node.forEach(process);
      return;
    }

    const type = node['@type'];
    if (type === 'Product' || type === 'ItemList') {
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
    }

    // recurse into @graph
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
    url = new URL(url, baseUrl).href;
  }

  let price: number | undefined;
  let salePrice: number | undefined;
  let currency: string | undefined;

  const offers = node.offers;
  if (offers) {
    const offerList = Array.isArray(offers) ? offers : [offers];
    const firstOffer = offerList[0];
    if (firstOffer) {
      price = parseFloat(firstOffer.price) || undefined;
      currency = firstOffer.priceCurrency;
      if (offerList.length > 1) {
        salePrice = Math.min(...offerList.map((o: any) => parseFloat(o.price) || Infinity));
        if (salePrice === Infinity) salePrice = undefined;
      }
    }
  }

  const images = extractImages(node.image, baseUrl);

  return {
    name: String(name),
    url,
    imageUrls: images,
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
  const raw = Array.isArray(img) ? img : [img];
  return raw
    .map((i: any) => {
      const src = typeof i === 'string' ? i : i.url || i.contentUrl || '';
      if (!src) return '';
      if (src.startsWith('http')) return src;
      try { return new URL(src, baseUrl).href; } catch { return ''; }
    })
    .filter(Boolean);
}

function extractFromOpenGraph($: cheerio.CheerioAPI, baseUrl: string): CrawledItem | null {
  const title = $('meta[property="og:title"]').attr('content') ||
    $('meta[name="og:title"]').attr('content') ||
    $('title').text();
  if (!title) return null;

  const image = $('meta[property="og:image"]').attr('content') || '';
  const url = $('meta[property="og:url"]').attr('content') || baseUrl;
  const description = $('meta[property="og:description"]').attr('content') || '';

  return {
    name: title.trim(),
    url,
    imageUrls: image ? [image] : [],
    description: description.substring(0, 500),
  };
}

function extractFromProductGrid($: cheerio.CheerioAPI, baseUrl: string): CrawledItem[] {
  const items: CrawledItem[] = [];

  // Common product card selectors across major e-commerce sites
  const productSelectors = [
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
  for (const sel of productSelectors) {
    const found = $(sel);
    if (found.length > 2) {
      $products = found;
      break;
    }
  }

  if ($products.length === 0) return items;

  $products.each((_, el) => {
    const $el = $(el);

    // Name
    const name = $el.find('h2, h3, h4, [class*="title"], [class*="name"], [class*="product-name"]').first().text().trim() ||
      $el.find('a').first().attr('title') || '';
    if (!name) return;

    // URL
    let href = $el.find('a').first().attr('href') || '';
    if (href && !href.startsWith('http')) {
      try { href = new URL(href, baseUrl).href; } catch {}
    }

    // Image
    const imgSrc = $el.find('img').first().attr('src') ||
      $el.find('img').first().attr('data-src') ||
      $el.find('img').first().attr('data-lazy-src') || '';
    const imageUrls = imgSrc ? [imgSrc.startsWith('http') ? imgSrc : new URL(imgSrc, baseUrl).href] : [];

    // Price
    const priceText = $el.find('[class*="price"]').first().text().replace(/[^0-9.]/g, '');
    const price = parseFloat(priceText) || undefined;

    items.push({ name, url: href || baseUrl, imageUrls, price });
  });

  return items;
}

export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function hashItems(items: CrawledItem[]): string {
  const normalized = items.map(i => `${i.name}|${i.url}`).sort().join('\n');
  return hashContent(normalized);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
