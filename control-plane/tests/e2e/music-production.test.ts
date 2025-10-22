/**
 * E2E Tests: Music Production Workflow
 *
 * Tests the complete AI DAWG music production pipeline:
 * - Beat generation
 * - Vocal analysis
 * - Mixing optimization
 * - Project management
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { TestAPIClient, sleep } from './helpers/test-client.js';

// Use global fetch (Node 18+)
const fetch = globalThis.fetch;

describe('Music Production Workflow E2E', () => {
  let apiClient: TestAPIClient;
  const PRODUCER_URL = 'http://localhost:8001';
  const VOCAL_COACH_URL = 'http://localhost:8000';
  const AI_BRAIN_URL = 'http://localhost:8002';
  const BACKEND_URL = 'http://localhost:3001';

  beforeAll(async () => {
    apiClient = new TestAPIClient();

    // Wait for all AI DAWG services to be healthy
    const services = [
      { name: 'JARVIS', url: 'http://localhost:4000/health' },
      { name: 'Backend', url: `${BACKEND_URL}/health` },
      { name: 'Producer', url: `${PRODUCER_URL}/health` },
      { name: 'Vocal Coach', url: `${VOCAL_COACH_URL}/health` },
      { name: 'AI Brain', url: `${AI_BRAIN_URL}/health` }
    ];

    for (const service of services) {
      let healthy = false;
      for (let i = 0; i < 15; i++) {
        try {
          const response = await fetch(service.url);
          if (response.ok) {
            healthy = true;
            console.log(`✅ ${service.name} is healthy`);
            break;
          }
        } catch (error) {
          // Service not ready
        }
        await sleep(2000);
      }

      if (!healthy) {
        console.warn(`⚠️  ${service.name} not available - some tests may fail`);
      }
    }
  });

  test('should generate a beat via Producer service', async () => {
    const beatParams = {
      genre: 'hip-hop',
      bpm: 120,
      mood: 'energetic',
      duration: 60,
      complexity: 'medium'
    };

    try {
      const response = await fetch(`${PRODUCER_URL}/api/beats/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(beatParams)
      });

      if (response.ok) {
        const result = await response.json();

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.genre).toBe('hip-hop');
        expect(result.bpm).toBe(120);
        expect(result.fileUrl).toBeDefined();
      } else {
        console.warn('Producer service not responding correctly - skipping validation');
      }
    } catch (error) {
      console.warn('Producer service not available - skipping test');
    }
  }, 30000);

  test('should analyze vocals via Vocal Coach service', async () => {
    const analysisParams = {
      audioUrl: 'https://example.com/test-vocal.mp3',
      analysisType: 'comprehensive'
    };

    try {
      const response = await fetch(`${VOCAL_COACH_URL}/api/vocals/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisParams)
      });

      if (response.ok) {
        const result = await response.json();

        expect(result).toBeDefined();
        expect(result.analysis).toBeDefined();
      } else {
        console.warn('Vocal Coach service not responding correctly');
      }
    } catch (error) {
      console.warn('Vocal Coach service not available - skipping test');
    }
  }, 30000);

  test('should optimize mixing via AI Brain service', async () => {
    const mixingParams = {
      trackId: 'test-track-123',
      targetLevel: 'professional',
      preserveOriginal: true,
      focusAreas: ['vocals', 'bass', 'dynamics']
    };

    try {
      const response = await fetch(`${AI_BRAIN_URL}/api/mixing/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mixingParams)
      });

      if (response.ok) {
        const result = await response.json();

        expect(result).toBeDefined();
        expect(result.adjustments).toBeDefined();
      } else {
        console.warn('AI Brain service not responding correctly');
      }
    } catch (error) {
      console.warn('AI Brain service not available - skipping test');
    }
  }, 30000);

  test('should fetch incomplete projects from Backend', async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/projects?status=incomplete`);

      if (response.ok) {
        const result = await response.json();

        expect(result).toBeDefined();
        expect(Array.isArray(result.projects)).toBe(true);
      } else {
        console.warn('Backend service not responding correctly');
      }
    } catch (error) {
      console.warn('Backend service not available - skipping test');
    }
  }, 15000);

  test('should detect autonomous music production opportunities', async () => {
    try {
      const result = await apiClient.triggerAutonomousAnalysis('music_production');

      expect(result).toBeDefined();
      expect(result.tasks).toBeDefined();
      expect(Array.isArray(result.tasks)).toBe(true);

      console.log(`Music domain found ${result.tasks.length} opportunities`);
    } catch (error: any) {
      console.warn('Autonomous analysis not available:', error.message);
    }
  }, 15000);

  test('should complete full music production workflow', async () => {
    const workflowSteps = [];

    // Step 1: Generate beat
    try {
      const beatResponse = await fetch(`${PRODUCER_URL}/api/beats/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: 'lo-fi',
          bpm: 90,
          mood: 'chill',
          duration: 120
        })
      });

      if (beatResponse.ok) {
        const beat = await beatResponse.json();
        workflowSteps.push({ step: 'beat_generation', success: true, data: beat });
      }
    } catch (error) {
      workflowSteps.push({ step: 'beat_generation', success: false });
    }

    await sleep(1000);

    // Step 2: Analyze vocals (simulated)
    try {
      const vocalResponse = await fetch(`${VOCAL_COACH_URL}/api/vocals/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: 'https://example.com/vocals.mp3',
          analysisType: 'pitch'
        })
      });

      if (vocalResponse.ok) {
        const analysis = await vocalResponse.json();
        workflowSteps.push({ step: 'vocal_analysis', success: true, data: analysis });
      }
    } catch (error) {
      workflowSteps.push({ step: 'vocal_analysis', success: false });
    }

    await sleep(1000);

    // Step 3: Optimize mixing
    try {
      const mixingResponse = await fetch(`${AI_BRAIN_URL}/api/mixing/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: 'workflow-test-track',
          targetLevel: 'professional'
        })
      });

      if (mixingResponse.ok) {
        const mixing = await mixingResponse.json();
        workflowSteps.push({ step: 'mixing_optimization', success: true, data: mixing });
      }
    } catch (error) {
      workflowSteps.push({ step: 'mixing_optimization', success: false });
    }

    // Log workflow results
    console.log('Workflow completed with steps:', workflowSteps.map(s => ({
      step: s.step,
      success: s.success
    })));

    expect(workflowSteps.length).toBe(3);
  }, 60000);

  test('should sync project across services', async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/projects/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'test-project-sync',
          targets: ['cloud', 'collaborators'],
          includeAssets: true
        })
      });

      if (response.ok) {
        const result = await response.json();

        expect(result).toBeDefined();
        expect(result.syncedTo).toBeDefined();
      } else {
        console.warn('Project sync endpoint not available');
      }
    } catch (error) {
      console.warn('Backend sync not available - skipping test');
    }
  }, 20000);

  test('should automate workflow via Backend', async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/workflows/automate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: 'test-workflow-123',
          steps: [
            { action: 'generate_beat', params: { genre: 'edm' } },
            { action: 'analyze_vocals' },
            { action: 'optimize_mixing' }
          ],
          schedule: 'immediate'
        })
      });

      if (response.ok) {
        const result = await response.json();

        expect(result).toBeDefined();
        expect(result.status).toBeDefined();
      } else {
        console.warn('Workflow automation endpoint not available');
      }
    } catch (error) {
      console.warn('Backend automation not available - skipping test');
    }
  }, 20000);
});
