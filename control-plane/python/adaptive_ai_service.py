#!/usr/bin/env python3
"""
Adaptive AI Microservice

Flask service that exposes the Python adaptive AI system via REST API.
Integrates with Jarvis Intelligence Engine.
"""

import sys
from pathlib import Path
import asyncio
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add adaptive_ai to path
sys.path.insert(0, str(Path(__file__).parent))

from adaptive_ai import AdaptiveEngine, IntentPredictor, PatternLearner, AdaptiveCodeGenerator

app = Flask(__name__)
CORS(app)

# Global instances
intent_predictor = IntentPredictor()
pattern_learner = PatternLearner()
code_generator = AdaptiveCodeGenerator()

# Adaptive engine requires async context
adaptive_engine = None


def get_adaptive_engine():
    """Get or create adaptive engine instance."""
    jarvis_url = request.headers.get('X-Jarvis-URL', 'http://localhost:4000')
    api_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    return AdaptiveEngine(jarvis_url=jarvis_url, api_key=api_key or 'test-token')


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'adaptive-ai',
        'version': '1.0.0'
    })


@app.route('/predict-intent', methods=['POST'])
def predict_intent():
    """
    Predict user intent from context.

    Body:
        {
            "context": "string",
            "userId": "string",
            "recentActions": ["action1", "action2"]
        }

    Returns:
        {
            "intent": "string",
            "confidence": 0.85,
            "explanation": "string",
            "nextAction": {...}
        }
    """
    try:
        data = request.json
        context = data.get('context', '')
        user_id = data.get('userId', 'default')
        recent_actions = data.get('recentActions', [])

        # Predict intent
        intent, confidence = intent_predictor.predict(context, {
            'recent_actions': recent_actions
        })

        explanation = intent_predictor.explain_prediction(intent, confidence, context)

        # Predict next action if we have a sequence
        next_action = None
        if recent_actions:
            next_prediction = pattern_learner.predict_next_action(context, recent_actions)
            next_action = {
                'action': next_prediction.get('action'),
                'confidence': next_prediction.get('confidence', 0.0),
                'reasoning': next_prediction.get('reasoning', '')
            }

        return jsonify({
            'intent': intent,
            'confidence': confidence,
            'explanation': explanation,
            'nextAction': next_action
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/generate-code', methods=['POST'])
def generate_code():
    """
    Generate adaptive code based on intent.

    Body:
        {
            "intent": "string",
            "context": {...},
            "patterns": {...}
        }

    Returns:
        {
            "code": "string",
            "language": "python"
        }
    """
    try:
        data = request.json
        intent = data.get('intent', '')
        context = data.get('context', {})
        patterns = data.get('patterns')

        # Generate code
        code = code_generator.generate(intent, context, patterns)

        return jsonify({
            'code': code,
            'language': 'python',
            'intent': intent
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/learn-pattern', methods=['POST'])
def learn_pattern():
    """
    Learn from user action.

    Body:
        {
            "action": "string",
            "context": "string",
            "success": true,
            "hour": 14
        }
    """
    try:
        data = request.json
        action = data.get('action', '')
        context = data.get('context', '')
        success = data.get('success', True)
        hour = data.get('hour', 12)

        # Observe action
        pattern_learner.observe(action, context, success, hour)

        return jsonify({
            'success': True,
            'message': 'Pattern learned'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/learn-sequence', methods=['POST'])
def learn_sequence():
    """
    Learn action sequence.

    Body:
        {
            "actions": ["action1", "action2", "action3"]
        }
    """
    try:
        data = request.json
        actions = data.get('actions', [])

        # Observe sequence
        pattern_learner.observe_sequence(actions)

        return jsonify({
            'success': True,
            'message': 'Sequence learned'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/predict-memory', methods=['POST'])
async def predict_with_memory():
    """
    Predict intent using Jarvis memory layer.

    Body:
        {
            "context": "string",
            "userId": "string"
        }

    Returns:
        {
            "intent": "string",
            "confidence": 0.85,
            "recommendation": "suggest",
            "explanation": "string",
            "patterns": {...}
        }
    """
    try:
        data = request.json
        context = data.get('context', '')
        user_id = data.get('userId', 'default')

        # Use adaptive engine with memory
        async with get_adaptive_engine() as engine:
            prediction = await engine.predict_intent(context, user_id)
            return jsonify(prediction)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/observe', methods=['POST'])
async def observe_action():
    """
    Observe user action and store in memory.

    Body:
        {
            "description": "string",
            "action": "string",
            "userId": "string",
            "success": true,
            "context": "string"
        }
    """
    try:
        data = request.json

        # Use adaptive engine to observe
        async with get_adaptive_engine() as engine:
            await engine.observe_action(data)

            return jsonify({
                'success': True,
                'message': 'Action observed and stored'
            })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/stats', methods=['GET'])
def get_stats():
    """Get learning statistics."""
    try:
        user_id = request.args.get('userId', 'default')

        # Get pattern learner stats
        learner_stats = pattern_learner.get_stats()

        return jsonify({
            'patternLearner': learner_stats,
            'userId': user_id
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/style/learn', methods=['POST'])
def learn_style():
    """
    Learn coding style from user code.

    Body:
        {
            "code": "string"
        }
    """
    try:
        data = request.json
        user_code = data.get('code', '')

        # Learn style
        code_generator.learn_style(user_code)

        return jsonify({
            'success': True,
            'message': 'Style learned'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 8003))

    print("=" * 70)
    print("🧠 Jarvis Adaptive AI Service")
    print("=" * 70)
    print(f"Port: {port}")
    print(f"Endpoints:")
    print(f"  GET  /health - Health check")
    print(f"  POST /predict-intent - Predict user intent")
    print(f"  POST /generate-code - Generate adaptive code")
    print(f"  POST /learn-pattern - Learn from action")
    print(f"  POST /learn-sequence - Learn action sequence")
    print(f"  POST /predict-memory - Predict with memory layer")
    print(f"  POST /observe - Observe and store action")
    print(f"  GET  /stats - Learning statistics")
    print(f"  POST /style/learn - Learn coding style")
    print("=" * 70)
    print()

    app.run(host='0.0.0.0', port=port, debug=True)
