/**
 * Test Gemini provider directly
 */

import dotenv from 'dotenv';
import { GeminiProvider } from './src/integrations/ai-providers/index.js';

dotenv.config();

async function test() {
  console.log('\n🧪 Testing Gemini Provider\n');

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not set');
    process.exit(1);
  }

  console.log('API Key:', process.env.GEMINI_API_KEY.substring(0, 20) + '...');

  const provider = new GeminiProvider({
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-1.5-flash-latest',
  });

  console.log('✅ Provider initialized');
  console.log('\n📝 Sending test request...\n');

  const response = await provider.complete({
    prompt: 'What is 2+2? Answer in one short sentence.',
    maxTokens: 100,
  });

  console.log('✅ Response:', response.content);
  console.log('\n📊 Metrics:');
  console.log('  - Input tokens:', response.inputTokens);
  console.log('  - Output tokens:', response.outputTokens);
  console.log('\n✅ Test successful!\n');
}

test().catch((error) => {
  console.error('\n❌ Test failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});
