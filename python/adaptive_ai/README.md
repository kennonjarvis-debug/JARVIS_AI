# Adaptive AI - Python Package

## Overview

Python package that provides adaptive AI capabilities for learning user patterns and generating personalized code.

## Components

### 1. AdaptiveEngine (`adaptive_engine.py`)

Main adaptive AI engine that learns from interactions.

**Features:**
- Integrates with Jarvis memory layer
- Pattern analysis and caching
- Intent prediction with confidence
- Learning statistics tracking

**Usage:**
```python
from adaptive_ai import AdaptiveEngine

async with AdaptiveEngine(jarvis_url='http://localhost:4000') as engine:
    # Predict intent
    prediction = await engine.predict_intent(
        context="I need to clean this CSV file",
        user_id="demo-user"
    )

    print(f"Intent: {prediction['intent']}")
    print(f"Confidence: {prediction['confidence']}")

    # Observe action
    await engine.observe_action({
        'description': 'Cleaned sales_data.csv',
        'action': 'data_processing',
        'user_id': 'demo-user',
        'success': True,
        'context': 'working with sales data'
    })
```

### 2. IntentPredictor (`intent_predictor.py`)

Predicts user intent from natural language.

**Features:**
- 15+ intent types
- Regex-based pattern matching
- Confidence boosting
- Context-aware prediction

**Usage:**
```python
from adaptive_ai import IntentPredictor

predictor = IntentPredictor()

intent, confidence = predictor.predict(
    "I need to clean this CSV file",
    context={'recent_actions': ['data_loading']}
)

print(f"Intent: {intent} ({confidence:.0%})")
# Output: Intent: data_processing (85%)
```

**Supported Intents:**
- `data_processing` - Clean/transform data
- `data_loading` - Load files
- `data_analysis` - Analyze/visualize
- `api_request` - Make API calls
- `code_generation` - Write functions
- `testing` - Create tests
- `debugging` - Fix bugs
- And more...

### 3. PatternLearner (`pattern_learner.py`)

Learns patterns from user behavior.

**Features:**
- Action sequence detection
- Success rate tracking
- Time-of-day patterns
- Context similarity matching
- Save/load patterns to JSON

**Usage:**
```python
from adaptive_ai import PatternLearner

learner = PatternLearner()

# Observe actions
learner.observe('data_loading', 'loaded sales.csv', success=True, hour=14)
learner.observe('data_processing', 'cleaned data', success=True, hour=14)
learner.observe('data_analysis', 'analyzed trends', success=True, hour=15)

# Learn sequences
learner.observe_sequence(['data_loading', 'data_processing', 'data_analysis'])

# Predict next action
prediction = learner.predict_next_action(
    current_context="working with sales data",
    recent_actions=['data_loading', 'data_processing']
)

print(f"Next action: {prediction['action']}")
print(f"Confidence: {prediction['confidence']:.0%}")
print(f"Reasoning: {prediction['reasoning']}")

# Save patterns
learner.save('patterns.json')

# Load patterns
learner.load('patterns.json')
```

### 4. AdaptiveCodeGenerator (`code_generator.py`)

Generates code adapted to user's style.

**Features:**
- 10+ code templates
- Style preference learning
- Type hints and docstrings
- Error handling patterns

**Usage:**
```python
from adaptive_ai import AdaptiveCodeGenerator

generator = AdaptiveCodeGenerator()

# Generate data processing code
code = generator.generate(
    intent='data_processing',
    context={
        'file_path': 'sales_data.csv',
        'operations': ['clean', 'transform']
    }
)

print(code)
```

**Output:**
```python
import pandas as pd
from typing import Optional

def process_data(file_path: str = "sales_data.csv") -> pd.DataFrame:
    """
    Process data file with cleaning and transformation.

    Based on your typical workflow:
    - Load data
    - Remove nulls
    - Clean values
    - Transform as needed
    """
    # Load data
    df = pd.read_csv(file_path)
    print(f"Loaded {len(df)} rows")

    # Remove nulls (you always do this first)
    df = df.dropna()

    # Clean data
    df = df[df['value'] > 0]  # Remove invalid values
    df['column'] = df['column'].str.strip()  # Clean strings

    # Transform data
    df['date'] = pd.to_datetime(df['date'])
    df['processed_at'] = pd.Timestamp.now()

    print(f"Processed {len(df)} rows")
    return df

# Execute
if __name__ == "__main__":
    df = process_data()
    print(df.head())
```

**Available Templates:**
- `data_processing` - Data cleaning pipeline
- `data_loading` - Load CSV/JSON/Excel
- `data_analysis` - Analysis with plots
- `api_request` - GET requests
- `api_post` - POST requests
- `file_creation` - Save files
- `file_manipulation` - Copy/move/delete
- `code_generation` - Function template
- `testing` - Unit tests
- `debugging` - Debug helpers

## Installation

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install aiohttp  # For AdaptiveEngine
```

## Quick Start

### Basic Intent Prediction

```python
from adaptive_ai import IntentPredictor

predictor = IntentPredictor()

