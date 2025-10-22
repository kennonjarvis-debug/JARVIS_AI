# Jarvis AI Orchestration CLI

**A robust CLI tool for running prompts through multiple AI models in parallel with automatic retry and timeout handling.**

---

## Features

✅ **Configurable Timeout** - Set custom timeout per model (default 60s, max 120s)
✅ **Async Execution** - Run multiple models in parallel for faster results
✅ **Partial Results** - Return successful responses even if some models fail
✅ **Automatic Retry** - Retry failed requests with exponential backoff (max 2 retries)
✅ **Comprehensive Logging** - Track success, failures, timeouts, and retries
✅ **Multiple Model Support** - Gemini, GPT-4, Codex, Claude

---

## Installation

No installation required - this is a standalone Node.js script.

**Requirements:**
- Node.js v14 or higher
- API keys for desired models (optional - can use mock mode)

---

## Quick Start

### 1. Set up API keys (optional)

```bash
# For Google Gemini
export GEMINI_API_KEY="your-gemini-api-key"
# OR
export GOOGLE_AI_API_KEY="your-google-ai-key"

# For OpenAI (GPT-4, Codex)
export OPENAI_API_KEY="your-openai-key"

# For Anthropic Claude
export ANTHROPIC_API_KEY="your-anthropic-key"
```

### 2. Run with a simple prompt

```bash
cd /Users/benkennon/Jarvis/scripts
node orchestrate-cli.js --prompt "Explain quantum computing in simple terms"
```

### 3. Run in mock mode (no API keys needed)

```bash
USE_MOCK_MODELS=true node orchestrate-cli.js -p "Test prompt" -m gemini,gpt4
```

---

## Usage

```bash
node orchestrate-cli.js [options]
```

### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--prompt <text>` | `-p` | Prompt to send to AI models | Required* |
| `--file <path>` | `-f` | Read prompt from file | Required* |
| `--models <list>` | `-m` | Comma-separated model list | `gemini` |
| `--timeout <ms>` | `-t` | Timeout per model (ms) | `60000` (60s) |
| `--retries <n>` | `-r` | Max retries per model | `2` |
| `--output <path>` | `-o` | Save results to JSON file | None |
| `--help` | `-h` | Show help message | - |

\* Either `--prompt` or `--file` is required

### Supported Models

- `gemini` - Google Gemini Pro
- `gpt4` - OpenAI GPT-4
- `codex` - OpenAI Codex (code-davinci-002)
- `claude` - Anthropic Claude 3 Sonnet

---

## Examples

### Example 1: Single Model with Custom Timeout

```bash
node orchestrate-cli.js \
  --prompt "Write a haiku about programming" \
  --models gemini \
  --timeout 30000
```

**Output:**
```
ℹ️  [INFO] 🚀 Starting orchestration with 1 model(s)
ℹ️  [INFO] ✅ gemini succeeded
ℹ️  [INFO] 📊 Orchestration complete
============================================================
📊 ORCHESTRATION SUMMARY
============================================================
Total Models:     1
Succeeded:        1 ✅
Failed:           0 ❌
Total Duration:   2847ms
============================================================

✅ SUCCESSFUL RESPONSES:

[gemini] (2847ms, 1 attempt(s))
Code flows like streams,
Logic branches like tree limbs,
Bugs hide in the leaves.
```

### Example 2: Multiple Models in Parallel

```bash
node orchestrate-cli.js \
  --prompt "What is the meaning of life?" \
  --models gemini,gpt4,claude \
  --retries 3
```

**Output:**
```
ℹ️  [INFO] 🚀 Starting orchestration with 3 model(s)
ℹ️  [INFO] ✅ gemini succeeded
ℹ️  [INFO] ✅ claude succeeded
⚠️  [WARN] gpt4 failed (attempt 1/4): Timeout after 60000ms
ℹ️  [INFO] 🔄 Retrying gpt4 (attempt 2/4) after 1000ms
ℹ️  [INFO] ✅ gpt4 recovered on attempt 2
ℹ️  [INFO] 📊 Orchestration complete
============================================================
📊 ORCHESTRATION SUMMARY
============================================================
Total Models:     3
Succeeded:        3 ✅
Failed:           0 ❌
Total Duration:   8421ms
============================================================
```

