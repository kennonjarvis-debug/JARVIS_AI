#!/bin/bash

# Claude Desktop MCP Integration - Installation Script
# Wave 4: Jarvis + AI Dawg MCP Server Setup
# Date: 2025-10-08

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
JARVIS_ROOT="/Users/benkennon/Jarvis"
MCP_SERVER_PATH="$JARVIS_ROOT/src/integrations/claude/mcp-server.ts"
MCP_CONFIG_TEMPLATE="$JARVIS_ROOT/src/integrations/claude/config/claude_desktop_config.json"
AI_DAWG_BACKEND_URL="http://localhost:3001"

# Claude Desktop config locations (try in order)
CLAUDE_CONFIG_PATHS=(
    "$HOME/Library/Application Support/Claude/claude_desktop_config.json"
    "$HOME/Library/Preferences/claude_desktop_config.json"
)

# Functions
print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Jarvis MCP Server - Claude Desktop Installation${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${GREEN}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Step 1: Verify prerequisites
verify_prerequisites() {
    print_step "Step 1: Verifying prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js not found. Please install Node.js v18 or higher."
        exit 1
    fi

    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version must be 18 or higher. Current: v$NODE_VERSION"
        exit 1
    fi
    print_success "Node.js $(node --version) found"

    # Check npx
    if ! command -v npx &> /dev/null; then
        print_error "npx not found. Please install npm."
        exit 1
    fi
    print_success "npx found"

    # Check Jarvis directory
    if [ ! -d "$JARVIS_ROOT" ]; then
        print_error "Jarvis directory not found at $JARVIS_ROOT"
        exit 1
    fi
    print_success "Jarvis directory found"

    # Check MCP server file
    if [ ! -f "$MCP_SERVER_PATH" ]; then
        print_error "MCP server file not found at $MCP_SERVER_PATH"
        exit 1
    fi
    print_success "MCP server file found"

    # Check Jarvis dependencies
    cd "$JARVIS_ROOT"
    if [ ! -d "node_modules/@modelcontextprotocol" ]; then
        print_warning "MCP SDK not found. Installing dependencies..."
        npm install
    fi
    print_success "Jarvis dependencies verified"

    echo ""
}

# Step 2: Test AI Dawg backend
test_backend() {
    print_step "Step 2: Testing AI Dawg backend connection..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$AI_DAWG_BACKEND_URL/api/v1/jarvis/execute" \
        -H "Content-Type: application/json" \
        -d '{"module":"test","action":"ping","params":{}}' 2>&1 || echo "000")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "200" ]; then
        print_success "AI Dawg backend is healthy at $AI_DAWG_BACKEND_URL"
        print_info "Response: $BODY"
    else
        print_error "AI Dawg backend not responding at $AI_DAWG_BACKEND_URL"
        print_info "Please ensure AI Dawg backend is running before continuing."
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    echo ""
}

# Step 3: Locate Claude Desktop config
locate_claude_config() {
    print_step "Step 3: Locating Claude Desktop configuration..."

    CLAUDE_CONFIG_PATH=""
    for path in "${CLAUDE_CONFIG_PATHS[@]}"; do
        if [ -f "$path" ]; then
            CLAUDE_CONFIG_PATH="$path"
            print_success "Found existing config at: $path"
            break
        fi
    done

    if [ -z "$CLAUDE_CONFIG_PATH" ]; then
        # No config found, create new one at default location
        CLAUDE_CONFIG_PATH="${CLAUDE_CONFIG_PATHS[0]}"
        CLAUDE_CONFIG_DIR=$(dirname "$CLAUDE_CONFIG_PATH")

        print_warning "No existing Claude Desktop config found."
        print_info "Will create new config at: $CLAUDE_CONFIG_PATH"

        # Create directory if it doesn't exist
        if [ ! -d "$CLAUDE_CONFIG_DIR" ]; then
            mkdir -p "$CLAUDE_CONFIG_DIR"
            print_success "Created config directory"
        fi

        # Create empty config
        echo '{"mcpServers":{}}' > "$CLAUDE_CONFIG_PATH"
        print_success "Created new config file"
    fi

    echo ""
}

# Step 4: Backup existing config
backup_config() {
    print_step "Step 4: Backing up existing configuration..."

    BACKUP_PATH="${CLAUDE_CONFIG_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$CLAUDE_CONFIG_PATH" "$BACKUP_PATH"
    print_success "Backup created at: $BACKUP_PATH"

    echo ""
}

