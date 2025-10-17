# JARVIS - AI DAW Control Agent
## Staged Implementation Prompts (Stage 0-n)

---

## OVERVIEW

**Purpose**: Jarvis is an autonomous AI agent designed to control and operate your AI DAW through natural language commands, visual understanding, and programmatic control.

**Core Capabilities**:
- Natural language understanding for music production tasks
- Visual UI understanding using vision-language models
- API/programmatic control of DAW functions
- Multi-step task planning and execution
- Session memory and user preference learning
- Audio understanding and processing knowledge

**Architecture Stack**:
- LLM: GPT-4/Claude/Gemini for reasoning and planning
- Vision-Language Model: ScreenAI/GPT-4V for UI understanding
- Framework: LangGraph for agent orchestration
- Memory: Redis (short-term) + Vector DB (long-term/semantic)
- Control Layer: API integration + Computer Use capability
- Audio Knowledge: RAG system with music production knowledge base

---

## STAGE 0: Foundation & Environment Setup

**Objective**: Set up the development environment and understand the AI DAW architecture.

### Prompt:

```
You are building JARVIS, an AI agent that will control an AI DAW (Digital Audio Workstation) being built in parallel.

STAGE 0 TASKS:

1. ENVIRONMENT SETUP
   - Set up Python 3.10+ development environment
   - Install core dependencies: langchain, langgraph, openai/anthropic SDK
   - Set up virtual environment and project structure
   - Create git repository for Jarvis project

2. PROJECT ARCHITECTURE
   Create the following directory structure:
   ```
   jarvis-ai-daw-agent/
   ├── src/
   │   ├── core/           # Core agent logic
   │   ├── vision/         # UI understanding module
   │   ├── memory/         # Memory management
   │   ├── tools/          # Tool definitions
   │   ├── controllers/    # DAW control interfaces
   │   └── knowledge/      # Music production knowledge base
   ├── config/             # Configuration files
   ├── tests/              # Unit and integration tests
   ├── docs/               # Documentation
   └── examples/           # Example usage scripts
   ```

3. DEPENDENCIES MANIFEST
   Create requirements.txt with:
   - langchain>=0.1.0
   - langgraph>=0.0.40
   - openai>=1.0.0
   - anthropic>=0.18.0
   - redis>=5.0.0
   - chromadb>=0.4.0 (or pinecone-client)
   - pillow>=10.0.0 (for image processing)
   - python-dotenv>=1.0.0
   - pydantic>=2.0.0
   - fastapi>=0.100.0 (for API server)

4. CONFIGURATION SYSTEM
   Create config/settings.py:
   - API keys management (OpenAI, Anthropic, etc.)
   - Model selection (GPT-4, Claude-3.5, etc.)
   - Memory backend configuration
   - DAW connection settings (placeholder for now)
   - Logging configuration

5. BASIC AGENT SKELETON
   Create src/core/agent.py with:
   - JarvisAgent class
   - Basic initialization
   - Placeholder methods for: process_command(), understand_screen(), execute_action()

DELIVERABLES:
- Fully set up development environment
- Project structure created
- Dependencies installed
- Basic agent skeleton code
- Configuration system in place
- README.md with setup instructions

SUCCESS CRITERIA:
- `python src/core/agent.py` runs without errors
- All imports resolve correctly
- Configuration loads from .env file
- Git repository initialized with .gitignore
```

---

## STAGE 1: Core Agent with LLM Reasoning

**Objective**: Build the core reasoning engine using LangGraph and LLM.

### Prompt:

```
STAGE 1: Build the core reasoning engine for Jarvis using LangGraph.

CONTEXT:
You have completed Stage 0 and have a basic project structure. Now build the agent's reasoning capability.

TASKS:

1. LANGGRAPH AGENT SETUP
   In src/core/agent.py, implement:
   - Define agent state schema using TypedDict
   - Create agent graph with nodes: [reasoning, planning, tool_selection, execution]
   - Implement ReAct pattern (Reasoning + Acting)
   - Add conditional edges for decision flow

2. STATE MANAGEMENT
   Define AgentState with fields:
   ```python
   class AgentState(TypedDict):
       messages: List[BaseMessage]
       user_intent: str
       current_task: Optional[str]
       plan: List[str]
       tool_calls: List[Dict]
       observations: List[str]
       daw_state: Dict  # Current state of the DAW
       session_id: str
   ```

3. REASONING NODE
   Implement reasoning logic:
   - Parse user natural language commands
   - Understand music production intent (e.g., "add reverb to vocal track")
   - Break down complex requests into subtasks
   - Use chain-of-thought prompting for multi-step reasoning

4. PLANNING NODE
   Implement task planning:
   - Generate step-by-step execution plan
   - Consider dependencies between steps
   - Validate plan feasibility
   - Return structured plan as list of actions

5. TOOL SELECTION NODE
   Create tool selection logic:
   - Map planned actions to available tools
   - Choose between: API calls, UI automation, or hybrid approach
   - Handle tool unavailability with fallback strategies

6. LLM PROMPT TEMPLATES
   Create src/core/prompts.py with:

   ```python
   SYSTEM_PROMPT = """
   You are JARVIS, an expert AI assistant for music production and DAW operation.

   Your capabilities:
   - Control all aspects of a professional DAW
   - Understand music theory and production techniques
   - Execute multi-step production workflows
   - Learn user preferences over time

   When given a command:
   1. Understand the musical intent
   2. Break it down into executable steps
   3. Generate a detailed plan
   4. Execute using available tools

   Always explain your reasoning and ask for clarification when needed.
   """

   REASONING_PROMPT = """
   User Command: {user_command}
   Current DAW State: {daw_state}

   Analyze this command and:
   1. Identify the user's intent
   2. List what information you need
   3. Determine if this is a single action or multi-step workflow
   4. Consider any potential issues or ambiguities

   Output your reasoning in JSON format.
   """

   PLANNING_PROMPT = """
   Intent: {intent}
   DAW State: {daw_state}
   Available Tools: {tools}

   Create a detailed execution plan:
   1. List each step in order
   2. Specify which tool to use for each step
   3. Identify any parameters needed
   4. Note dependencies between steps

   Return as structured JSON plan.
   """
   ```

7. BASIC CLI INTERFACE
   Create src/cli.py:
   - Simple command-line interface for testing
   - Accept text commands
   - Display agent's reasoning and plan
   - Show execution results

8. TESTING
   Create tests/test_reasoning.py:
   - Test parsing simple commands
   - Test multi-step planning
   - Test tool selection logic
   - Mock LLM responses for consistent testing

EXAMPLE COMMANDS TO SUPPORT:
- "Create a new track"
- "Add a kick drum on beat 1 of every bar"
- "Apply compression to the vocal track"
- "Set the tempo to 120 BPM"
- "Create a 4-bar drum loop with kick, snare, and hi-hat"

DELIVERABLES:
- Fully functional LangGraph agent
- State management system
- Reasoning and planning capabilities
- Prompt templates
- CLI interface for testing
- Unit tests

SUCCESS CRITERIA:
- Agent can parse and understand music production commands
- Agent generates logical step-by-step plans
- Agent correctly selects tools (even if tools are mocks)
- All tests pass
- CLI interface works and displays agent reasoning
```

---

## STAGE 2: Vision-Language Model Integration

**Objective**: Add visual understanding capability so Jarvis can "see" and understand the DAW UI.

### Prompt:

