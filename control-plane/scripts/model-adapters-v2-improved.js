/**
 * AI Model Adapters v2 - Production Grade
 *
 * Enhanced adapter functions with:
 * - Built-in retry logic with exponential backoff
 * - Comprehensive error categorization
 * - Detailed structured logging
 * - Graceful degradation
 * - Non-retryable error detection
 */

const https = require('https');
const http = require('http');

// ============================================================================
// Configuration from Environment
// ============================================================================

const API_KEYS = {
  gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY,
  codex: process.env.OPENAI_API_KEY,
  gpt4: process.env.OPENAI_API_KEY,
  claude: process.env.ANTHROPIC_API_KEY,
};

const API_ENDPOINTS = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
  codex: 'https://api.openai.com/v1/completions',
  gpt4: 'https://api.openai.com/v1/chat/completions',
  claude: 'https://api.anthropic.com/v1/messages',
};

const RETRY_CONFIG = {
  maxRetries: 2,
  baseBackoffMs: 1000, // Start with 1s
  maxBackoffMs: 8000,  // Cap at 8s
};

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

// ============================================================================
// Error Classification
// ============================================================================

const ERROR_TYPES = {
  AUTH: 'auth_error',
  RATE_LIMIT: 'rate_limit_error',
  TIMEOUT: 'timeout_error',
  INVALID_REQUEST: 'invalid_request_error',
  API_ERROR: 'api_error',
  NETWORK_ERROR: 'network_error',
  PARSE_ERROR: 'parse_error',
  NOT_FOUND: 'not_found_error',
  OVERLOADED: 'overloaded_error',
};

/**
 * Classify error for retry logic
 * @param {Error} error - The error object
 * @param {number} statusCode - HTTP status code if available
 * @returns {Object} - Classification result
 */
function classifyError(error, statusCode = null) {
  const message = error.message || '';
  const code = error.code || '';

  // Authentication errors (don't retry)
  if (statusCode === 401 || statusCode === 403 ||
      message.includes('Invalid API key') ||
      message.includes('authentication') ||
      message.includes('unauthorized')) {
    return { type: ERROR_TYPES.AUTH, retryable: false };
  }

  // Rate limit errors (retry with backoff)
  if (statusCode === 429 ||
      message.includes('rate limit') ||
      message.includes('too many requests')) {
    return { type: ERROR_TYPES.RATE_LIMIT, retryable: true };
  }

  // Timeout errors (retry)
  if (message.includes('timeout') ||
      message.includes('ETIMEDOUT') ||
      code === 'ETIMEDOUT') {
    return { type: ERROR_TYPES.TIMEOUT, retryable: true };
  }

  // Invalid request errors (don't retry)
  if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
    return { type: ERROR_TYPES.INVALID_REQUEST, retryable: false };
  }

  // Not found errors (don't retry)
  if (statusCode === 404 || message.includes('not found')) {
    return { type: ERROR_TYPES.NOT_FOUND, retryable: false };
  }

  // Server overloaded (retry)
  if (statusCode === 503 ||
      message.includes('overloaded') ||
      message.includes('capacity')) {
    return { type: ERROR_TYPES.OVERLOADED, retryable: true };
  }

  // Network errors (retry)
  if (code === 'ECONNREFUSED' ||
      code === 'ENOTFOUND' ||
      code === 'ECONNRESET' ||
      message.includes('socket hang up')) {
    return { type: ERROR_TYPES.NETWORK_ERROR, retryable: true };
  }

  // API errors (retry)
  if (statusCode >= 500) {
    return { type: ERROR_TYPES.API_ERROR, retryable: true };
  }

  // Parse errors (don't retry)
  if (message.includes('parse') || message.includes('JSON')) {
    return { type: ERROR_TYPES.PARSE_ERROR, retryable: false };
  }

  // Default to retryable API error
  return { type: ERROR_TYPES.API_ERROR, retryable: true };
}

// ============================================================================
// Structured Logging Utility
// ============================================================================

/**
 * Structured logging with model-specific prefixes
 * @param {string} level - Log level (debug, info, warn, error)
 * @param {string} model - Model name
 * @param {string} message - Log message
 * @param {Object} data - Additional structured data
 */