### Example 3: Read Prompt from File

```bash
# Create prompt file
echo "Explain recursion using a real-world analogy" > prompt.txt

# Run orchestration
node orchestrate-cli.js \
  --file prompt.txt \
  --models gemini,gpt4 \
  --output results.json
```

### Example 4: Mock Mode for Testing

```bash
# Test without API keys
USE_MOCK_MODELS=true node orchestrate-cli.js \
  --prompt "Test prompt" \
  --models gemini,codex,gpt4,claude \
  --timeout 10000
```

### Example 5: Debug Logging

```bash
# Enable debug logs to see detailed execution
LOG_LEVEL=debug node orchestrate-cli.js \
  --prompt "Explain async/await" \
  --models gemini
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | None |
| `GOOGLE_AI_API_KEY` | Alias for Gemini key | None |
| `OPENAI_API_KEY` | OpenAI API key (GPT-4, Codex) | None |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | None |
| `USE_MOCK_MODELS` | Use mock responses (`true`/`false`) | `false` |
| `LOG_LEVEL` | Logging verbosity (`debug`/`info`/`warn`/`error`) | `info` |

---

## Output Format

### Console Output

```
============================================================
📊 ORCHESTRATION SUMMARY
============================================================
Total Models:     3
Succeeded:        2 ✅
Failed:           1 ❌
Total Duration:   4532ms
============================================================

✅ SUCCESSFUL RESPONSES:

[gemini] (2847ms, 1 attempt(s))
[Model response here...]

[claude] (3124ms, 2 attempt(s))
[Model response here...]

❌ FAILED MODELS:

[gpt4] Timeout after 60000ms
```

### JSON Output (with `--output`)

```json
{
  "success": true,
  "totalModels": 3,
  "successCount": 2,
  "failureCount": 1,
  "results": [
    {
      "success": true,
      "model": "gemini",
      "result": {
        "model": "gemini",
        "response": "...",
        "timestamp": "2025-10-07T19:30:00.000Z",
        "duration": 2847
      },
      "attempts": 1,
      "duration": 2847
    }
  ],
  "failures": [
    {
      "model": "gpt4",
      "error": "Timeout after 60000ms"
    }
  ],
  "duration": 4532,
  "timestamp": "2025-10-07T19:30:04.532Z"
}
```

---

## Retry Logic

The CLI automatically retries failed requests with **exponential backoff**:

| Attempt | Delay Before Retry |
|---------|--------------------|
| 1       | 0ms (immediate)    |
| 2       | 1000ms (1s)        |
| 3       | 2000ms (2s)        |

**Example retry sequence:**
```
⚠️  [WARN] gemini failed (attempt 1/3): HTTP 429: Rate limit exceeded
ℹ️  [INFO] 🔄 Retrying gemini (attempt 2/3) after 1000ms
⚠️  [WARN] gemini failed (attempt 2/3): Timeout after 60000ms
ℹ️  [INFO] 🔄 Retrying gemini (attempt 3/3) after 2000ms
ℹ️  [INFO] ✅ gemini recovered on attempt 3
```

---

## Timeout Handling

- **Per-model timeout:** Each model has its own timeout (default 60s)
- **Max timeout:** 120s (2 minutes)
- **Timeout errors:** Trigger automatic retry
- **Partial results:** Other models continue even if one times out

**Example:**
```bash
# Set aggressive 15s timeout for fast models only
node orchestrate-cli.js \
  --prompt "Quick answer: What is 2+2?" \
  --models gemini,gpt4 \
  --timeout 15000
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success - at least one model succeeded |
| `1` | Failure - all models failed or error occurred |

---

## Troubleshooting