```
STAGE 2: Integrate vision-language model for UI understanding.

CONTEXT:
Your agent can now reason and plan. Add visual understanding so it can interpret the DAW's UI.

TASKS:

1. SCREENSHOT CAPTURE
   Create src/vision/capture.py:
   - Cross-platform screenshot capability (macOS, Windows, Linux)
   - Region-specific capture (for focused UI elements)
   - Screenshot timing and buffering
   - Handle multi-monitor setups

2. VISION-LANGUAGE MODEL INTEGRATION
   Create src/vision/ui_understanding.py:
   - Integrate GPT-4V, Claude-3.5-Sonnet, or Gemini Pro Vision
   - Send screenshots with prompts to VLM
   - Parse VLM responses for UI element locations
   - Cache UI understanding to reduce API calls

3. UI ELEMENT DETECTION
   Implement methods:
   ```python
   class UIUnderstanding:
       def detect_elements(self, screenshot) -> List[UIElement]:
           """Detect buttons, sliders, tracks, etc."""

       def locate_element(self, screenshot, element_name: str) -> Tuple[int, int]:
           """Find specific UI element by name/description"""

       def read_text(self, screenshot) -> Dict[str, str]:
           """Extract text from UI (track names, parameter values)"""

       def understand_context(self, screenshot) -> Dict:
           """Understand current DAW state from UI"""
   ```

4. VISION PROMPTS
   Create src/vision/prompts.py:

   ```python
   UI_ANALYSIS_PROMPT = """
   Analyze this DAW interface screenshot.

   Identify:
   1. Visible tracks and their names
   2. Transport controls (play, stop, record)
   3. Current playhead position
   4. Selected track/region
   5. Visible plugins/effects
   6. Mixer view elements

   Return structured JSON with element types, positions, and states.
   """

   ELEMENT_LOCATION_PROMPT = """
   Find the {element_type} named "{element_name}" in this screenshot.

   Return the center coordinates (x, y) and bounding box.
   If not visible, return null and suggest how to navigate to it.
   """

   STATE_UNDERSTANDING_PROMPT = """
   What is the current state of this DAW?

   Report:
   - Is it playing, stopped, or recording?
   - How many tracks are visible?
   - What is the current time position?
   - Are any tracks selected?
   - What plugins are visible?

   Return as structured JSON.
   """
   ```

5. MOUSE/KEYBOARD CONTROL
   Create src/controllers/input_controller.py:
   - Cross-platform mouse control (pyautogui or similar)
   - Keyboard input simulation
   - Safe click detection (confirm element before clicking)
   - Smooth mouse movement to avoid detection
   - Keyboard shortcuts mapping

6. VISUAL FEEDBACK LOOP
   Integrate vision into agent workflow:
   - Take screenshot before action
   - Understand current state
   - Execute action
   - Take screenshot after action
   - Verify action succeeded
   - Retry if needed

7. VISION-GUIDED ACTIONS
   Create src/controllers/vision_controller.py:
   ```python
   class VisionController:
       def click_element(self, element_name: str):
           """Find element visually and click it"""

       def drag_slider(self, slider_name: str, target_value: float):
           """Visually locate and drag a slider"""

       def type_in_field(self, field_name: str, text: str):
           """Click field and type text"""

       def verify_state(self, expected_state: Dict) -> bool:
           """Verify DAW state matches expectation"""
   ```

8. INTEGRATION WITH AGENT
   Update agent.py:
   - Add vision node to LangGraph
   - Vision node captures and analyzes UI before/after actions
   - Use vision observations in reasoning
   - Fall back to vision if API control fails

9. TESTING
   Create tests/test_vision.py:
   - Mock screenshot responses
   - Test UI element detection
   - Test coordinate calculation
   - Test action verification

EXAMPLE USE CASES:
- "Show me what tracks are currently in the project"
- "Click the record button"
- "Set the master volume to -6dB"
- "Tell me if the track is currently muted"
- "Find and click the 'Add Track' button"

DELIVERABLES:
- Screenshot capture system
- VLM integration
- UI understanding capabilities
- Mouse/keyboard control
- Vision-guided action execution
- Integration with main agent
- Tests for vision system

SUCCESS CRITERIA:
- Can capture DAW screenshots
- Can identify UI elements accurately
- Can locate elements by name/description
- Can execute mouse/keyboard actions on UI
- Can verify actions succeeded visually
- Vision integrates seamlessly with agent reasoning
```

---

## STAGE 3: DAW API & Tool Integration

**Objective**: Create programmatic control interfaces for the DAW (API-based when available).

### Prompt:

```
STAGE 3: Implement programmatic DAW control through APIs and tools.

CONTEXT:
You have reasoning and vision capabilities. Now add direct API control for faster, more reliable operations.

TASKS:

1. DAW API CLIENT
   Create src/controllers/daw_api.py:
   - Define abstract base class DAWController
   - Implement connection management
   - Handle authentication if needed
   - Support both REST API and WebSocket connections
   - Implement error handling and retries

2. CORE DAW OPERATIONS
   Implement these methods in DAWController:

   ```python
   class DAWController:
       # Project Management
       def create_project(self, name: str, template: Optional[str]) -> str
       def save_project(self, path: str) -> bool
       def load_project(self, path: str) -> bool

       # Track Management
       def create_track(self, name: str, track_type: str) -> str
       def delete_track(self, track_id: str) -> bool
       def rename_track(self, track_id: str, name: str) -> bool
       def get_all_tracks(self) -> List[Track]
       def get_track_info(self, track_id: str) -> Track

       # Transport Control
       def play(self) -> bool
       def stop(self) -> bool
       def record(self) -> bool
       def set_tempo(self, bpm: float) -> bool
       def set_playhead(self, position: float) -> bool
       def get_playhead_position(self) -> float

       # Audio Regions/Clips
       def create_region(self, track_id: str, start: float, duration: float) -> str
       def delete_region(self, region_id: str) -> bool
       def move_region(self, region_id: str, new_start: float) -> bool

       # Mixing
       def set_track_volume(self, track_id: str, volume_db: float) -> bool
       def set_track_pan(self, track_id: str, pan: float) -> bool
       def mute_track(self, track_id: str, muted: bool) -> bool
       def solo_track(self, track_id: str, soloed: bool) -> bool

       # Effects/Plugins
       def add_plugin(self, track_id: str, plugin_name: str) -> str
       def remove_plugin(self, plugin_id: str) -> bool
       def set_plugin_parameter(self, plugin_id: str, param: str, value: float) -> bool

       # State Queries
       def get_project_state(self) -> ProjectState
       def get_transport_state(self) -> TransportState
   ```

3. DATA MODELS
   Create src/models/daw_models.py:
   ```python
   from pydantic import BaseModel
   from typing import List, Optional

   class Track(BaseModel):
       id: str
       name: str
       type: str  # audio, midi, instrument
       volume_db: float
       pan: float
       muted: bool
       soloed: bool
       plugins: List[str]

   class Region(BaseModel):
       id: str
       track_id: str
       start_time: float
       duration: float
       name: Optional[str]

   class ProjectState(BaseModel):
       tracks: List[Track]
       regions: List[Region]
       tempo: float
       time_signature: str
       playhead_position: float

   class TransportState(BaseModel):
       is_playing: bool
       is_recording: bool
       playhead_position: float
       loop_enabled: bool
       loop_start: float
       loop_end: float
   ```

4. LANGCHAIN TOOLS
   Create src/tools/daw_tools.py:
   - Wrap each DAW operation as a LangChain Tool
   - Define clear descriptions for each tool
   - Specify input schemas
   - Handle tool execution errors gracefully

   Example:
   ```python
   from langchain.tools import Tool

   create_track_tool = Tool(
       name="create_track",
       description="Create a new track in the DAW. Specify track name and type (audio/midi/instrument).",
       func=lambda name, track_type: daw_controller.create_track(name, track_type),
       args_schema=CreateTrackSchema
   )
   ```

5. TOOL REGISTRY
   Create src/tools/registry.py:
   - Centralized tool registry
   - Dynamic tool loading
   - Tool categorization (transport, tracks, mixing, effects)
   - Tool availability checking
   - Tool documentation generation

6. HYBRID CONTROL STRATEGY
   Create src/controllers/hybrid_controller.py:
   ```python
   class HybridController:
       def __init__(self, api_controller, vision_controller):
           self.api = api_controller
           self.vision = vision_controller

       def execute_action(self, action: Action) -> Result:
           """
           Try API first, fall back to vision if API unavailable.
           Use vision to verify API actions succeeded.
           """
           if self.is_api_available(action):
               result = self.api.execute(action)
               if self.verify_with_vision:
                   verified = self.vision.verify_state(expected_state)
                   if not verified:
                       return self.vision.execute(action)  # Fallback
               return result
           else:
               return self.vision.execute(action)
   ```

7. TOOL INTEGRATION WITH AGENT
   Update src/core/agent.py:
   - Register all DAW tools with agent
   - Add tool execution node to LangGraph
   - Implement tool result processing
   - Add tool error handling and retry logic

8. STATE SYNCHRONIZATION
   Create src/core/state_sync.py:
   - Poll DAW state periodically
   - Update agent state with DAW state
   - Detect external changes (user manual edits)
   - Maintain consistency between agent and DAW

9. MOCK DAW FOR TESTING
   Create tests/mock_daw.py:
   - Implement mock DAW with all API methods
   - Simulate DAW state changes
   - Useful for testing without real DAW

10. API DOCUMENTATION
    Create docs/api_reference.md:
    - Document all available tools
    - Provide examples for each tool
    - Explain when to use API vs vision control

EXAMPLE WORKFLOWS:
- "Create an audio track called 'Lead Vocal'"
- "Set the tempo to 128 BPM and start recording"
- "Add a compressor to the drum bus and set the threshold to -20dB"
- "Mute all tracks except drums and bass"
- "Create a 4-bar MIDI region on the piano track"

DELIVERABLES:
- DAW API client with all core operations
- Pydantic data models
- LangChain tool definitions
- Tool registry system
- Hybrid control strategy
- Mock DAW for testing
- Updated agent with tool execution
- API documentation

SUCCESS CRITERIA:
- All DAW operations work via API
- Tools are properly registered with agent
- Agent can execute API-based actions
- Hybrid fallback works correctly
- Mock DAW passes all tests
- API is well-documented
```

