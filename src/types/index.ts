import { Brand, BrandSource, Discovery, Product, Collection, CrawlJob, Notification, Setting } from '@prisma/client';

export type BrandWithSources = Brand & {
  sources: BrandSource[];
  _count?: {
    products: number;
    discoveries: number;
    collections: number;
  };
};

export type DiscoveryWithRelations = Discovery & {
  brand: Brand;
  product?: Product | null;
  collection?: Collection | null;
  aiAnalysis?: {
    id: string;
    summary: string | null;
    confidence: number | null;
    importanceScore: number | null;
    keywords: string[];
    classifiedAs: string | null;
    productName: string | null;
    collectionName: string | null;
  } | null;
  notifications: Notification[];
};

export type DashboardStats = {
  totalBrands: number;
  activeBrands: number;
  totalDiscoveries: number;
  todayDiscoveries: number;
  totalProducts: number;
  newProductsToday: number;
  totalCollections: number;
  notificationsSent: number;
  pendingNotifications: number;
  recentDiscoveries: DiscoveryWithRelations[];
  discoveryTypes: { type: string; count: number }[];
  brandActivity: { name: string; count: number }[];
};

export type CrawlerResult = {
  success: boolean;
  items: CrawledItem[];
  error?: string;
  metadata?: Record<string, any>;
};

export type CrawledItem = {
  name: string;
  url: string;
  imageUrls: string[];
  price?: number;
  salePrice?: number;
  currency?: string;
  category?: string;
  color?: string;
  description?: string;
  sizes?: string[];
  releaseDate?: string;
  collectionName?: string;
  gender?: string;
  tags?: string[];
  rawData?: Record<string, any>;
};

export type AIAnalysisResult = {
  classifiedAs: string;
  summary: string;
  reasoning: string;
  confidence: number;
  importanceScore: number;
  keywords: string[];
  productName?: string;
  collectionName?: string;
  shouldNotify: boolean;
  model?: string;
};

export type TelegramMessage = {
  brandName: string;
  discoveryType: string;
  title: string;
  summary?: string;
  productName?: string;
  collectionName?: string;
  imageUrl?: string;
  url?: string;
  confidence?: number;
  timestamp: Date;
};

export type SettingsMap = {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  OPENAI_API_KEY?: string;
  GROQ_API_KEY?: string;
  AI_PROVIDER?: string;
  CRAWL_INTERVAL_MINUTES?: string;
  SEARCH_INTERVAL_HOURS?: string;
  AI_CONFIDENCE_THRESHOLD?: string;
  IMPORTANCE_THRESHOLD?: string;
  DAILY_DIGEST_HOUR?: string;
  MAX_RETRIES?: string;
  NOTIFICATION_TYPES?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ApiError = {
  error: string;
  details?: string;
  code?: string;
};
