-- ============================================================
-- Brand Monitor — SQL Seed
-- Pure PostgreSQL. Safe to re-run (ON CONFLICT DO NOTHING).
-- Paste into Railway Postgres → Query Editor and run.
-- ============================================================

BEGIN;

-- ── 1. Brands ─────────────────────────────────────────────
INSERT INTO brands (
  id, name, slug,
  "websiteUrl", "newArrivalsUrl", "collectionsUrl",
  "instagramHandle", "instagramUrl",
  country, category, priority,
  "isActive", "createdAt", "updatedAt"
) VALUES
  ('brand_nike',        'Nike',           'nike',
   'https://www.nike.com',
   'https://www.nike.com/w/new-releases-3n82y',
   'https://www.nike.com/w/new-3n82y',
   'nike',          'https://www.instagram.com/nike/',
   'US', 'SPORTSWEAR', 'HIGH',   true, NOW(), NOW()),

  ('brand_adidas',      'Adidas',         'adidas',
   'https://www.adidas.com',
   'https://www.adidas.com/us/new_arrivals',
   'https://www.adidas.com/us/collections',
   'adidas',        'https://www.instagram.com/adidas/',
   'DE', 'SPORTSWEAR', 'HIGH',   true, NOW(), NOW()),

  ('brand_puma',        'Puma',           'puma',
   'https://www.puma.com',
   'https://www.puma.com/us/en/new-arrivals',
   'https://www.puma.com/us/en/collections',
   'puma',          'https://www.instagram.com/puma/',
   'DE', 'SPORTSWEAR', 'HIGH',   true, NOW(), NOW()),

  ('brand_newbalance',  'New Balance',    'new-balance',
   'https://www.newbalance.com',
   'https://www.newbalance.com/en-us/sale/new-arrivals/',
   'https://www.newbalance.com/en-us/collections/',
   'newbalance',    'https://www.instagram.com/newbalance/',
   'US', 'SPORTSWEAR', 'HIGH',   true, NOW(), NOW()),

  ('brand_underarmour', 'Under Armour',   'under-armour',
   'https://www.underarmour.com',
   'https://www.underarmour.com/en-us/c/mens-new-arrivals/',
   'https://www.underarmour.com/en-us/c/new-collections/',
   'underarmour',   'https://www.instagram.com/underarmour/',
   'US', 'SPORTSWEAR', 'MEDIUM', true, NOW(), NOW()),

  ('brand_reebok',      'Reebok',         'reebok',
   'https://www.reebok.com',
   'https://www.reebok.com/us/new-arrivals',
   'https://www.reebok.com/us/collections',
   'reebok',        'https://www.instagram.com/reebok/',
   'US', 'SPORTSWEAR', 'MEDIUM', true, NOW(), NOW()),

  ('brand_converse',    'Converse',       'converse',
   'https://www.converse.com',
   'https://www.converse.com/us/en/new-arrivals/',
   'https://www.converse.com/us/en/collections/',
   'converse',      'https://www.instagram.com/converse/',
   'US', 'FOOTWEAR',   'MEDIUM', true, NOW(), NOW()),

  ('brand_vans',        'Vans',           'vans',
   'https://www.vans.com',
   'https://www.vans.com/en-us/new-arrivals/',
   'https://www.vans.com/en-us/collections/',
   'vans',          'https://www.instagram.com/vans/',
   'US', 'STREETWEAR', 'MEDIUM', true, NOW(), NOW()),

  ('brand_jordan',      'Jordan',         'jordan',
   'https://www.nike.com/jordan',
   'https://www.nike.com/w/jordan-new-3n82yqi',
   'https://www.nike.com/w/jordan-3n82y',
   'jumpman23',     'https://www.instagram.com/jumpman23/',
   'US', 'SPORTSWEAR', 'HIGH',   true, NOW(), NOW()),

  ('brand_asics',       'ASICS',          'asics',
   'https://www.asics.com',
   'https://www.asics.com/us/en-us/new-arrivals/',
   'https://www.asics.com/us/en-us/collections/',
   'asics',         'https://www.instagram.com/asics/',
   'JP', 'SPORTSWEAR', 'MEDIUM', true, NOW(), NOW()),

  ('brand_skechers',    'Skechers',       'skechers',
   'https://www.skechers.com',
   'https://www.skechers.com/new-arrivals/',
   'https://www.skechers.com/collections/',
   'skechers',      'https://www.instagram.com/skechers/',
   'US', 'FOOTWEAR',   'LOW',    true, NOW(), NOW()),

  ('brand_northface',   'The North Face', 'the-north-face',
   'https://www.thenorthface.com',
   'https://www.thenorthface.com/shop/new-arrivals',
   'https://www.thenorthface.com/shop/collections',
   'thenorthface',  'https://www.instagram.com/thenorthface/',
   'US', 'OUTDOOR',    'HIGH',   true, NOW(), NOW()),

  ('brand_columbia',    'Columbia',       'columbia',
   'https://www.columbia.com',
   'https://www.columbia.com/c/new-arrivals',
   'https://www.columbia.com/c/collections',
   'columbiasportswear','https://www.instagram.com/columbiasportswear/',
   'US', 'OUTDOOR',    'MEDIUM', true, NOW(), NOW()),

  ('brand_lacoste',     'Lacoste',        'lacoste',
   'https://www.lacoste.com',
   'https://www.lacoste.com/en/us/new-arrivals/',
   'https://www.lacoste.com/en/us/collections/',
   'lacoste',       'https://www.instagram.com/lacoste/',
   'FR', 'FASHION',    'MEDIUM', true, NOW(), NOW()),

  ('brand_tommy',       'Tommy Hilfiger', 'tommy-hilfiger',
   'https://www.tommy.com',
   'https://www.tommy.com/en/new-arrivals',
   'https://www.tommy.com/en/collections',
   'tommyhilfiger', 'https://www.instagram.com/tommyhilfiger/',
   'US', 'FASHION',    'MEDIUM', true, NOW(), NOW())

