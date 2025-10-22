/**
 * AI Model Adapters v2
 *
 * Enhanced adapter functions with:
 * - Built-in retry logic per model
 * - Exponential backoff
 * - Detailed error logging
 * - Fallback mechanisms
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
};

// ============================================================================
// Logging Utility
// ============================================================================

function log(level, model, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
  }[level] || 'ℹ️';

  console.error(`${timestamp} ${prefix} [${model.toUpperCase()}] ${message}`);
  if (data) {
    console.error(JSON.stringify(data, null, 2));
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
 * @returns {Promise<Object>} - Response data
 */
function makeRequest(options, data, timeout, model) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    const startTime = Date.now();

    log('debug', model, `Making request to ${options.hostname}${options.path}`);

    const req = protocol.request(options, (res) => {
      let body = '';
      let rawBody = '';

      res.on('data', chunk => {
        rawBody += chunk;
        body += chunk;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;

        try {
          const parsed = JSON.parse(body);

          if (res.statusCode >= 200 && res.statusCode < 300) {
            log('debug', model, `Request succeeded in ${duration}ms`, {
              statusCode: res.statusCode,
              bodyLength: body.length,
            });
            resolve(parsed);
          } else {
            const errorMsg = parsed.error?.message || parsed.error?.type || body.substring(0, 200);
            log('error', model, `HTTP ${res.statusCode} error`, {
              statusCode: res.statusCode,
              error: errorMsg,
              duration,
            });
            reject(new Error(`HTTP ${res.statusCode}: ${errorMsg}`));
          }
        } catch (error) {
          log('error', model, `Failed to parse response`, {
            parseError: error.message,
            rawBody: rawBody.substring(0, 500),
            statusCode: res.statusCode,
          });
          reject(new Error(`Failed to parse response: ${error.message}`));
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
      reject(error);
    });

    // Set timeout
    req.setTimeout(timeout, () => {
      req.destroy();
      const duration = Date.now() - startTime;
      log('error', model, `Request timeout after ${timeout}ms`, { duration });
      reject(new Error(`Request timeout after ${timeout}ms`));
    });

    if (data) {
      req.write(data);
    }

    req.end();
  });
}

// ============================================================================
// Retry Wrapper with Exponential Backoff
// ============================================================================

/**
 * Execute a function with retry logic
 * @param {Function} fn - Async function to execute
 * @param {string} model - Model name for logging
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<any>} - Function result
 */
async function withRetry(fn, model, maxRetries = RETRY_CONFIG.maxRetries) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Apply exponential backoff for retries
      if (attempt > 0) {
        const backoffMs = RETRY_CONFIG.baseBackoffMs * Math.pow(2, attempt - 1);
        log('warn', model, `Retrying attempt ${attempt + 1}/${maxRetries + 1} after ${backoffMs}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }

      const result = await fn();

      if (attempt > 0) {
        log('info', model, `✅ Recovered on attempt ${attempt + 1}`);
      }

      return result;
    } catch (error) {
      lastError = error;
      log('warn', model, `Attempt ${attempt + 1}/${maxRetries + 1} failed: ${error.message}`);

      // Don't retry on certain errors
      if (error.message.includes('401') || error.message.includes('Invalid API key')) {
        log('error', model, `Authentication error - not retrying`);
        throw error;
      }
    }
  }

  // All retries exhausted
  log('error', model, `🚨 All ${maxRetries + 1} attempts failed`, {
    lastError: lastError.message,
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
 * @returns {Promise<string>} - Model response
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

    const response = await makeRequest(options, requestBody, timeout, 'gemini');

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No text in Gemini response');
    }

    return text;
  }, 'gemini');
}

/**
 * OpenAI GPT-4 adapter with retry
 * @param {string} prompt - The prompt
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<string>} - Model response
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

    const response = await makeRequest(options, requestBody, timeout, 'gpt4');

    const text = response.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error('No text in GPT-4 response');
    }

    return text;
  }, 'gpt4');
}

/**
 * OpenAI Codex adapter with retry
 * @param {string} prompt - The prompt
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<string>} - Model response
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

    const response = await makeRequest(options, requestBody, timeout, 'codex');

    const text = response.choices?.[0]?.text;

    if (!text) {
      throw new Error('No text in Codex response');
    }

    return text;
  }, 'codex');
}

/**
 * Anthropic Claude adapter with enhanced retry and error handling
 * @param {string} prompt - The prompt
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<string>} - Model response
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

    const response = await makeRequest(options, requestBody, timeout, 'claude');

    // Handle Claude-specific response format
    if (response.type === 'error') {
      const errorMsg = response.error?.message || 'Unknown Claude error';
      log('error', 'claude', 'Claude API returned error', {
        type: response.error?.type,
        message: errorMsg,
      });
      throw new Error(`Claude API error: ${errorMsg}`);
    }

    const text = response.content?.[0]?.text;

    if (!text) {
      log('error', 'claude', 'No text in Claude response', {
        responseKeys: Object.keys(response),
        contentLength: response.content?.length,
      });
      throw new Error('No text in Claude response');
    }

    log('info', 'claude', `✅ Successfully got response (${text.length} chars)`);

    return text;
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
 * @param {string} model - Model name
 * @param {string} prompt - The prompt
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<Object>} - Normalized response
 */
async function executeModelCall(model, prompt, timeout) {
  const adapter = getAdapter(model);
  const startTime = Date.now();

  try {
    const text = await adapter(prompt, timeout);
    const duration = Date.now() - startTime;

    return {
      model,
      response: text,
      timestamp: new Date().toISOString(),
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    // Enhanced error with model and duration
    const enhancedError = new Error(`${model} error: ${error.message}`);
    enhancedError.model = model;
    enhancedError.duration = duration;
    enhancedError.originalError = error;

    throw enhancedError;
  }
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  executeModelCall,
  getAdapter,
  ADAPTERS,
  API_KEYS,
  RETRY_CONFIG,
};
