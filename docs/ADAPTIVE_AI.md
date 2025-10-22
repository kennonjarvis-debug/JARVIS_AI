# Jarvis Adaptive AI System

## Overview

The Adaptive AI system learns from user interactions to predict intent and generate personalized code. It combines pattern learning, intent prediction, and adaptive code generation to create an AI that adapts to your coding style.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Jarvis Intelligence Engine                  │
│                  (TypeScript - Port 4000)                       │
│                                                                 │
│  /api/autonomous/intelligence/adaptive/...                     │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Adaptive AI Python Service                      │
│                  (Python Flask - Port 8003)                     │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Intent     │  │   Pattern    │  │     Code     │        │
│  │  Predictor   │  │   Learner    │  │  Generator   │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Memory Layer                               │
│                (Vector Store + Knowledge Graph)                 │
│                    (Redis - Port 6379)                         │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Intent Predictor
- Predicts what the user wants to do based on context
- Uses regex pattern matching with confidence scoring
- Supports 15+ intent types: data_processing, api_request, code_generation, testing, etc.

### 2. Pattern Learner
- Learns action sequences from user behavior
- Tracks success rates and time-of-day patterns
- Predicts next actions based on workflow patterns

### 3. Code Generator
- Generates Python code adapted to user's style
- 10+ code templates for common tasks
- Learns coding preferences over time

### 4. Adaptive Engine
- Integrates with Jarvis memory layer
- Predicts intent using historical patterns
- Provides confidence-based recommendations

## Installation

### Prerequisites
- Python 3.11+
- Redis (for memory layer)
- Node.js 18+ (for Jarvis)

### Setup

1. **Install Python dependencies:**
```bash
cd /Users/benkennon/Jarvis/python
python3 -m venv venv
source venv/bin/activate
pip install flask flask-cors aiohttp
```

2. **Configure environment:**
```bash
# .env file
ADAPTIVE_AI_URL=http://localhost:8003
FEATURE_ADAPTIVE_ENGINE_V2=true
FEATURE_INSIGHT_ENGINE=true
ENABLE_MEMORY_LAYER=true
```

3. **Start services:**
```bash
# Terminal 1: Start Jarvis
npm run dev

# Terminal 2: Start Redis (if not running)
redis-server

# Terminal 3: Start Adaptive AI
./launch-adaptive-ai.sh
```

## API Reference

### Intelligence Engine Endpoints

All endpoints require the `FEATURE_ADAPTIVE_ENGINE_V2=true` flag.

#### 1. Predict Intent
```http
POST /api/autonomous/intelligence/adaptive/predict-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "context": "I need to clean this CSV file with messy data",
  "userId": "demo-user",
  "recentActions": ["data_loading"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "intent": "data_processing",
    "confidence": 0.85,
    "explanation": "LIKELY: You're working with data - I can help clean, transform, or process it.",
    "nextAction": {
      "action": "data_analysis",
      "confidence": 0.7,
      "reasoning": "Based on your typical workflow, you usually do 'data_analysis' next."
    }
  },
  "timestamp": "2025-10-08T..."
}
```

#### 2. Generate Code
```http
POST /api/autonomous/intelligence/adaptive/generate-code
Authorization: Bearer <token>
Content-Type: application/json

{
  "intent": "data_processing",
  "context": {
    "file_path": "sales_data.csv",
    "operations": ["clean", "transform"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "code": "import pandas as pd\n\ndef process_data...",
    "language": "python",
    "intent": "data_processing"
  },
  "timestamp": "2025-10-08T..."
}
```

#### 3. Learn from Action
```http
POST /api/autonomous/intelligence/adaptive/learn
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "data_processing",
  "context": "cleaned customer data from CSV",
  "success": true,
  "hour": 14
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Pattern learned"
  },
  "timestamp": "2025-10-08T..."
}
```

#### 4. Get Statistics
```http
GET /api/autonomous/intelligence/adaptive/ai-stats?userId=demo-user
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "patternLearner": {
      "sequences_learned": 12,
      "actions_observed": 8,
      "total_observations": 45
    },
    "userId": "demo-user"
  },
  "timestamp": "2025-10-08T..."
}
```

#### 5. Health Check
```http
GET /api/autonomous/intelligence/adaptive/ai-health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "adaptive-ai",
    "version": "1.0.0"
  },
  "timestamp": "2025-10-08T..."
}
```

### Python Service Endpoints

Direct access to Python service (port 8003):

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/predict-intent` | POST | Predict user intent |
| `/generate-code` | POST | Generate adaptive code |
| `/learn-pattern` | POST | Learn from action |
| `/learn-sequence` | POST | Learn action sequence |
| `/predict-memory` | POST | Predict with memory layer |
| `/observe` | POST | Observe and store action |
| `/stats` | GET | Learning statistics |
| `/style/learn` | POST | Learn coding style |

## Usage Examples

### Example 1: Predict Intent and Generate Code

```bash
# 1. Predict what user wants to do
curl -X POST http://localhost:4000/api/autonomous/intelligence/adaptive/predict-intent \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "context": "I have a CSV file with product data",
    "userId": "user123",
    "recentActions": []
  }'

# Response: { "intent": "data_loading", "confidence": 0.6, ... }

# 2. Generate code for that intent
curl -X POST http://localhost:4000/api/autonomous/intelligence/adaptive/generate-code \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "data_loading",
    "context": {
      "file_path": "products.csv",
      "file_type": "csv"
    }
  }'