function log(level, model, message, data = null) {
  const currentLevel = LOG_LEVELS[LOG_LEVEL] || LOG_LEVELS.info;
  const messageLevel = LOG_LEVELS[level] || LOG_LEVELS.info;

  if (messageLevel < currentLevel) return;

  const timestamp = new Date().toISOString();
  const prefix = {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
  }[level] || 'ℹ️';

  const modelPrefix = `[${model.toUpperCase()}]`;

  const logData = {
    timestamp,
    level,
    model,
    message,
    ...data,
  };

  // Console.error for stderr (doesn't interfere with stdout JSON output)
  console.error(`${timestamp} ${prefix} ${modelPrefix} ${message}`);

  if (data && messageLevel >= LOG_LEVELS.debug) {
    console.error(JSON.stringify(logData, null, 2));
  }
}

// ============================================================================
// HTTP Request Utility with Enhanced Error Handling
// ============================================================================

/**
 * Make an HTTP request with timeout and detailed error capture
 * @param {Object} options - Request options
 * @param {string} data - Request body
 * @param {number} timeout - Timeout in ms
 * @param {string} model - Model name for logging
 * @returns {Promise<Object>} - Response data with metadata
 */
function makeRequest(options, data, timeout, model) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    const startTime = Date.now();

    log('debug', model, `Making request`, {
      url: `${options.hostname}${options.path}`,
      method: options.method,
      timeout,
    });

    const req = protocol.request(options, (res) => {
      let body = '';

      res.on('data', chunk => {
        body += chunk;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;

        try {
          const parsed = JSON.parse(body);

          if (res.statusCode >= 200 && res.statusCode < 300) {
            log('debug', model, `Request succeeded`, {
              statusCode: res.statusCode,
              duration,
              bodyLength: body.length,
            });
            resolve({ data: parsed, statusCode: res.statusCode, duration });
          } else {
            // Extract error details
            const errorMsg = parsed.error?.message ||
                           parsed.error?.type ||
                           parsed.message ||
                           body.substring(0, 200);

            const errorType = parsed.error?.type || 'unknown';
            const errorCode = parsed.error?.code || res.statusCode;

            log('error', model, `HTTP ${res.statusCode} error`, {
              statusCode: res.statusCode,
              errorType,
              errorCode,
              error: errorMsg,
              duration,
            });

            const error = new Error(`HTTP ${res.statusCode}: ${errorMsg}`);
            error.statusCode = res.statusCode;
            error.errorType = errorType;
            error.errorCode = errorCode;
            error.duration = duration;

            reject(error);
          }
        } catch (parseError) {
          log('error', model, `Failed to parse response`, {
            parseError: parseError.message,
            rawBody: body.substring(0, 500),
            statusCode: res.statusCode,
            duration,
          });

          const error = new Error(`Failed to parse response: ${parseError.message}`);
          error.statusCode = res.statusCode;
          error.duration = duration;

          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      const duration = Date.now() - startTime;

      log('error', model, `Request error`, {
        error: error.message,
        code: error.code,
        duration,
      });

      error.duration = duration;
      reject(error);
    });

    // Set timeout
    req.setTimeout(timeout, () => {
      req.destroy();
      const duration = Date.now() - startTime;

      log('error', model, `Request timeout`, {
        timeout,
        duration,
      });

      const error = new Error(`Request timeout after ${timeout}ms`);
      error.code = 'ETIMEDOUT';
      error.duration = duration;

      reject(error);
    });

    if (data) {
      req.write(data);
    }

    req.end();
  });
}

// ============================================================================
// Retry Wrapper with Exponential Backoff and Error Classification
// ============================================================================

/**
 * Execute a function with retry logic and smart error handling
 * @param {Function} fn - Async function to execute
 * @param {string} model - Model name for logging
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<any>} - Function result
 */