ON CONFLICT (slug) DO NOTHING;

-- ── 2. Brand Sources (4 per brand = 60 rows) ──────────────
INSERT INTO brand_sources (
  id, "brandId", "sourceType", url,
  "isActive", "crawlFreq", "errorCount", "createdAt", "updatedAt"
) VALUES
  -- Nike
  ('bs_nike_web', 'brand_nike', 'WEBSITE',      'https://www.nike.com',                          true, 120, 0, NOW(), NOW()),
  ('bs_nike_new', 'brand_nike', 'NEW_ARRIVALS', 'https://www.nike.com/w/new-releases-3n82y',     true,  60, 0, NOW(), NOW()),
  ('bs_nike_col', 'brand_nike', 'COLLECTIONS',  'https://www.nike.com/w/new-3n82y',              true, 120, 0, NOW(), NOW()),
  ('bs_nike_ig',  'brand_nike', 'INSTAGRAM',    'https://www.instagram.com/nike/',               true,  30, 0, NOW(), NOW()),
  -- Adidas
  ('bs_adi_web',  'brand_adidas', 'WEBSITE',      'https://www.adidas.com',                      true, 120, 0, NOW(), NOW()),
  ('bs_adi_new',  'brand_adidas', 'NEW_ARRIVALS', 'https://www.adidas.com/us/new_arrivals',       true,  60, 0, NOW(), NOW()),
  ('bs_adi_col',  'brand_adidas', 'COLLECTIONS',  'https://www.adidas.com/us/collections',        true, 120, 0, NOW(), NOW()),
  ('bs_adi_ig',   'brand_adidas', 'INSTAGRAM',    'https://www.instagram.com/adidas/',            true,  30, 0, NOW(), NOW()),
  -- Puma
  ('bs_puma_web', 'brand_puma', 'WEBSITE',      'https://www.puma.com',                          true, 120, 0, NOW(), NOW()),
  ('bs_puma_new', 'brand_puma', 'NEW_ARRIVALS', 'https://www.puma.com/us/en/new-arrivals',        true,  60, 0, NOW(), NOW()),
  ('bs_puma_col', 'brand_puma', 'COLLECTIONS',  'https://www.puma.com/us/en/collections',         true, 120, 0, NOW(), NOW()),
  ('bs_puma_ig',  'brand_puma', 'INSTAGRAM',    'https://www.instagram.com/puma/',               true,  30, 0, NOW(), NOW()),
  -- New Balance
  ('bs_nb_web',   'brand_newbalance', 'WEBSITE',      'https://www.newbalance.com',              true, 120, 0, NOW(), NOW()),
  ('bs_nb_new',   'brand_newbalance', 'NEW_ARRIVALS', 'https://www.newbalance.com/en-us/sale/new-arrivals/', true, 60, 0, NOW(), NOW()),
  ('bs_nb_col',   'brand_newbalance', 'COLLECTIONS',  'https://www.newbalance.com/en-us/collections/',       true, 120, 0, NOW(), NOW()),
  ('bs_nb_ig',    'brand_newbalance', 'INSTAGRAM',    'https://www.instagram.com/newbalance/',   true,  30, 0, NOW(), NOW()),
  -- Under Armour
  ('bs_ua_web',   'brand_underarmour', 'WEBSITE',      'https://www.underarmour.com',            true, 120, 0, NOW(), NOW()),
  ('bs_ua_new',   'brand_underarmour', 'NEW_ARRIVALS', 'https://www.underarmour.com/en-us/c/mens-new-arrivals/', true, 60, 0, NOW(), NOW()),
  ('bs_ua_col',   'brand_underarmour', 'COLLECTIONS',  'https://www.underarmour.com/en-us/c/new-collections/',   true, 120, 0, NOW(), NOW()),
  ('bs_ua_ig',    'brand_underarmour', 'INSTAGRAM',    'https://www.instagram.com/underarmour/', true,  30, 0, NOW(), NOW()),
  -- Reebok
  ('bs_rbk_web',  'brand_reebok', 'WEBSITE',      'https://www.reebok.com',                      true, 120, 0, NOW(), NOW()),
  ('bs_rbk_new',  'brand_reebok', 'NEW_ARRIVALS', 'https://www.reebok.com/us/new-arrivals',       true,  60, 0, NOW(), NOW()),
  ('bs_rbk_col',  'brand_reebok', 'COLLECTIONS',  'https://www.reebok.com/us/collections',        true, 120, 0, NOW(), NOW()),
  ('bs_rbk_ig',   'brand_reebok', 'INSTAGRAM',    'https://www.instagram.com/reebok/',            true,  30, 0, NOW(), NOW()),
  -- Converse
  ('bs_cvs_web',  'brand_converse', 'WEBSITE',      'https://www.converse.com',                  true, 120, 0, NOW(), NOW()),
  ('bs_cvs_new',  'brand_converse', 'NEW_ARRIVALS', 'https://www.converse.com/us/en/new-arrivals/', true, 60, 0, NOW(), NOW()),
  ('bs_cvs_col',  'brand_converse', 'COLLECTIONS',  'https://www.converse.com/us/en/collections/',  true, 120, 0, NOW(), NOW()),
  ('bs_cvs_ig',   'brand_converse', 'INSTAGRAM',    'https://www.instagram.com/converse/',       true,  30, 0, NOW(), NOW()),
  -- Vans
  ('bs_vns_web',  'brand_vans', 'WEBSITE',      'https://www.vans.com',                          true, 120, 0, NOW(), NOW()),
  ('bs_vns_new',  'brand_vans', 'NEW_ARRIVALS', 'https://www.vans.com/en-us/new-arrivals/',       true,  60, 0, NOW(), NOW()),
  ('bs_vns_col',  'brand_vans', 'COLLECTIONS',  'https://www.vans.com/en-us/collections/',        true, 120, 0, NOW(), NOW()),
  ('bs_vns_ig',   'brand_vans', 'INSTAGRAM',    'https://www.instagram.com/vans/',               true,  30, 0, NOW(), NOW()),
  -- Jordan
  ('bs_jrd_web',  'brand_jordan', 'WEBSITE',      'https://www.nike.com/jordan',                 true, 120, 0, NOW(), NOW()),
  ('bs_jrd_new',  'brand_jordan', 'NEW_ARRIVALS', 'https://www.nike.com/w/jordan-new-3n82yqi',   true,  60, 0, NOW(), NOW()),
  ('bs_jrd_col',  'brand_jordan', 'COLLECTIONS',  'https://www.nike.com/w/jordan-3n82y',          true, 120, 0, NOW(), NOW()),
  ('bs_jrd_ig',   'brand_jordan', 'INSTAGRAM',    'https://www.instagram.com/jumpman23/',         true,  30, 0, NOW(), NOW()),
  -- ASICS
  ('bs_asc_web',  'brand_asics', 'WEBSITE',      'https://www.asics.com',                        true, 120, 0, NOW(), NOW()),
  ('bs_asc_new',  'brand_asics', 'NEW_ARRIVALS', 'https://www.asics.com/us/en-us/new-arrivals/', true,  60, 0, NOW(), NOW()),
  ('bs_asc_col',  'brand_asics', 'COLLECTIONS',  'https://www.asics.com/us/en-us/collections/',  true, 120, 0, NOW(), NOW()),
  ('bs_asc_ig',   'brand_asics', 'INSTAGRAM',    'https://www.instagram.com/asics/',             true,  30, 0, NOW(), NOW()),
  -- Skechers
  ('bs_skc_web',  'brand_skechers', 'WEBSITE',      'https://www.skechers.com',                  true, 120, 0, NOW(), NOW()),
  ('bs_skc_new',  'brand_skechers', 'NEW_ARRIVALS', 'https://www.skechers.com/new-arrivals/',     true,  60, 0, NOW(), NOW()),
  ('bs_skc_col',  'brand_skechers', 'COLLECTIONS',  'https://www.skechers.com/collections/',      true, 120, 0, NOW(), NOW()),
  ('bs_skc_ig',   'brand_skechers', 'INSTAGRAM',    'https://www.instagram.com/skechers/',       true,  30, 0, NOW(), NOW()),
  -- The North Face
  ('bs_tnf_web',  'brand_northface', 'WEBSITE',      'https://www.thenorthface.com',             true, 120, 0, NOW(), NOW()),
  ('bs_tnf_new',  'brand_northface', 'NEW_ARRIVALS', 'https://www.thenorthface.com/shop/new-arrivals', true, 60, 0, NOW(), NOW()),
  ('bs_tnf_col',  'brand_northface', 'COLLECTIONS',  'https://www.thenorthface.com/shop/collections',  true, 120, 0, NOW(), NOW()),
  ('bs_tnf_ig',   'brand_northface', 'INSTAGRAM',    'https://www.instagram.com/thenorthface/',  true,  30, 0, NOW(), NOW()),
  -- Columbia
  ('bs_col_web',  'brand_columbia', 'WEBSITE',      'https://www.columbia.com',                  true, 120, 0, NOW(), NOW()),
  ('bs_col_new',  'brand_columbia', 'NEW_ARRIVALS', 'https://www.columbia.com/c/new-arrivals',   true,  60, 0, NOW(), NOW()),
  ('bs_col_col',  'brand_columbia', 'COLLECTIONS',  'https://www.columbia.com/c/collections',    true, 120, 0, NOW(), NOW()),
  ('bs_col_ig',   'brand_columbia', 'INSTAGRAM',    'https://www.instagram.com/columbiasportswear/', true, 30, 0, NOW(), NOW()),
  -- Lacoste
  ('bs_lac_web',  'brand_lacoste', 'WEBSITE',      'https://www.lacoste.com',                    true, 120, 0, NOW(), NOW()),
  ('bs_lac_new',  'brand_lacoste', 'NEW_ARRIVALS', 'https://www.lacoste.com/en/us/new-arrivals/', true, 60, 0, NOW(), NOW()),
  ('bs_lac_col',  'brand_lacoste', 'COLLECTIONS',  'https://www.lacoste.com/en/us/collections/',  true, 120, 0, NOW(), NOW()),
  ('bs_lac_ig',   'brand_lacoste', 'INSTAGRAM',    'https://www.instagram.com/lacoste/',         true,  30, 0, NOW(), NOW()),
  -- Tommy Hilfiger
  ('bs_tmy_web',  'brand_tommy', 'WEBSITE',      'https://www.tommy.com',                        true, 120, 0, NOW(), NOW()),
  ('bs_tmy_new',  'brand_tommy', 'NEW_ARRIVALS', 'https://www.tommy.com/en/new-arrivals',         true,  60, 0, NOW(), NOW()),
  ('bs_tmy_col',  'brand_tommy', 'COLLECTIONS',  'https://www.tommy.com/en/collections',          true, 120, 0, NOW(), NOW()),
  ('bs_tmy_ig',   'brand_tommy', 'INSTAGRAM',    'https://www.instagram.com/tommyhilfiger/',     true,  30, 0, NOW(), NOW())

