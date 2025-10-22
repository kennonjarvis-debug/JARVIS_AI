# ============================================================================
# Jarvis Control Plane - Production Dockerfile
# Multi-stage build for optimized production image
# ============================================================================

# ==================== STAGE 1: Dependencies ====================
FROM node:20-alpine AS deps

# Install build dependencies
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (production only)
RUN npm ci --omit=dev && \
    npm cache clean --force

# ==================== STAGE 2: Builder ====================
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files and install ALL dependencies (including dev)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Skip TypeScript build - we'll run with tsx
# RUN npm run build

# ==================== STAGE 3: Runner ====================
FROM node:20-alpine AS runner

# Set production environment
ENV NODE_ENV=production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S jarvis && \
    adduser -S jarvis -u 1001

WORKDIR /app

# Copy source files and all dependencies (need dev deps for tsx)
COPY --from=builder --chown=jarvis:jarvis /app/src ./src
COPY --from=builder --chown=jarvis:jarvis /app/node_modules ./node_modules
COPY --from=builder --chown=jarvis:jarvis /app/package.json ./package.json
COPY --from=builder --chown=jarvis:jarvis /app/tsconfig.json ./tsconfig.json

# Copy runtime configuration files
COPY --chown=jarvis:jarvis config ./config
COPY --chown=jarvis:jarvis docs ./docs

# Create directories for logs and data
RUN mkdir -p /app/logs /app/data && \
    chown -R jarvis:jarvis /app/logs /app/data

# Switch to non-root user
USER jarvis

# Expose port
EXPOSE 5001

# Health check with error handling
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD node -e "const http = require('http'); http.get('http://localhost:5001/health', {timeout: 5000}, (r) => { r.on('data', () => {}); r.on('end', () => { process.exit(r.statusCode === 200 ? 0 : 1); }); }).on('error', () => process.exit(1));"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application with tsx
CMD ["npx", "tsx", "src/main.ts"]