async function withRetry(fn, model, maxRetries = RETRY_CONFIG.maxRetries) {
  let lastError;
  let errorClassification;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Apply exponential backoff for retries
      if (attempt > 0) {
        const backoffMs = Math.min(
          RETRY_CONFIG.baseBackoffMs * Math.pow(2, attempt - 1),
          RETRY_CONFIG.maxBackoffMs
        );

        log('info', model, `Retrying attempt ${attempt + 1}/${maxRetries + 1}`, {
          attempt: attempt + 1,
          maxAttempts: maxRetries + 1,
          backoffMs,
          previousError: errorClassification?.type || 'unknown',
        });

        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }

      const result = await fn();

      if (attempt > 0) {
        log('info', model, `✅ Recovered on attempt ${attempt + 1}`, {
          attempt: attempt + 1,
          totalAttempts: attempt + 1,
        });
      }

      return result;
    } catch (error) {
      lastError = error;
      errorClassification = classifyError(error, error.statusCode);

      log('warn', model, `Attempt ${attempt + 1}/${maxRetries + 1} failed`, {
        attempt: attempt + 1,
        maxAttempts: maxRetries + 1,
        error: error.message,
        errorType: errorClassification.type,
        retryable: errorClassification.retryable,
        statusCode: error.statusCode,
        duration: error.duration,
      });

      // Don't retry non-retryable errors
      if (!errorClassification.retryable) {
        log('error', model, `Non-retryable error - aborting`, {
          errorType: errorClassification.type,
          error: error.message,
        });
        throw error;
      }
    }
  }

  // All retries exhausted
  log('error', model, `🚨 All ${maxRetries + 1} attempts failed`, {
    totalAttempts: maxRetries + 1,
    finalError: lastError.message,
    errorType: errorClassification?.type || 'unknown',
  });

  throw lastError;
}

// ============================================================================
// Model-Specific Adapters with Built-in Retry
// ============================================================================

/**
 * Google Gemini adapter with retry
 * @param {string} prompt - The prompt
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<Object>} - Normalized response
 */
async function geminiAdapter(prompt, timeout) {
  const apiKey = API_KEYS.gemini;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set in environment');
  }

  return withRetry(async () => {
    const url = new URL(`${API_ENDPOINTS.gemini}?key=${apiKey}`);

    const requestBody = JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    const options = {
      protocol: url.protocol,
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    const { data: response, duration } = await makeRequest(options, requestBody, timeout, 'gemini');

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No text in Gemini response');
    }

    return {
      success: true,
      output: text,
      durationMs: duration,
    };
  }, 'gemini');
}

/**
 * OpenAI GPT-4 adapter with retry
 * @param {string} prompt - The prompt
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<Object>} - Normalized response
 */
async function gpt4Adapter(prompt, timeout) {
  const apiKey = API_KEYS.gpt4;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set in environment');
  }

  return withRetry(async () => {
    const requestBody = JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
    });

    const url = new URL(API_ENDPOINTS.gpt4);

    const options = {
      protocol: url.protocol,
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    const { data: response, duration } = await makeRequest(options, requestBody, timeout, 'gpt4');

    const text = response.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error('No text in GPT-4 response');
    }

    return {
      success: true,
      output: text,
      durationMs: duration,
    };
  }, 'gpt4');
}

/**
 * OpenAI Codex adapter with retry
 * @param {string} prompt - The prompt
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<Object>} - Normalized response
 */
async function codexAdapter(prompt, timeout) {
  const apiKey = API_KEYS.codex;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set in environment');
  }

  return withRetry(async () => {
    const requestBody = JSON.stringify({
      model: 'code-davinci-002',
      prompt: prompt,
      temperature: 0.5,
      max_tokens: 2048,
    });

    const url = new URL(API_ENDPOINTS.codex);

    const options = {
      protocol: url.protocol,
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    const { data: response, duration } = await makeRequest(options, requestBody, timeout, 'codex');

    const text = response.choices?.[0]?.text;

    if (!text) {
      throw new Error('No text in Codex response');
    }

    return {
      success: true,
      output: text,
      durationMs: duration,
    };
  }, 'codex');
}

/**
 * Anthropic Claude adapter with enhanced retry and error handling
 * @param {string} prompt - The prompt
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<Object>} - Normalized response
 */