ON CONFLICT ("brandId", "sourceType") DO NOTHING;

-- ── 3. Settings ───────────────────────────────────────────
INSERT INTO settings (id, key, value, "isSecret", "createdAt", "updatedAt")
VALUES
  ('set_tg_token',    'TELEGRAM_BOT_TOKEN',      '',                                                    true,  NOW(), NOW()),
  ('set_tg_chat',     'TELEGRAM_CHAT_ID',        '',                                                    false, NOW(), NOW()),
  ('set_oai_key',     'OPENAI_API_KEY',          '',                                                    true,  NOW(), NOW()),
  ('set_groq_key',    'GROQ_API_KEY',            '',                                                    true,  NOW(), NOW()),
  ('set_ai_prov',     'AI_PROVIDER',             'groq',                                                false, NOW(), NOW()),
  ('set_crawl_min',   'CRAWL_INTERVAL_MINUTES',  '60',                                                  false, NOW(), NOW()),
  ('set_search_hr',   'SEARCH_INTERVAL_HOURS',   '24',                                                  false, NOW(), NOW()),
  ('set_ai_conf',     'AI_CONFIDENCE_THRESHOLD', '0.6',                                                 false, NOW(), NOW()),
  ('set_imp_thr',     'IMPORTANCE_THRESHOLD',    '0.5',                                                 false, NOW(), NOW()),
  ('set_digest_hr',   'DAILY_DIGEST_HOUR',       '8',                                                   false, NOW(), NOW()),
  ('set_max_ret',     'MAX_RETRIES',             '3',                                                   false, NOW(), NOW()),
  ('set_notif_typ',   'NOTIFICATION_TYPES',      'NEW_PRODUCT,NEW_COLLECTION,LIMITED_DROP,RESTOCK',     false, NOW(), NOW())

ON CONFLICT (key) DO NOTHING;

-- ── Verification ──────────────────────────────────────────
SELECT 'brands'        AS tbl, COUNT(*) AS rows FROM brands
UNION ALL
SELECT 'brand_sources' AS tbl, COUNT(*) AS rows FROM brand_sources
UNION ALL
SELECT 'settings'      AS tbl, COUNT(*) AS rows FROM settings;

COMMIT;
