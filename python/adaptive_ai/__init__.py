"""
Jarvis Adaptive AI - Python Package

Adaptive AI that learns user patterns and predicts intent.
Integrates with Jarvis memory layer for semantic understanding.
"""

from .adaptive_engine import AdaptiveEngine
from .intent_predictor import IntentPredictor
from .pattern_learner import PatternLearner
from .code_generator import AdaptiveCodeGenerator

__version__ = "1.0.0"
__all__ = [
    "AdaptiveEngine",
    "IntentPredictor",
    "PatternLearner",
    "AdaptiveCodeGenerator"
]
