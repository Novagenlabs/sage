# syntax=docker/dockerfile:1

# ========================================
# LiveKit Voice Agent
# ========================================
FROM node:20-alpine

# Install dependencies for native modules
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --omit=dev || npm install --omit=dev

# Copy source files
COPY src ./src
COPY scripts ./scripts

# Download Silero VAD model
RUN npm run download-files || true

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 agent
RUN chown -R agent:nodejs /app

USER agent

CMD ["node", "src/agent.js", "start"]
