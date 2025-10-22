#!/bin/bash
#
# Jarvis macOS Installation Script
#
# This script sets up Jarvis with macOS-specific integrations.
# It installs dependencies, configures permissions, and sets up LaunchAgent.
#
# Usage: ./scripts/install-macos.sh
#

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    error "This script is for macOS only"
    exit 1
fi

log "Starting Jarvis macOS installation..."

# Determine Jarvis directory
JARVIS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$JARVIS_DIR"

log "Jarvis directory: $JARVIS_DIR"

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    warning "Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    success "Homebrew installed"
else
    success "Homebrew already installed"
fi

# Update Homebrew
log "Updating Homebrew..."
brew update

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    log "Installing Node.js..."
    brew install node
    success "Node.js installed"
else
    success "Node.js already installed ($(node --version))"
fi

# Install required system tools
log "Installing system tools..."
brew install fswatch mdfind terminal-notifier || true

# Install npm dependencies
log "Installing npm dependencies..."
npm install

# Add CLI tool package dependencies
log "Installing CLI dependencies..."
npm install --save commander readline

# Build the project
log "Building Jarvis..."
npm run build

# Create necessary directories
log "Creating directories..."
mkdir -p "$JARVIS_DIR/logs"
mkdir -p "$JARVIS_DIR/pids"
mkdir -p "$JARVIS_DIR/data"
mkdir -p "$JARVIS_DIR/recordings"
success "Directories created"

# Setup CLI tool
log "Setting up Jarvis CLI..."
CLI_LINK="/usr/local/bin/jarvis"

# Remove old link if exists
if [ -L "$CLI_LINK" ]; then
    rm "$CLI_LINK"
fi

# Create symlink
chmod +x "$JARVIS_DIR/src/cli/jarvis-cli.ts"
ln -s "$JARVIS_DIR/src/cli/jarvis-cli.ts" "$CLI_LINK" || {
    warning "Could not create global 'jarvis' command. You may need sudo."
    log "Run: sudo ln -s $JARVIS_DIR/src/cli/jarvis-cli.ts /usr/local/bin/jarvis"
}

success "CLI tool installed (run 'jarvis' from anywhere)"

# Setup LaunchAgent
log "Setting up LaunchAgent..."
LAUNCH_AGENT_DIR="$HOME/Library/LaunchAgents"
LAUNCH_AGENT_FILE="$LAUNCH_AGENT_DIR/com.jarvis.ai.plist"

mkdir -p "$LAUNCH_AGENT_DIR"

# Copy and configure LaunchAgent plist
cp "$JARVIS_DIR/macos/LaunchAgents/com.jarvis.ai.plist" "$LAUNCH_AGENT_FILE"

# Replace YOUR_USERNAME with actual username
sed -i '' "s|/Users/YOUR_USERNAME|$HOME|g" "$LAUNCH_AGENT_FILE"

# Find node path
NODE_PATH=$(which node)
sed -i '' "s|/usr/local/bin/node|$NODE_PATH|g" "$LAUNCH_AGENT_FILE"

success "LaunchAgent configured"

# Ask user if they want to enable auto-start
echo
read -p "Enable Jarvis to start automatically on login? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Loading LaunchAgent..."
    launchctl unload "$LAUNCH_AGENT_FILE" 2>/dev/null || true
    launchctl load "$LAUNCH_AGENT_FILE"
    success "LaunchAgent loaded - Jarvis will start on login"
else
    log "Skipping auto-start. You can enable it later with:"
    log "  launchctl load ~/Library/LaunchAgents/com.jarvis.ai.plist"
fi

# Check permissions
echo
log "Checking macOS permissions..."

# Check Full Disk Access for iMessage
IMESSAGE_DB="$HOME/Library/Messages/chat.db"
if [ -f "$IMESSAGE_DB" ]; then
    if [ -r "$IMESSAGE_DB" ]; then
        success "iMessage database is accessible"
    else
        warning "iMessage database found but not readable"
        log "Grant Full Disk Access to Terminal (or your terminal app):"
        log "  System Settings > Privacy & Security > Full Disk Access"
    fi
