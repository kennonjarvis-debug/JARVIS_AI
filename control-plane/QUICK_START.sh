#!/bin/bash

echo "🚀 Jarvis AI - Quick Start"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}✅ Environment configured${NC}"
echo -e "${GREEN}✅ Database: Supabase PostgreSQL${NC}"
echo -e "${GREEN}✅ SUPERADMIN: kennonjarvis@gmail.com${NC}"
echo -e "${GREEN}✅ Plan: ENTERPRISE (unlimited)${NC}"
echo ""

echo "📋 Quick Commands:"
echo "=================="
echo ""
echo "1️⃣  Run Setup:"
echo "   ./scripts/setup-production.sh"
echo ""
echo "2️⃣  Start Jarvis API:"
echo "   npm run dev"
echo ""
echo "3️⃣  Start Web UI:"
echo "   cd web/jarvis-web && npm run dev"
echo ""
echo "4️⃣  Create SUPERADMIN:"
echo "   npx tsx scripts/create-superadmin.ts"
echo ""
echo "5️⃣  Start Monitoring:"
echo "   docker-compose up -d grafana prometheus"
echo ""
echo "6️⃣  View Logs:"
echo "   docker-compose logs -f jarvis-api"
echo ""
echo "🌐 Access Points:"
echo "================="
echo "   Web UI: http://localhost:3000"
echo "   API: http://localhost:4000"
echo "   Grafana: http://localhost:3001"
echo ""
echo -e "${YELLOW}💡 Tip: Run './scripts/setup-production.sh' first!${NC}"
