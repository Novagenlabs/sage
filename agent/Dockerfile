# syntax=docker/dockerfile:1

# ========================================
# LiveKit Voice Agent
# ========================================
# Use Debian-based image (glibc) instead of Alpine (musl)
# because @livekit/rtc-node requires glibc native bindings
FROM node:20-slim

# Install dependencies for native modules and curl for downloads
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (include all deps to get platform-specific binaries)
RUN npm ci || npm install

# Copy source files
COPY src ./src
COPY scripts ./scripts

# Download Silero VAD model
RUN npm run download-files || true

# Create non-root user
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs agent
RUN chown -R agent:nodejs /app

USER agent

CMD ["node", "src/agent.js", "start"]