# Test cases
test_inputs = [
    "I need to clean this CSV file",
    "Call the API to get user data",
    "Write a function to calculate fibonacci",
    "Test this new feature"
]

for text in test_inputs:
    intent, confidence = predictor.predict(text)
    print(f"{text}")
    print(f"  → {intent} ({confidence:.0%})\n")
```

### Learning Workflows

```python
from adaptive_ai import PatternLearner

learner = PatternLearner()

# Simulate user workflow
workflows = [
    ['data_loading', 'data_processing', 'data_analysis', 'reporting'],
    ['data_loading', 'data_processing', 'data_analysis', 'visualization'],
    ['code_generation', 'testing', 'debugging', 'deployment']
]

for workflow in workflows:
    learner.observe_sequence(workflow)

# Predict next step
prediction = learner.predict_next_action(
    context="",
    recent_actions=['data_loading', 'data_processing']
)

print(f"After data_processing, you usually do: {prediction['action']}")
```

### Generating Code

```python
from adaptive_ai import AdaptiveCodeGenerator

generator = AdaptiveCodeGenerator()

# Generate API request code
code = generator.generate(
    intent='api_request',
    context={
        'url': 'https://api.github.com/users/octocat',
        'method': 'GET',
        'auth': False
    }
)

print(code)
```

### Full Adaptive System

```python
import asyncio
from adaptive_ai import AdaptiveEngine

async def main():
    async with AdaptiveEngine() as engine:
        # Observe some actions
        await engine.observe_action({
            'description': 'Loaded sales_data.csv',
            'action': 'data_loading',
            'user_id': 'demo-user',
            'success': True,
            'context': 'working with sales data'
        })

        await engine.observe_action({
            'description': 'Cleaned and processed data',
            'action': 'data_processing',
            'user_id': 'demo-user',
            'success': True,
            'context': 'cleaning sales data'
        })

        # Predict intent
        prediction = await engine.predict_intent(
            context="I have a new CSV file with product data",
            user_id='demo-user'
        )

        print(f"Intent: {prediction['intent']}")
        print(f"Confidence: {prediction['confidence']:.0%}")
        print(f"Recommendation: {prediction['recommendation']}")
        print(f"Explanation: {prediction['explanation']}")

        # Get stats
        stats = engine.get_stats()
        print(f"\nStats: {stats}")

asyncio.run(main())
```

## Demo

Run the comprehensive demo:

```bash
cd /Users/benkennon/Jarvis
source python/venv/bin/activate
python3 examples/adaptive_ai/demo.py
```

The demo shows:
1. Adaptive Engine learning from interactions
2. Intent Predictor understanding user input
3. Pattern Learner detecting action sequences
4. Code Generator creating custom code
5. Real-world scenario combining all components

## API Reference

### AdaptiveEngine

```python
class AdaptiveEngine:
    def __init__(self, jarvis_url: str = "http://localhost:4000", api_key: str = "test-token")

    async def predict_intent(self, context: str, user_id: str = "default") -> Dict[str, Any]
    async def recall_memories(self, query: str, user_id: str, limit: int = 20) -> List[Dict]
    async def observe_action(self, action: Dict[str, Any]) -> None
    async def provide_feedback(self, prediction_id: str, was_correct: bool) -> None

    def get_stats(self) -> Dict[str, Any]
    def clear_cache(self) -> None
```

### IntentPredictor

```python
class IntentPredictor:
    def __init__(self)

    def predict(self, text: str, context: Optional[Dict] = None) -> Tuple[str, float]
    def predict_next_action(self, action_sequence: List[str]) -> Tuple[str, float]
    def explain_prediction(self, intent: str, confidence: float, text: str) -> str
```

### PatternLearner

```python
class PatternLearner:
    def __init__(self)

    def observe(self, action: str, context: str, success: bool = True, hour: int = 12)
    def observe_sequence(self, actions: List[str])
    def predict_next_action(self, current_context: str, recent_actions: List[str] = None) -> Dict[str, Any]
    def get_success_rate(self, action: str) -> float
    def get_best_time(self, action: str) -> int
    def get_stats(self) -> Dict[str, Any]

    def save(self, filepath: str)
    def load(self, filepath: str)
```

### AdaptiveCodeGenerator

```python
class AdaptiveCodeGenerator:
    def __init__(self)

    def generate(self, intent: str, context: Dict, patterns: Optional[Dict] = None) -> str
    def learn_style(self, user_code: str) -> None
```

## Testing

```bash
# Run demo
python3 examples/adaptive_ai/demo.py

# Test specific components
python3 -c "
from adaptive_ai import IntentPredictor
predictor = IntentPredictor()
intent, conf = predictor.predict('clean this CSV file')
print(f'{intent}: {conf:.0%}')
"
```

## Integration with Jarvis

The package integrates with Jarvis through:

1. **Memory Layer** - Stores patterns in Jarvis memory
2. **REST API** - Flask service on port 8003
3. **Intelligence Engine** - TypeScript endpoints call Python service

See `/docs/ADAPTIVE_AI.md` for full integration guide.

## License

Part of the Jarvis Control Plane project.
