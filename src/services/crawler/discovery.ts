import { prisma } from '@/lib/db';
import { CrawledItem, AIAnalysisResult } from '@/types';
import { analyzeWithAI, saveAiAnalysis } from '@/services/ai/analyzer';
import { notifyDiscovery } from '@/services/telegram/notifier';
import { getSettings } from '@/services/settings';
import { hashContent } from '@/services/crawler/scraper';
import { DiscoveryType, SourceType } from '@prisma/client';

export async function processDiscoveries(
  brandId: string,
  items: CrawledItem[],
  sourceType: SourceType
): Promise<{ newCount: number; duplicateCount: number }> {
  let newCount = 0;
  let duplicateCount = 0;

  console.log('[PIPELINE] processDiscoveries started | brandId:', brandId, '| items:', items.length, '| sourceType:', sourceType);

  const settings = await getSettings();
  const confidenceThreshold = parseFloat(settings.AI_CONFIDENCE_THRESHOLD || '0.6');
  const importanceThreshold = parseFloat(settings.IMPORTANCE_THRESHOLD || '0.5');
  const notifyTypes = (settings.NOTIFICATION_TYPES || 'NEW_PRODUCT,NEW_COLLECTION,LIMITED_DROP,RESTOCK').split(',');

  console.log('[PIPELINE] thresholds | confidence:', confidenceThreshold, '| importance:', importanceThreshold, '| notifyTypes:', notifyTypes);
  console.log('[PIPELINE] settings | AI_PROVIDER:', settings.AI_PROVIDER, '| GROQ_KEY_SET:', !!(settings.GROQ_API_KEY), '| OPENAI_KEY_SET:', !!(settings.OPENAI_API_KEY));

  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) {
    console.warn('[PIPELINE] brand not found:', brandId);
    return { newCount, duplicateCount };
  }

  for (const item of items) {
    try {
      console.log('[PIPELINE] processing item:', item.name, '| url:', item.url);

      const isDup = await isDuplicate(item, brandId);
      if (isDup) {
        duplicateCount++;
        console.log('[PIPELINE] duplicate skipped:', item.name);
        continue;
      }

      // Save as product
      let productId: string | undefined;
      let product = null;
      if (item.url) {
        product = await prisma.product.upsert({
          where: { url: item.url },
          update: {
            name: item.name,
            imageUrls: item.imageUrls,
            price: item.price,
            salePrice: item.salePrice,
            currency: item.currency,
            category: item.category,
            color: item.color,
            description: item.description,
            sizes: item.sizes || [],
            collectionName: item.collectionName,
            tags: item.tags || [],
          },
          create: {
            brandId,
            name: item.name,
            url: item.url,
            urlHash: hashContent(item.url),
            imageUrls: item.imageUrls,
            price: item.price,
            salePrice: item.salePrice,
            currency: item.currency,
            category: item.category,
            color: item.color,
            description: item.description,
            sizes: item.sizes || [],
            releaseDate: item.releaseDate,
            collectionName: item.collectionName,
            gender: item.gender,
            tags: item.tags || [],
            rawData: item.rawData as any,
          },
        });
        productId = product.id;
      }

      // Create content hash for dedup
      const contentHash = hashContent(`${item.name}|${item.url}|${brandId}`);

      // Create discovery
      const discovery = await prisma.discovery.create({
        data: {
          brandId,
          discoveryType: DiscoveryType.NEW_PRODUCT, // updated after AI
          sourceType,
          title: item.name,
          url: item.url,
          imageUrls: item.imageUrls,
          contentHash,
          productId,
          rawData: item.rawData as any,
        },
      });

      console.log('[PIPELINE] discovery created:', discovery.id, '| title:', item.name);

      // AI Analysis
      console.log('[PIPELINE] calling analyzeWithAI for:', item.name);
      const analysis = await analyzeWithAI({
        title: item.name,
        description: item.description,
        brandName: brand.name,
        url: item.url,
        imageCount: item.imageUrls.length,
        sourceType: sourceType,
        additionalContext: [
          item.collectionName ? `Collection: ${item.collectionName}` : '',
          item.releaseDate ? `Release Date: ${item.releaseDate}` : '',
          item.tags?.length ? `Tags: ${item.tags.join(', ')}` : '',
        ].filter(Boolean).join(' | '),
      });

      if (analysis) {
        console.log('[PIPELINE] AI analysis returned | classifiedAs:', analysis.classifiedAs, '| confidence:', analysis.confidence, '| importance:', analysis.importanceScore, '| shouldNotify:', analysis.shouldNotify, '| model:', analysis.model);

        await saveAiAnalysis(discovery.id, analysis, analysis.model);
        console.log('[PIPELINE] saveAiAnalysis done for discovery:', discovery.id);

        // Update discovery with AI results
        await prisma.discovery.update({
          where: { id: discovery.id },
          data: {
            discoveryType: analysis.classifiedAs as DiscoveryType,
            summary: analysis.summary,
            confidenceScore: analysis.confidence,
            importanceScore: analysis.importanceScore,
          },
        });
        console.log('[DISCOVERY] updated', discovery.id, '| type:', analysis.classifiedAs);

        // Update collection if detected
        if (analysis.collectionName) {
          try {
            let collection = await prisma.collection.findFirst({
              where: { brandId, name: analysis.collectionName },
            });
            if (!collection) {
              collection = await prisma.collection.create({
                data: {
                  brandId,
                  name: analysis.collectionName,
                  url: item.url,
                  imageUrls: item.imageUrls.slice(0, 3),
                },
              });
            }
            if (collection) {
              await prisma.discovery.update({
                where: { id: discovery.id },
                data: { collectionId: collection.id },
              });
            }
          } catch {}
        }

        // Send notification if meets thresholds
        const shouldNotify =
          analysis.shouldNotify &&
          analysis.confidence >= confidenceThreshold &&
          analysis.importanceScore >= importanceThreshold &&
          notifyTypes.includes(analysis.classifiedAs);

        console.log('[NOTIFICATION] shouldNotify:', shouldNotify, {
          analysisShould: analysis.shouldNotify,
          confidence: analysis.confidence,
          confidenceThreshold,
          importance: analysis.importanceScore,
          importanceThreshold,
          classifiedAs: analysis.classifiedAs,
          typeAllowed: notifyTypes.includes(analysis.classifiedAs),
        });

        if (shouldNotify) {
          console.log('[NOTIFICATION] triggering notifyDiscovery for:', discovery.id);
          await notifyDiscovery(discovery.id);
          console.log('[NOTIFICATION] notifyDiscovery complete for:', discovery.id);
        }
      } else {
        console.warn('[PIPELINE] analyzeWithAI returned null for:', item.name, '— no AI analysis saved');
      }

      // Log system event
      await prisma.systemEvent.create({
        data: {
          type: 'NEW_DISCOVERY',
          level: 'INFO',
          message: `New discovery: ${item.name} (${brand.name})`,
          metadata: { brandId, discoveryId: discovery.id, sourceType } as any,
        },
      });

      newCount++;
    } catch (error: any) {
      console.error(`[PIPELINE] Error processing item "${item.name}":`, error.message);
    }
  }

  console.log('[PIPELINE] processDiscoveries done | newCount:', newCount, '| duplicateCount:', duplicateCount);
  return { newCount, duplicateCount };
}

