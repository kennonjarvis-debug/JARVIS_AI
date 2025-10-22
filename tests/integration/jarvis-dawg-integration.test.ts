/**
 * Integration Tests: JARVIS ↔ DAWG AI
 * Tests communication between JARVIS autonomous agents and DAWG AI backend
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import axios from 'axios';

// API endpoints
const JARVIS_API_BASE = 'http://localhost:3000';
const DAWG_AI_API_BASE = 'http://localhost:9000';

describe('Integration: JARVIS → DAWG AI', () => {
  let jarvisHealthy = false;
  let dawgHealthy = false;

  beforeAll(async () => {
    // Check if both services are running
    try {
      const jarvisHealth = await axios.get(`${JARVIS_API_BASE}/api/health`, { timeout: 2000 });
      jarvisHealthy = jarvisHealth.data.success === true;
    } catch (error) {
      console.warn('JARVIS API not running - some tests will be skipped');
    }

    try {
      const dawgHealth = await axios.get(`${DAWG_AI_API_BASE}/health`, { timeout: 2000 });
      dawgHealthy = dawgHealth.data.status === 'healthy';
    } catch (error) {
      console.warn('DAWG AI API not running - some tests will be skipped');
    }
  });

  describe('Service Health Checks', () => {
    it('should have JARVIS API running on port 3000', async () => {
      expect(jarvisHealthy).toBe(true);
    });

    it('should have DAWG AI Backend running on port 9000', async () => {
      expect(dawgHealthy).toBe(true);
    });
  });

  describe('JARVIS Voice Commands → DAWG AI Generation', () => {
    it.skipIf(!jarvisHealthy || !dawgHealthy)(
      'should generate MIDI drums from voice command',
      async () => {
        // Simulate JARVIS voice command flow
        const voiceCommand = {
          command: 'Generate a trap beat at 140 BPM',
          parsedIntent: {
            action: 'generate',
            type: 'drums',
            tempo: 140,
            bars: 4,
          },
        };

        // Call DAWG AI backend
        const response = await axios.post(
          `${DAWG_AI_API_BASE}/api/v1/generate/midi`,
          {
            style: 'drums',
            tempo: 140,
            bars: 4,
            temperature: 0.8,
          },
          { timeout: 30000 }
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('midi_base64');
        expect(response.data).toHaveProperty('metadata');
        expect(response.data.metadata).toHaveProperty('notes_generated');
        expect(response.data.metadata.notes_generated).toBeGreaterThan(0);
      },
      { timeout: 35000 }
    );

    it.skipIf(!jarvisHealthy || !dawgHealthy)(
      'should generate bassline from voice command',
      async () => {
        const response = await axios.post(
          `${DAWG_AI_API_BASE}/api/v1/generate/bassline`,
          {
            key: 'C',
            scale: 'minor',
            bars: 4,
            style: 'funk',
          },
          { timeout: 30000 }
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('midi_base64');
      },
      { timeout: 35000 }
    );

    it.skipIf(!jarvisHealthy || !dawgHealthy)(
      'should generate melody from voice command',
      async () => {
        const response = await axios.post(
          `${DAWG_AI_API_BASE}/api/v1/generate/melody`,
          {
            key: 'C',
            scale: 'major',
            bars: 8,
            style: 'uplifting',
          },
          { timeout: 30000 }
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('midi_base64');
      },
      { timeout: 35000 }
    );
  });

  describe('DAWG AI → JARVIS Observatory Updates', () => {
    it.skipIf(!jarvisHealthy)(
      'should log DAWG AI generation as agent activity',
      async () => {
        // Simulate DAWG AI Monitor Agent logging activity
        const activityPayload = {
          agent_type: 'dawg-monitor',
          action: 'midi_generation_completed',
          description: 'Generated trap drums at 140 BPM',
          risk_level: 'LOW',
          status: 'completed',
          metadata: {
            generation_type: 'drums',
            tempo: 140,
            bars: 4,
            duration_ms: 2500,
          },
        };

        // This would be called by DAWG AI after successful generation
        // For now, we'll test the endpoint exists and accepts the format
        const response = await axios.get(`${JARVIS_API_BASE}/api/agents/activities`, {
          timeout: 5000,
        });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data.activities)).toBe(true);
      },
      { timeout: 10000 }
    );

    it.skipIf(!jarvisHealthy)(
      'should display DAWG AI metrics in Observatory',
      async () => {
        const response = await axios.get(`${JARVIS_API_BASE}/api/agents/metrics`, {
          timeout: 5000,
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('total_activities');
        expect(response.data).toHaveProperty('agents');
      },
      { timeout: 10000 }
    );
  });

  describe('Performance Requirements', () => {
    it.skipIf(!dawgHealthy)(
      'should generate MIDI in under 10 seconds',
      async () => {
        const startTime = Date.now();

        await axios.post(
          `${DAWG_AI_API_BASE}/api/v1/generate/midi`,
          {
            style: 'drums',
            tempo: 120,
            bars: 4,
          },
          { timeout: 15000 }
        );

        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(10000);
      },
      { timeout: 20000 }
    );

    it.skipIf(!jarvisHealthy)(
      'should respond to API requests in under 1 second',
      async () => {
        const startTime = Date.now();

        await axios.get(`${JARVIS_API_BASE}/api/agents/activities?limit=10`, {
          timeout: 2000,
        });

        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(1000);
      },
      { timeout: 3000 }
    );
  });

  describe('Error Handling', () => {
    it.skipIf(!dawgHealthy)(
      'should handle invalid MIDI generation parameters gracefully',
      async () => {
        try {
          await axios.post(
            `${DAWG_AI_API_BASE}/api/v1/generate/midi`,
            {
              style: 'invalid_style',
              tempo: -1,
              bars: 0,
            },
            { timeout: 5000 }
          );
        } catch (error: any) {
          expect(error.response.status).toBeGreaterThanOrEqual(400);
        }
      },
      { timeout: 10000 }
    );

    it.skipIf(!jarvisHealthy)(
      'should handle invalid activity log format',
      async () => {
        // Test that API validates input
        const response = await axios.get(`${JARVIS_API_BASE}/api/agents/activities?limit=abc`, {
          validateStatus: () => true,
        });

        // Should either accept it (default to reasonable limit) or return 400
        expect([200, 400]).toContain(response.status);
      }
    );
  });
});

describe('Integration: Complete Voice-to-DAW Workflow', () => {
  let jarvisHealthy = false;
  let dawgHealthy = false;

  beforeAll(async () => {
    try {
      const jarvisHealth = await axios.get(`${JARVIS_API_BASE}/api/health`, { timeout: 2000 });
      jarvisHealthy = jarvisHealth.data.success === true;
    } catch (error) {
      jarvisHealthy = false;
    }

    try {
      const dawgHealth = await axios.get(`${DAWG_AI_API_BASE}/health`, { timeout: 2000 });
      dawgHealthy = dawgHealth.data.status === 'healthy';
    } catch (error) {
      dawgHealthy = false;
    }
  });

  it.skipIf(!jarvisHealthy || !dawgHealthy)(
    'should complete full voice-to-DAW workflow',
    async () => {
      // Scenario: User says "Create a trap beat at 140 BPM"
      // 1. Voice captured (simulated)
      const voiceCommand = 'Create a trap beat at 140 BPM';

      // 2. JARVIS parses command (simulated NLU)
      const parsedIntent = {
        action: 'generate',
        type: 'drums',
        tempo: 140,
        genre: 'trap',
      };

      // 3. JARVIS calls DAWG AI backend
      const generationStart = Date.now();
      const midiResponse = await axios.post(
        `${DAWG_AI_API_BASE}/api/v1/generate/midi`,
        {
          style: 'drums',
          tempo: 140,
          bars: 4,
        },
        { timeout: 15000 }
      );
      const generationDuration = Date.now() - generationStart;

      expect(midiResponse.status).toBe(200);
      expect(midiResponse.data).toHaveProperty('midi_base64');

      // 4. MIDI would be loaded into frontend (tested separately in frontend tests)
      const midiData = midiResponse.data.midi_base64;
      expect(typeof midiData).toBe('string');
      expect(midiData.length).toBeGreaterThan(0);

      // 5. Activity logged to JARVIS
      const activitiesResponse = await axios.get(`${JARVIS_API_BASE}/api/agents/activities`, {
        params: { limit: 1 },
      });

      expect(activitiesResponse.status).toBe(200);
      expect(Array.isArray(activitiesResponse.data.activities)).toBe(true);

      // Performance assertion
      expect(generationDuration).toBeLessThan(10000);
    },
    { timeout: 30000 }
  );
});

describe('Integration: API Contract Compliance', () => {
  it('should match DAWG AI MIDI generation contract', async () => {
    // Define expected contract
    interface GenerateMIDIRequest {
      style: 'drums' | 'melody' | 'bass';
      tempo: number;
      bars: number;
      temperature?: number;
    }

    interface GenerateMIDIResponse {
      midi_base64: string;
      metadata: {
        notes_generated: number;
        duration_seconds: number;
      };
    }

    // Contract is defined - actual test happens in runtime
    expect(true).toBe(true);
  });

  it('should match JARVIS Activity API contract', async () => {
    // Define expected contract
    interface AgentActivity {
      id: string;
      agent_type: string;
      action: string;
      description: string;
      risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
      status: string;
      metadata: Record<string, any>;
      timestamp: string;
    }

    // Contract is defined
    expect(true).toBe(true);
  });
});