# Response: { "code": "import pandas as pd...", ... }
```

### Example 2: Learn from Workflow

```bash
# Teach the AI your typical workflow
curl -X POST http://localhost:4000/api/autonomous/intelligence/adaptive/learn \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "data_loading",
    "context": "loaded sales_data.csv",
    "success": true
  }'

curl -X POST http://localhost:4000/api/autonomous/intelligence/adaptive/learn \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "data_processing",
    "context": "cleaned and transformed sales data",
    "success": true
  }'

# Now it knows: data_loading → data_processing
```

### Example 3: Run Demo

```bash
# Run the comprehensive demo
cd /Users/benkennon/Jarvis
source python/venv/bin/activate
python3 examples/adaptive_ai/demo.py
```

The demo shows:
1. ✅ Adaptive Engine learning from interactions
2. ✅ Intent Predictor understanding user input
3. ✅ Pattern Learner detecting sequences
4. ✅ Code Generator creating custom code
5. ✅ Real-world scenario combining all components

## Intent Types

The system recognizes these intent types:

| Intent | Description | Example Input |
|--------|-------------|---------------|
| `data_processing` | Clean/transform data | "clean this CSV file" |
| `data_loading` | Load data files | "read the JSON file" |
| `data_analysis` | Analyze/visualize | "analyze this dataset" |
| `api_request` | Make API calls | "fetch user data from API" |
| `api_post` | POST to API | "send data to endpoint" |
| `file_creation` | Create files | "save results to file" |
| `file_manipulation` | Copy/move files | "move files to folder" |
| `code_generation` | Write functions | "create a function to..." |
| `testing` | Write tests | "test this function" |
| `debugging` | Fix bugs | "debug this error" |
| `deployment` | Deploy apps | "deploy to production" |
| `documentation` | Add docs | "document this code" |

## Code Templates

Available code generation templates:

1. **Data Processing Pipeline**
   - Load CSV/JSON/Excel
   - Clean nulls and duplicates
   - Transform data types

2. **API Requests**
   - GET/POST requests
   - Authentication headers
   - Error handling

3. **File Operations**
   - Read/write files
   - Copy/move/delete
   - JSON serialization

4. **Function Generation**
   - Type hints
   - Docstrings
   - Test functions

5. **Debugging Helpers**
   - Debug print functions
   - Safe execution wrappers
   - Traceback formatting

## Configuration

### Environment Variables

```bash
# Adaptive AI Service
ADAPTIVE_AI_URL=http://localhost:8003

# Feature Flags
FEATURE_ADAPTIVE_ENGINE_V2=true
FEATURE_INSIGHT_ENGINE=true

# Memory Layer (required)
ENABLE_MEMORY_LAYER=true
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...

# Jarvis Core
JARVIS_PORT=4000
JARVIS_AUTH_TOKEN=test-token
```

### Feature Flags

Enable/disable features in `.env`:

```bash
# Enable adaptive AI integration
FEATURE_ADAPTIVE_ENGINE_V2=true

# Enable insight generation
FEATURE_INSIGHT_ENGINE=true

# Disable other features
FEATURE_PROACTIVE_AGENT=false
FEATURE_DOMAIN_ROUTING=false
```

## Troubleshooting

### Service Not Available

**Error:** `Adaptive AI service not available`

**Solution:**
```bash
# Start the adaptive AI service
./launch-adaptive-ai.sh

# Or manually:
cd python
source venv/bin/activate
PORT=8003 python3 adaptive_ai_service.py
```

### Memory Layer Not Working

**Error:** `Memory recall failed with status 503`

**Solution:**
```bash
# Ensure Redis is running
redis-cli ping
# Should return: PONG

# Ensure memory layer is enabled
grep ENABLE_MEMORY_LAYER .env
# Should show: ENABLE_MEMORY_LAYER=true

# Restart Jarvis
npm run dev
```

### Feature Disabled

**Error:** `Adaptive Engine V2 is disabled`

**Solution:**
```bash
# Enable the feature flag
echo "FEATURE_ADAPTIVE_ENGINE_V2=true" >> .env

# Restart Jarvis
npm run dev
```

## Performance

### Benchmarks

- **Intent Prediction:** ~50ms (regex-based)
- **Code Generation:** ~100ms (template-based)
- **Pattern Learning:** ~10ms (in-memory)
- **Memory Recall:** ~200ms (Redis + embeddings)

### Scaling

- Pattern learner: In-memory (can handle 10,000+ observations)
- Code generator: Stateless (scales horizontally)
- Memory layer: Redis-backed (scales to millions of memories)

## Future Enhancements

1. **ML Models:** Replace regex with fine-tuned models
2. **Multi-language:** Support JavaScript, TypeScript, Go, etc.
3. **User Profiles:** Per-user style preferences
4. **Feedback Loop:** Active learning from corrections
5. **Templates:** Expand code template library
6. **Analytics:** Usage patterns and improvement metrics

## Contributing

To add new intent types:

1. Add pattern to `intent_predictor.py`:
```python
self.intent_patterns = {
    r'(?i)(your|pattern)': 'your_intent',
    ...
}
```

2. Add template to `code_generator.py`:
```python
self.templates = {
    'your_intent': self.generate_your_template,
    ...
}
```

3. Add endpoint to `adaptive_ai_service.py` if needed

## License

Part of the Jarvis Control Plane project.

## Support

- Issues: GitHub Issues
- Docs: `/docs/ADAPTIVE_AI.md`
- Demo: `python examples/adaptive_ai/demo.py`