else
    warning "iMessage database not found. Setup Messages app first."
fi

# Check Contacts access
if osascript -e 'tell application "Contacts" to return count of people' &>/dev/null; then
    success "Contacts is accessible"
else
    warning "Contacts permission not granted"
    log "Grant Contacts access when prompted, or in:"
    log "  System Settings > Privacy & Security > Contacts"
fi

# Check Calendar access
if osascript -e 'tell application "Calendar" to return count of calendars' &>/dev/null; then
    success "Calendar is accessible"
else
    warning "Calendar permission not granted"
    log "Grant Calendar access when prompted, or in:"
    log "  System Settings > Privacy & Security > Calendars"
fi

# Check Shortcuts
if command -v shortcuts &> /dev/null; then
    success "Shortcuts CLI is available"
else
    warning "Shortcuts CLI not found (requires macOS 12+)"
fi

# Create sample AppleScript examples
log "Creating AppleScript examples..."
cat > "$JARVIS_DIR/examples/applescript/send-imessage.scpt" << 'EOF'
-- Send iMessage Example
-- Usage: osascript send-imessage.scpt "phone_or_email" "message"

on run argv
    set targetBuddy to item 1 of argv
    set message to item 2 of argv

    tell application "Messages"
        set targetService to 1st account whose service type = iMessage
        set theBuddy to participant targetBuddy of targetService
        send message to theBuddy
    end tell
end run
EOF

cat > "$JARVIS_DIR/examples/applescript/create-event.scpt" << 'EOF'
-- Create Calendar Event Example
-- Usage: osascript create-event.scpt "Event Title" "2024-01-01 10:00:00"

on run argv
    set eventTitle to item 1 of argv
    set eventDate to item 2 of argv

    tell application "Calendar"
        tell calendar "Calendar"
            set newEvent to make new event with properties {summary:eventTitle, start date:date eventDate}
        end tell
    end tell
end run
EOF

cat > "$JARVIS_DIR/examples/applescript/show-notification.scpt" << 'EOF'
-- Show Notification Example
-- Usage: osascript show-notification.scpt "Title" "Message"

on run argv
    set notificationTitle to item 1 of argv
    set notificationMessage to item 2 of argv

    display notification notificationMessage with title notificationTitle sound name "Ping"
end run
EOF

chmod +x "$JARVIS_DIR/examples/applescript/"*.scpt
success "AppleScript examples created"

# Setup environment
if [ ! -f "$JARVIS_DIR/.env" ]; then
    warning ".env file not found. Creating from example..."
    cp "$JARVIS_DIR/.env.example" "$JARVIS_DIR/.env"
    log "Please edit .env with your configuration"
fi

# Print summary
echo
log "================================================"
log "           Jarvis macOS Installation Complete!"
log "================================================"
echo
success "Next steps:"
echo
echo "1. Configure environment variables:"
echo "   ${BLUE}nano $JARVIS_DIR/.env${NC}"
echo
echo "2. Start Jarvis:"
echo "   ${BLUE}jarvis start${NC}"
echo
echo "3. Check status:"
echo "   ${BLUE}jarvis status${NC}"
echo
echo "4. Grant permissions when prompted:"
echo "   - Full Disk Access (for iMessage)"
echo "   - Contacts"
echo "   - Calendar"
echo "   - Notifications"
echo
echo "5. Install Shortcuts (optional):"
echo "   - Open Shortcuts app"
echo "   - Create shortcuts as documented in:"
echo "     ${BLUE}$JARVIS_DIR/docs/MACOS_INTEGRATION.md${NC}"
echo
echo "6. Install Quick Actions (optional):"
echo "   - Follow guide in:"
echo "     ${BLUE}$JARVIS_DIR/macos/QuickActions/README.md${NC}"
echo
log "For help, run: ${BLUE}jarvis --help${NC}"
echo

# Check if we should start Jarvis now
read -p "Start Jarvis now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Starting Jarvis..."
    "$CLI_LINK" start || npm run dev
fi

success "Installation complete!"
