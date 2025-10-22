#!/bin/bash

# Jarvis Command Center Dashboard Launcher
# Starts both backend API and frontend simultaneously

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🎯 Launching Jarvis Command Center Dashboard..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if ports are available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}⚠️  Port $port is already in use${NC}"
        return 1
    fi
    return 0
}

echo "Checking ports..."
check_port 5001 || { echo "Backend API port (5001) in use. Stop existing process or change port."; exit 1; }
check_port 3003 || { echo "Frontend port (3003) in use. Stop existing process or change port."; exit 1; }

echo -e "${GREEN}✓ Ports available${NC}"
echo ""

# Check dependencies
echo "Checking dependencies..."

if [ ! -d "$SCRIPT_DIR/backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd "$SCRIPT_DIR/backend" && npm install
fi

if [ ! -d "$SCRIPT_DIR/frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd "$SCRIPT_DIR/frontend" && npm install
fi

echo -e "${GREEN}✓ Dependencies ready${NC}"
echo ""

# Start backend API
echo -e "${BLUE}Starting Backend API on port 5001...${NC}"
cd "$SCRIPT_DIR/backend"
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 3

# Start frontend
echo -e "${BLUE}Starting Frontend on port 3003...${NC}"
cd "$SCRIPT_DIR/frontend"
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
sleep 5

# Get Mac IP for mobile access
MAC_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "unknown")

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🚀 Jarvis Command Center Dashboard is LIVE!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Dashboard URLs:${NC}"
echo -e "   Mac Browser:  ${GREEN}http://localhost:3003${NC}"
echo -e "   iPhone:       ${GREEN}http://$MAC_IP:3003${NC}"
echo ""
echo -e "${BLUE}📡 Backend API:${NC}"
echo -e "   Health:       ${GREEN}http://localhost:5001/health${NC}"
echo -e "   Overview:     ${GREEN}http://localhost:5001/api/dashboard/overview${NC}"
echo -e "   Stream:       ${GREEN}http://localhost:5001/api/dashboard/stream${NC}"
echo ""
echo -e "${BLUE}📝 Logs:${NC}"
echo -e "   Backend:      ${YELLOW}tail -f $SCRIPT_DIR/logs/backend.log${NC}"
echo -e "   Frontend:     ${YELLOW}tail -f $SCRIPT_DIR/logs/frontend.log${NC}"
echo ""
echo -e "${BLUE}🛑 To stop:${NC}"
echo -e "   ${YELLOW}kill $BACKEND_PID $FRONTEND_PID${NC}"
echo -e "   ${YELLOW}or press Ctrl+C${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Save PIDs for easy cleanup
mkdir -p "$SCRIPT_DIR/logs"
echo "$BACKEND_PID" > "$SCRIPT_DIR/logs/backend.pid"
echo "$FRONTEND_PID" > "$SCRIPT_DIR/logs/frontend.pid"

# Wait for user interrupt
trap "echo ''; echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

# Keep script running
wait