---

## STAGE 4: Memory & Context Management

**Objective**: Implement short-term and long-term memory for session persistence and learning.

### Prompt:

```
STAGE 4: Implement comprehensive memory system for Jarvis.

CONTEXT:
Your agent can reason, see, and control the DAW. Now add memory so it can remember sessions, learn preferences, and maintain context.

TASKS:

1. SHORT-TERM MEMORY (Redis)
   Create src/memory/short_term.py:
   - Use Redis for conversation history
   - Store current session state
   - Implement LangGraph checkpointer
   - Support session resume/restore

   ```python
   class ShortTermMemory:
       def __init__(self, redis_client):
           self.redis = redis_client

       def save_message(self, session_id: str, message: BaseMessage):
           """Save message to conversation history"""

       def get_history(self, session_id: str, last_n: int = 10) -> List[BaseMessage]:
           """Retrieve recent conversation history"""

       def save_state(self, session_id: str, state: AgentState):
           """Save current agent state (checkpoint)"""

       def load_state(self, session_id: str) -> Optional[AgentState]:
           """Load saved state to resume session"""

       def clear_session(self, session_id: str):
           """Clear session data"""
   ```

2. LONG-TERM MEMORY (Vector Database)
   Create src/memory/long_term.py:
   - Use ChromaDB/Pinecone for semantic memory
   - Store user preferences and patterns
   - Remember project-specific context
   - Store successful workflows for reuse

   ```python
   class LongTermMemory:
       def __init__(self, vector_db):
           self.db = vector_db

       def store_interaction(self, session_id: str, interaction: Dict):
           """Store interaction with embeddings"""

       def recall_similar(self, query: str, top_k: int = 5) -> List[Dict]:
           """Retrieve similar past interactions"""

       def store_preference(self, user_id: str, preference: UserPreference):
           """Store user preference"""

       def get_preferences(self, user_id: str) -> List[UserPreference]:
           """Retrieve user preferences"""

       def store_workflow(self, workflow_name: str, steps: List[str]):
           """Store successful workflow for reuse"""

       def find_workflow(self, query: str) -> Optional[List[str]]:
           """Find relevant workflow from past"""
   ```

3. SEMANTIC MEMORY SCHEMAS
   Create src/models/memory_models.py:
   ```python
   class UserPreference(BaseModel):
       user_id: str
       preference_type: str  # mixing_style, plugin_choice, workflow_pattern
       value: Any
       confidence: float  # Learned confidence
       timestamp: datetime

   class WorkflowMemory(BaseModel):
       name: str
       description: str
       steps: List[Action]
       success_count: int
       last_used: datetime
       tags: List[str]

   class ProjectContext(BaseModel):
       project_id: str
       genre: Optional[str]
       tempo_range: Tuple[float, float]
       typical_track_count: int
       common_plugins: List[str]
       mixing_preferences: Dict[str, Any]
   ```

4. CONTEXT MANAGEMENT
   Create src/memory/context_manager.py:
   - Handle context window limitations
   - Implement context compression strategies
   - Prioritize recent and relevant information
   - Summarize older context

   ```python
   class ContextManager:
       def __init__(self, max_tokens: int = 4000):
           self.max_tokens = max_tokens

       def compress_context(self, messages: List[BaseMessage]) -> List[BaseMessage]:
           """Compress context to fit within token limit"""

       def prioritize_messages(self, messages: List[BaseMessage]) -> List[BaseMessage]:
           """Keep most relevant messages"""

       def summarize_old_context(self, messages: List[BaseMessage]) -> str:
           """Summarize older messages into a single context message"""
   ```

5. LEARNING SYSTEM
   Create src/memory/learning.py:
   - Track successful actions
   - Learn user preferences from behavior
   - Identify patterns in workflows
   - Improve tool selection over time

   ```python
   class LearningSystem:
       def observe_action(self, action: Action, result: Result, feedback: Optional[str]):
           """Learn from action outcomes"""

       def update_preferences(self, user_id: str, session_data: Dict):
           """Extract and update preferences from session"""

       def suggest_workflow(self, intent: str) -> Optional[List[Action]]:
           """Suggest workflow based on past success"""

       def improve_tool_selection(self, context: Dict) -> List[Tool]:
           """Prioritize tools based on past success"""
   ```

6. MEMORY INTEGRATION WITH AGENT
   Update src/core/agent.py:
   - Add memory nodes to LangGraph
   - Query long-term memory before planning
   - Save interactions after execution
   - Use context manager for message history
   - Implement checkpointing for resume capability

7. CONVERSATION MEMORY
   Create src/memory/conversation.py:
   - Track multi-turn conversations
   - Maintain coreference resolution (understand "it", "that", etc.)
   - Remember user corrections and adjustments
   - Build session narrative

8. MEMORY RETRIEVAL STRATEGIES
   Implement retrieval methods:
   - Recency: Recent interactions
   - Relevance: Semantically similar
   - Importance: User-marked important actions
   - Frequency: Often-used workflows
   - Hybrid: Combine multiple strategies

9. PRIVACY & DATA MANAGEMENT
   Create src/memory/privacy.py:
   - User data export
   - Memory deletion
   - Data retention policies
   - Anonymization options

10. TESTING
    Create tests/test_memory.py:
    - Test short-term memory persistence
    - Test long-term memory retrieval
    - Test context compression
    - Test learning system
    - Test session resume

EXAMPLE SCENARIOS:
- "Use the same mixing chain I used on the last vocal track"
- "Remember I like to compress drums at 4:1 ratio"
- Resume session: "Continue where we left off"
- "What did we do in the last session?"
- "Apply the workflow we used for the chorus to this verse"

DELIVERABLES:
- Redis-based short-term memory
- Vector DB-based long-term memory
- Context management system
- Learning system for preferences
- Memory retrieval strategies
- Privacy and data management
- Full integration with agent
- Memory system tests

SUCCESS CRITERIA:
- Sessions can be saved and resumed
- Agent remembers user preferences
- Agent can recall similar past interactions
- Context stays within token limits
- Learning system improves over time
- All memory tests pass
```

---

## STAGE 5: Audio Understanding & Music Knowledge

**Objective**: Add audio analysis capabilities and music production knowledge.

### Prompt:

