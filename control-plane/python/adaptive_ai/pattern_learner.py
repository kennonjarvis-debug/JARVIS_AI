"""
Pattern Learner - ML-based pattern learning

Learns patterns from user interactions using simple ML.
"""

from typing import Dict, List, Any
from collections import defaultdict, Counter
import json


class PatternLearner:
    """
    Learns patterns from user behavior.
    Uses simple statistical learning (can be upgraded to ML models).
    """

    def __init__(self):
        # Action sequences
        self.sequences: List[List[str]] = []

        # Action contexts (what led to each action)
        self.action_contexts: Dict[str, List[str]] = defaultdict(list)

        # Success rates per action
        self.action_success: Dict[str, Dict[str, int]] = defaultdict(
            lambda: {'success': 0, 'failure': 0}
        )

        # Time-of-day patterns
        self.time_patterns: Dict[str, List[int]] = defaultdict(list)

    def observe(self, action: str, context: str, success: bool = True, hour: int = 12):
        """
        Observe an action and learn from it.

        Args:
            action: Action taken
            context: Context in which action was taken
            success: Whether action was successful
            hour: Hour of day (0-23)
        """
        # Record context
        self.action_contexts[action].append(context)

        # Record success/failure
        if success:
            self.action_success[action]['success'] += 1
        else:
            self.action_success[action]['failure'] += 1

        # Record time pattern
        self.time_patterns[action].append(hour)

    def observe_sequence(self, actions: List[str]):
        """
        Observe a sequence of actions.
        """
        if len(actions) >= 2:
            self.sequences.append(actions)

    def predict_next_action(self, current_context: str, recent_actions: List[str] = None) -> Dict[str, Any]:
        """
        Predict next action based on context and recent actions.

        Returns:
            Dictionary with prediction, confidence, and reasoning
        """
        predictions = []

        # Strategy 1: Sequence-based prediction
        if recent_actions and len(recent_actions) > 0:
            seq_prediction = self.predict_from_sequences(recent_actions)
            if seq_prediction:
                predictions.append(('sequence', seq_prediction, 0.7))

        # Strategy 2: Context-based prediction
        context_prediction = self.predict_from_context(current_context)
        if context_prediction:
            predictions.append(('context', context_prediction, 0.6))

        # Choose best prediction
        if predictions:
            strategy, action, confidence = max(predictions, key=lambda x: x[2])
            return {
                'action': action,
                'confidence': confidence,
                'strategy': strategy,
                'reasoning': self.explain_prediction(strategy, action, confidence)
            }

        return {
            'action': None,
            'confidence': 0.0,
            'strategy': 'none',
            'reasoning': 'Not enough data to make a prediction'
        }

    def predict_from_sequences(self, recent_actions: List[str]) -> str:
        """
        Predict next action based on action sequences.
        """
        # Look for sequences that start with recent actions
        last_action = recent_actions[-1] if recent_actions else None

        if not last_action:
            return None

        # Count what comes after this action in past sequences
        next_actions = []
        for seq in self.sequences:
            for i, action in enumerate(seq[:-1]):
                if action == last_action:
                    next_actions.append(seq[i + 1])

        if next_actions:
            # Return most common next action
            most_common = Counter(next_actions).most_common(1)[0][0]
            return most_common

        return None

    def predict_from_context(self, context: str) -> str:
        """
        Predict action based on similar contexts.
        """
        # Find actions taken in similar contexts
        context_lower = context.lower()

        similar_actions = []
        for action, contexts in self.action_contexts.items():
            for ctx in contexts:
                if self.contexts_similar(context_lower, ctx.lower()):
                    similar_actions.append(action)

        if similar_actions:
            # Return most common action in similar contexts
            most_common = Counter(similar_actions).most_common(1)[0][0]
            return most_common

        return None

    def contexts_similar(self, ctx1: str, ctx2: str, threshold: float = 0.3) -> bool:
        """
        Check if two contexts are similar.
        Simple word overlap method.
        """
        words1 = set(ctx1.split())
        words2 = set(ctx2.split())

        if not words1 or not words2:
            return False

        overlap = len(words1 & words2)
        total = len(words1 | words2)

        similarity = overlap / total if total > 0 else 0
        return similarity >= threshold

    def get_success_rate(self, action: str) -> float:
        """
        Get success rate for an action.
        """
        stats = self.action_success[action]
        total = stats['success'] + stats['failure']

        if total == 0:
            return 0.5  # Unknown

        return stats['success'] / total

    def get_best_time(self, action: str) -> int:
        """
        Get best time of day for an action.
        """
        times = self.time_patterns.get(action, [])

        if not times:
            return 12  # Default to noon

        # Return most common hour
        return Counter(times).most_common(1)[0][0]

    def explain_prediction(self, strategy: str, action: str, confidence: float) -> str:
        """
        Explain why this prediction was made.
        """
        if strategy == 'sequence':
            return f"Based on your typical workflow, you usually do '{action}' next."
        elif strategy == 'context':
            return f"In similar situations, you've done '{action}' before."
        else:
            return "Not enough historical data for a confident prediction."

    def get_stats(self) -> Dict[str, Any]:
        """
        Get learning statistics.
        """
        return {
            'sequences_learned': len(self.sequences),
            'actions_observed': len(self.action_contexts),
            'total_observations': sum(
                len(contexts) for contexts in self.action_contexts.values()
            ),
            'most_common_actions': dict(
                Counter([
                    action
                    for contexts in self.action_contexts.values()
                    for action in contexts
                ]).most_common(5)
            )
        }

    def save(self, filepath: str):
        """Save learned patterns to file."""
        data = {
            'sequences': self.sequences,
            'action_contexts': dict(self.action_contexts),
            'action_success': dict(self.action_success),
            'time_patterns': dict(self.time_patterns)
        }

        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)

    def load(self, filepath: str):
        """Load learned patterns from file."""
        with open(filepath, 'r') as f:
            data = json.load(f)

        self.sequences = data.get('sequences', [])
        self.action_contexts = defaultdict(list, data.get('action_contexts', {}))
        self.action_success = defaultdict(
            lambda: {'success': 0, 'failure': 0},
            data.get('action_success', {})
        )
        self.time_patterns = defaultdict(list, data.get('time_patterns', {}))
