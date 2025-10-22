#!/usr/bin/env node

/**
 * Jarvis AI Orchestration CLI
 *
 * Runs prompts through multiple AI models (Gemini, Codex, etc.) with:
 * - Configurable timeout (default 60s, max 120s)
 * - Asynchronous model execution
 * - Partial results if some models fail
 * - Automatic retry logic (max 2 retries per model)
 * - Comprehensive logging
 *
 * Usage:
 *   node orchestrate-cli.js --prompt "Your prompt here" --models gemini,codex --timeout 60
 *   node orchestrate-cli.js --file prompt.txt --models gemini --retries 2
 */

const fs = require('fs');
const path = require('path');

// Import model adapters for real API calls
// Set USE_MOCK_MODELS=true to use simulated responses for testing
const USE_MOCK = process.env.USE_MOCK_MODELS === 'true';
const modelAdapters = USE_MOCK ? null : require('./model-adapters-v2');

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  DEFAULT_TIMEOUT: 60000,      // 60 seconds
  MAX_TIMEOUT: 120000,         // 120 seconds
  DEFAULT_MAX_RETRIES: 2,
  RETRY_BACKOFF_MS: 1000,      // Start with 1s backoff
  SUPPORTED_MODELS: ['gemini', 'codex', 'claude', 'gpt4'],
  LOG_LEVEL: process.env.LOG_LEVEL || 'info', // debug, info, warn, error
};

// ============================================================================
// Logging Utilities
// ============================================================================

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLogLevel = LOG_LEVELS[CONFIG.LOG_LEVEL] || LOG_LEVELS.info;

function log(level, message, data = null) {
  if (LOG_LEVELS[level] < currentLogLevel) return;

  const timestamp = new Date().toISOString();
  const prefix = {
    debug: '🔍 [DEBUG]',
    info: 'ℹ️  [INFO]',
    warn: '⚠️  [WARN]',
    error: '❌ [ERROR]',
  }[level];

  console.log(`${timestamp} ${prefix} ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// ============================================================================
// Model Execution Functions
// ============================================================================

/**
 * Execute a prompt with a specific AI model
 * @param {string} model - Model name (gemini, codex, etc.)
 * @param {string} prompt - The prompt to send
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Object>} - Result with model response
 */
async function executeModelCall(model, prompt, timeout) {
  log('debug', `Executing model call: ${model}`, { promptLength: prompt.length, timeout });

  // Use real API adapters if not in mock mode
  if (!USE_MOCK && modelAdapters) {
    try {
      return await modelAdapters.executeModelCall(model, prompt, timeout);
    } catch (error) {
      throw new Error(`${model} API error: ${error.message}`);
    }
  }

  // Mock implementation for testing without API keys
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Timeout after ${timeout}ms`));
    }, timeout);

    // Simulate API call
    const apiCallDuration = Math.random() * (timeout * 0.8); // Random duration up to 80% of timeout

    setTimeout(() => {
      clearTimeout(timeoutId);

      // Simulate occasional failures (10% chance)
      if (Math.random() < 0.1) {
        reject(new Error(`${model} API error: Rate limit exceeded`));
        return;
      }

      // Success
      resolve({
        model,
        response: `[MOCK ${model}] Response to: "${prompt.substring(0, 50)}..."`,
        timestamp: new Date().toISOString(),
        duration: Math.round(apiCallDuration),
      });
    }, apiCallDuration);
  });
}

/**
 * Execute model with retry logic
 * @param {string} model - Model name
 * @param {string} prompt - The prompt
 * @param {number} timeout - Timeout in milliseconds
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<Object>} - Result or error
 */