```
STAGE 5: Implement audio understanding and music production knowledge base.

CONTEXT:
Jarvis can control the DAW but needs deep audio and music knowledge to make intelligent production decisions.

TASKS:

1. AUDIO ANALYSIS INTEGRATION
   Create src/audio/analyzer.py:
   - Integrate audio analysis library (librosa, essentia)
   - Analyze audio features (tempo, key, loudness, timbre)
   - Detect beats, onsets, pitch
   - Analyze frequency spectrum
   - Detect silence/noise

   ```python
   class AudioAnalyzer:
       def analyze_file(self, audio_path: str) -> AudioAnalysis:
           """Comprehensive audio analysis"""

       def detect_tempo(self, audio_path: str) -> float:
           """Detect tempo in BPM"""

       def detect_key(self, audio_path: str) -> str:
           """Detect musical key"""

       def analyze_loudness(self, audio_path: str) -> LoudnessMetrics:
           """Analyze LUFS, peak, RMS"""

       def detect_beats(self, audio_path: str) -> List[float]:
           """Detect beat positions"""

       def analyze_spectrum(self, audio_path: str) -> np.ndarray:
           """Frequency spectrum analysis"""

       def detect_silence(self, audio_path: str) -> List[Tuple[float, float]]:
           """Find silent regions"""
   ```

2. AUDIO UNDERSTANDING MODELS
   Create src/models/audio_models.py:
   ```python
   class AudioAnalysis(BaseModel):
       duration: float
       sample_rate: int
       tempo: Optional[float]
       key: Optional[str]
       time_signature: Optional[str]
       loudness_lufs: float
       peak_db: float
       dynamic_range: float
       spectral_centroid: float
       beats: List[float]

   class LoudnessMetrics(BaseModel):
       integrated_lufs: float
       loudness_range: float
       true_peak_db: float
       suggested_adjustment: float

   class MixAnalysis(BaseModel):
       frequency_balance: Dict[str, float]  # low, mid, high energy
       stereo_width: float
       phase_correlation: float
       issues: List[str]  # e.g., "excessive bass", "phase issues"
       suggestions: List[str]
   ```

3. MUSIC PRODUCTION KNOWLEDGE BASE
   Create knowledge/music_production_kb.json:
   - Mixing best practices
   - Plugin usage guidelines
   - Genre-specific conventions
   - Frequency ranges for instruments
   - Compression ratios for sources
   - EQ starting points
   - Effect chains for common scenarios

   Example structure:
   ```json
   {
     "mixing_rules": [
       {
         "source": "vocals",
         "frequency_range": "80Hz - 12kHz",
         "compression": {
           "ratio": "3:1 to 4:1",
           "attack": "fast (1-10ms)",
           "release": "auto or 40-60ms"
         },
         "eq_tips": [
           "High-pass filter at 80-100Hz",
           "Boost presence at 2-5kHz",
           "Cut mud at 200-400Hz if needed"
         ]
       }
     ],
     "effect_chains": [
       {
         "name": "vocal_chain_pop",
         "genre": "pop",
         "plugins": [
           {"type": "EQ", "purpose": "cut mud"},
           {"type": "Compressor", "purpose": "control dynamics"},
           {"type": "De-esser", "purpose": "tame sibilance"},
           {"type": "Reverb", "purpose": "add space"}
         ]
       }
     ]
   }
   ```

4. RAG SYSTEM FOR MUSIC KNOWLEDGE
   Create src/knowledge/rag_system.py:
   - Embed music production knowledge
   - Store in vector database
   - Retrieve relevant knowledge based on context
   - Use retrieved knowledge in agent reasoning

   ```python
   class MusicKnowledgeRAG:
       def __init__(self, vector_db):
           self.db = vector_db
           self.load_knowledge_base()

       def load_knowledge_base(self):
           """Load and embed all music production knowledge"""

       def query_knowledge(self, query: str, context: Dict) -> List[str]:
           """Retrieve relevant production knowledge"""

       def get_mixing_advice(self, source_type: str, issue: str) -> List[str]:
           """Get specific mixing advice"""

       def suggest_plugin_chain(self, source: str, genre: str) -> List[Dict]:
           """Suggest effect chain"""

       def get_frequency_guidance(self, instrument: str) -> Dict:
           """Get frequency range and EQ guidance"""
   ```

5. INTELLIGENT MIXING ASSISTANT
   Create src/audio/mixing_assistant.py:
   - Analyze current mix
   - Identify issues (frequency masking, dynamics problems)
   - Suggest improvements
   - Apply auto-mixing with user approval

   ```python
   class MixingAssistant:
       def analyze_mix(self, tracks: List[Track]) -> MixAnalysis:
           """Analyze overall mix and identify issues"""

       def suggest_improvements(self, analysis: MixAnalysis) -> List[Suggestion]:
           """Suggest specific improvements"""

       def auto_balance(self, tracks: List[Track]) -> Dict[str, float]:
           """Suggest volume levels for balance"""

       def detect_masking(self, tracks: List[Track]) -> List[MaskingIssue]:
           """Identify frequency masking between tracks"""
   ```

6. AUDIO TOOLS FOR AGENT
   Create src/tools/audio_tools.py:
   - Wrap audio analysis as LangChain tools
   - Make audio knowledge queryable by agent
   - Enable intelligent parameter suggestions

   Example tools:
   - analyze_audio: Analyze uploaded audio
   - detect_tempo: Find tempo of audio
   - suggest_compressor_settings: Based on source type
   - suggest_eq: Based on frequency analysis
   - check_mix_balance: Analyze overall mix

7. SMART PARAMETER SUGGESTIONS
   Create src/audio/parameter_suggestions.py:
   ```python
   class ParameterSuggester:
       def suggest_compressor(self, source_type: str, audio_analysis: AudioAnalysis) -> CompressorSettings:
           """Suggest compressor settings based on source and analysis"""

       def suggest_eq(self, source_type: str, spectrum: np.ndarray) -> List[EQBand]:
           """Suggest EQ adjustments based on spectrum"""

       def suggest_reverb(self, source_type: str, genre: str) -> ReverbSettings:
           """Suggest reverb settings"""
   ```

8. GENRE DETECTION & STYLING
   Create src/audio/genre_classifier.py:
   - Detect genre from audio features
   - Apply genre-appropriate production styles
   - Suggest genre-specific workflows

9. INTEGRATION WITH AGENT
   Update agent to use audio knowledge:
   - Query knowledge base during planning
   - Use audio analysis before making mixing decisions
   - Explain decisions using production knowledge
   - Provide educational feedback to user

10. TESTING
    Create tests/test_audio.py:
    - Test audio analysis functions
    - Test knowledge base retrieval
    - Test mixing suggestions
    - Mock audio files for testing

EXAMPLE USE CASES:
- "Analyze the vocal track and suggest compression settings"
- "Is my mix too bass-heavy?"
- "Apply a pop vocal chain to this track"
- "What's the tempo of this audio file?"
- "Help me fix the muddiness in my mix"
- "Suggest EQ settings for this acoustic guitar"

DELIVERABLES:
- Audio analysis system
- Music production knowledge base
- RAG system for knowledge retrieval
- Mixing assistant with AI-powered suggestions
- Audio-specific tools for agent
- Smart parameter suggestion system
- Genre detection
- Full integration with agent
- Tests for audio systems

SUCCESS CRITERIA:
- Can analyze audio files accurately
- Knowledge base is comprehensive and queryable
- Mixing suggestions are helpful and accurate
- Agent makes intelligent production decisions
- Parameter suggestions are within professional ranges
- Genre detection works reliably
- All audio tests pass
```

---

## STAGE 6: Natural Language & Workflow Automation

**Objective**: Advanced NLP for natural commands and automated workflow creation.

### Prompt:

