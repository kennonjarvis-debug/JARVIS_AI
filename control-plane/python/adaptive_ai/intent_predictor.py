"""
Intent Predictor - Specialized intent classification

Predicts user intent from natural language input.
"""

from typing import Dict, List, Optional, Tuple
import re


class IntentPredictor:
    """
    Predicts user intent from context and input.
    Uses pattern matching and learned behaviors.
    """

    def __init__(self):
        # Intent patterns (regex -> intent mapping)
        self.intent_patterns = {
            # Data processing intents
            r'(?i)(clean|process|transform|parse).{0,20}(data|csv|json|file)': 'data_processing',
            r'(?i)(load|read|import).{0,20}(data|file|csv|json)': 'data_loading',
            r'(?i)(analyze|visualize|plot|graph)': 'data_analysis',

            # API/Network intents
            r'(?i)(call|request|fetch|get).{0,20}(api|endpoint|url)': 'api_request',
            r'(?i)(post|send|submit).{0,20}(to|data|api)': 'api_post',

            # File operations
            r'(?i)(create|write|save).{0,20}(file|document)': 'file_creation',
            r'(?i)(delete|remove).{0,20}(file|folder)': 'file_deletion',
            r'(?i)(move|copy).{0,20}(file|folder)': 'file_manipulation',

            # Code generation
            r'(?i)(write|create|generate).{0,20}(function|class|code)': 'code_generation',
            r'(?i)(fix|debug|solve).{0,20}(bug|error|issue)': 'debugging',
            r'(?i)(refactor|optimize|improve)': 'code_optimization',

            # Testing
            r'(?i)(test|unit test|integration test)': 'testing',
            r'(?i)(validate|verify|check)': 'validation',

            # Deployment
            r'(?i)(deploy|release|publish)': 'deployment',
            r'(?i)(build|compile|package)': 'build',

            # Documentation
            r'(?i)(document|explain|comment)': 'documentation',
            r'(?i)(help|guide|tutorial)': 'help_request',
        }

        # Intent confidence boosters (words that increase confidence)
        self.confidence_boosters = {
            'data_processing': ['pandas', 'numpy', 'clean', 'transform'],
            'api_request': ['requests', 'http', 'fetch', 'endpoint'],
            'code_generation': ['function', 'class', 'method', 'implement'],
            'testing': ['pytest', 'unittest', 'test', 'assert'],
        }

    def predict(self, text: str, context: Optional[Dict] = None) -> Tuple[str, float]:
        """
        Predict intent from text.

        Args:
            text: User input text
            context: Optional context (recent actions, environment, etc.)

        Returns:
            Tuple of (intent, confidence)
        """
        # Try pattern matching first
        matched_intent, base_confidence = self.match_patterns(text)

        if matched_intent:
            # Boost confidence based on context
            boosted_confidence = self.boost_confidence(
                matched_intent,
                text,
                base_confidence,
                context
            )
            return matched_intent, boosted_confidence

        # Fallback: unknown intent
        return 'unknown', 0.0

    def match_patterns(self, text: str) -> Tuple[Optional[str], float]:
        """
        Match text against intent patterns.
        """
        for pattern, intent in self.intent_patterns.items():
            if re.search(pattern, text):
                # Base confidence for pattern match
                return intent, 0.6

        return None, 0.0

    def boost_confidence(
        self,
        intent: str,
        text: str,
        base_confidence: float,
        context: Optional[Dict]
    ) -> float:
        """
        Boost confidence based on additional signals.
        """
        confidence = base_confidence

        # Check for confidence booster keywords
        if intent in self.confidence_boosters:
            keywords = self.confidence_boosters[intent]
            text_lower = text.lower()

            matches = sum(1 for keyword in keywords if keyword in text_lower)
            confidence += min(matches * 0.1, 0.3)

        # Boost based on context (e.g., recent similar actions)
        if context:
            recent_actions = context.get('recent_actions', [])
            if intent in recent_actions:
                confidence += 0.1

        # Cap confidence at 1.0
        return min(confidence, 1.0)

    def predict_next_action(self, action_sequence: List[str]) -> Tuple[str, float]:
        """
        Predict next action given a sequence of recent actions.
        Uses common workflow patterns.
        """
        if not action_sequence:
            return 'unknown', 0.0

        # Common action sequences
        sequences = {
            ('data_loading', 'data_processing'): ('data_analysis', 0.8),
            ('data_analysis', 'data_visualization'): ('reporting', 0.7),
            ('code_generation', 'testing'): ('debugging', 0.6),
            ('debugging', 'testing'): ('deployment', 0.7),
            ('api_request', 'api_request'): ('api_request', 0.5),  # Batch requests
        }

        # Check last 2 actions
        if len(action_sequence) >= 2:
            last_two = tuple(action_sequence[-2:])
            if last_two in sequences:
                return sequences[last_two]

        # Check last action for simple continuation
        last_action = action_sequence[-1]

        # Simple continuations
        continuations = {
            'data_loading': ('data_processing', 0.6),
            'code_generation': ('testing', 0.5),
            'testing': ('debugging', 0.4),
        }

        if last_action in continuations:
            return continuations[last_action]

        return 'unknown', 0.0

    def explain_prediction(self, intent: str, confidence: float, text: str) -> str:
        """
        Generate human-readable explanation of prediction.
        """
        explanations = {
            'data_processing': "You're working with data - I can help clean, transform, or process it.",
            'api_request': "You want to make an API call - I'll help with the request.",
            'code_generation': "You need code written - I'll generate it for you.",
            'testing': "You want to test something - I'll help create tests.",
            'debugging': "You're fixing a bug - I'll help debug it.",
            'file_manipulation': "You're working with files - I'll help manage them.",
        }

        explanation = explanations.get(intent, f"Detected intent: {intent}")

        if confidence >= 0.8:
            return f"HIGH CONFIDENCE: {explanation}"
        elif confidence >= 0.5:
            return f"LIKELY: {explanation}"
        else:
            return f"POSSIBLE: {explanation}"