async function executeWithRetry(model, prompt, timeout, maxRetries) {
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Apply exponential backoff for retries
      if (attempt > 0) {
        const backoffMs = CONFIG.RETRY_BACKOFF_MS * Math.pow(2, attempt - 1);
        log('info', `🔄 Retrying ${model} (attempt ${attempt + 1}/${maxRetries + 1}) after ${backoffMs}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }

      const startTime = Date.now();
      const result = await executeModelCall(model, prompt, timeout);
      const duration = Date.now() - startTime;

      // Log recovery if it was a retry
      if (attempt > 0) {
        log('info', `✅ ${model} recovered on attempt ${attempt + 1}`, { duration });
      } else {
        log('info', `✅ ${model} succeeded`, { duration });
      }

      return {
        success: true,
        model,
        result,
        attempts: attempt + 1,
        duration,
      };
    } catch (error) {
      lastError = error;
      log('warn', `${model} failed (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}`);
    }
  }

  // All retries exhausted
  log('error', `🚨 ${model} failed after ${maxRetries + 1} attempts`, { error: lastError.message });

  return {
    success: false,
    model,
    error: lastError.message,
    attempts: maxRetries + 1,
  };
}

/**
 * Orchestrate multiple models in parallel
 * @param {string[]} models - Array of model names
 * @param {string} prompt - The prompt
 * @param {number} timeout - Timeout per model
 * @param {number} maxRetries - Max retries per model
 * @returns {Promise<Object>} - Results from all models
 */
async function orchestrateModels(models, prompt, timeout, maxRetries) {
  log('info', `🚀 Starting orchestration with ${models.length} model(s)`, {
    models,
    timeout,
    maxRetries,
    promptLength: prompt.length,
  });

  const startTime = Date.now();

  // Execute all models in parallel
  const results = await Promise.allSettled(
    models.map(model => executeWithRetry(model, prompt, timeout, maxRetries))
  );

  // Separate successes from failures
  const successes = [];
  const failures = [];

  results.forEach((result, index) => {
    const modelResult = result.status === 'fulfilled' ? result.value : null;

    if (result.status === 'fulfilled' && modelResult.success) {
      successes.push(modelResult);
    } else {
      failures.push({
        model: models[index],
        error: modelResult?.error || result.reason?.message || 'Unknown error',
      });
    }
  });

  const totalDuration = Date.now() - startTime;

  // Log summary
  log('info', `📊 Orchestration complete`, {
    total: models.length,
    succeeded: successes.length,
    failed: failures.length,
    duration: totalDuration,
  });

  if (successes.length > 0) {
    log('info', `✅ Successful models: ${successes.map(s => s.model).join(', ')}`);
  }

  if (failures.length > 0) {
    log('warn', `❌ Failed models: ${failures.map(f => f.model).join(', ')}`);
  }

  return {
    success: successes.length > 0, // Partial success if at least one model succeeded
    totalModels: models.length,
    successCount: successes.length,
    failureCount: failures.length,
    results: successes,
    failures,
    duration: totalDuration,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    prompt: null,
    file: null,
    models: ['gemini'], // Default to Gemini
    timeout: CONFIG.DEFAULT_TIMEOUT,
    retries: CONFIG.DEFAULT_MAX_RETRIES,
    output: null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--prompt':
      case '-p':
        parsed.prompt = args[++i];
        break;
      case '--file':
      case '-f':
        parsed.file = args[++i];
        break;
      case '--models':
      case '-m':
        parsed.models = args[++i].split(',').map(m => m.trim().toLowerCase());
        break;
      case '--timeout':
      case '-t':
        parsed.timeout = Math.min(parseInt(args[++i], 10), CONFIG.MAX_TIMEOUT);
        break;
      case '--retries':
      case '-r':
        parsed.retries = parseInt(args[++i], 10);
        break;
      case '--output':
      case '-o':
        parsed.output = args[++i];
        break;
      case '--help':
      case '-h':
        parsed.help = true;
        break;
      default:
        log('warn', `Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function showHelp() {
  console.log(`
🧠 Jarvis AI Orchestration CLI

Usage:
  node orchestrate-cli.js [options]

Options:
  -p, --prompt <text>       Prompt to send to AI models
  -f, --file <path>         Read prompt from file
  -m, --models <list>       Comma-separated list of models (default: gemini)
                            Supported: ${CONFIG.SUPPORTED_MODELS.join(', ')}
  -t, --timeout <ms>        Timeout per model in milliseconds (default: ${CONFIG.DEFAULT_TIMEOUT}, max: ${CONFIG.MAX_TIMEOUT})
  -r, --retries <n>         Max retries per model (default: ${CONFIG.DEFAULT_MAX_RETRIES})
  -o, --output <path>       Save results to file
  -h, --help                Show this help message

Examples:
  # Single model with custom timeout
  node orchestrate-cli.js -p "Explain quantum computing" -m gemini -t 60000

  # Multiple models with retries
  node orchestrate-cli.js -p "Write a poem" -m gemini,codex,claude -r 3

  # Read from file and save output
  node orchestrate-cli.js -f prompt.txt -m gemini,gpt4 -o results.json

Environment Variables:
  LOG_LEVEL=debug|info|warn|error  Set logging verbosity (default: info)
`);
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  // Validate prompt
  let prompt = args.prompt;

  if (args.file) {
    try {
      prompt = fs.readFileSync(args.file, 'utf-8').trim();
      log('info', `📄 Loaded prompt from file: ${args.file}`);
    } catch (error) {
      log('error', `Failed to read prompt file: ${args.file}`, { error: error.message });
      process.exit(1);
    }
  }

  if (!prompt) {
    log('error', 'No prompt provided. Use --prompt or --file');
    showHelp();
    process.exit(1);
  }

  // Validate models
  const invalidModels = args.models.filter(m => !CONFIG.SUPPORTED_MODELS.includes(m));
  if (invalidModels.length > 0) {
    log('error', `Unsupported models: ${invalidModels.join(', ')}`);
    log('info', `Supported models: ${CONFIG.SUPPORTED_MODELS.join(', ')}`);
    process.exit(1);
  }

  // Execute orchestration
  try {
    const results = await orchestrateModels(args.models, prompt, args.timeout, args.retries);

    // Save output if requested
    if (args.output) {
      try {
        fs.writeFileSync(args.output, JSON.stringify(results, null, 2), 'utf-8');
        log('info', `💾 Results saved to: ${args.output}`);
      } catch (error) {
        log('error', `Failed to save output file: ${args.output}`, { error: error.message });
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 ORCHESTRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Models:     ${results.totalModels}`);
    console.log(`Succeeded:        ${results.successCount} ✅`);
    console.log(`Failed:           ${results.failureCount} ❌`);
    console.log(`Total Duration:   ${results.duration}ms`);
    console.log('='.repeat(60));

    if (results.results.length > 0) {
      console.log('\n✅ SUCCESSFUL RESPONSES:\n');
      results.results.forEach(r => {
        console.log(`[${r.model}] (${r.duration}ms, ${r.attempts} attempt(s))`);
        console.log(r.result.response);
        console.log('');
      });
    }

    if (results.failures.length > 0) {
      console.log('\n❌ FAILED MODELS:\n');
      results.failures.forEach(f => {
        console.log(`[${f.model}] ${f.error}`);
      });
      console.log('');
    }

    // Exit with error code if all models failed
    process.exit(results.success ? 0 : 1);
  } catch (error) {
    log('error', 'Orchestration failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    log('error', 'Unhandled error in main', { error: error.message, stack: error.stack });
    process.exit(1);
  });
}

// Export for testing
module.exports = {
  orchestrateModels,
  executeWithRetry,
  executeModelCall,
  CONFIG,
};