```
STAGE 6: Implement advanced natural language understanding and workflow automation.

CONTEXT:
Jarvis has all core capabilities. Now make interactions more natural and enable complex workflow automation.

TASKS:

1. ADVANCED INTENT RECOGNITION
   Create src/nlp/intent_parser.py:
   - Handle ambiguous commands
   - Support contextual pronouns ("it", "that track", "the last one")
   - Understand music production slang
   - Parse complex multi-step commands
   - Handle corrections and modifications

   ```python
   class IntentParser:
       def parse_command(self, text: str, context: Dict) -> Intent:
           """Parse natural language to structured intent"""

       def resolve_references(self, text: str, session_context: Dict) -> str:
           """Resolve pronouns and references"""

       def extract_parameters(self, text: str, intent_type: str) -> Dict:
           """Extract specific parameters from text"""

       def handle_ambiguity(self, text: str) -> List[Intent]:
           """Return multiple interpretations if ambiguous"""
   ```

2. CONVERSATION FLOW MANAGEMENT
   Create src/nlp/conversation_manager.py:
   - Multi-turn conversations
   - Clarification questions
   - Confirmation before destructive actions
   - Progress updates during long operations
   - Natural error explanations

   ```python
   class ConversationManager:
       def needs_clarification(self, intent: Intent) -> bool:
           """Check if clarification needed"""

       def generate_clarification(self, intent: Intent) -> str:
           """Generate clarification question"""

       def process_clarification_response(self, response: str, intent: Intent) -> Intent:
           """Update intent with clarification"""

       def generate_progress_update(self, workflow: Workflow, current_step: int) -> str:
           """Natural language progress update"""
   ```

3. WORKFLOW DEFINITION LANGUAGE
   Create src/workflows/workflow_dsl.py:
   - Define workflow schema
   - Support sequential and parallel steps
   - Conditional execution
   - Loops and iterations
   - Error handling in workflows

   ```python
   class Workflow(BaseModel):
       id: str
       name: str
       description: str
       steps: List[WorkflowStep]
       error_handling: ErrorHandlingStrategy

   class WorkflowStep(BaseModel):
       id: str
       action: str
       parameters: Dict
       depends_on: List[str]  # Step IDs
       condition: Optional[Condition]
       retry_on_failure: bool
   ```

4. WORKFLOW ENGINE
   Create src/workflows/engine.py:
   - Execute workflows with dependency resolution
   - Handle parallel execution
   - Manage workflow state
   - Resume failed workflows
   - Provide real-time progress

   ```python
   class WorkflowEngine:
       def execute_workflow(self, workflow: Workflow, context: Dict) -> WorkflowResult:
           """Execute complete workflow"""

       def execute_step(self, step: WorkflowStep, context: Dict) -> StepResult:
           """Execute single step"""

       def pause_workflow(self, workflow_id: str):
           """Pause execution"""

       def resume_workflow(self, workflow_id: str):
           """Resume paused workflow"""

       def get_workflow_status(self, workflow_id: str) -> WorkflowStatus:
           """Get current status"""
   ```

5. WORKFLOW TEMPLATES
   Create workflows/templates/:
   - Pre-built workflow templates for common tasks
   - Parameterized templates
   - Genre-specific workflows
   - Mixing/mastering workflows

   Examples:
   ```yaml
   # vocal_production_workflow.yaml
   name: "Vocal Production Workflow"
   description: "Complete vocal production from recording to final mix"
   steps:
     - id: setup
       action: create_tracks
       parameters:
         tracks:
           - {name: "Lead Vocal", type: "audio"}
           - {name: "Vocal Double", type: "audio"}
           - {name: "Vocal FX", type: "audio"}

     - id: record
       action: arm_and_record
       depends_on: [setup]
       parameters:
         track: "Lead Vocal"
         countdown: 4

     - id: comp_tune
       action: apply_vocal_processing
       depends_on: [record]
       parameters:
         track: "Lead Vocal"
         steps: ["comp", "tune", "de-ess"]

     - id: effects
       action: apply_effect_chain
       depends_on: [comp_tune]
       parameters:
         track: "Lead Vocal"
         chain: "pop_vocal_chain"
   ```

6. NATURAL COMMAND EXAMPLES
   Support these natural variations:
   - "Make the vocals louder" → adjust_volume
   - "That's too much reverb" → reduce_plugin_parameter
   - "Apply the same to track 3" → replicate_action
   - "Undo that" → undo_last_action
   - "Create a beat" → complex_workflow
   - "Mix this like a Drake song" → style_transfer
   - "The kick and bass are clashing" → fix_frequency_masking

7. MACRO/ROUTINE SYSTEM
   Create src/workflows/macros.py:
   - User-definable macros
   - Record user actions as macros
   - Name and save macros
   - Execute macros by name

   ```python
   class MacroSystem:
       def start_recording(self, macro_name: str):
           """Start recording user actions"""

       def stop_recording(self) -> Macro:
           """Stop and save macro"""

       def execute_macro(self, macro_name: str, context: Dict):
           """Execute saved macro"""

       def list_macros(self) -> List[str]:
           """List available macros"""
   ```

8. SMART DEFAULTS & SUGGESTIONS
   Create src/nlp/smart_defaults.py:
   - Provide sensible defaults for unspecified parameters
   - Suggest next actions based on context
   - Autocomplete commands
   - Learn user patterns for better defaults

9. ERROR RECOVERY & EXPLANATION
   Create src/nlp/error_handler.py:
   - Natural language error messages
   - Suggest fixes for errors
   - Explain why action failed
   - Offer alternatives

   ```python
   class NaturalErrorHandler:
       def explain_error(self, error: Exception, context: Dict) -> str:
           """Generate natural explanation of error"""

       def suggest_fixes(self, error: Exception) -> List[str]:
           """Suggest ways to fix the issue"""
   ```

10. TESTING
    Create tests/test_nlp_workflows.py:
    - Test intent parsing variations
    - Test workflow execution
    - Test multi-turn conversations
    - Test macro recording/playback

EXAMPLE CONVERSATIONS:
```
User: "Create a beat"
Jarvis: "I'll create a drum beat for you. What tempo would you like? (Default: 120 BPM)"
User: "Make it 140"
Jarvis: "Perfect. Creating a 140 BPM drum beat with kick, snare, and hi-hats. Would you like me to add any other elements?"
User: "Add a bass line"
Jarvis: "Added a bass track. I'll create a simple bassline that follows the kick drum. Starting playback..."

User: "The vocals are too quiet and need more presence"
Jarvis: "I'll increase the vocal volume by 3dB and boost the presence frequencies around 3-5kHz. Applying now..."
[Executes: volume +3dB, EQ boost at 4kHz]
Jarvis: "Done. How does that sound?"
User: "Better but less EQ"
Jarvis: "Reducing the EQ boost by half."
```

DELIVERABLES:
- Advanced intent parsing
- Conversation flow management
- Workflow definition system
- Workflow execution engine
- Workflow templates
- Macro recording system
- Smart defaults and suggestions
- Natural error handling
- Comprehensive NLP tests

SUCCESS CRITERIA:
- Handles natural, varied language
- Manages multi-turn conversations smoothly
- Executes complex workflows reliably
- Asks clarifying questions when needed
- Provides helpful suggestions
- Explains errors naturally
- Macros record and playback correctly
```

---

## STAGE 7: Web Interface & API Server

**Objective**: Build a web-based interface and API server for Jarvis.

### Prompt:

```
STAGE 7: Create web interface and REST API for Jarvis.

CONTEXT:
Jarvis works via CLI. Now build a web interface and API for broader accessibility.

TASKS:

1. FASTAPI SERVER
   Create src/server/app.py:
   - FastAPI application setup
   - CORS configuration
   - Authentication/API keys
   - WebSocket support for real-time updates
   - Error handling middleware

   ```python
   from fastapi import FastAPI, WebSocket
   from fastapi.middleware.cors import CORSMiddleware

   app = FastAPI(title="Jarvis AI DAW Agent API")

   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

