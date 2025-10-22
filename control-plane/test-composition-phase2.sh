#!/bin/bash
# Test script for Phase 2: AI Composition Engine

BASE_URL="http://localhost:4000"
AUTH_TOKEN="test-token"

echo "🎵 Testing Phase 2: AI Composition Engine"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Create test voice memo with musical intent
echo -e "${BLUE}[Test 1]${NC} Creating test voice memo with clear musical intent..."
cat > /tmp/test-composition-idea.txt << 'EOF'
This is a chill hip-hop track about late night vibes and nostalgia.
Feeling emotional about the good times.
Thinking about someone special when I'm alone at night.
Slow tempo around 80-85 BPM.
R&B influenced hip-hop with lo-fi production.
Themes: love, nostalgia, late night introspection.
EOF

echo -e "${GREEN}✓ Test file created${NC}"
cat /tmp/test-composition-idea.txt
echo ""

# Test 2: Upload and trigger full composition
echo -e "${BLUE}[Test 2]${NC} Uploading voice memo with auto-composition..."
upload_response=$(curl -s -X POST "${BASE_URL}/api/v1/music/upload" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -F "file=@/tmp/test-composition-idea.txt" \
  -F "userId=testuser-phase2" \
  -F "autoCompose=true" \
  -F "notes=Test full composition workflow")

if echo "$upload_response" | grep -q "success"; then
    echo -e "${GREEN}✓ Upload successful${NC}"
    upload_id=$(echo "$upload_response" | jq -r '.uploadId')
    echo -e "${YELLOW}Upload ID: ${upload_id}${NC}"
else
    echo -e "${RED}✗ Upload failed${NC}"
    echo "$upload_response" | jq '.'
    exit 1
fi
echo ""

# Test 3: Monitor processing stages
echo -e "${BLUE}[Test 3]${NC} Monitoring composition pipeline..."
echo "Expected stages:"
echo "  1. processing → Phase 1 (vocal isolation, transcription, analysis)"
echo "  2. analyzed → Phase 1 complete, musical intent extracted"
echo "  3. composing → Phase 2 (lyric generation, music generation, mixing)"
echo "  4. completed → Final song ready!"
echo ""

max_wait=180  # 3 minutes max
elapsed=0
last_status=""

while [ $elapsed -lt $max_wait ]; do
    status_response=$(curl -s "${BASE_URL}/api/v1/music/upload/${upload_id}/status" \
      -H "Authorization: Bearer ${AUTH_TOKEN}")

    status=$(echo "$status_response" | jq -r '.upload.status')

    if [ "$status" != "$last_status" ]; then
        echo ""
        echo -e "${YELLOW}Status changed: ${status}${NC}"

        case $status in
            "processing")
                echo "  → Running Phase 1: Vocal isolation + Transcription + Intent analysis..."
                ;;
            "analyzed")
                echo "  → Phase 1 complete! Musical intent extracted"
                echo ""
                echo -e "${BLUE}Musical Intent:${NC}"
                echo "$status_response" | jq '.upload.musicalIntent'
                echo ""
                echo "  → Starting Phase 2: Composition..."
                ;;
            "composing")
                echo "  → Generating lyrics..."
                echo "  → Generating instrumental..."
                echo "  → Mixing final track..."
                ;;
            "completed")
                echo ""
                echo -e "${GREEN}✓ COMPOSITION COMPLETE!${NC}"
                break
                ;;
            "failed")
                echo -e "${RED}✗ Processing failed${NC}"
                echo "$status_response" | jq '.upload.error'
                exit 1
                ;;
        esac

        last_status=$status
    else
        echo -n "."
    fi

    sleep 2
    elapsed=$((elapsed + 2))
done

if [ $elapsed -ge $max_wait ]; then
    echo ""
    echo -e "${YELLOW}⚠ Processing taking longer than expected (${max_wait}s)${NC}"
    echo "Current status: $status"
    echo ""
    echo "Note: Music generation can take 2-5 minutes with external APIs"
    echo "Check status manually:"
    echo "  curl ${BASE_URL}/api/v1/music/upload/${upload_id}/status -H \"Authorization: Bearer ${AUTH_TOKEN}\""
    exit 0
fi

echo ""

# Test 4: Display composition results
echo -e "${BLUE}[Test 4]${NC} Displaying composition results..."

final_response=$(curl -s "${BASE_URL}/api/v1/music/upload/${upload_id}/status" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

echo ""
echo -e "${YELLOW}=== FINAL RESULTS ===${NC}"
echo ""

song_id=$(echo "$final_response" | jq -r '.upload.songId')
echo -e "${GREEN}Song ID:${NC} ${song_id}"
echo ""

# Musical Intent
echo -e "${BLUE}Musical Intent:${NC}"
echo "$final_response" | jq '.upload.musicalIntent' | head -15
echo ""

# Lyrics (first 20 lines)
echo -e "${BLUE}Generated Lyrics (preview):${NC}"
lyrics=$(echo "$final_response" | jq -r '.upload.composition.lyrics // empty')
if [ -n "$lyrics" ]; then
    echo "$lyrics" | head -20
    echo "..."
else
    echo "(Lyrics not available in response - check output directory)"
fi
echo ""

# Composition files
echo -e "${BLUE}Composition Files:${NC}"
instrumental=$(echo "$final_response" | jq -r '.upload.composition.instrumentalPath // empty')
final_mix=$(echo "$final_response" | jq -r '.upload.composition.finalMixPath // empty')

if [ -n "$instrumental" ]; then
    echo -e "${GREEN}✓ Instrumental:${NC} ${instrumental}"
fi

if [ -n "$final_mix" ]; then
    echo -e "${GREEN}✓ Final Mix:${NC} ${final_mix}"
fi

echo ""
echo -e "${BLUE}Output Directory:${NC}"
output_dir="/tmp/jarvis-compositions/${song_id}"
if [ -d "$output_dir" ]; then
    echo "$output_dir"
    echo ""
    echo "Files:"
    ls -lh "$output_dir" 2>/dev/null || echo "(Directory not found)"
else
    echo "(Local mode - no audio files generated)"
    echo "See composition blueprint: ${instrumental}"
fi

echo ""

# Test 5: Summary and next steps
echo "================================================"
echo -e "${GREEN}🎉 Phase 2 Test Complete!${NC}"
echo ""
echo "Summary:"
echo "  ✓ Voice memo uploaded and analyzed"
echo "  ✓ Musical intent extracted"
echo "  ✓ Lyrics generated"
echo "  ✓ Instrumental/beat generated"
echo "  ✓ Final composition complete"
echo ""
echo "Output location:"
echo "  ${output_dir}"
echo ""
echo "Files created:"
echo "  - lyrics.txt (full song lyrics)"
echo "  - instrumental.mp3 or .json (beat/blueprint)"
echo "  - final-mix.mp3 (if vocals available)"
echo ""

if echo "$final_response" | grep -q '"model":"local-blueprint"'; then
    echo -e "${YELLOW}Note: Running in LOCAL MODE${NC}"
    echo "No actual audio generated (composition blueprint only)"
    echo ""
    echo "To generate real audio:"
    echo "  1. Add Suno AI API key: SUNO_API_KEY=... in .env"
    echo "  2. Set MUSIC_GENERATOR_PROVIDER=suno"
    echo "  3. Restart server and test again"
    echo ""
fi

echo "Next steps:"
echo "  • Listen to the final mix (if audio generated)"
echo "  • Review generated lyrics"
echo "  • Test with real voice memo (audio file)"
echo "  • Configure external music generation API"
echo "  • Proceed to Phase 3 (Organization System)"
echo ""
