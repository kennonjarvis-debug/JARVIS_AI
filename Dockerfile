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

# Install dependencies with production flag
RUN npm ci --only=production && \
    npm cache clean --force

# ==================== STAGE 2: Builder ====================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

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

# Copy built application and production dependencies
COPY --from=builder --chown=jarvis:jarvis /app/dist ./dist
COPY --from=deps --chown=jarvis:jarvis /app/node_modules ./node_modules
COPY --from=builder --chown=jarvis:jarvis /app/package.json ./package.json

# Copy additional runtime files
COPY --chown=jarvis:jarvis docs ./docs

# Create directories for logs and data
RUN mkdir -p /app/logs /app/data && \
    chown -R jarvis:jarvis /app/logs /app/data

# Switch to non-root user
USER jarvis

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/main.js"]