2. REST API ENDPOINTS
   Create src/server/routes/:

   ```python
   # routes/agent.py
   @app.post("/api/v1/command")
   async def execute_command(command: CommandRequest):
       """Execute natural language command"""

   @app.get("/api/v1/status")
   async def get_status():
       """Get agent and DAW status"""

   @app.post("/api/v1/session/start")
   async def start_session():
       """Start new session"""

   @app.get("/api/v1/session/{session_id}")
   async def get_session(session_id: str):
       """Get session info and history"""

   # routes/daw.py
   @app.get("/api/v1/daw/tracks")
   async def get_tracks():
       """Get all tracks"""

   @app.post("/api/v1/daw/tracks")
   async def create_track(track: TrackCreate):
       """Create new track"""

   @app.get("/api/v1/daw/transport")
   async def get_transport_state():
       """Get transport state"""

   @app.post("/api/v1/daw/transport/play")
   async def play():
       """Start playback"""

   # routes/workflows.py
   @app.get("/api/v1/workflows")
   async def list_workflows():
       """List available workflows"""

   @app.post("/api/v1/workflows/{workflow_id}/execute")
   async def execute_workflow(workflow_id: str, params: Dict):
       """Execute workflow"""

   # routes/memory.py
   @app.get("/api/v1/memory/history")
   async def get_history(session_id: str):
       """Get conversation history"""

   @app.get("/api/v1/memory/preferences")
   async def get_preferences():
       """Get user preferences"""
   ```

3. WEBSOCKET FOR REAL-TIME UPDATES
   Create src/server/websocket.py:
   - Real-time command execution updates
   - Live DAW state changes
   - Progress updates for long operations
   - Multi-client support

   ```python
   @app.websocket("/ws/{session_id}")
   async def websocket_endpoint(websocket: WebSocket, session_id: str):
       await websocket.accept()
       # Stream agent responses and updates
   ```

4. REQUEST/RESPONSE MODELS
   Create src/server/schemas.py:
   ```python
   class CommandRequest(BaseModel):
       command: str
       session_id: str
       context: Optional[Dict] = None

   class CommandResponse(BaseModel):
       session_id: str
       response: str
       actions_taken: List[Dict]
       new_state: Dict
       success: bool

   class StatusResponse(BaseModel):
       agent_status: str
       daw_connected: bool
       active_sessions: int
       version: str
   ```

5. FRONTEND WEB APP
   Create frontend/ directory:
   - React or Vue.js app
   - Chat interface for natural language
   - DAW state visualization
   - Workflow builder UI
   - Session history view
   - Settings panel

6. CHAT INTERFACE COMPONENT
   Create frontend/src/components/ChatInterface.jsx:
   ```jsx
   import React, { useState } from 'react';

   function ChatInterface() {
     const [messages, setMessages] = useState([]);
     const [input, setInput] = useState('');

     const sendCommand = async () => {
       // Send to API
       const response = await fetch('/api/v1/command', {
         method: 'POST',
         body: JSON.stringify({ command: input })
       });
       // Handle response
     };

     return (
       <div className="chat-interface">
         <MessageList messages={messages} />
         <CommandInput value={input} onChange={setInput} onSend={sendCommand} />
       </div>
     );
   }
   ```

7. DAW STATE VISUALIZATION
   Create frontend/src/components/DAWState.jsx:
   - Show current tracks
   - Transport controls
   - Playhead position
   - Volume meters
   - Real-time updates via WebSocket

8. WORKFLOW BUILDER UI
   Create frontend/src/components/WorkflowBuilder.jsx:
   - Visual workflow editor
   - Drag-and-drop steps
   - Parameter configuration
   - Save/load workflows
   - Execute workflows

9. AUTHENTICATION & SECURITY
   Create src/server/auth.py:
   - API key authentication
   - Rate limiting
   - Input validation
   - SQL injection prevention
   - XSS protection

10. DEPLOYMENT CONFIGURATION
    Create deployment files:
    - Dockerfile
    - docker-compose.yml
    - kubernetes manifests (optional)
    - Environment configuration

    ```dockerfile
    # Dockerfile
    FROM python:3.10-slim
    WORKDIR /app
    COPY requirements.txt .
    RUN pip install -r requirements.txt
    COPY . .
    CMD ["uvicorn", "src.server.app:app", "--host", "0.0.0.0", "--port", "8000"]
    ```

    ```yaml
    # docker-compose.yml
    version: '3.8'
    services:
      jarvis-api:
        build: .
        ports:
          - "8000:8000"
        environment:
          - OPENAI_API_KEY=${OPENAI_API_KEY}
          - REDIS_URL=redis://redis:6379
        depends_on:
          - redis

      redis:
        image: redis:7-alpine
        ports:
          - "6379:6379"

      frontend:
        build: ./frontend
        ports:
          - "3000:3000"
    ```

11. API DOCUMENTATION
    - Auto-generated OpenAPI docs (FastAPI default)
    - Custom documentation page
    - Example requests/responses
    - Client SDKs (Python, JavaScript)

12. TESTING
    Create tests/test_api.py:
    - Test all API endpoints
    - Test WebSocket connections
    - Test authentication
    - Integration tests

DELIVERABLES:
- FastAPI server with full REST API
- WebSocket real-time communication
- React/Vue frontend with chat interface
- DAW state visualization
- Workflow builder UI
- Authentication system
- Docker deployment setup
- API documentation
- Frontend and backend tests

SUCCESS CRITERIA:
- API serves all endpoints correctly
- WebSocket provides real-time updates
- Frontend is responsive and intuitive
- Can execute commands through web UI
- Can visualize DAW state in browser
- Can build and execute workflows visually
- Authentication works correctly
- Docker deployment successful
- All API tests pass
```

---

## STAGE 8: Testing, Optimization & Production Readiness

**Objective**: Comprehensive testing, performance optimization, and production deployment.

### Prompt:

```
STAGE 8: Testing, optimization, and production readiness.

CONTEXT:
Jarvis is feature-complete. Now ensure reliability, performance, and production readiness.

TASKS:

1. COMPREHENSIVE TEST SUITE
   Create tests/ directory with:

   ```python
   # tests/test_integration.py
   class TestIntegration:
       def test_end_to_end_workflow(self):
           """Test complete workflow from command to execution"""

       def test_multi_step_command(self):
           """Test complex multi-step command"""

       def test_vision_fallback(self):
           """Test API failure -> vision fallback"""

       def test_session_resume(self):
           """Test session persistence and resume"""

   # tests/test_performance.py
   class TestPerformance:
       def test_response_time(self):
           """Ensure responses under 2 seconds"""

       def test_concurrent_sessions(self):
           """Test multiple simultaneous sessions"""

       def test_memory_usage(self):
           """Monitor memory consumption"""

       def test_token_usage(self):
           """Track LLM token consumption"""

   # tests/test_reliability.py
   class TestReliability:
       def test_error_recovery(self):
           """Test graceful error handling"""

       def test_network_failure(self):
           """Test behavior during network issues"""

       def test_daw_disconnect(self):
           """Test DAW connection loss"""

       def test_rate_limiting(self):
           """Test API rate limit handling"""
   ```

2. PERFORMANCE OPTIMIZATION
   Create src/optimization/:

   - **Caching Strategy**:
     ```python
     # src/optimization/cache.py
     class CacheManager:
         def cache_llm_response(self, prompt: str, response: str):
             """Cache LLM responses for identical prompts"""

         def cache_ui_screenshot(self, screen_hash: str, analysis: Dict):
             """Cache UI analysis results"""

         def cache_audio_analysis(self, file_hash: str, analysis: AudioAnalysis):
             """Cache audio analysis results"""
     ```

   - **Request Batching**:
     ```python
     # src/optimization/batching.py
     class RequestBatcher:
         def batch_daw_operations(self, operations: List[Operation]) -> List[Result]:
             """Batch multiple DAW operations into single request"""
     ```

   - **Lazy Loading**:
     ```python
     # src/optimization/lazy_loading.py
     - Load heavy models only when needed
     - Lazy load audio analysis libraries
     - On-demand knowledge base loading
     ```

   - **Token Optimization**:
     ```python
     # src/optimization/token_optimizer.py
     class TokenOptimizer:
         def compress_history(self, messages: List[Message]) -> List[Message]:
             """Compress conversation history"""

         def optimize_prompts(self, prompt: str) -> str:
             """Remove redundant information from prompts"""
     ```

