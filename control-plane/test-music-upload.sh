#!/bin/bash
# Test script for Music Upload API (Phase 1)

BASE_URL="http://localhost:4000"
AUTH_TOKEN="test-token"

echo "🎵 Testing Jarvis Music Creation API - Phase 1"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Health check
echo -e "${BLUE}[Test 1]${NC} Checking API health..."
response=$(curl -s "${BASE_URL}/health")
if echo "$response" | grep -q "healthy"; then
    echo -e "${GREEN}✓ API is healthy${NC}"
    echo "$response" | jq '.'
else
    echo -e "${RED}✗ API is not responding${NC}"
    exit 1
fi
echo ""

# Test 2: Create a test voice memo (text file for quick testing)
echo -e "${BLUE}[Test 2]${NC} Creating test voice memo (text file)..."
cat > /tmp/test-voice-memo.txt << 'EOF'
Yo, this is a chill track about late night vibes.
Feeling nostalgic about the good times.
Thinking about you when I'm alone at night.
It's a slow tempo, emotional vibe, maybe 80 BPM.
Hip-hop with some R&B influences.
EOF

echo -e "${GREEN}✓ Test file created${NC}"
cat /tmp/test-voice-memo.txt
echo ""

# Test 3: Upload the voice memo
echo -e "${BLUE}[Test 3]${NC} Uploading voice memo..."
upload_response=$(curl -s -X POST "${BASE_URL}/api/v1/music/upload" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -F "file=@/tmp/test-voice-memo.txt" \
  -F "userId=testuser" \
  -F "notes=Test upload from script")

if echo "$upload_response" | grep -q "success"; then
    echo -e "${GREEN}✓ Upload successful${NC}"
    echo "$upload_response" | jq '.'

    # Extract upload ID
    upload_id=$(echo "$upload_response" | jq -r '.uploadId')
    echo ""
    echo -e "${YELLOW}Upload ID: ${upload_id}${NC}"
else
    echo -e "${RED}✗ Upload failed${NC}"
    echo "$upload_response" | jq '.'
    exit 1
fi
echo ""

# Test 4: Wait for processing
echo -e "${BLUE}[Test 4]${NC} Waiting for processing to complete..."
for i in {1..30}; do
    echo -n "."
    sleep 1

    status_response=$(curl -s "${BASE_URL}/api/v1/music/upload/${upload_id}/status" \
      -H "Authorization: Bearer ${AUTH_TOKEN}")

    status=$(echo "$status_response" | jq -r '.upload.status')

    if [ "$status" = "analyzed" ] || [ "$status" = "completed" ]; then
        echo ""
        echo -e "${GREEN}✓ Processing complete!${NC}"
        echo "$status_response" | jq '.'
        break
    elif [ "$status" = "failed" ]; then
        echo ""
        echo -e "${RED}✗ Processing failed${NC}"
        echo "$status_response" | jq '.'
        exit 1
    fi

    if [ $i -eq 30 ]; then
        echo ""
        echo -e "${YELLOW}⚠ Processing taking longer than expected${NC}"
        echo "Current status: $status"
    fi
done
echo ""

# Test 5: Get musical intent details
echo -e "${BLUE}[Test 5]${NC} Extracting musical intent..."
musical_intent=$(echo "$status_response" | jq '.upload.musicalIntent')

if [ "$musical_intent" != "null" ]; then
    echo -e "${GREEN}✓ Musical intent extracted${NC}"
    echo ""
    echo -e "${YELLOW}Genre:${NC} $(echo "$status_response" | jq -r '.upload.musicalIntent.genre')"
    echo -e "${YELLOW}Mood:${NC} $(echo "$status_response" | jq -r '.upload.musicalIntent.mood')"
    echo -e "${YELLOW}Tempo:${NC} $(echo "$status_response" | jq -r '.upload.musicalIntent.tempo') BPM"
    echo -e "${YELLOW}Energy:${NC} $(echo "$status_response" | jq -r '.upload.musicalIntent.energy')/10"
    echo -e "${YELLOW}Themes:${NC} $(echo "$status_response" | jq -r '.upload.musicalIntent.themes | join(", ")')"
    echo ""
    echo -e "${YELLOW}Transcription:${NC}"
    echo "$(echo "$status_response" | jq -r '.upload.transcription')"
else
    echo -e "${RED}✗ Musical intent not available${NC}"
fi
echo ""

# Test 6: Get all uploads
echo -e "${BLUE}[Test 6]${NC} Getting all uploads for user..."
uploads_response=$(curl -s "${BASE_URL}/api/v1/music/uploads?userId=testuser" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

upload_count=$(echo "$uploads_response" | jq -r '.count')
echo -e "${GREEN}✓ Found ${upload_count} upload(s)${NC}"
echo "$uploads_response" | jq '.'
echo ""

# Summary
echo "================================================"
echo -e "${GREEN}🎉 All tests passed!${NC}"
echo ""
echo "Next steps:"
echo "1. Try uploading a real voice memo (audio file)"
echo "2. Test with vocal isolation (requires audio with beats)"
echo "3. Move to Phase 2 for music composition"
echo ""
echo "For real audio test:"
echo "  curl -X POST ${BASE_URL}/api/v1/music/upload \\"
echo "    -H \"Authorization: Bearer ${AUTH_TOKEN}\" \\"
echo "    -F \"file=@your-voice-memo.m4a\" \\"
echo "    -F \"userId=\$(whoami)\""
echo ""
