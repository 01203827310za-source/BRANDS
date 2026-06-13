# Brand Monitor — Fashion Intelligence Platform

Monitor 15+ fashion and sportswear brands for new products, collections, drops, and restocks. Get instant Telegram notifications. AI-powered classification and analysis.

## Features

- **Web Crawling** — Monitors brand websites, new arrivals, and collection pages
- **Instagram Monitoring** — Tracks public Instagram posts for product announcements
- **Web Search** — DuckDuckGo search for news and announcements
- **AI Classification** — OpenAI / Gemini analyzes each discovery (NEW_PRODUCT, LIMITED_DROP, etc.)
- **Telegram Alerts** — Instant push notifications with product images
- **Daily Digest** — Morning summary of all previous day's discoveries
- **Deduplication** — Smart dedup by URL, content hash, and name similarity
- **15 Pre-loaded Brands** — Nike, Adidas, Puma, New Balance, Under Armour, Reebok, Converse, Vans, Jordan, ASICS, Skechers, The North Face, Columbia, Lacoste, Tommy Hilfiger

## Tech Stack

- **Frontend** — Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **Backend** — Next.js API routes, Prisma ORM, PostgreSQL
- **Crawling** — Cheerio, node-cron, JSON-LD extraction, OpenGraph fallback
- **AI** — OpenAI GPT-4o mini or Google Gemini 1.5 Flash
- **Notifications** — Telegram Bot API
- **Auth** — NextAuth.js with credentials provider

---

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- PostgreSQL database
- (Optional) OpenAI or Gemini API key
- (Optional) Telegram bot token

### 1. Clone and Install

```bash
git clone <your-repo>
cd brand-monitor
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

Minimum required:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/brand_monitor"
NEXTAUTH_SECRET="your-32-char-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Database Setup

```bash
# Push schema and seed 15 brands
npm run db:push
npm run db:seed
```

### 4. Start

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with:
- Email: `admin@brandmonitor.com` (or `ADMIN_EMAIL` from .env)
- Password: `admin123` (or `ADMIN_PASSWORD` from .env)

---

## Deploy to Railway

### 1. Create Railway Project

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select your repo

### 2. Add PostgreSQL

In your Railway project: **New** → **Database** → **PostgreSQL**

### 3. Set Environment Variables

In Railway dashboard → your service → **Variables**:

```
DATABASE_URL          = (auto-filled from PostgreSQL addon)
NEXTAUTH_SECRET       = (generate: openssl rand -base64 32)
NEXTAUTH_URL          = https://your-app.railway.app
ADMIN_EMAIL           = admin@yourdomain.com
ADMIN_PASSWORD        = your-secure-password
TELEGRAM_BOT_TOKEN    = your-bot-token
TELEGRAM_CHAT_ID      = your-chat-id
OPENAI_API_KEY        = sk-...
AI_PROVIDER           = openai
```

### 4. Deploy

Railway auto-deploys on push. After first deploy, run migrations:

```bash
# In Railway shell or via CLI
npx prisma migrate deploy
npx prisma db seed
```

Or add a start command that auto-migrates:
```
npx prisma migrate deploy && node server.js
```

---

## Telegram Setup

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow instructions
3. Copy the bot token
4. Create a group or channel, add your bot as admin
5. Get the chat ID by messaging [@userinfobot](https://t.me/userinfobot) in your group
6. Enter both in Settings → Telegram and click **Send Test Message**

---

## Adding Brands

1. Go to **Brands** → **Add Brand**
2. Fill in name, website URL, new arrivals URL, Instagram handle
3. Set priority (HIGH brands crawl more frequently)
4. Click **Add Brand**

Or use the API:
```bash
curl -X POST /api/brands \
  -H "Content-Type: application/json" \
  -d '{"name":"Supreme","websiteUrl":"https://www.supremenewyork.com","newArrivalsUrl":"https://www.supremenewyork.com/shop/all","priority":"HIGH","category":"STREETWEAR"}'
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│            Next.js App                  │
│  ┌──────────┐  ┌─────────────────────┐  │
│  │ Dashboard│  │   API Routes        │  │
│  │  Pages   │  │ /api/brands         │  │
│  └──────────┘  │ /api/discoveries    │  │
│                │ /api/dashboard/stats│  │
│                └─────────────────────┘  │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────▼─────────┐
        │   Services Layer   │
        │  ┌──────────────┐  │
        │  │   Crawler    │  │
        │  │  Orchestrator│  │
        │  └──────┬───────┘  │
        │  ┌──────▼───────┐  │
        │  │  AI Analyzer │  │
        │  │ (OpenAI/Gemini│ │
        │  └──────┬───────┘  │
        │  ┌──────▼───────┐  │
        │  │  Telegram    │  │
        │  │  Notifier    │  │
        │  └──────────────┘  │
        │  ┌──────────────┐  │
        │  │  Scheduler   │  │
        │  │  (node-cron) │  │
        │  └──────────────┘  │
        └─────────┬──────────┘
                  │
        ┌─────────▼──────────┐
        │    PostgreSQL       │
        │    (via Prisma)     │
        └────────────────────┘
```

---

## Crawl Schedule

| Job | Frequency |
|-----|-----------|
| Website crawl | Every 60 min (configurable) |
| Web search | Every 6 hours |
| Daily digest | 8:00 AM UTC (configurable) |
| Log cleanup | 3:00 AM UTC daily |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/brands` | List brands |
| POST | `/api/brands` | Add brand |
| PATCH | `/api/brands/:id` | Update brand |
| DELETE | `/api/brands/:id` | Delete brand |
| POST | `/api/brands/:id/crawl` | Trigger crawl |
| GET | `/api/discoveries` | List discoveries |
| GET | `/api/products` | List products |
| GET | `/api/collections` | List collections |
| GET | `/api/instagram` | List Instagram posts |
| GET | `/api/notifications` | List notifications |
| POST | `/api/crawl` | Trigger crawl/search |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/export?type=discoveries` | Export CSV |
| GET | `/api/search?q=query` | Search |
| GET | `/api/health` | Health check |

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | 32+ char secret for JWT |
| `NEXTAUTH_URL` | ✅ | Your app's base URL |
| `ADMIN_EMAIL` | ✅ | Admin login email |
| `ADMIN_PASSWORD` | ✅ | Admin login password |
| `TELEGRAM_BOT_TOKEN` | Optional | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Optional | Target chat/group ID |
| `OPENAI_API_KEY` | Optional | OpenAI API key |
| `GEMINI_API_KEY` | Optional | Google Gemini API key |
| `AI_PROVIDER` | Optional | `openai` or `gemini` |
| `CRAWL_INTERVAL_MINUTES` | Optional | Default: 60 |
| `AI_CONFIDENCE_THRESHOLD` | Optional | Default: 0.6 |
| `IMPORTANCE_THRESHOLD` | Optional | Default: 0.5 |

---

## License

MIT
