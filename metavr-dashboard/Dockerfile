FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Install DNS utilities and ensure network access
RUN apk add --no-cache curl ca-certificates bash

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Download fonts before building
# If download fails, build will continue and use system font fallbacks
RUN if [ -f scripts/download-fonts.js ]; then \
      echo "Downloading fonts (Inter and JetBrains Mono)..."; \
      node scripts/download-fonts.js 2>&1 || echo "Note: Font download failed - will use system font fallbacks"; \
      echo "Font download step completed"; \
    else \
      echo "Font download script not found - will use system font fallbacks"; \
    fi

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package*.json ./

EXPOSE 3000

CMD ["node", "server.js"]

