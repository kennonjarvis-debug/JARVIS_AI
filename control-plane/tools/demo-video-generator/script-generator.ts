#!/usr/bin/env ts-node

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Type definitions
interface DemoScript {
  title: string;
  duration: number; // seconds
  product: 'jarvis' | 'ai-dawg';
  narration: {
    text: string;
    timing: number; // when to start narration (seconds)
  }[];
  actions: {
    type: 'click' | 'type' | 'wait' | 'scroll' | 'hover';
    selector?: string;
    text?: string;
    timing: number;
    description: string;
  }[];
  callouts: {
    text: string;
    position: { x: number; y: number };
    timing: number;
    duration: number;
  }[];
}

interface VideoSpec {
  title: string;
  duration: number;
  product: 'jarvis' | 'ai-dawg';
  description: string;
  keyFeatures: string[];
}

// Video specifications
const VIDEO_SPECS: VideoSpec[] = [
  {
    title: 'Getting Started with Jarvis',
    duration: 180,
    product: 'jarvis',
    description: 'Introduction to Jarvis AI assistant - setup, basic commands, and first interactions',
    keyFeatures: [
      'Account creation and login',
      'Dashboard overview',
      'First AI conversation',
      'Voice command basics',
      'Task creation'
    ]
  },
  {
    title: 'Jarvis Power User Features',
    duration: 240,
    product: 'jarvis',
    description: 'Advanced Jarvis features for productivity power users',
    keyFeatures: [
      'Multi-modal AI interactions (text, voice, image)',
      'Context-aware task management',
      'Integration with external tools',
      'Custom workflows and automation',
      'Memory and learning capabilities'
    ]
  },
  {
    title: 'Jarvis Autonomous Mode',
    duration: 180,
    product: 'jarvis',
    description: 'Exploring Jarvis autonomous capabilities and self-management',
    keyFeatures: [
      'Enabling autonomous mode',
      'Setting clearance levels',
      'Watching Jarvis work independently',
      'Reviewing autonomous suggestions',
      'Approving system improvements'
    ]
  },
  {
    title: 'AI DAWG: Your First Song',
    duration: 180,
    product: 'ai-dawg',
    description: 'Create your first AI-generated song in minutes',
    keyFeatures: [
      'Signing up and exploring the studio',
      'Writing lyrics with AI assistance',
      'Selecting beat and style',
      'Generating your first track',
      'Downloading and sharing'
    ]
  },
  {
    title: 'AI DAWG: Voice Cloning Magic',
    duration: 240,
    product: 'ai-dawg',
    description: 'Clone your voice and create personalized AI vocals',
    keyFeatures: [
      'Recording voice samples',
      'Training your AI voice model',
      'Testing voice quality',
      'Using your cloned voice in songs',
      'Voice style adjustments'
    ]
  },
  {
    title: 'AI DAWG: Studio Workflow',
    duration: 240,
    product: 'ai-dawg',
    description: 'Professional music production workflow in AI DAWG',
    keyFeatures: [
      'Project organization',
      'Advanced beat customization',
      'Multi-track composition',
      'Mixing and mastering',
      'Exporting professional-quality tracks'
    ]
  }
];

