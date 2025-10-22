#!/usr/bin/env node

/**
 * Jarvis AI Orchestration CLI - Production Grade
 *
 * Multi-model AI orchestration with:
 * - Truly concurrent execution (Promise.allSettled)
 * - Comprehensive error handling and retry logic
 * - Partial success support (succeeds if ≥1 model succeeds)
 * - Detailed structured logging with model prefixes
 * - Smart timeout and backoff configuration
 * - Mock mode for testing without API keys
 *
 * Usage:
 *   node orchestrate-cli.js --prompt "Your prompt here" --models gemini,claude --timeout 60000
 *   node orchestrate-cli.js --file prompt.txt --models gemini --retries 2
 *   USE_MOCK_MODELS=true node orchestrate-cli.js -p "Test" -m gemini,claude
 */

const fs = require('fs');
const path = require('path');

// Import model adapters for real API calls
// Set USE_MOCK_MODELS=true to use simulated responses for testing
const USE_MOCK = process.env.USE_MOCK_MODELS === 'true';
const modelAdapters = USE_MOCK ? null : require('./model-adapters-v2-improved');

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  DEFAULT_TIMEOUT: 60000,      // 60 seconds
  MAX_TIMEOUT: 120000,         // 120 seconds
  DEFAULT_MAX_RETRIES: 2,
  RETRY_BACKOFF_BASE_MS: 1000, // Start with 1s backoff
  RETRY_BACKOFF_MAX_MS: 8000,  // Cap at 8s
  SUPPORTED_MODELS: ['gemini', 'codex', 'claude', 'gpt4'],
  LOG_LEVEL: process.env.LOG_LEVEL || 'info', // debug, info, warn, error
};

// ============================================================================
// Logging Utilities with Structured Output
// ============================================================================

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLogLevel = LOG_LEVELS[CONFIG.LOG_LEVEL] || LOG_LEVELS.info;

/**
 * Structured logging function
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} data - Structured data
 */
function log(level, message, data = null) {
  if (LOG_LEVELS[level] < currentLogLevel) return;

  const timestamp = new Date().toISOString();
  const prefix = {
    debug: '🔍 [DEBUG]',
    info: 'ℹ️  [INFO]',
    warn: '⚠️  [WARN]',
    error: '❌ [ERROR]',
  }[level] || 'ℹ️  [INFO]';

  const logEntry = {
    timestamp,
    level,
    message,
    ...data,
  };

  // Write to stderr to not interfere with stdout JSON output
  console.error(`${timestamp} ${prefix} ${message}`);

  if (data && currentLogLevel <= LOG_LEVELS.debug) {
    console.error(JSON.stringify(logEntry, null, 2));
  }
}

/**
 * Log with model-specific prefix
 * @param {string} level - Log level
 * @param {string} model - Model name
 * @param {string} message - Message
 * @param {Object} data - Additional data
 */
