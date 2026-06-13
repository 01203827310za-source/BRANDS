import { PrismaClient, BrandCategory, Priority, SourceType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const brands = [
  {
    name: 'Nike',
    slug: 'nike',
    websiteUrl: 'https://www.nike.com',
    newArrivalsUrl: 'https://www.nike.com/w/new-releases-3n82y',
    collectionsUrl: 'https://www.nike.com/w/new-3n82y',
    instagramHandle: 'nike',
    instagramUrl: 'https://www.instagram.com/nike/',
    country: 'US',
    category: BrandCategory.SPORTSWEAR,
    priority: Priority.HIGH,
  },
  {
    name: 'Adidas',
    slug: 'adidas',
    websiteUrl: 'https://www.adidas.com',
    newArrivalsUrl: 'https://www.adidas.com/us/new_arrivals',
    collectionsUrl: 'https://www.adidas.com/us/collections',
    instagramHandle: 'adidas',
    instagramUrl: 'https://www.instagram.com/adidas/',
    country: 'DE',
    category: BrandCategory.SPORTSWEAR,
    priority: Priority.HIGH,
  },
  {
    name: 'Puma',
    slug: 'puma',
    websiteUrl: 'https://www.puma.com',
    newArrivalsUrl: 'https://www.puma.com/us/en/new-arrivals',
    collectionsUrl: 'https://www.puma.com/us/en/collections',
    instagramHandle: 'puma',
    instagramUrl: 'https://www.instagram.com/puma/',
    country: 'DE',
    category: BrandCategory.SPORTSWEAR,
    priority: Priority.HIGH,
  },
  {
    name: 'New Balance',
    slug: 'new-balance',
    websiteUrl: 'https://www.newbalance.com',
    newArrivalsUrl: 'https://www.newbalance.com/en-us/sale/new-arrivals/',
    collectionsUrl: 'https://www.newbalance.com/en-us/collections/',
    instagramHandle: 'newbalance',
    instagramUrl: 'https://www.instagram.com/newbalance/',
    country: 'US',
    category: BrandCategory.SPORTSWEAR,
    priority: Priority.HIGH,
  },
  {
    name: 'Under Armour',
    slug: 'under-armour',
    websiteUrl: 'https://www.underarmour.com',
    newArrivalsUrl: 'https://www.underarmour.com/en-us/c/mens-new-arrivals/',
    collectionsUrl: 'https://www.underarmour.com/en-us/c/new-collections/',
    instagramHandle: 'underarmour',
    instagramUrl: 'https://www.instagram.com/underarmour/',
    country: 'US',
    category: BrandCategory.SPORTSWEAR,
    priority: Priority.MEDIUM,
  },
  {
    name: 'Reebok',
    slug: 'reebok',
    websiteUrl: 'https://www.reebok.com',
    newArrivalsUrl: 'https://www.reebok.com/us/new-arrivals',
    collectionsUrl: 'https://www.reebok.com/us/collections',
    instagramHandle: 'reebok',
    instagramUrl: 'https://www.instagram.com/reebok/',
    country: 'US',
    category: BrandCategory.SPORTSWEAR,
    priority: Priority.MEDIUM,
  },
  {
    name: 'Converse',
    slug: 'converse',
    websiteUrl: 'https://www.converse.com',
    newArrivalsUrl: 'https://www.converse.com/us/en/new-arrivals/',
    collectionsUrl: 'https://www.converse.com/us/en/collections/',
    instagramHandle: 'converse',
    instagramUrl: 'https://www.instagram.com/converse/',
    country: 'US',
    category: BrandCategory.FOOTWEAR,
    priority: Priority.MEDIUM,
  },
  {
    name: 'Vans',
    slug: 'vans',
    websiteUrl: 'https://www.vans.com',
    newArrivalsUrl: 'https://www.vans.com/en-us/new-arrivals/',
    collectionsUrl: 'https://www.vans.com/en-us/collections/',
    instagramHandle: 'vans',
    instagramUrl: 'https://www.instagram.com/vans/',
    country: 'US',
    category: BrandCategory.STREETWEAR,
    priority: Priority.MEDIUM,
  },
  {
    name: 'Jordan',
    slug: 'jordan',
    websiteUrl: 'https://www.nike.com/jordan',
    newArrivalsUrl: 'https://www.nike.com/w/jordan-new-3n82yqi',
    collectionsUrl: 'https://www.nike.com/w/jordan-3n82y',
    instagramHandle: 'jumpman23',
    instagramUrl: 'https://www.instagram.com/jumpman23/',
    country: 'US',
    category: BrandCategory.SPORTSWEAR,
    priority: Priority.HIGH,
  },
  {
    name: 'ASICS',
    slug: 'asics',
    websiteUrl: 'https://www.asics.com',
    newArrivalsUrl: 'https://www.asics.com/us/en-us/new-arrivals/',
    collectionsUrl: 'https://www.asics.com/us/en-us/collections/',
    instagramHandle: 'asics',
    instagramUrl: 'https://www.instagram.com/asics/',
    country: 'JP',
    category: BrandCategory.SPORTSWEAR,
    priority: Priority.MEDIUM,
  },
  {
    name: 'Skechers',
    slug: 'skechers',
    websiteUrl: 'https://www.skechers.com',
    newArrivalsUrl: 'https://www.skechers.com/new-arrivals/',
    collectionsUrl: 'https://www.skechers.com/collections/',
    instagramHandle: 'skechers',
    instagramUrl: 'https://www.instagram.com/skechers/',
    country: 'US',
    category: BrandCategory.FOOTWEAR,
    priority: Priority.LOW,
  },
  {
    name: 'The North Face',
    slug: 'the-north-face',
    websiteUrl: 'https://www.thenorthface.com',
    newArrivalsUrl: 'https://www.thenorthface.com/shop/new-arrivals',
    collectionsUrl: 'https://www.thenorthface.com/shop/collections',
    instagramHandle: 'thenorthface',
    instagramUrl: 'https://www.instagram.com/thenorthface/',
    country: 'US',
    category: BrandCategory.OUTDOOR,
    priority: Priority.HIGH,
  },
  {
    name: 'Columbia',
    slug: 'columbia',
    websiteUrl: 'https://www.columbia.com',
    newArrivalsUrl: 'https://www.columbia.com/c/new-arrivals',
    collectionsUrl: 'https://www.columbia.com/c/collections',
    instagramHandle: 'columbiasportswear',
    instagramUrl: 'https://www.instagram.com/columbiasportswear/',
    country: 'US',
    category: BrandCategory.OUTDOOR,
    priority: Priority.MEDIUM,
  },
  {
    name: 'Lacoste',
    slug: 'lacoste',
    websiteUrl: 'https://www.lacoste.com',
    newArrivalsUrl: 'https://www.lacoste.com/en/us/new-arrivals/',
    collectionsUrl: 'https://www.lacoste.com/en/us/collections/',
    instagramHandle: 'lacoste',
    instagramUrl: 'https://www.instagram.com/lacoste/',
    country: 'FR',
    category: BrandCategory.FASHION,
    priority: Priority.MEDIUM,
  },
  {
    name: 'Tommy Hilfiger',
    slug: 'tommy-hilfiger',
    websiteUrl: 'https://www.tommy.com',
    newArrivalsUrl: 'https://www.tommy.com/en/new-arrivals',
    collectionsUrl: 'https://www.tommy.com/en/collections',
    instagramHandle: 'tommyhilfiger',
    instagramUrl: 'https://www.instagram.com/tommyhilfiger/',
    country: 'US',
    category: BrandCategory.FASHION,
    priority: Priority.MEDIUM,
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@brandmonitor.com' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@brandmonitor.com',
      passwordHash: hashedPassword,
      name: 'Admin',
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // Create brands and their sources
  for (const brandData of brands) {
    const brand = await prisma.brand.upsert({
      where: { slug: brandData.slug },
      update: {},
      create: {
        ...brandData,
      },
    });

    // Create sources for each brand
    const sources = [];
    if (brandData.websiteUrl) {
      sources.push({ sourceType: SourceType.WEBSITE, url: brandData.websiteUrl, crawlFreq: 120 });
    }
    if (brandData.newArrivalsUrl) {
      sources.push({ sourceType: SourceType.NEW_ARRIVALS, url: brandData.newArrivalsUrl, crawlFreq: 60 });
    }
    if (brandData.collectionsUrl) {
      sources.push({ sourceType: SourceType.COLLECTIONS, url: brandData.collectionsUrl, crawlFreq: 120 });
    }
    if (brandData.instagramUrl) {
      sources.push({ sourceType: SourceType.INSTAGRAM, url: brandData.instagramUrl, crawlFreq: 30 });
    }

    for (const src of sources) {
      await prisma.brandSource.upsert({
        where: {
          brandId_sourceType: {
            brandId: brand.id,
            sourceType: src.sourceType,
          },
        },
        update: {
          url: src.url,
          crawlFreq: src.crawlFreq || 60,
        },
        create: {
          brandId: brand.id,
          ...src,
        },
      }).catch(() => {
        // Ignore duplicate key
      });
    }

    console.log(`✅ Brand: ${brand.name}`);
  }

  // Create default settings
  const defaultSettings = [
    { key: 'TELEGRAM_BOT_TOKEN', value: '', isSecret: true },
    { key: 'TELEGRAM_CHAT_ID', value: '', isSecret: false },
    { key: 'OPENAI_API_KEY', value: '', isSecret: true },
    { key: 'GROQ_API_KEY',  value: '', isSecret: true },
    { key: 'AI_PROVIDER',   value: 'groq', isSecret: false },
    { key: 'CRAWL_INTERVAL_MINUTES', value: '60', isSecret: false },
    { key: 'SEARCH_INTERVAL_HOURS', value: '24', isSecret: false },
    { key: 'AI_CONFIDENCE_THRESHOLD', value: '0.6', isSecret: false },
    { key: 'IMPORTANCE_THRESHOLD', value: '0.5', isSecret: false },
    { key: 'DAILY_DIGEST_HOUR', value: '8', isSecret: false },
    { key: 'MAX_RETRIES', value: '3', isSecret: false },
    { key: 'NOTIFICATION_TYPES', value: 'NEW_PRODUCT,NEW_COLLECTION,LIMITED_DROP,RESTOCK', isSecret: false },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log('✅ Default settings created');

  console.log('\n🎉 Database seeded successfully!');
  console.log(`📧 Admin email: ${admin.email}`);
  console.log(`🔑 Admin password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
