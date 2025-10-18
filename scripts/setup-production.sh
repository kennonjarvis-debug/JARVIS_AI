#!/bin/bash

##############################################
# Jarvis AI - Production Setup Script
# Sets up Supabase, integrations, and monitoring
##############################################

set -e

echo "🚀 Jarvis AI - Production Setup"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment
if [ -f .env.production ]; then
    echo "✅ Loading .env.production"
    export $(cat .env.production | grep -v '^#' | xargs)
else
    echo -e "${RED}❌ .env.production not found${NC}"
    exit 1
fi

echo ""
echo "📋 Setup Checklist:"
echo "==================="
echo ""

# 1. Database Setup
echo "1️⃣  Setting up Supabase Database..."
echo "   Database: ${POSTGRES_HOST}"
echo "   Database: ${POSTGRES_DB}"

# Test connection
if PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Database connection successful${NC}"
else
    echo -e "   ${RED}❌ Database connection failed${NC}"
    exit 1
fi

# Run migrations
echo "   Running Prisma migrations..."
cd web/jarvis-web
npx prisma migrate deploy
npx prisma generate
cd ../..
echo -e "   ${GREEN}✅ Migrations complete${NC}"

# 2. Create SUPERADMIN
echo ""
echo "2️⃣  Creating SUPERADMIN account..."
echo "   Email: ${SUPERADMIN_EMAIL}"
npx tsx scripts/create-superadmin.ts
echo -e "   ${GREEN}✅ SUPERADMIN created${NC}"

# 3. Setup Redis
echo ""
echo "3️⃣  Setting up Redis..."
if [ -n "${REDIS_URL}" ]; then
    if redis-cli -u "${REDIS_URL}" PING > /dev/null 2>&1; then
        echo -e "   ${GREEN}✅ Redis connection successful${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Redis not accessible (optional)${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  Redis URL not configured${NC}"
fi

# 4. Setup Monitoring
echo ""
echo "4️⃣  Setting up monitoring..."
if [ -d "monitoring/grafana" ]; then
    echo "   Grafana dashboard: monitoring/grafana/jarvis-dashboard.json"
    echo -e "   ${GREEN}✅ Monitoring configured${NC}"
else
    echo -e "   ${YELLOW}⚠️  Monitoring directory not found${NC}"
fi

# 5. Verify Integrations Configuration
echo ""
echo "5️⃣  Verifying integrations configuration..."

check_integration() {
    local name=$1
    local var=$2
    if [ -n "${!var}" ] && [ "${!var}" != "your_${var,,}" ]; then
        echo -e "   ${GREEN}✅ ${name}${NC}"
        return 0
    else
        echo -e "   ${YELLOW}⚠️  ${name} - Not configured${NC}"
        return 1
    fi
}

check_integration "Salesforce" "SALESFORCE_CLIENT_ID"
check_integration "Instagram" "INSTAGRAM_APP_ID"
check_integration "Twitter/X" "TWITTER_CLIENT_ID"
check_integration "Google/Gmail" "GOOGLE_CLIENT_ID"
check_integration "HubSpot" "HUBSPOT_CLIENT_ID"
check_integration "Twilio/SMS" "TWILIO_ACCOUNT_SID"
check_integration "Stripe" "STRIPE_SECRET_KEY"
check_integration "OpenAI" "OPENAI_API_KEY"
check_integration "Anthropic" "ANTHROPIC_API_KEY"

# 6. Test API Key
echo ""
echo "6️⃣  Verifying Jarvis API Key..."
if [ -n "${JARVIS_API_KEY}" ]; then
    echo "   API Key: ${JARVIS_API_KEY:0:20}..."
    echo -e "   ${GREEN}✅ API Key configured${NC}"
else
    echo -e "   ${RED}❌ API Key not set${NC}"
fi

# 7. Generate secrets if needed
echo ""
echo "7️⃣  Generating missing secrets..."

if [ "${NEXTAUTH_SECRET}" == "generate_with_openssl_rand_base64_32" ] || [ -z "${NEXTAUTH_SECRET}" ]; then
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    echo "   Generated NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:0:20}..."
    echo "   ⚠️  Add to .env.production: NEXTAUTH_SECRET=\"${NEXTAUTH_SECRET}\""
fi

if [ "${JARVIS_API_SECRET}" == "generate_with_openssl_rand_hex_32" ] || [ -z "${JARVIS_API_SECRET}" ]; then
    JARVIS_API_SECRET=$(openssl rand -hex 32)
    echo "   Generated JARVIS_API_SECRET: ${JARVIS_API_SECRET:0:20}..."
    echo "   ⚠️  Add to .env.production: JARVIS_API_SECRET=\"${JARVIS_API_SECRET}\""
fi

# Summary
echo ""
echo "================================"
echo "📊 Setup Summary"
echo "================================"
echo ""
echo -e "${GREEN}✅ Database connected and migrated${NC}"
echo -e "${GREEN}✅ SUPERADMIN account created${NC}"
echo "   📧 Email: ${SUPERADMIN_EMAIL}"
echo "   🔑 Role: SUPERADMIN"
echo "   💎 Plan: ENTERPRISE"
echo ""
echo "🔗 Next Steps:"
echo "  1. Configure missing integrations in .env.production"
echo "  2. Start the application: npm run dev"
echo "  3. Login at: ${NEXTAUTH_URL:-http://localhost:3000}"
echo "  4. Access Grafana: http://localhost:3001"
echo ""
echo -e "${GREEN}🎉 Production setup complete!${NC}"
