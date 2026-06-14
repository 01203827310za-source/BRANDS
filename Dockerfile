FROM node:20-alpine AS base

# ── deps: install all npm dependencies ───────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── builder: generate Prisma client and build Next.js ────────────────────────
FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure public/ exists so the COPY in runner never fails on empty/missing dir
RUN mkdir -p /app/public

RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── runner: minimal production image ─────────────────────────────────────────
FROM base AS runner
WORKDIR /app

# openssl — required by Prisma
# chromium + rendering libs — required by Playwright headless browser
RUN apk add --no-cache \
    openssl \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Path to the Alpine-packaged Chromium binary (used by playwright-core via executablePath)
ENV CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Standalone Next.js server (includes its own node_modules subset)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Static assets and public files
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public       ./public

# Prisma schema, migrations, and generated binaries
COPY --from=builder --chown=nextjs:nodejs /app/prisma                  ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma       ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma       ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma        ./node_modules/prisma
# playwright-core is loaded via dynamic import at runtime; copy it explicitly
# because Next.js standalone output does not trace dynamic imports
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/playwright-core ./node_modules/playwright-core

# Write a global wrapper so `prisma` is available as a bare command.
# Using a wrapper instead of a symlink avoids the execute-bit issue on the
# copied JS file (which has 644 permissions from npm).
RUN printf '#!/bin/sh\nexec node /app/node_modules/prisma/build/index.js "$@"\n' \
    > /usr/local/bin/prisma && chmod +x /usr/local/bin/prisma

# Startup script — strip CRLF in case of Windows checkout, then chmod
COPY start.sh ./
RUN sed -i 's/\r//' start.sh && chmod +x start.sh && chown nextjs:nodejs start.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "start.sh"]
