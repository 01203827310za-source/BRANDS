import { prisma } from '@/lib/db';
import { analyzeWithAI, saveAiAnalysis } from '@/services/ai/analyzer';
import { notifyDiscovery } from '@/services/telegram/notifier';
import { getSettings } from '@/services/settings';
import { DiscoveryType } from '@prisma/client';

export async function monitorInstagram(brandId: string): Promise<void> {
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: { sources: { where: { sourceType: 'INSTAGRAM', isActive: true } } },
  });

  if (!brand || !brand.instagramHandle) return;

  const source = brand.sources[0];
  if (!source) return;

  try {
    // Try scraping public Instagram profile via web
    const posts = await scrapeInstagramPublic(brand.instagramHandle);
    
    const settings = await getSettings();
    const confidenceThreshold = parseFloat(settings.AI_CONFIDENCE_THRESHOLD || '0.6');
    const importanceThreshold = parseFloat(settings.IMPORTANCE_THRESHOLD || '0.5');
    const notifyTypes = (settings.NOTIFICATION_TYPES || 'NEW_PRODUCT,NEW_COLLECTION,LIMITED_DROP').split(',');

    for (const post of posts) {
      // Check if already processed
      const existing = await prisma.instagramPost.findUnique({
        where: { postId: post.id },
      });
      if (existing) continue;

      // Save post
      const savedPost = await prisma.instagramPost.create({
        data: {
          brandId,
          postId: post.id,
          postUrl: post.url,
          mediaUrls: post.mediaUrls,
          caption: post.caption,
          hashtags: post.hashtags,
          mentions: post.mentions,
          postType: post.type,
          postedAt: post.timestamp ? new Date(post.timestamp * 1000) : null,
          rawData: post as any,
        },
      });

      // Analyze with AI
      const analysis = await analyzeWithAI({
        title: post.caption?.substring(0, 100) || 'Instagram post',
        description: post.caption,
        brandName: brand.name,
        url: post.url,
        imageCount: post.mediaUrls.length,
        sourceType: 'INSTAGRAM',
        additionalContext: `Hashtags: ${post.hashtags.join(', ')}`,
      });

      if (!analysis || analysis.importanceScore < 0.3) {
        console.log('[Instagram] skipping post (low importance or null analysis):', post.id);
        continue;
      }

      console.log('[Instagram] AI result | type:', analysis.classifiedAs, '| confidence:', analysis.confidence, '| model:', analysis.model);

      // Create discovery
      const discovery = await prisma.discovery.create({
        data: {
          brandId,
          discoveryType: analysis.classifiedAs as DiscoveryType,
          sourceType: 'INSTAGRAM',
          title: analysis.productName || analysis.collectionName || `${brand.name} Instagram post`,
          summary: analysis.summary,
          url: post.url,
          imageUrls: post.mediaUrls.slice(0, 5),
          confidenceScore: analysis.confidence,
          importanceScore: analysis.importanceScore,
          instagramPostId: savedPost.id,
        },
      });

      // Issue 6 fix: pass analysis.model so the model name is recorded in the DB
      await saveAiAnalysis(discovery.id, analysis, analysis.model);

      const shouldNotify =
        analysis.shouldNotify &&
        analysis.confidence >= confidenceThreshold &&
        analysis.importanceScore >= importanceThreshold &&
        notifyTypes.includes(analysis.classifiedAs);

      console.log('[Instagram] shouldNotify:', shouldNotify, { type: analysis.classifiedAs, confidence: analysis.confidence, importance: analysis.importanceScore });

      if (shouldNotify) {
        await notifyDiscovery(discovery.id);
      }
    }

    await prisma.brandSource.update({
      where: { id: source.id },
      data: { lastCrawled: new Date(), errorCount: 0 },
    });
  } catch (error: any) {
    console.error(`[Instagram] Error for ${brand.name}:`, error.message);
    await prisma.brandSource.update({
      where: { id: source.id },
      data: { errorCount: { increment: 1 } },
    });
  }
}

interface InstagramPost {
  id: string;
  url: string;
  mediaUrls: string[];
  caption: string;
  hashtags: string[];
  mentions: string[];
  type: string;
  timestamp?: number;
}

async function scrapeInstagramPublic(handle: string): Promise<InstagramPost[]> {
  // Instagram public scraping via their public API endpoint
  const url = `https://www.instagram.com/${handle}/?__a=1&__d=dis`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const edges = data?.graphql?.user?.edge_owner_to_timeline_media?.edges || [];

    return edges.slice(0, 12).map((edge: any) => {
      const node = edge.node;
      const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text || '';
      const hashtags = (caption.match(/#\w+/g) || []).map((h: string) => h.toLowerCase());
      const mentions = (caption.match(/@\w+/g) || []).map((m: string) => m.toLowerCase());

      const mediaUrls: string[] = [];
      if (node.display_url) mediaUrls.push(node.display_url);
      if (node.edge_sidecar_to_children?.edges) {
        for (const child of node.edge_sidecar_to_children.edges) {
          if (child.node?.display_url) mediaUrls.push(child.node.display_url);
        }
      }

      return {
        id: node.id,
        url: `https://www.instagram.com/p/${node.shortcode}/`,
        mediaUrls,
        caption,
        hashtags,
        mentions,
        type: node.__typename === 'GraphVideo' ? 'VIDEO' :
          node.__typename === 'GraphSidecar' ? 'CAROUSEL' : 'IMAGE',
        timestamp: node.taken_at_timestamp,
      };
    });
  } catch {
    return [];
  }
}