### Issue: "No adapter found for model"

**Solution:** Check that the model name is spelled correctly and supported:
```bash
# Supported models: gemini, gpt4, codex, claude
node orchestrate-cli.js -p "test" -m gemini  # ✅ correct
node orchestrate-cli.js -p "test" -m gemni   # ❌ typo
```

### Issue: "GEMINI_API_KEY not set in environment"

**Solution:** Set the API key before running:
```bash
export GEMINI_API_KEY="your-key-here"
node orchestrate-cli.js -p "test" -m gemini
```

**Or use mock mode:**
```bash
USE_MOCK_MODELS=true node orchestrate-cli.js -p "test" -m gemini
```

### Issue: "Timeout after 60000ms"

**Solutions:**
1. Increase timeout: `--timeout 120000`
2. Reduce prompt length
3. Enable retries: `--retries 3`
4. Check network connectivity

### Issue: All models failing

**Debug steps:**
1. Enable debug logging: `LOG_LEVEL=debug`
2. Test one model at a time: `-m gemini`
3. Verify API keys are set correctly
4. Check API rate limits
5. Try mock mode to test orchestration logic: `USE_MOCK_MODELS=true`

---

## Architecture

```
orchestrate-cli.js
├── CLI Argument Parsing
├── Model Orchestration
│   ├── Parallel Execution (Promise.allSettled)
│   ├── Retry Logic (per model)
│   └── Timeout Management
└── Results Aggregation

model-adapters.js
├── Gemini Adapter
├── GPT-4 Adapter
├── Codex Adapter
└── Claude Adapter
```

### Key Functions

**`orchestrateModels(models, prompt, timeout, retries)`**
- Executes all models in parallel
- Returns partial results if some fail

**`executeWithRetry(model, prompt, timeout, maxRetries)`**
- Handles retry logic with exponential backoff
- Logs recovery on successful retry

**`executeModelCall(model, prompt, timeout)`**
- Uses appropriate adapter for each model
- Falls back to mock if `USE_MOCK_MODELS=true`

---

## Integration with Jarvis

This CLI is designed to be called from other Jarvis components:

```javascript
// Example: Call from Node.js
const { orchestrateModels } = require('./scripts/orchestrate-cli');

const result = await orchestrateModels(
  ['gemini', 'gpt4'],
  'Explain async/await',
  60000,
  2
);

console.log(result.results);
```

```bash
# Example: Call from shell script
#!/bin/bash
RESULT=$(node /Users/benkennon/Jarvis/scripts/orchestrate-cli.js \
  --prompt "Generate code for..." \
  --models gemini,codex \
  --output result.json)

if [ $? -eq 0 ]; then
  echo "Success!"
  cat result.json
else
  echo "All models failed"
fi
```

---

## Performance Tips

1. **Use parallel execution** - Multiple models run simultaneously
2. **Set appropriate timeouts** - Don't wait longer than necessary
3. **Limit retries** - Too many retries slow down execution
4. **Save to file** - Use `--output` for large responses
5. **Mock mode for testing** - Faster iteration without API calls

---

## Roadmap

Planned enhancements:

- [ ] Support for streaming responses
- [ ] Custom model parameters (temperature, max_tokens)
- [ ] Result caching to avoid duplicate calls
- [ ] Rate limit awareness and queuing
- [ ] Model fallback chains (use gpt4 if gemini fails)
- [ ] Integration with Jarvis memory system
- [ ] Webhook notifications on completion
- [ ] Result comparison and ranking

---

## License

Part of the Jarvis AI system - internal use only

---

## Support

For issues or questions, see the main Jarvis documentation or contact the development team.

**Related Documentation:**
- `/Users/benkennon/Jarvis/README.md` - Main Jarvis docs
- `/Users/benkennon/Jarvis/scripts/memory/` - Memory system integration
- `/Users/benkennon/ai-dawg-v0.1/CHATGPT_SECURITY_ENHANCEMENTS.md` - Security guidelines
