/**
 * AI Model Adapters
 *
 * Adapter functions for different AI model APIs (Gemini, OpenAI, Claude, etc.)
 * Each adapter normalizes the API call and response format
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

// ============================================================================
// HTTP Request Utility
// ============================================================================

/**
 * Make an HTTP request with timeout
 * @param {Object} options - Request options
 * @param {string} data - Request body
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<Object>} - Response data
 */
function makeRequest(options, data, timeout) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;

    const req = protocol.request(options, (res) => {
      let body = '';

      res.on('data', chunk => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.error?.message || body}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', reject);

    // Set timeout
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeout}ms`));
    });

    if (data) {
      req.write(data);
    }

    req.end();
  });
}

// ============================================================================
// Model-Specific Adapters
// ============================================================================

/**
 * Google Gemini adapter
 * @param {string} prompt - The prompt
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<string>} - Model response
 */
async function geminiAdapter(prompt, timeout) {
  const apiKey = API_KEYS.gemini;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set in environment');
  }

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

  const response = await makeRequest(options, requestBody, timeout);

  // Extract text from Gemini response
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No text in Gemini response');
  }

  return text;
}

/**
 * OpenAI GPT-4 adapter
 * @param {string} prompt - The prompt
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<string>} - Model response
 */
async function gpt4Adapter(prompt, timeout) {
  const apiKey = API_KEYS.gpt4;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set in environment');
  }

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

  const response = await makeRequest(options, requestBody, timeout);

  const text = response.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('No text in GPT-4 response');
  }

  return text;
}

/**
 * OpenAI Codex adapter
 * @param {string} prompt - The prompt
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<string>} - Model response
 */
async function codexAdapter(prompt, timeout) {
  const apiKey = API_KEYS.codex;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set in environment');
  }

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

  const response = await makeRequest(options, requestBody, timeout);

  const text = response.choices?.[0]?.text;

  if (!text) {
    throw new Error('No text in Codex response');
  }

  return text;
}

/**
 * Anthropic Claude adapter
 * @param {string} prompt - The prompt
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<string>} - Model response
 */
async function claudeAdapter(prompt, timeout) {
  const apiKey = API_KEYS.claude;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set in environment');
  }

  const requestBody = JSON.stringify({
    model: 'claude-3-sonnet-20240229',
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

  const response = await makeRequest(options, requestBody, timeout);

  const text = response.content?.[0]?.text;

  if (!text) {
    throw new Error('No text in Claude response');
  }

  return text;
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
    throw Object.assign(error, { model, duration });
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
};
