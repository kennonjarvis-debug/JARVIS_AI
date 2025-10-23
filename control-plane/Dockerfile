# Use Node.js 22
FROM node:22-slim

# Install system dependencies for Playwright and native modules
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    make \
    g++ \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libgbm1 \
    libasound2 \
    libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for tsx)
RUN npm install

# Install Playwright browsers
RUN npx playwright install chromium --with-deps || true

# Copy application code
COPY . .

# Expose port
EXPOSE 5001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Run with tsx (no build step needed)
CMD ["npx", "tsx", "src/main.ts"]
