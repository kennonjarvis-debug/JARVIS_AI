#!/usr/bin/env python3
"""
Quick test of Adaptive AI components
"""

import sys
from pathlib import Path

# Add adaptive_ai to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'python'))

from adaptive_ai import IntentPredictor, PatternLearner, AdaptiveCodeGenerator


def test_intent_predictor():
    """Test intent prediction"""
    print("=" * 70)
    print("TEST 1: Intent Predictor")
    print("=" * 70)

    predictor = IntentPredictor()

    test_cases = [
        "I need to clean this CSV file",
        "Call the API to get user data",
        "Write a function to calculate fibonacci"
    ]

    for text in test_cases:
        intent, confidence = predictor.predict(text)
        print(f"✓ '{text}'")
        print(f"  → {intent} ({confidence:.0%})")
    print()


def test_pattern_learner():
    """Test pattern learning"""
    print("=" * 70)
    print("TEST 2: Pattern Learner")
    print("=" * 70)

    learner = PatternLearner()

    # Learn a workflow
    learner.observe_sequence(['data_loading', 'data_processing', 'data_analysis'])
    learner.observe_sequence(['data_loading', 'data_processing', 'data_analysis'])

    # Predict next
    prediction = learner.predict_next_action(
        current_context="working with data",
        recent_actions=['data_loading', 'data_processing']
    )

    print(f"✓ After 'data_loading' → 'data_processing':")
    print(f"  → Next: {prediction['action']} ({prediction['confidence']:.0%})")
    print(f"  → {prediction['reasoning']}")
    print()


def test_code_generator():
    """Test code generation"""
    print("=" * 70)
    print("TEST 3: Code Generator")
    print("=" * 70)

    generator = AdaptiveCodeGenerator()

    code = generator.generate(
        intent='data_processing',
        context={
            'file_path': 'test_data.csv',
            'operations': ['clean']
        }
    )

    print("✓ Generated code for 'data_processing':")
    print()
    # Show first 10 lines
    lines = code.split('\n')[:10]
    for line in lines:
        print(f"  {line}")
    print(f"  ... ({len(code.split(chr(10)))} total lines)")
    print()


if __name__ == "__main__":
    print()
    print("╔════════════════════════════════════════════════════════════════════╗")
    print("║                                                                    ║")
    print("║           JARVIS ADAPTIVE AI - QUICK TEST                         ║")
    print("║                                                                    ║")
    print("╚════════════════════════════════════════════════════════════════════╝")
    print()

    try:
        test_intent_predictor()
        test_pattern_learner()
        test_code_generator()

        print("=" * 70)
        print("✅ ALL TESTS PASSED")
        print("=" * 70)
        print()
        print("Next steps:")
        print("  1. Start Jarvis: npm run dev")
        print("  2. Start Adaptive AI: ./launch-adaptive-ai.sh")
        print("  3. Run full demo: python examples/adaptive_ai/demo.py")
        print()

    except Exception as e:
        print(f"❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