3. MONITORING & OBSERVABILITY
   Create src/monitoring/:

   ```python
   # src/monitoring/metrics.py
   class MetricsCollector:
       def track_command_latency(self, latency: float):
       def track_llm_tokens(self, prompt_tokens: int, completion_tokens: int):
       def track_api_errors(self, error_type: str):
       def track_user_satisfaction(self, rating: int):

   # src/monitoring/logging.py
   - Structured logging with context
   - Log levels (DEBUG, INFO, WARNING, ERROR)
   - Log aggregation for analysis
   - Error tracking integration (Sentry)

   # src/monitoring/health_checks.py
   @app.get("/health")
   async def health_check():
       return {
           "status": "healthy",
           "daw_connected": check_daw_connection(),
           "redis_connected": check_redis_connection(),
           "llm_available": check_llm_api()
       }
   ```

4. ERROR TRACKING & DEBUGGING
   - Integrate Sentry or similar
   - Detailed error context
   - User session replay
   - Performance monitoring
   - Alert on critical errors

5. RATE LIMITING & QUOTAS
   Create src/server/rate_limiting.py:
   ```python
   from slowapi import Limiter

   limiter = Limiter(key_func=get_client_ip)

   @app.post("/api/v1/command")
   @limiter.limit("60/minute")  # 60 requests per minute
   async def execute_command(command: CommandRequest):
       pass
   ```

6. LOAD TESTING
   Create tests/load_tests/:
   - Use locust or similar tool
   - Simulate 100+ concurrent users
   - Test under peak load
   - Identify bottlenecks

   ```python
   # tests/load_tests/locustfile.py
   from locust import HttpUser, task, between

   class JarvisUser(HttpUser):
       wait_time = between(1, 5)

       @task
       def send_command(self):
           self.client.post("/api/v1/command", json={
               "command": "Create a new audio track",
               "session_id": self.session_id
           })
   ```

7. SECURITY HARDENING
   Create src/security/:
   - Input sanitization
   - SQL injection prevention
   - XSS protection
   - CSRF tokens
   - Secrets management (use env vars, not hardcoded)
   - API key rotation
   - Audit logging

   ```python
   # src/security/input_validation.py
   class InputValidator:
       def sanitize_command(self, command: str) -> str:
           """Remove potentially malicious content"""

       def validate_parameters(self, params: Dict) -> bool:
           """Validate parameter values"""
   ```

8. DOCUMENTATION
   Create docs/ directory:
   - **docs/user_guide.md**: End-user documentation
   - **docs/api_reference.md**: API documentation
   - **docs/architecture.md**: System architecture
   - **docs/deployment.md**: Deployment guide
   - **docs/troubleshooting.md**: Common issues and solutions
   - **docs/contributing.md**: Contribution guidelines

9. DEPLOYMENT AUTOMATION
   Create deployment scripts:

   ```bash
   # scripts/deploy.sh
   #!/bin/bash

   # Build Docker images
   docker build -t jarvis-api:latest .
   docker build -t jarvis-frontend:latest ./frontend

   # Run tests
   pytest tests/

   # Push to registry
   docker push jarvis-api:latest
   docker push jarvis-frontend:latest

   # Deploy to production
   kubectl apply -f k8s/
   ```

   ```yaml
   # .github/workflows/deploy.yml
   name: Deploy Jarvis
   on:
     push:
       branches: [main]
   jobs:
     test-and-deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - name: Run tests
           run: pytest tests/
         - name: Build and push
           run: ./scripts/deploy.sh
   ```

10. PERFORMANCE BENCHMARKS
    Document and track:
    - Command response time: < 2 seconds
    - API latency: < 100ms
    - UI rendering: < 16ms (60fps)
    - Memory usage: < 2GB
    - Token usage per command: < 1000 tokens average
    - Concurrent sessions supported: 100+

11. PRODUCTION CHECKLIST
    - [ ] All tests passing (unit, integration, load)
    - [ ] Error tracking configured
    - [ ] Monitoring dashboards set up
    - [ ] Logging configured and aggregated
    - [ ] Rate limiting implemented
    - [ ] Security audit completed
    - [ ] Documentation complete
    - [ ] Backup and recovery plan
    - [ ] Incident response plan
    - [ ] API versioning strategy
    - [ ] Database migration strategy
    - [ ] Rollback procedures documented
    - [ ] Performance benchmarks met
    - [ ] User acceptance testing completed

12. FINAL INTEGRATION TEST
    ```python
    # tests/test_production_ready.py
    def test_production_readiness():
        """Comprehensive production readiness test"""

        # Test all critical paths
        assert test_user_command_flow()
        assert test_vision_system()
        assert test_memory_persistence()
        assert test_api_availability()
        assert test_error_recovery()
        assert test_performance_requirements()
        assert test_security_measures()

        print("✅ Jarvis is production ready!")
    ```

DELIVERABLES:
- Comprehensive test suite (unit, integration, load)
- Performance optimizations implemented
- Monitoring and observability setup
- Error tracking configured
- Rate limiting and quotas
- Security hardening
- Complete documentation
- Deployment automation
- Production readiness checklist completed
- Performance benchmarks met

SUCCESS CRITERIA:
- All tests pass with >90% coverage
- Response times meet targets
- Can handle 100+ concurrent users
- Zero critical security vulnerabilities
- Complete documentation
- Successful deployment to production
- Monitoring shows healthy metrics
- User acceptance testing passed
```

---

## STAGE 9: Advanced Features & Extensions

**Objective**: Advanced features and extensibility for power users.

### Prompt:

```
STAGE 9: Implement advanced features and extensibility.

CONTEXT:
Jarvis is production-ready. Add advanced features for power users and developers.

TASKS:

1. PLUGIN SYSTEM
   Create src/plugins/:
   - Plugin interface definition
   - Plugin discovery and loading
   - Plugin lifecycle management
   - Plugin marketplace/registry

   ```python
   # src/plugins/interface.py
   from abc import ABC, abstractmethod

   class JarvisPlugin(ABC):
       @property
       @abstractmethod
       def name(self) -> str:
           """Plugin name"""

       @property
       @abstractmethod
       def version(self) -> str:
           """Plugin version"""

       @abstractmethod
       def initialize(self, agent):
           """Initialize plugin with agent instance"""

       @abstractmethod
       def get_tools(self) -> List[Tool]:
           """Return tools provided by this plugin"""

       @abstractmethod
       def on_command(self, command: str) -> Optional[Response]:
           """Handle command if plugin wants to override"""

   # Example plugin
   class CustomEffectsPlugin(JarvisPlugin):
       name = "custom-effects"
       version = "1.0.0"

       def get_tools(self):
           return [
               Tool(name="apply_custom_reverb", ...),
               Tool(name="apply_custom_delay", ...)
           ]
   ```

2. SCRIPTING INTERFACE
   Create src/scripting/:
   - Python scripting API
   - JavaScript scripting (for web)
   - Script execution sandbox
   - Built-in script library

   ```python
   # src/scripting/python_api.py
   class JarvisAPI:
       """Python API for scripting Jarvis"""

       def execute(self, command: str) -> Result:
           """Execute natural language command"""

       def daw(self) -> DAWController:
           """Access DAW controller"""

       def workflow(self, name: str) -> Workflow:
           """Load workflow by name"""

       def macro(self, name: str) -> Macro:
           """Load macro by name"""

   # Example user script
   from jarvis import JarvisAPI

   jarvis = JarvisAPI()

   # Create drum tracks
   for drum in ['kick', 'snare', 'hi-hat']:
       jarvis.daw().create_track(f"Drum - {drum}", "audio")

   # Apply processing
   jarvis.execute("Apply compression to all drum tracks")
   ```

3. CUSTOM TOOL BUILDER
   Create src/tools/builder.py:
   - GUI for creating custom tools
   - Tool definition wizard
   - Test custom tools
   - Share tools with community

   ```python
   class ToolBuilder:
       def create_tool(self,
                       name: str,
                       description: str,
                       function: Callable,
                       parameters: Dict) -> Tool:
           """Create custom tool from function"""
   ```

4. VOICE CONTROL
   Create src/voice/:
   - Speech-to-text integration
   - Text-to-speech for responses
   - Wake word detection ("Hey Jarvis")
   - Voice command processing

   ```python
   # src/voice/voice_interface.py
   class VoiceInterface:
       def start_listening(self):
           """Start listening for wake word"""

       def process_speech(self, audio: bytes) -> str:
           """Convert speech to text"""

       def speak(self, text: str):
           """Convert text to speech and play"""
   ```

