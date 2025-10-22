"""
Adaptive Engine - Core adaptive AI system

Learns from user interactions and adapts behavior in real-time.
"""

import asyncio
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
from collections import Counter, deque
import aiohttp


class AdaptiveEngine:
    """
    Main adaptive AI engine that learns user patterns
    and predicts intent based on context and history.
    """

    def __init__(self, jarvis_url: str = "http://localhost:4000", api_key: str = "test-token"):
        self.jarvis_url = jarvis_url
        self.api_key = api_key
        self.session: Optional[aiohttp.ClientSession] = None

        # Recent action buffer for sequence detection
        self.action_buffer = deque(maxlen=20)

        # Pattern cache
        self.pattern_cache: Dict[str, Any] = {}
        self.cache_ttl = 300  # 5 minutes

        # Learning statistics
        self.stats = {
            'predictions_made': 0,
            'predictions_correct': 0,
            'patterns_learned': 0,
            'interactions_tracked': 0
        }

    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession(
            headers={'Authorization': f'Bearer {self.api_key}'}
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()

    async def predict_intent(self, context: str, user_id: str = "default") -> Dict[str, Any]:
        """
        Predict user intent based on context and historical patterns.

        Args:
            context: Current user input/context
            user_id: User identifier for personalization

        Returns:
            Dictionary with predicted intent, confidence, and suggestions
        """

        # Check cache first
        cache_key = f"{user_id}:{context[:50]}"
        if cache_key in self.pattern_cache:
            cached = self.pattern_cache[cache_key]
            if (datetime.now() - cached['timestamp']).seconds < self.cache_ttl:
                return cached['prediction']

        # Recall similar past interactions
        memories = await self.recall_memories(context, user_id)

        # Analyze patterns in memories
        patterns = self.analyze_patterns(memories)

        # Predict next action
        prediction = self.generate_prediction(context, patterns)

        # Cache the prediction
        self.pattern_cache[cache_key] = {
            'prediction': prediction,
            'timestamp': datetime.now()
        }

        self.stats['predictions_made'] += 1

        return prediction

    async def recall_memories(self, query: str, user_id: str, limit: int = 20) -> List[Dict]:
        """
        Retrieve similar past interactions from Jarvis memory layer.
        """
        if not self.session:
            self.session = aiohttp.ClientSession(
                headers={'Authorization': f'Bearer {self.api_key}'}
            )

        try:
            async with self.session.post(
                f'{self.jarvis_url}/api/v1/memory/recall',
                json={
                    'query': query,
                    'limit': limit,
                    'filter': {
                        'type': 'task',
                        'userId': user_id
                    }
                }
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get('results', [])
                elif response.status == 503:
                    # Memory layer not initialized, return empty
                    return []
                else:
                    print(f"Warning: Memory recall failed with status {response.status}")
                    return []
        except Exception as e:
            print(f"Error recalling memories: {e}")
            return []

    def analyze_patterns(self, memories: List[Dict]) -> Dict[str, Any]:
        """
        Analyze patterns in user's historical interactions.
        """
        if not memories:
            return {
                'actions': Counter(),
                'sequences': [],
                'confidence': 0.0,
                'total_samples': 0
            }

        # Extract actions from memories
        actions = []
        contexts = []
        timestamps = []

        for memory in memories:
            metadata = memory.get('metadata', {})
            actions.append(metadata.get('action', 'unknown'))
            contexts.append(memory.get('content', ''))
            timestamps.append(metadata.get('timestamp', ''))

        # Count action frequencies
        action_counts = Counter(actions)

        # Detect sequences (if we have enough data)
        sequences = self.detect_sequences(actions) if len(actions) >= 3 else []

        # Calculate pattern strength
        most_common = action_counts.most_common(1)
        confidence = most_common[0][1] / len(actions) if most_common else 0.0

        return {
            'actions': action_counts,
            'sequences': sequences,
            'confidence': confidence,
            'total_samples': len(memories),
            'most_common_action': most_common[0][0] if most_common else None,
            'contexts': contexts[:5]  # Sample contexts
        }

    def detect_sequences(self, actions: List[str], min_length: int = 2) -> List[List[str]]:
        """
        Detect common action sequences (e.g., always does A then B).
        """
        sequences = []

        # Look for 2-action sequences
        for i in range(len(actions) - 1):
            seq = [actions[i], actions[i + 1]]
            sequences.append(seq)

        # Count sequence frequencies
        seq_counter = Counter([tuple(s) for s in sequences])

        # Return sequences that appear more than once
        common_sequences = [
            list(seq) for seq, count in seq_counter.items()
            if count > 1
        ]

        return common_sequences

    def generate_prediction(self, context: str, patterns: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate intent prediction based on patterns.
        """
        confidence = patterns['confidence']
        action = patterns.get('most_common_action')

        # Determine prediction quality
        if confidence >= 0.7:
            recommendation = 'auto_execute'
        elif confidence >= 0.4:
            recommendation = 'suggest'
        else:
            recommendation = 'ask_user'

        # Generate explanation
        total = patterns['total_samples']
        explanation = self.generate_explanation(action, confidence, total)

        return {
            'intent': action or 'unknown',
            'confidence': round(confidence, 2),
            'recommendation': recommendation,
            'explanation': explanation,
            'patterns': {
                'action_distribution': dict(patterns['actions'].most_common(5)),
                'sequences': patterns['sequences'][:3],
                'total_samples': total
            },
            'sample_contexts': patterns.get('contexts', [])
        }

    def generate_explanation(self, action: Optional[str], confidence: float, samples: int) -> str:
        """
        Generate human-readable explanation of prediction.
        """
        if not action or samples == 0:
            return "No patterns detected yet. I'm still learning your preferences."

        percentage = int(confidence * 100)

        if confidence >= 0.8:
            return f"You almost always do '{action}' in this situation ({percentage}% of {samples} times)."
        elif confidence >= 0.5:
            return f"You often do '{action}' here ({percentage}% of {samples} times)."
        else:
            return f"You sometimes do '{action}', but I need more data to be certain ({samples} samples)."

    async def observe_action(self, action: Dict[str, Any]) -> None:
        """
        Observe and learn from user action.
        """
        # Add to action buffer
        self.action_buffer.append(action)

        # Store in Jarvis memory
        if self.session:
            try:
                await self.session.post(
                    f'{self.jarvis_url}/api/v1/memory/remember',
                    json={
                        'content': action.get('description', str(action)),
                        'metadata': {
                            'type': 'task',
                            'action': action.get('action', 'unknown'),
                            'userId': action.get('user_id', 'default'),
                            'success': action.get('success', True),
                            'context': action.get('context', '')
                        }
                    }
                )
                self.stats['interactions_tracked'] += 1
            except Exception as e:
                print(f"Error storing action: {e}")

    async def provide_feedback(self, prediction_id: str, was_correct: bool) -> None:
        """
        Learn from feedback on predictions.
        """
        if was_correct:
            self.stats['predictions_correct'] += 1

        # Update model based on feedback
        # (This is where you'd update ML model weights in production)

    def get_stats(self) -> Dict[str, Any]:
        """
        Get learning statistics.
        """
        accuracy = 0.0
        if self.stats['predictions_made'] > 0:
            accuracy = self.stats['predictions_correct'] / self.stats['predictions_made']

        return {
            **self.stats,
            'accuracy': round(accuracy, 2),
            'cache_size': len(self.pattern_cache),
            'buffer_size': len(self.action_buffer)
        }

    def clear_cache(self) -> None:
        """Clear pattern cache."""
        self.pattern_cache.clear()
