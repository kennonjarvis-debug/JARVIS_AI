# Adaptive AI - Quick Start Guide

## 🎯 What You Get

A complete Python adaptive AI system that:
- ✅ Learns from your interactions
- ✅ Predicts what you want to do next
- ✅ Generates code adapted to your style
- ✅ Integrates with Jarvis Intelligence Engine

## 🚀 Quick Start (3 Commands)

### 1. Start the adaptive AI service:
```bash
./launch-adaptive-ai.sh
```

### 2. In another terminal, start Jarvis:
```bash
npm run dev
```

### 3. Test it:
```bash
curl -X POST http://localhost:4000/api/autonomous/intelligence/adaptive/predict-intent \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "context": "I need to clean this CSV file",
    "userId": "demo-user",
    "recentActions": []
  }'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "intent": "data_processing",
    "confidence": 0.85,
    "explanation": "LIKELY: You're working with data...",
    "nextAction": { ... }
  }
}
```

## 📁 What Was Built

### Python Package (`/python/adaptive_ai/`)
```
python/adaptive_ai/
├── __init__.py                 # Package exports
├── adaptive_engine.py          # Main engine (350 lines)
├── intent_predictor.py         # Intent classification (200 lines)
├── code_generator.py           # Code templates (400 lines)
├── pattern_learner.py          # Pattern learning (200 lines)
└── README.md                   # Package docs
```

### Flask Service (`/python/adaptive_ai_service.py`)
- REST API on port 8003
- 9 endpoints for prediction, learning, code generation
- Integrates with Jarvis memory layer

### TypeScript Integration (`/src/autonomous/intelligence/api.ts`)
- 5 new endpoints in Intelligence Engine
- Proxies requests to Python service
- Feature-flag protected

### Examples & Docs
```
examples/adaptive_ai/
├── demo.py          # Full demonstration (500 lines)
└── quick_test.py    # Quick verification test

docs/
├── ADAPTIVE_AI.md   # Complete guide
└── python/adaptive_ai/README.md  # Package API docs
```

## 🧪 Run the Demo

```bash
source python/venv/bin/activate
python3 examples/adaptive_ai/demo.py
```

This shows:
1. **Demo 1:** Adaptive Engine learning patterns
2. **Demo 2:** Intent Predictor understanding input
3. **Demo 3:** Pattern Learner detecting sequences
4. **Demo 4:** Code Generator creating custom code
5. **Demo 5:** Real-world workflow combining all

## 🔌 API Endpoints

All endpoints at: `http://localhost:4000/api/autonomous/intelligence/adaptive/`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/predict-intent` | POST | Predict user intent from context |
| `/generate-code` | POST | Generate adaptive Python code |
| `/learn` | POST | Learn from user action |
| `/ai-stats` | GET | Get learning statistics |
| `/ai-health` | GET | Check service health |

## 📖 Examples

### Example 1: Predict Intent
```bash
curl -X POST http://localhost:4000/api/autonomous/intelligence/adaptive/predict-intent \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "context": "I have a CSV file with product data",
    "userId": "user123"
  }'
```

### Example 2: Generate Code
```bash
curl -X POST http://localhost:4000/api/autonomous/intelligence/adaptive/generate-code \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "data_processing",
    "context": {
      "file_path": "products.csv",
      "operations": ["clean", "transform"]
    }
  }'
```

### Example 3: Learn Pattern
```bash
curl -X POST http://localhost:4000/api/autonomous/intelligence/adaptive/learn \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "data_processing",
    "context": "cleaned customer data",
    "success": true
  }'
```

## 🎓 What It Can Do

### 15+ Intent Types
- `data_processing` - Clean/transform data
- `data_loading` - Load files
- `data_analysis` - Analyze/visualize
- `api_request` - Make API calls
- `code_generation` - Write functions
- `testing` - Create tests
- And more...

### 10+ Code Templates
- Data processing pipelines
- API requests (GET/POST)
- File operations
- Function generation
- Unit tests
- Debug helpers

### Learning Capabilities
- Action sequence detection
- Context similarity matching
- Success rate tracking
- Time-of-day patterns
- Workflow prediction

## ⚙️ Configuration

Already configured in `.env`:
```bash
# Python service
ADAPTIVE_AI_URL=http://localhost:8003

# Feature flags
FEATURE_ADAPTIVE_ENGINE_V2=true
FEATURE_INSIGHT_ENGINE=true

# Memory layer (for advanced features)
ENABLE_MEMORY_LAYER=true
```

## 🐛 Troubleshooting

### Service won't start
```bash
# Ensure venv is set up
cd python
python3 -m venv venv
source venv/bin/activate
pip install flask flask-cors aiohttp

# Try again
./launch-adaptive-ai.sh
```

### "Service not available" error
```bash
# Check if service is running
curl http://localhost:8003/health

# If not, start it
./launch-adaptive-ai.sh
```

### Feature disabled error
```bash
# Enable feature flags
grep FEATURE_ADAPTIVE_ENGINE_V2 .env
# Should show: FEATURE_ADAPTIVE_ENGINE_V2=true

# If not, add it
echo "FEATURE_ADAPTIVE_ENGINE_V2=true" >> .env
```

## 📚 Full Documentation

- **Complete Guide:** `/docs/ADAPTIVE_AI.md`
- **Package API:** `/python/adaptive_ai/README.md`
- **Integration:** See Intelligence Engine endpoints

## 🎯 Next Steps

1. **Try the demo:** `python3 examples/adaptive_ai/demo.py`
2. **Test the API:** Use curl examples above
3. **Read the docs:** `/docs/ADAPTIVE_AI.md`
4. **Build something:** Use the API in your app

## 🎉 Summary

**All three options delivered:**
- ✅ **Option A:** Standalone Python system (`/python/adaptive_ai/`)
- ✅ **Option B:** Intelligence Engine integration (5 new endpoints)
- ✅ **Option C:** Proof-of-concept demo (`demo.py`)

**Features:**
- Intent prediction with 15+ types
- Adaptive code generation with 10+ templates
- Pattern learning from workflows
- Full REST API integration
- Comprehensive documentation

**Total lines of code:** ~1,500+ lines
**Services:** Python (port 8003) + TypeScript integration
**No interference:** Separate ports from audio services (8000, 8001)

Enjoy your adaptive AI system! 🚀