5. COLLABORATIVE FEATURES
   Create src/collaboration/:
   - Multi-user sessions
   - Shared workflows
   - Real-time collaboration
   - Commenting and feedback

   ```python
   class CollaborationManager:
       def create_shared_session(self, users: List[str]) -> str:
           """Create session for multiple users"""

       def invite_user(self, session_id: str, user_id: str):
           """Invite user to session"""

       def sync_state(self, session_id: str):
           """Synchronize state across users"""
   ```

6. ADVANCED AUDIO FEATURES
   Create src/audio/advanced/:
   - AI-powered stem separation
   - Automatic mastering
   - Style transfer (make it sound like X artist)
   - Audio restoration
   - Pitch correction

   ```python
   class AdvancedAudioProcessor:
       def separate_stems(self, audio_path: str) -> Dict[str, str]:
           """Separate audio into stems (vocals, drums, bass, other)"""

       def auto_master(self, tracks: List[Track], reference: Optional[str]) -> MasterSettings:
           """Automatic mastering with optional reference track"""

       def style_transfer(self, audio: str, style: str) -> str:
           """Apply style from reference"""
   ```

7. MIDI GENERATION & MANIPULATION
   Create src/midi/:
   - AI melody generation
   - Chord progression generation
   - MIDI humanization
   - MIDI to audio conversion

   ```python
   class MIDIGenerator:
       def generate_melody(self, key: str, scale: str, bars: int) -> MIDISequence:
           """Generate melody using AI"""

       def generate_chords(self, key: str, progression: str) -> MIDISequence:
           """Generate chord progression"""

       def humanize(self, midi: MIDISequence) -> MIDISequence:
           """Add human-like variations"""
   ```

8. INTEGRATION MARKETPLACE
   Create integrations/:
   - Spotify integration (analyze tracks)
   - YouTube integration (import audio)
   - Cloud storage (Dropbox, Google Drive)
   - Social media sharing
   - Music distribution platforms

   ```python
   class SpotifyIntegration:
       def analyze_track(self, spotify_url: str) -> AudioFeatures:
           """Analyze Spotify track features"""

       def get_recommendations(self, seed_tracks: List[str]) -> List[Track]:
           """Get similar tracks"""
   ```

9. LEARNING & ADAPTATION
   Create src/learning/:
   - Reinforcement learning from user feedback
   - Personalization engine
   - Adaptive UI based on usage
   - Predictive suggestions

   ```python
   class AdaptiveLearning:
       def learn_from_feedback(self, action: Action, rating: int):
           """Learn from user ratings"""

       def predict_next_action(self, context: Dict) -> List[Action]:
           """Predict what user will do next"""

       def personalize_interface(self, user_id: str) -> UIConfig:
           """Customize UI based on usage patterns"""
   ```

10. EXPORT & REPORTING
    Create src/reporting/:
    - Session reports
    - Mix analysis reports
    - Time tracking
    - Project statistics
    - Export to PDF/HTML

    ```python
    class ReportGenerator:
        def generate_session_report(self, session_id: str) -> Report:
            """Generate session activity report"""

        def generate_mix_analysis(self, project_id: str) -> MixReport:
            """Detailed mix analysis report"""

        def export_pdf(self, report: Report) -> bytes:
            """Export report to PDF"""
    ```

11. MOBILE APP
    Create mobile/:
    - iOS/Android apps
    - Remote DAW control
    - Voice commands on mobile
    - Notifications and alerts

12. COMMUNITY FEATURES
    - Workflow sharing platform
    - User-generated templates
    - Tutorial system
    - Community forums/support
    - Rating and reviews

DELIVERABLES:
- Plugin system with example plugins
- Python and JavaScript scripting API
- Custom tool builder
- Voice control interface
- Collaborative features
- Advanced audio processing
- MIDI generation
- Third-party integrations
- Adaptive learning system
- Reporting and export
- Mobile app (if resources allow)
- Community platform

SUCCESS CRITERIA:
- Plugins can be loaded and executed
- Scripts can control Jarvis programmatically
- Voice control works reliably
- Advanced audio features produce quality results
- MIDI generation is musically coherent
- Integrations work with major platforms
- Reports are comprehensive and useful
- System learns and adapts to user behavior
```

---

## BONUS: Continuous Improvement Plan

### Prompt:

```
CONTINUOUS IMPROVEMENT & ROADMAP

ONGOING TASKS:

1. **User Feedback Loop**
   - Collect user feedback systematically
   - Analyze common requests
   - Prioritize feature development
   - A/B test new features

2. **Model Updates**
   - Stay updated with latest LLMs
   - Benchmark new models
   - Migrate to better models when available
   - Fine-tune models on music production data

3. **Performance Monitoring**
   - Weekly performance reviews
   - Identify bottlenecks
   - Optimize slow operations
   - Monitor costs (API usage)

4. **Security Updates**
   - Regular security audits
   - Dependency updates
   - Vulnerability scanning
   - Penetration testing

5. **Feature Roadmap**
   - Q1: Core functionality, API, vision control
   - Q2: Memory, audio intelligence, workflows
   - Q3: Web UI, optimizations, production launch
   - Q4: Advanced features, plugins, mobile app

6. **Community Building**
   - Developer documentation
   - Tutorial videos
   - Community contributions
   - Plugin ecosystem growth

7. **Research & Innovation**
   - Stay updated with AI research
   - Experiment with new techniques
   - Prototype innovative features
   - Collaborate with music production community

SUCCESS METRICS:
- User satisfaction score > 4.5/5
- Command success rate > 95%
- Average response time < 2 seconds
- Monthly active users growth
- Plugin ecosystem growth
- Community engagement metrics
```

---

## IMPLEMENTATION PRIORITY MATRIX

**MUST HAVE (MVP)**:
- Stage 0: Foundation
- Stage 1: Core reasoning
- Stage 2: Vision control
- Stage 3: DAW API integration

**SHOULD HAVE (V1.0)**:
- Stage 4: Memory system
- Stage 5: Audio intelligence
- Stage 6: Workflow automation
- Stage 8: Testing & optimization

**NICE TO HAVE (V2.0+)**:
- Stage 7: Web interface
- Stage 9: Advanced features
- Mobile app
- Community platform

---

## ESTIMATED TIMELINE

- **Stages 0-1**: 2-3 weeks
- **Stages 2-3**: 3-4 weeks
- **Stages 4-5**: 3-4 weeks
- **Stage 6**: 2-3 weeks
- **Stage 7**: 3-4 weeks
- **Stage 8**: 2-3 weeks
- **Stage 9**: 4-6 weeks

**Total MVP (Stages 0-3)**: ~8 weeks
**Total V1.0 (Stages 0-8)**: ~20 weeks
**Total V2.0 (All stages)**: ~26 weeks

---

## TECH STACK SUMMARY

**Core Agent**:
- Python 3.10+
- LangChain + LangGraph
- OpenAI GPT-4 / Anthropic Claude 3.5

**Vision**:
- GPT-4V / Claude 3.5 Sonnet / Gemini Pro Vision
- Pillow (image processing)
- PyAutoGUI (mouse/keyboard control)

**Memory**:
- Redis (short-term)
- ChromaDB/Pinecone (long-term/vector)

**Audio**:
- Librosa (analysis)
- Essentia (advanced analysis)

**API & Web**:
- FastAPI
- React/Vue.js
- WebSocket

**Deployment**:
- Docker
- Kubernetes
- PostgreSQL/MongoDB (persistent data)

---

## KEY SUCCESS FACTORS

1. **Robust error handling** - Music production can't afford failures
2. **Low latency** - Users need real-time responsiveness
3. **High accuracy** - Incorrect actions can ruin projects
4. **Natural UX** - Should feel like talking to a producer
5. **Reliability** - Production-grade stability
6. **Extensibility** - Plugin system for customization
7. **Security** - Protect user data and projects
8. **Documentation** - Clear guides for all features

---

This is your complete roadmap for building JARVIS, the AI agent that controls your AI DAW. Good luck! 🚀
