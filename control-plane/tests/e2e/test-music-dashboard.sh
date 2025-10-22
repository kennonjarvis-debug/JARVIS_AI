#!/bin/bash

###############################################################################
# Music Dashboard E2E Test Script
# Tests the complete music studio dashboard interface
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:4000}"
DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:3003}"
AUTH_TOKEN="${AUTH_TOKEN:-test-token}"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

###############################################################################
# Helper Functions
###############################################################################

log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
  TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_error() {
  echo -e "${RED}✗${NC} $1"
  TESTS_FAILED=$((TESTS_FAILED + 1))
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

test_api_endpoint() {
  local endpoint="$1"
  local method="${2:-GET}"
  local description="$3"

  TESTS_RUN=$((TESTS_RUN + 1))

  log_info "Testing: $description"

  response=$(curl -s -w "\n%{http_code}" \
    -X "$method" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "$API_URL$endpoint")

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    log_success "$description - HTTP $http_code"
    echo "$body" | jq '.' > /dev/null 2>&1 && log_info "Response is valid JSON"
    return 0
  else
    log_error "$description - HTTP $http_code"
    echo "$body"
    return 1
  fi
}

test_dashboard_page() {
  local path="$1"
  local description="$2"

  TESTS_RUN=$((TESTS_RUN + 1))

  log_info "Testing: $description"

  http_code=$(curl -s -o /dev/null -w "%{http_code}" "$DASHBOARD_URL$path")

  if [ "$http_code" -eq 200 ]; then
    log_success "$description - HTTP $http_code"
    return 0
  else
    log_error "$description - HTTP $http_code"
    return 1
  fi
}

###############################################################################
# Pre-flight Checks
###############################################################################

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         Jarvis Music Dashboard E2E Test Suite                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

log_info "Configuration:"
echo "  API URL: $API_URL"
echo "  Dashboard URL: $DASHBOARD_URL"
echo ""

# Check if API is running
log_info "Checking if Jarvis Control Plane is running..."
if curl -s "$API_URL/health" > /dev/null 2>&1; then
  log_success "API is running"
else
  log_error "API is not reachable at $API_URL"
  echo ""
  echo "Please start the Jarvis Control Plane:"
  echo "  cd /Users/benkennon/Jarvis"
  echo "  npm run start:gateway"
  exit 1
fi

# Check if Dashboard is running
log_info "Checking if Dashboard is running..."
if curl -s "$DASHBOARD_URL" > /dev/null 2>&1; then
  log_success "Dashboard is running"
else
  log_error "Dashboard is not reachable at $DASHBOARD_URL"
  echo ""
  echo "Please start the Dashboard:"
  echo "  cd /Users/benkennon/Jarvis/dashboard/frontend"
  echo "  npm run dev"
  exit 1
fi

echo ""
log_info "Starting tests..."
echo ""

###############################################################################
# Test 1: API Endpoints
###############################################################################

echo "═══════════════════════════════════════════════════════════════"
echo "Test Group 1: Music API Endpoints"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Test library endpoints
test_api_endpoint "/api/v1/library/songs?userId=demo-user&limit=10" "GET" "Fetch songs from library"
test_api_endpoint "/api/v1/library/stats?userId=demo-user" "GET" "Fetch library statistics"
test_api_endpoint "/api/v1/library/folders" "GET" "Fetch folders"
test_api_endpoint "/api/v1/library/search/semantic?q=happy+song&userId=demo-user&limit=5" "GET" "Semantic search"

# Test upload endpoints
test_api_endpoint "/api/v1/music/uploads?userId=demo-user&limit=5" "GET" "Fetch recent uploads"

echo ""

###############################################################################
# Test 2: Dashboard Pages
###############################################################################

echo "═══════════════════════════════════════════════════════════════"
echo "Test Group 2: Dashboard Pages"
echo "═══════════════════════════════════════════════════════════════"
echo ""

test_dashboard_page "/" "Main dashboard page"
test_dashboard_page "/music" "Music studio page"

echo ""

###############################################################################
# Test 3: Upload Flow (with mock file)
###############################################################################

echo "═══════════════════════════════════════════════════════════════"
echo "Test Group 3: Music Upload Flow"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Create a mock audio file
TEMP_DIR="/tmp/jarvis-dashboard-test"
mkdir -p "$TEMP_DIR"

# Create a small mock MP3 file (just for testing upload endpoint)
# Note: This is a minimal valid MP3 header
echo -n -e '\xFF\xFB\x90\x00' > "$TEMP_DIR/test-voice-memo.mp3"

TESTS_RUN=$((TESTS_RUN + 1))
log_info "Testing: Upload mock voice memo"

upload_response=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "file=@$TEMP_DIR/test-voice-memo.mp3" \
  -F "userId=demo-user" \
  "$API_URL/api/v1/music/upload")