async function isDuplicate(item: CrawledItem, brandId: string): Promise<boolean> {
  if (item.url) {
    const existing = await prisma.product.findUnique({ where: { url: item.url } });
    if (existing) return true;
  }

  // Check by content hash
  const contentHash = hashContent(`${item.name}|${item.url}|${brandId}`);
  const existingDiscovery = await prisma.discovery.findFirst({
    where: { contentHash },
  });
  if (existingDiscovery) return true;

  // Check by name similarity (same brand, same name within last 7 days)
  if (item.name) {
    const recentSimilar = await prisma.discovery.findFirst({
      where: {
        brandId,
        title: { equals: item.name, mode: 'insensitive' },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
    if (recentSimilar) return true;
  }

  return false;
}

export async function processWebSearchResults(
  brandId: string,
  results: { title: string; url: string; snippet: string }[]
): Promise<{ newCount: number }> {
  let newCount = 0;
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) return { newCount };

  const settings = await getSettings();
  const confidenceThreshold = parseFloat(settings.AI_CONFIDENCE_THRESHOLD || '0.6');
  const importanceThreshold = parseFloat(settings.IMPORTANCE_THRESHOLD || '0.5');
  const notifyTypes = (settings.NOTIFICATION_TYPES || 'NEW_PRODUCT,NEW_COLLECTION,LIMITED_DROP,RESTOCK').split(',');

  console.log('[PIPELINE] processWebSearchResults started | brandId:', brandId, '| results:', results.length);

  for (const result of results) {
    try {
      const contentHash = hashContent(`search|${result.url}|${brandId}`);
      const existing = await prisma.discovery.findFirst({ where: { contentHash } });
      if (existing) continue;

      console.log('[PIPELINE] web search item:', result.title);
      const analysis = await analyzeWithAI({
        title: result.title,
        description: result.snippet,
        brandName: brand.name,
        url: result.url,
        sourceType: 'WEB_SEARCH',
      });

      if (!analysis || analysis.importanceScore < 0.4) {
        console.log('[PIPELINE] web search item skipped (low importance or null):', result.title);
        continue;
      }

      const discovery = await prisma.discovery.create({
        data: {
          brandId,
          discoveryType: analysis.classifiedAs as DiscoveryType,
          sourceType: 'WEB_SEARCH',
          title: result.title,
          summary: analysis.summary,
          url: result.url,
          imageUrls: [],
          contentHash,
          confidenceScore: analysis.confidence,
          importanceScore: analysis.importanceScore,
        },
      });

      await saveAiAnalysis(discovery.id, analysis, analysis.model);

      const shouldNotify =
        analysis.shouldNotify &&
        analysis.confidence >= confidenceThreshold &&
        analysis.importanceScore >= importanceThreshold &&
        notifyTypes.includes(analysis.classifiedAs);

      console.log('[NOTIFICATION] web search shouldNotify:', shouldNotify, '| title:', result.title);

      if (shouldNotify) {
        await notifyDiscovery(discovery.id);
      }

      newCount++;
    } catch (error: any) {
      console.error(`[PIPELINE] Web search item error:`, error.message);
    }
  }

  console.log('[PIPELINE] processWebSearchResults done | newCount:', newCount);
  return { newCount };
}