class DemoScriptGenerator {
  private anthropic: Anthropic;
  private outputDir: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not found in environment variables');
    }

    this.anthropic = new Anthropic({ apiKey });
    this.outputDir = path.join(__dirname, 'scripts');

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate a demo video script using Claude
   */
  async generateScript(spec: VideoSpec): Promise<DemoScript> {
    console.log(`\nGenerating script for: ${spec.title}...`);

    const prompt = this.buildPrompt(spec);

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Parse the JSON response
      const jsonMatch = content.text.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) {
        throw new Error('Could not find JSON in Claude response');
      }

      const script: DemoScript = JSON.parse(jsonMatch[1]);
      console.log(`✓ Script generated successfully`);

      return script;
    } catch (error) {
      console.error(`Error generating script: ${error}`);
      throw error;
    }
  }

  /**
   * Build the prompt for Claude
   */
  private buildPrompt(spec: VideoSpec): string {
    return `You are an expert demo video script writer for SaaS products. Create a detailed, engaging demo video script for "${spec.title}".

PRODUCT: ${spec.product.toUpperCase()}
DURATION: ${spec.duration} seconds (${Math.floor(spec.duration / 60)} minutes)
DESCRIPTION: ${spec.description}

KEY FEATURES TO SHOWCASE:
${spec.keyFeatures.map((f, i) => `${i + 1}. ${f}`).join('\n')}

REQUIREMENTS:
1. Create natural, conversational narration that sounds like a friendly expert
2. Plan specific user actions with precise timing
3. Add helpful visual callouts at key moments
4. Ensure pacing feels natural (not rushed, not slow)
5. Build excitement and demonstrate value
6. Use realistic UI selectors (e.g., "[data-testid='login-button']", "#email-input", ".submit-btn")

OUTPUT FORMAT:
Return ONLY a JSON object matching this exact structure (no additional text):

\`\`\`json
{
  "title": "${spec.title}",
  "duration": ${spec.duration},
  "product": "${spec.product}",
  "narration": [
    {
      "text": "Welcome to ${spec.product === 'jarvis' ? 'Jarvis' : 'AI DAWG'}...",
      "timing": 0
    }
  ],
  "actions": [
    {
      "type": "click",
      "selector": "[data-testid='example-button']",
      "timing": 5,
      "description": "Click the example button"
    }
  ],
  "callouts": [
    {
      "text": "Notice this key feature",
      "position": {"x": 50, "y": 30},
      "timing": 10,
      "duration": 3
    }
  ]
}
\`\`\`

IMPORTANT:
- Narration should be split into logical segments (5-15 seconds each)
- Actions should align with narration timing
- Position callouts using percentages (x: 0-100, y: 0-100)
- Make the demo feel realistic and achievable
- Include wait actions for loading states
- Total duration should match ${spec.duration} seconds

Generate the complete demo script now.`;
  }

  /**
   * Save script to file
   */
  private saveScript(script: DemoScript): string {
    const filename = script.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const filepath = path.join(this.outputDir, `${filename}.json`);

    fs.writeFileSync(filepath, JSON.stringify(script, null, 2), 'utf-8');
    console.log(`✓ Saved to: ${filepath}`);

    return filepath;
  }

  /**
   * Generate all demo scripts
   */
  async generateAll(): Promise<void> {
    console.log('=== Demo Video Script Generator ===');
    console.log(`Generating ${VIDEO_SPECS.length} demo video scripts...\n`);

    const results: { spec: VideoSpec; filepath: string }[] = [];

    for (const spec of VIDEO_SPECS) {
      try {
        const script = await this.generateScript(spec);
        const filepath = this.saveScript(script);
        results.push({ spec, filepath });

        // Brief pause to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to generate script for "${spec.title}":`, error);
      }
    }

    console.log('\n=== Generation Complete ===');
    console.log(`\nGenerated ${results.length}/${VIDEO_SPECS.length} scripts:`);
    results.forEach(({ spec, filepath }) => {
      console.log(`  ✓ ${spec.title} (${spec.duration}s) → ${filepath}`);
    });
  }

  /**
   * Generate a single script by title
   */
  async generateOne(title: string): Promise<void> {
    const spec = VIDEO_SPECS.find(s =>
      s.title.toLowerCase().includes(title.toLowerCase())
    );

    if (!spec) {
      console.error(`No video spec found matching: ${title}`);
      console.log('\nAvailable videos:');
      VIDEO_SPECS.forEach(s => console.log(`  - ${s.title}`));
      return;
    }

    const script = await this.generateScript(spec);
    const filepath = this.saveScript(script);

    console.log('\n=== Script Preview ===');
    console.log(`Title: ${script.title}`);
    console.log(`Duration: ${script.duration}s`);
    console.log(`Narration segments: ${script.narration.length}`);
    console.log(`Actions: ${script.actions.length}`);
    console.log(`Callouts: ${script.callouts.length}`);
    console.log(`\nFull script saved to: ${filepath}`);
  }
}

// CLI execution
async function main() {
  const generator = new DemoScriptGenerator();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Generate all scripts
    await generator.generateAll();
  } else if (args[0] === '--list') {
    // List available videos
    console.log('Available demo videos:');
    VIDEO_SPECS.forEach((spec, i) => {
      console.log(`\n${i + 1}. ${spec.title}`);
      console.log(`   Product: ${spec.product.toUpperCase()}`);
      console.log(`   Duration: ${spec.duration}s (${Math.floor(spec.duration / 60)}m)`);
      console.log(`   Features: ${spec.keyFeatures.join(', ')}`);
    });
  } else {
    // Generate specific script
    const title = args.join(' ');
    await generator.generateOne(title);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { DemoScriptGenerator, VideoSpec, DemoScript };