# Step 5: Install MCP server config
install_mcp_config() {
    print_step "Step 5: Installing Jarvis MCP server configuration..."

    # Read existing config
    EXISTING_CONFIG=$(cat "$CLAUDE_CONFIG_PATH")

    # Check if jarvis-aidawg already exists
    if echo "$EXISTING_CONFIG" | grep -q '"jarvis-aidawg"'; then
        print_warning "jarvis-aidawg server already exists in config"
        read -p "Replace existing configuration? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Skipping installation"
            return
        fi
    fi

    # Use jq to merge configs if available, otherwise manual JSON construction
    if command -v jq &> /dev/null; then
        # Use jq for safe JSON merging
        NEW_CONFIG=$(echo "$EXISTING_CONFIG" | jq --arg path "$MCP_SERVER_PATH" --arg url "$AI_DAWG_BACKEND_URL" \
            '.mcpServers["jarvis-aidawg"] = {
                "command": "npx",
                "args": ["tsx", $path],
                "env": {
                    "NODE_ENV": "production",
                    "AI_DAWG_BACKEND_URL": $url
                }
            }')
        echo "$NEW_CONFIG" > "$CLAUDE_CONFIG_PATH"
    else
        # Manual JSON construction (less safe but works)
        print_warning "jq not found, using manual JSON construction"
        cat > "$CLAUDE_CONFIG_PATH" << EOF
{
  "mcpServers": {
    "jarvis-aidawg": {
      "command": "npx",
      "args": [
        "tsx",
        "$MCP_SERVER_PATH"
      ],
      "env": {
        "NODE_ENV": "production",
        "AI_DAWG_BACKEND_URL": "$AI_DAWG_BACKEND_URL"
      }
    }
  }
}
EOF
    fi

    print_success "MCP server configuration installed"
    print_info "Config location: $CLAUDE_CONFIG_PATH"

    echo ""
}

# Step 6: Test MCP server
test_mcp_server() {
    print_step "Step 6: Testing MCP server startup..."

    cd "$JARVIS_ROOT"

    print_info "Starting MCP server (will timeout after 5 seconds)..."

    # Start MCP server in background and kill after 5 seconds
    timeout 5s npx tsx "$MCP_SERVER_PATH" > /tmp/mcp-server-test.log 2>&1 &
    MCP_PID=$!

    sleep 2

    # Check if process is still running
    if ps -p $MCP_PID > /dev/null 2>&1; then
        kill $MCP_PID 2>/dev/null || true
        print_success "MCP server started successfully"

        # Check logs for errors
        if grep -i "error" /tmp/mcp-server-test.log > /dev/null; then
            print_warning "Errors found in startup logs:"
            grep -i "error" /tmp/mcp-server-test.log | head -5
        fi
    else
        print_error "MCP server failed to start"
        print_info "Check logs at /tmp/mcp-server-test.log"
        cat /tmp/mcp-server-test.log
        exit 1
    fi

    echo ""
}

# Step 7: Final instructions
print_final_instructions() {
    print_step "Step 7: Installation complete!"

    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Installation Successful!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo ""

    echo "Next steps:"
    echo ""
    echo "1. ${YELLOW}Restart Claude Desktop${NC}"
    echo "   - Quit Claude Desktop completely (⌘+Q)"
    echo "   - Wait 5 seconds"
    echo "   - Relaunch Claude Desktop"
    echo ""
    echo "2. ${YELLOW}Test the integration${NC}"
    echo "   Open a new conversation in Claude and try:"
    echo "   - \"Can you list the available Jarvis tools?\""
    echo "   - \"What's the current status of Jarvis?\""
    echo "   - \"Generate a chill lofi beat\""
    echo ""
    echo "3. ${YELLOW}Available tools:${NC}"
    echo "   - 22 AI tools (music, marketing, engagement, automation, system)"
    echo "   - 4 data resources (jarvis://status, jarvis://modules, etc.)"
    echo ""
    echo "4. ${YELLOW}Documentation:${NC}"
    echo "   - Setup guide: $JARVIS_ROOT/docs/CLAUDE_DESKTOP_SETUP.md"
    echo "   - Config backup: $BACKUP_PATH"
    echo ""
    echo "5. ${YELLOW}Troubleshooting:${NC}"
    echo "   If tools don't appear:"
    echo "   - Verify config: cat '$CLAUDE_CONFIG_PATH'"
    echo "   - Check logs: tail -f ~/Library/Logs/Claude/mcp-*.log"
    echo "   - Test backend: curl $AI_DAWG_BACKEND_URL/api/v1/jarvis/execute"
    echo ""

    print_success "Jarvis MCP Server is ready to use!"
    echo ""
}

# Main installation flow
main() {
    print_header

    verify_prerequisites
    test_backend
    locate_claude_config
    backup_config
    install_mcp_config
    test_mcp_server
    print_final_instructions
}

# Run installation
main