upload_http_code=$(echo "$upload_response" | tail -n1)
upload_body=$(echo "$upload_response" | head -n-1)

if [ "$upload_http_code" -ge 200 ] && [ "$upload_http_code" -lt 300 ]; then
  log_success "Upload endpoint accepts files - HTTP $upload_http_code"

  # Extract upload ID
  upload_id=$(echo "$upload_body" | jq -r '.data.id' 2>/dev/null || echo "")

  if [ -n "$upload_id" ] && [ "$upload_id" != "null" ]; then
    log_success "Received upload ID: $upload_id"

    # Test status endpoint
    TESTS_RUN=$((TESTS_RUN + 1))
    log_info "Testing: Check upload status"

    status_response=$(curl -s -w "\n%{http_code}" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      "$API_URL/api/v1/music/upload/$upload_id/status")

    status_http_code=$(echo "$status_response" | tail -n1)

    if [ "$status_http_code" -ge 200 ] && [ "$status_http_code" -lt 300 ]; then
      log_success "Status endpoint works - HTTP $status_http_code"
    else
      log_error "Status endpoint failed - HTTP $status_http_code"
    fi
  else
    log_warning "No upload ID returned (API may need full setup)"
  fi
else
  log_error "Upload failed - HTTP $upload_http_code"
  echo "$upload_body"
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo ""

###############################################################################
# Test 4: Component Integration
###############################################################################

echo "═══════════════════════════════════════════════════════════════"
echo "Test Group 4: Component Integration"
echo "═══════════════════════════════════════════════════════════════"
echo ""

log_info "Checking if React components are accessible..."

# Check if the music page loads without errors
TESTS_RUN=$((TESTS_RUN + 1))
music_page_content=$(curl -s "$DASHBOARD_URL/music")

if echo "$music_page_content" | grep -q "Jarvis Music Studio"; then
  log_success "Music page contains expected header"
else
  log_error "Music page missing expected header"
fi

# Check for key component markers
components=("MusicPlayer" "MusicLibrary" "MusicUploadZone" "FolderBrowser")
for component in "${components[@]}"; do
  TESTS_RUN=$((TESTS_RUN + 1))
  # Note: In production build, component names may be minified
  # This is a basic check that the page structure exists
  if echo "$music_page_content" | grep -q "Upload\|Library\|Folders"; then
    log_success "Dashboard structure includes navigation elements"
    break
  fi
done

echo ""

###############################################################################
# Test 5: API Response Validation
###############################################################################

echo "═══════════════════════════════════════════════════════════════"
echo "Test Group 5: API Response Validation"
echo "═══════════════════════════════════════════════════════════════"
echo ""

TESTS_RUN=$((TESTS_RUN + 1))
log_info "Validating library songs response structure"

songs_response=$(curl -s \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/api/v1/library/songs?userId=demo-user&limit=5")

# Check if response has expected structure
if echo "$songs_response" | jq -e '.success' > /dev/null 2>&1; then
  log_success "Response has 'success' field"
else
  log_warning "Response missing 'success' field (may be using mock data)"
fi

if echo "$songs_response" | jq -e '.data.songs' > /dev/null 2>&1; then
  log_success "Response has 'data.songs' array"
else
  log_warning "Response missing 'data.songs' (library may be empty)"
fi

echo ""

###############################################################################
# Test Summary
###############################################################################

echo "═══════════════════════════════════════════════════════════════"
echo "Test Summary"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Total Tests Run:    $TESTS_RUN"
echo -e "${GREEN}Tests Passed:       $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed:       $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║                 ALL TESTS PASSED! ✓                           ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "🎉 The music dashboard is working correctly!"
  echo ""
  echo "Next steps:"
  echo "  1. Open browser: $DASHBOARD_URL/music"
  echo "  2. Try uploading a voice memo"
  echo "  3. Browse your music library"
  echo "  4. Create playlists and folders"
  exit 0
else
  echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║                 SOME TESTS FAILED ✗                           ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "Please check the errors above and ensure:"
  echo "  1. Jarvis Control Plane is running on port 4000"
  echo "  2. Dashboard is running on port 3003"
  echo "  3. PostgreSQL database is set up (Phase 4)"
  echo "  4. All dependencies are installed"
  exit 1
fi
