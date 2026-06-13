import { prisma } from '@/lib/db';
import { processWebSearchResults } from '@/services/crawler/discovery';

const SEARCH_QUERIES = [
  '{brand} new collection {year}',
  '{brand} new arrival',
  '{brand} new release',
  '{brand} new drop',
  '{brand} launch',
  '{brand} limited edition',
  '{brand} collaboration',
];

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function searchWebForBrand(brandId: string): Promise<void> {
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) return;

  const year = new Date().getFullYear();
  const allResults: SearchResult[] = [];

  for (const queryTemplate of SEARCH_QUERIES.slice(0, 4)) {
    const query = queryTemplate
      .replace('{brand}', brand.name)
      .replace('{year}', String(year));

    try {
      const results = await searchDuckDuckGo(query);
      allResults.push(...results);
      await sleep(1000); // be polite
    } catch (error: any) {
      console.warn(`[Search] Failed query "${query}": ${error.message}`);
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const uniqueResults = allResults.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  // Filter out irrelevant results
  const relevant = uniqueResults.filter(r => {
    const text = (r.title + ' ' + r.snippet).toLowerCase();
    return text.includes(brand.name.toLowerCase()) ||
      text.includes(brand.slug.replace('-', ' '));
  });

  if (relevant.length > 0) {
    const { newCount } = await processWebSearchResults(brandId, relevant.slice(0, 20));
    console.log(`[Search] ${brand.name}: ${newCount} new discoveries from ${relevant.length} results`);
  }

  // Update source last crawled
  await prisma.brandSource.updateMany({
    where: { brandId, sourceType: 'WEB_SEARCH' },
    data: { lastCrawled: new Date() },
  });
}

async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://html.duckduckgo.com/html/?q=${encoded}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(`Search failed: ${response.status}`);

  const html = await response.text();
  return parseDuckDuckGoResults(html);
}

function parseDuckDuckGoResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  // Extract results using regex (no cheerio dependency for this simple case)
  const resultRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
  const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([^<]*(?:<[^\/][^>]*>[^<]*<\/[^>]+>[^<]*)*)<\/a>/g;

  let match;
  const urls: string[] = [];
  const titles: string[] = [];

  while ((match = resultRegex.exec(html)) !== null) {
    const href = match[1];
    const title = match[2].replace(/<[^>]+>/g, '').trim();
    if (href && title && !href.includes('duckduckgo.com')) {
      urls.push(href);
      titles.push(title);
    }
  }

  const snippets: string[] = [];
  while ((match = snippetRegex.exec(html)) !== null) {
    snippets.push(match[1].replace(/<[^>]+>/g, '').trim());
  }

  for (let i = 0; i < Math.min(urls.length, 10); i++) {
    results.push({
      title: titles[i] || '',
      url: urls[i],
      snippet: snippets[i] || '',
    });
  }

  return results;
}

export async function runWebSearchForAllBrands(): Promise<void> {
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    orderBy: { priority: 'asc' },
  });

  for (const brand of brands) {
    try {
      await searchWebForBrand(brand.id);
      await sleep(3000); // rate limiting between brands
    } catch (error: any) {
      console.error(`[Search] Error for ${brand.name}:`, error.message);
    }
  }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
