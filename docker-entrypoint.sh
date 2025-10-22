#!/bin/sh
set -e

echo "🚀 Starting Jarvis AI Platform..."
echo "Environment: ${NODE_ENV}"
echo "Version: ${VERSION:-unknown}"

# Run database migrations if AUTO_MIGRATE is set
if [ "${AUTO_MIGRATE}" = "true" ]; then
  echo "📦 Running database migrations..."
  npx prisma migrate deploy
fi

# Generate Prisma Client if needed
if [ ! -d "node_modules/.prisma" ]; then
  echo "🔧 Generating Prisma Client..."
  npx prisma generate
fi

# Start the application
echo "✅ Starting application server..."
exec node dist/main.js
