/**
 * Test OpenAI provider directly
 */

import dotenv from 'dotenv';
import { OpenAIProvider } from './src/integrations/ai-providers/index.js';

dotenv.config();

async function test() {
  console.log('\n🧪 Testing OpenAI Provider\n');

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not set');
    process.exit(1);
  }

  const provider = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini',
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
  process.exit(1);
});
