# syntax=docker/dockerfile:1

# ========================================
# Stage 1: Dependencies
# ========================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci || npm install

# Generate Prisma Client
RUN npx prisma generate

# ========================================
# Stage 2: Builder
# ========================================
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables needed at build time
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_LIVEKIT_URL

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_LIVEKIT_URL=$NEXT_PUBLIC_LIVEKIT_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# ========================================
# Stage 3: Production Runner
# ========================================
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Set the correct permissions for Next.js cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma client
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