function logModel(level, model, message, data = null) {
  const modelPrefix = `[${model.toUpperCase()}]`;
  log(level, `${modelPrefix} ${message}`, data);
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
  logModel('debug', model, `Starting execution`, {
    promptLength: prompt.length,
    timeout,
  });

  // Use real API adapters if not in mock mode
  if (!USE_MOCK && modelAdapters) {
    try {
      const result = await modelAdapters.executeModelCall(model, prompt, timeout);

      if (result.success) {
        logModel('info', model, `✅ Execution succeeded`, {
          duration: result.durationMs,
          outputLength: result.output?.length,
        });
      } else {
        logModel('error', model, `❌ Execution failed`, {
          error: result.error,
          errorType: result.errorType,
          duration: result.durationMs,
        });
      }

      return result;
    } catch (error) {
      logModel('error', model, `API error`, {
        error: error.message,
      });

      return {
        success: false,
        model,
        error: error.message,
        errorType: 'api_error',
        durationMs: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Mock implementation for testing without API keys
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Timeout after ${timeout}ms`));
    }, timeout);

    // Simulate API call with random duration
    const apiCallDuration = Math.random() * (timeout * 0.8);

    setTimeout(() => {
      clearTimeout(timeoutId);

      // Simulate occasional failures (10% chance)
      if (Math.random() < 0.1) {
        logModel('error', model, `[MOCK] Simulated failure`);
        resolve({
          success: false,
          model,
          error: 'Rate limit exceeded (simulated)',
          errorType: 'rate_limit_error',
          durationMs: Math.round(apiCallDuration),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Success
      logModel('info', model, `[MOCK] Simulated success`, {
        duration: Math.round(apiCallDuration),
      });

      resolve({
        success: true,
        model,
        output: `[MOCK ${model}] Response to: "${prompt.substring(0, 50)}..."`,
        durationMs: Math.round(apiCallDuration),
        timestamp: new Date().toISOString(),
      });
    }, apiCallDuration);
  });
}

/**
 * Execute model with orchestrator-level retry logic
 * Note: Model adapters have their own retry logic for API failures
 * This adds an additional layer for orchestration-level retry
 * @param {string} model - Model name
 * @param {string} prompt - The prompt
 * @param {number} timeout - Timeout in milliseconds
 * @param {number} maxRetries - Maximum retry attempts at orchestrator level
 * @returns {Promise<Object>} - Result or error
 */
async function executeWithRetry(model, prompt, timeout, maxRetries) {
  let lastResult = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Apply exponential backoff for retries
      if (attempt > 0) {
        const backoffMs = Math.min(
          CONFIG.RETRY_BACKOFF_BASE_MS * Math.pow(2, attempt - 1),
          CONFIG.RETRY_BACKOFF_MAX_MS
        );

        logModel('info', model, `🔄 Orchestrator retry`, {
          attempt: attempt + 1,
          maxAttempts: maxRetries + 1,
          backoffMs,
          previousError: lastResult?.error || 'unknown',
        });

        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }

      const startTime = Date.now();
      const result = await executeModelCall(model, prompt, timeout);
      const totalDuration = Date.now() - startTime;

      // Check if successful
      if (result.success) {
        if (attempt > 0) {
          logModel('info', model, `✅ Recovered on orchestrator retry ${attempt + 1}`, {
            totalDuration,
          });
        }

        return {
          success: true,
          model,
          result,
          attempts: attempt + 1,
          duration: totalDuration,
        };
      }

      // Store failed result
      lastResult = result;

      // Don't retry on non-retryable errors (auth, invalid request, etc.)
      if (result.errorType === 'auth_error' ||
          result.errorType === 'invalid_request_error' ||
          result.errorType === 'not_found_error') {
        logModel('error', model, `Non-retryable error, aborting`, {
          errorType: result.errorType,
          error: result.error,
        });
        break;
      }

      logModel('warn', model, `Attempt ${attempt + 1}/${maxRetries + 1} failed`, {
        error: result.error,
        errorType: result.errorType,
      });
    } catch (error) {
      lastResult = {
        success: false,
        model,
        error: error.message,
        errorType: 'unknown_error',
      };

      logModel('error', model, `Exception in attempt ${attempt + 1}/${maxRetries + 1}`, {
        error: error.message,
      });
    }
  }

  // All retries exhausted
  logModel('error', model, `🚨 Failed after ${maxRetries + 1} orchestrator attempts`, {
    finalError: lastResult?.error || 'unknown',
    errorType: lastResult?.errorType || 'unknown',
  });

  return {
    success: false,
    model,
    error: lastResult?.error || 'All attempts failed',
    errorType: lastResult?.errorType || 'unknown_error',
    attempts: maxRetries + 1,
  };
}

/**
 * Orchestrate multiple models in parallel with Promise.allSettled
 * Returns partial success if ≥1 model succeeds
 * @param {string[]} models - Array of model names
 * @param {string} prompt - The prompt
 * @param {number} timeout - Timeout per model
 * @param {number} maxRetries - Max retries per model
 * @returns {Promise<Object>} - Comprehensive results from all models
 */
async function orchestrateModels(models, prompt, timeout, maxRetries) {
  log('info', `🚀 Starting orchestration`, {
    models,
    modelCount: models.length,
    timeout,
    maxRetries,
    promptLength: prompt.length,
    mockMode: USE_MOCK,
  });

  const startTime = Date.now();

  // Log individual model starts
  models.forEach(model => {
    logModel('info', model, `Starting concurrent execution`);
  });

  // Execute all models in parallel with Promise.allSettled
  const results = await Promise.allSettled(
    models.map(model => executeWithRetry(model, prompt, timeout, maxRetries))
  );

  // Separate successes from failures
  const successes = [];
  const failures = [];

  results.forEach((result, index) => {
    const modelName = models[index];

    if (result.status === 'fulfilled') {
      const modelResult = result.value;

      if (modelResult.success) {
        successes.push(modelResult);
        logModel('info', modelName, `✅ Completed successfully`, {
          attempts: modelResult.attempts,
          duration: modelResult.duration,
        });
      } else {
        failures.push({
          model: modelName,
          error: modelResult.error,
          errorType: modelResult.errorType,
          attempts: modelResult.attempts,
        });
        logModel('error', modelName, `❌ Failed`, {
          error: modelResult.error,
          errorType: modelResult.errorType,
        });
      }
    } else {
      // Promise rejected (shouldn't happen with our error handling, but be safe)
      failures.push({
        model: modelName,
        error: result.reason?.message || 'Promise rejected',
        errorType: 'promise_rejection',
      });
      logModel('error', modelName, `❌ Promise rejected`, {
        error: result.reason?.message,
      });
    }
  });

  const totalDuration = Date.now() - startTime;

  // Prepare result summary
  const summary = {
    success: successes.map(s => s.model),
    failed: failures.map(f => f.model),
    durationMs: totalDuration,
  };

  // Log orchestration summary
  log('info', `📊 Orchestration complete`, {
    total: models.length,
    succeeded: successes.length,
    failed: failures.length,
    duration: totalDuration,
    summary,
  });

  if (successes.length > 0) {
    log('info', `✅ Successful models: ${successes.map(s => s.model).join(', ')}`);
  }

  if (failures.length > 0) {
    log('warn', `❌ Failed models: ${failures.map(f => `${f.model} (${f.errorType})`).join(', ')}`);
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
    summary, // For easy programmatic access
  };
}

// ============================================================================
// CLI Argument Parsing with Validation
// ============================================================================

/**
 * Parse command line arguments
 * @returns {Object} - Parsed arguments
 */
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
        if (i + 1 >= args.length) {
          throw new Error('--prompt requires a value');
        }
        parsed.prompt = args[++i];
        break;

      case '--file':
      case '-f':
        if (i + 1 >= args.length) {
          throw new Error('--file requires a value');
        }
        parsed.file = args[++i];
        break;

      case '--models':
      case '-m':
        if (i + 1 >= args.length) {
          throw new Error('--models requires a value');
        }
        parsed.models = args[++i]
          .split(',')
          .map(m => m.trim().toLowerCase())
          .filter(m => m.length > 0);
        break;

      case '--timeout':
      case '-t':
        if (i + 1 >= args.length) {
          throw new Error('--timeout requires a value');
        }
        const timeoutValue = parseInt(args[++i], 10);
        if (isNaN(timeoutValue) || timeoutValue <= 0) {
          throw new Error('--timeout must be a positive number');
        }
        parsed.timeout = Math.min(timeoutValue, CONFIG.MAX_TIMEOUT);
        break;

      case '--retries':
      case '-r':
        if (i + 1 >= args.length) {
          throw new Error('--retries requires a value');
        }
        const retriesValue = parseInt(args[++i], 10);
        if (isNaN(retriesValue) || retriesValue < 0) {
          throw new Error('--retries must be a non-negative number');
        }
        parsed.retries = retriesValue;
        break;

      case '--output':
      case '-o':
        if (i + 1 >= args.length) {
          throw new Error('--output requires a value');
        }
        parsed.output = args[++i];
        break;

      case '--help':
      case '-h':
        parsed.help = true;
        break;

      default:
        log('warn', `Unknown argument: ${arg}`, { arg });
    }
  }

  return parsed;
}

/**
 * Display help message
 */
function showHelp() {
  console.log(`
🧠 Jarvis AI Orchestration CLI - Production Grade

Usage:
  node orchestrate-cli.js [options]

Options:
  -p, --prompt <text>       Prompt to send to AI models
  -f, --file <path>         Read prompt from file
  -m, --models <list>       Comma-separated list of models (default: gemini)
                            Supported: ${CONFIG.SUPPORTED_MODELS.join(', ')}
  -t, --timeout <ms>        Timeout per model in milliseconds
                            (default: ${CONFIG.DEFAULT_TIMEOUT}, max: ${CONFIG.MAX_TIMEOUT})
  -r, --retries <n>         Max retries per model at orchestrator level
                            (default: ${CONFIG.DEFAULT_MAX_RETRIES})
                            Note: Model adapters have their own retry logic
  -o, --output <path>       Save results to JSON file
  -h, --help                Show this help message

Examples:
  # Single model with custom timeout
  node orchestrate-cli.js -p "Explain quantum computing" -m gemini -t 60000

  # Multiple models with retries
  node orchestrate-cli.js -p "Write a poem" -m gemini,claude,gpt4 -r 2

  # Read from file and save output
  node orchestrate-cli.js -f prompt.txt -m gemini,gpt4 -o results.json

  # Mock mode for testing (no API keys required)
  USE_MOCK_MODELS=true node orchestrate-cli.js -p "Test" -m gemini,claude

Environment Variables:
  LOG_LEVEL=debug|info|warn|error    Set logging verbosity (default: info)
  USE_MOCK_MODELS=true               Use mock responses for testing

Exit Codes:
  0 - Success (at least one model succeeded)
  1 - Failure (all models failed or validation error)
`);
}

// ============================================================================
// Main Execution
// ============================================================================

/**
 * Main orchestration function
 */
async function main() {
  try {
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
        log('info', `📄 Loaded prompt from file`, {
          file: args.file,
          promptLength: prompt.length,
        });
      } catch (error) {
        log('error', `Failed to read prompt file`, {
          file: args.file,
          error: error.message,
        });
        process.exit(1);
      }
    }

    if (!prompt || prompt.length === 0) {
      log('error', 'No prompt provided. Use --prompt or --file');
      showHelp();
      process.exit(1);
    }

    // Validate models
    const invalidModels = args.models.filter(m => !CONFIG.SUPPORTED_MODELS.includes(m));
    if (invalidModels.length > 0) {
      log('error', `Unsupported models`, {
        invalidModels,
        supportedModels: CONFIG.SUPPORTED_MODELS,
      });
      process.exit(1);
    }

    if (args.models.length === 0) {
      log('error', 'No models specified. Use --models');
      showHelp();
      process.exit(1);
    }

    // Execute orchestration
    const results = await orchestrateModels(args.models, prompt, args.timeout, args.retries);

    // Save output if requested
    if (args.output) {
      try {
        const outputData = {
          ...results,
          config: {
            models: args.models,
            timeout: args.timeout,
            retries: args.retries,
            mockMode: USE_MOCK,
          },
          prompt: prompt.substring(0, 200), // Include truncated prompt for reference
        };

        fs.writeFileSync(args.output, JSON.stringify(outputData, null, 2), 'utf-8');
        log('info', `💾 Results saved`, {
          file: args.output,
          size: fs.statSync(args.output).size,
        });
      } catch (error) {
        log('error', `Failed to save output file`, {
          file: args.output,
          error: error.message,
        });
      }
    }

    // Print summary to stdout (can be captured separately from stderr logs)
    const summaryOutput = {
      success: results.success,
      summary: results.summary,
      totalDuration: results.duration,
      successCount: results.successCount,
      failureCount: results.failureCount,
      timestamp: results.timestamp,
    };

    console.log('\n' + '='.repeat(70));
    console.log('📊 ORCHESTRATION SUMMARY');
    console.log('='.repeat(70));
    console.log(JSON.stringify(summaryOutput, null, 2));
    console.log('='.repeat(70));

    if (results.results.length > 0) {
      console.log('\n✅ SUCCESSFUL RESPONSES:\n');
      results.results.forEach(r => {
        console.log(`[${r.model}] (${r.duration}ms, ${r.attempts} attempt(s))`);
        console.log(r.result.output || r.result.response);
        console.log('');
      });
    }

    if (results.failures.length > 0) {
      console.log('\n❌ FAILED MODELS:\n');
      results.failures.forEach(f => {
        console.log(`[${f.model}] ${f.errorType}: ${f.error}`);
      });
      console.log('');
    }

    // Log exit decision
    const exitCode = results.success ? 0 : 1;
    log('info', `Exiting with code ${exitCode}`, {
      reason: results.success ? 'At least one model succeeded' : 'All models failed',
    });

    process.exit(exitCode);
  } catch (error) {
    log('error', 'Orchestration failed', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    log('error', 'Unhandled error in main', {
      error: error.message,
      stack: error.stack,
    });
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

/*
 * ============================================================================
 * CHANGELOG - orchestrate-cli-improved.js
 * ============================================================================
 *
 * FIXED:
 * - ✅ Argument parsing now validates all inputs with clear error messages
 * - ✅ Timeout capped at CONFIG.MAX_TIMEOUT with validation
 * - ✅ Retries validated to be non-negative numbers
 * - ✅ Model list validated to contain only supported models
 * - ✅ Exit code logic explicitly logged before process.exit()
 * - ✅ Promise.allSettled already used correctly (no changes needed)
 * - ✅ Non-retryable errors now abort retry loop early
 *
 * ADDED:
 * - ✅ Model-specific logging with [MODEL] prefixes
 * - ✅ Structured JSON output for programmatic use
 * - ✅ Per-model execution start logs
 * - ✅ Comprehensive timing metrics (per-model and total)
 * - ✅ Error type tracking in failure summaries
 * - ✅ Summary object for easy programmatic access
 * - ✅ Better help text with examples and exit codes
 * - ✅ Mock mode indicator in logs and output
 * - ✅ Truncated prompt in saved output for reference
 *
 * OPTIMIZED:
 * - ✅ Exponential backoff capped at 8s to prevent excessive delays
 * - ✅ Early abort on non-retryable errors (auth, invalid request, not found)
 * - ✅ Logging respects LOG_LEVEL environment variable
 * - ✅ Stderr for logs, stdout for results (easier parsing)
 * - ✅ Clearer separation of adapter vs orchestrator retry logic
 * - ✅ More detailed orchestration summary
 *
 * REMOVED:
 * - ✅ Redundant error handling code (consolidated)
 * - ✅ Unnecessary console.log statements (use structured logging)
 */