async function claudeAdapter(prompt, timeout) {
  const apiKey = API_KEYS.claude;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set in environment');
  }

  return withRetry(async () => {
    const requestBody = JSON.stringify({
      model: 'claude-3-7-sonnet-20250201',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
    });

    const url = new URL(API_ENDPOINTS.claude);

    const options = {
      protocol: url.protocol,
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    log('debug', 'claude', 'Sending request to Anthropic API', {
      endpoint: url.toString(),
      promptLength: prompt.length,
      timeout,
    });

    const { data: response, duration } = await makeRequest(options, requestBody, timeout, 'claude');

    // Handle Claude-specific error response format
    if (response.type === 'error') {
      const errorType = response.error?.type || 'unknown_error';
      const errorMsg = response.error?.message || 'Unknown Claude error';
      const errorCode = response.error?.code;

      log('error', 'claude', 'Claude API returned error response', {
        type: errorType,
        code: errorCode,
        message: errorMsg,
      });

      // Classify specific Claude errors
      if (errorType === 'not_found_error') {
        const error = new Error(`Claude API error: ${errorMsg}`);
        error.statusCode = 404;
        throw error;
      } else if (errorType === 'rate_limit_error') {
        const error = new Error(`Claude API error: ${errorMsg}`);
        error.statusCode = 429;
        throw error;
      } else {
        throw new Error(`Claude API error (${errorType}): ${errorMsg}`);
      }
    }

    const text = response.content?.[0]?.text;

    if (!text) {
      log('error', 'claude', 'No text in Claude response', {
        responseType: response.type,
        responseKeys: Object.keys(response),
        contentLength: response.content?.length,
      });
      throw new Error('No text in Claude response');
    }

    log('info', 'claude', `✅ Successfully got response`, {
      outputLength: text.length,
      duration,
    });

    return {
      success: true,
      output: text,
      durationMs: duration,
    };
  }, 'claude', RETRY_CONFIG.maxRetries);
}

// ============================================================================
// Adapter Registry
// ============================================================================

const ADAPTERS = {
  gemini: geminiAdapter,
  codex: codexAdapter,
  gpt4: gpt4Adapter,
  claude: claudeAdapter,
};

/**
 * Get adapter for a specific model
 * @param {string} model - Model name
 * @returns {Function} - Adapter function
 */
function getAdapter(model) {
  const adapter = ADAPTERS[model.toLowerCase()];

  if (!adapter) {
    throw new Error(`No adapter found for model: ${model}`);
  }

  return adapter;
}

/**
 * Execute a model call using the appropriate adapter
 * Consistent interface: returns { success, output, durationMs, error? }
 * @param {string} model - Model name
 * @param {string} prompt - The prompt
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<Object>} - Normalized response
 */
async function executeModelCall(model, prompt, timeout) {
  const adapter = getAdapter(model);
  const startTime = Date.now();

  try {
    const result = await adapter(prompt, timeout);
    const totalDuration = Date.now() - startTime;

    return {
      success: true,
      model,
      output: result.output,
      durationMs: totalDuration,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    const classification = classifyError(error, error.statusCode);

    log('error', model, `Model execution failed`, {
      error: error.message,
      errorType: classification.type,
      duration: totalDuration,
    });

    return {
      success: false,
      model,
      error: error.message,
      errorType: classification.type,
      durationMs: totalDuration,
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  executeModelCall,
  getAdapter,
  classifyError,
  ADAPTERS,
  API_KEYS,
  RETRY_CONFIG,
  ERROR_TYPES,
};

/*
 * ============================================================================
 * CHANGELOG - model-adapters-v2-improved.js
 * ============================================================================
 *
 * FIXED:
 * - ✅ Claude adapter now properly handles response.type === 'error'
 * - ✅ Detects specific Claude error types (not_found_error, rate_limit_error)
 * - ✅ HTTP error responses now include full error details (type, code, message)
 * - ✅ Parse errors no longer retry (non-retryable)
 * - ✅ Auth errors (401/403) no longer retry
 * - ✅ All adapters now return consistent format: { success, output, durationMs, error? }
 *
 * ADDED:
 * - ✅ Error classification system (classifyError function)
 * - ✅ ERROR_TYPES enum for standardized error categories
 * - ✅ Smart retry logic: retryable vs non-retryable errors
 * - ✅ Enhanced structured logging with model-specific prefixes ([CLAUDE], [GEMINI], etc.)
 * - ✅ Duration tracking at both request and adapter levels
 * - ✅ Status code and error type in all error responses
 * - ✅ Max backoff cap (8s) to prevent excessive delays
 * - ✅ Detailed error metadata in all log entries
 *
 * OPTIMIZED:
 * - ✅ Retry logic now skips non-retryable errors (saves time and API calls)
 * - ✅ Exponential backoff capped at reasonable maximum
 * - ✅ Logging respects LOG_LEVEL environment variable
 * - ✅ Consistent return format across all adapters
 * - ✅ Better error messages with context
 *
 * REMOVED:
 * - ✅ Redundant error handling (consolidated into classifyError)
 * - ✅ Duplicate logging code (centralized in log function)
 */
