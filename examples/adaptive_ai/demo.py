#!/usr/bin/env python3
"""
Jarvis Adaptive AI - Proof of Concept Demo

Demonstrates adaptive AI that learns user patterns and predicts intent.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'python'))

from adaptive_ai import AdaptiveEngine, IntentPredictor, PatternLearner, AdaptiveCodeGenerator


async def demo_adaptive_engine():
    """
    Demo 1: Adaptive Engine - Learning from interactions
    """
    print("=" * 70)
    print("DEMO 1: ADAPTIVE ENGINE - Learning User Patterns")
    print("=" * 70)
    print()

    async with AdaptiveEngine() as engine:
        # Simulate user interactions
        print("📝 Simulating user interactions...")
        print()

        interactions = [
            {
                'description': 'Loaded sales_data.csv and cleaned it',
                'action': 'data_processing',
                'user_id': 'demo_user',
                'success': True,
                'context': 'working with sales data'
            },
            {
                'description': 'Processed customer data from CSV',
                'action': 'data_processing',
                'user_id': 'demo_user',
                'success': True,
                'context': 'cleaning customer records'
            },
            {
                'description': 'Cleaned and transformed product data',
                'action': 'data_processing',
                'user_id': 'demo_user',
                'success': True,
                'context': 'working with product catalog'
            },
        ]

        # Observe interactions
        for interaction in interactions:
            await engine.observe_action(interaction)
            print(f"✓ Observed: {interaction['description']}")

        print()
        print("-" * 70)
        print("🔮 Now predicting intent based on learned patterns...")
        print()

        # Test prediction
        test_context = "I have a new CSV file with inventory data"

        prediction = await engine.predict_intent(test_context, 'demo_user')

        print(f"User says: \"{test_context}\"")
        print()
        print(f"Predicted Intent: {prediction['intent']}")
        print(f"Confidence: {prediction['confidence']:.0%}")
        print(f"Recommendation: {prediction['recommendation']}")
        print(f"Explanation: {prediction['explanation']}")
        print()

        # Show statistics
        stats = engine.get_stats()
        print("📊 Learning Statistics:")
        print(f"  - Predictions made: {stats['predictions_made']}")
        print(f"  - Interactions tracked: {stats['interactions_tracked']}")
        print(f"  - Accuracy: {stats['accuracy']:.0%}")


def demo_intent_predictor():
    """
    Demo 2: Intent Predictor - Understanding what user wants
    """
    print()
    print("=" * 70)
    print("DEMO 2: INTENT PREDICTOR - Understanding User Intent")
    print("=" * 70)
    print()

    predictor = IntentPredictor()

    test_cases = [
        "I need to clean this CSV file with messy data",
        "Can you make an API call to fetch user data?",
        "Write a function to calculate fibonacci numbers",
        "I want to test this new feature",
        "Deploy the application to production",
    ]

    for test in test_cases:
        intent, confidence = predictor.predict(test)
        explanation = predictor.explain_prediction(intent, confidence, test)

        print(f"Input: \"{test}\"")
        print(f"  → Intent: {intent} ({confidence:.0%})")
        print(f"  → {explanation}")
        print()


def demo_pattern_learner():
    """
    Demo 3: Pattern Learner - Learning from sequences
    """
    print("=" * 70)
    print("DEMO 3: PATTERN LEARNER - Learning Action Sequences")
    print("=" * 70)
    print()

    learner = PatternLearner()

    # Simulate learning phase
    print("📚 Learning Phase: Observing user workflows...")
    print()

    workflows = [
        ['data_loading', 'data_processing', 'data_analysis', 'reporting'],
        ['data_loading', 'data_processing', 'data_analysis', 'visualization'],
        ['code_generation', 'testing', 'debugging', 'deployment'],
        ['data_loading', 'data_processing', 'data_analysis', 'reporting'],
    ]

    for i, workflow in enumerate(workflows, 1):
        learner.observe_sequence(workflow)
        print(f"  Workflow {i}: {' → '.join(workflow)}")

    print()
    print("-" * 70)
    print("🔮 Prediction Phase: What comes next?")
    print()

    # Test predictions
    test_sequences = [
        ['data_loading', 'data_processing'],
        ['code_generation', 'testing'],
    ]

    for seq in test_sequences:
        prediction = learner.predict_next_action("", seq)

        print(f"Recent actions: {' → '.join(seq)}")
        print(f"  → Predicted next: {prediction['action']} ({prediction['confidence']:.0%})")
        print(f"  → Reasoning: {prediction['reasoning']}")
        print()

    # Show statistics
    stats = learner.get_stats()
    print("📊 Learning Statistics:")
    print(f"  - Sequences learned: {stats['sequences_learned']}")
    print(f"  - Actions observed: {stats['actions_observed']}")
    print(f"  - Total observations: {stats['total_observations']}")


def demo_code_generator():
    """
    Demo 4: Adaptive Code Generator - Generating custom code
    """
    print()
    print("=" * 70)
    print("DEMO 4: CODE GENERATOR - Adaptive Code Generation")
    print("=" * 70)
    print()

    generator = AdaptiveCodeGenerator()

    # Demo: Data processing code
    print("Example 1: Data Processing Pipeline")
    print("-" * 70)

    context = {
        'file_path': 'sales_data.csv',
        'operations': ['clean', 'transform']
    }

    code = generator.generate('data_processing', context)
    print(code)

    print()
    print("Example 2: API Request")
    print("-" * 70)

    context = {
        'url': 'https://api.github.com/users/octocat',
        'method': 'GET',
        'auth': False
    }

    code = generator.generate('api_request', context)
    print(code)


def demo_real_world_scenario():
    """
    Demo 5: Real-world scenario combining all components
    """
    print()
    print("=" * 70)
    print("DEMO 5: REAL-WORLD SCENARIO - Complete Adaptive Workflow")
    print("=" * 70)
    print()

    print("Scenario: User works with data files regularly")
    print()

    # Components
    predictor = IntentPredictor()
    learner = PatternLearner()
    generator = AdaptiveCodeGenerator()

    # User's typical workflow
    print("🎬 Scene 1: AI learns from user's past behavior")
    print("-" * 70)

    past_actions = [
        ('data_loading', 'loaded customer_data.csv', True),
        ('data_processing', 'cleaned nulls and duplicates', True),
        ('data_analysis', 'ran correlation analysis', True),
        ('data_loading', 'loaded sales_data.csv', True),
        ('data_processing', 'processed sales records', True),
        ('data_analysis', 'created summary stats', True),
    ]

    for action, desc, success in past_actions:
        learner.observe(action, desc, success)
        print(f"  ✓ Learned: {desc} ({action})")

    print()
    print("🎬 Scene 2: User starts new task")
    print("-" * 70)

    user_input = "I have a new CSV file with product data that needs cleaning"
    print(f"User: \"{user_input}\"")
    print()

    # Predict intent
    intent, confidence = predictor.predict(user_input)
    print(f"AI Analysis:")
    print(f"  Detected Intent: {intent}")
    print(f"  Confidence: {confidence:.0%}")
    print()

    # Predict next steps based on learned workflow
    recent_actions = ['data_loading']
    next_action = learner.predict_next_action(user_input, recent_actions)

    print(f"Predicted Workflow:")
    print(f"  1. {recent_actions[0]} (current)")
    print(f"  2. {next_action['action']} (predicted next)")
    print(f"     Confidence: {next_action['confidence']:.0%}")
    print()

    # Generate code
    print("🎬 Scene 3: AI generates adapted code")
    print("-" * 70)

    context = {
        'file_path': 'product_data.csv',
        'operations': ['clean', 'transform']
    }

    code = generator.generate(intent, context)
    print("Generated Code:")
    print()
    print(code)


async def main():
    """Run all demos"""
    print()
    print("╔════════════════════════════════════════════════════════════════════╗")
    print("║                                                                    ║")
    print("║        JARVIS ADAPTIVE AI - PROOF OF CONCEPT DEMONSTRATION        ║")
    print("║                                                                    ║")
    print("║  AI that learns your patterns and adapts to your coding style     ║")
    print("║                                                                    ║")
    print("╚════════════════════════════════════════════════════════════════════╝")
    print()

    try:
        # Run demos
        await demo_adaptive_engine()
        demo_intent_predictor()
        demo_pattern_learner()
        demo_code_generator()
        demo_real_world_scenario()

        print()
        print("=" * 70)
        print("✅ DEMONSTRATION COMPLETE")
        print("=" * 70)
        print()
        print("Key Takeaways:")
        print("  1. ✓ AI learns from your interactions")
        print("  2. ✓ Predicts what you want to do next")
        print("  3. ✓ Generates code adapted to your style")
        print("  4. ✓ Improves with more data")
        print()
        print("Next Steps:")
        print("  - Integrate with Jarvis memory layer for persistence")
        print("  - Add ML models for better predictions")
        print("  - Expand code templates")
        print("  - Build UI for feedback loop")
        print()

    except KeyboardInterrupt:
        print("\n\nDemo interrupted by user.")
    except Exception as e:
        print(f"\n\nError during demo: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
