/**
 * Edge Case Tests: AI DAWG Project Creation
 *
 * Tests for obscure bugs and edge cases in project creation flow
 */

import axios from 'axios';

const AI_DAWG_API = 'http://localhost:3001/api/v1';

interface TestResult {
  scenario: string;
  category: string;
  passed: boolean;
  error?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

const results: TestResult[] = [];

async function testProjectCreation(
  scenario: string,
  projectName: string,
  expectedBehavior: 'reject' | 'accept' | 'sanitize',
  severity: 'critical' | 'high' | 'medium' | 'low' = 'medium'
): Promise<void> {
  try {
    const response = await axios.post(
      `${AI_DAWG_API}/projects`,
      { name: projectName, description: 'Edge case test project' },
      { timeout: 5000, validateStatus: () => true }
    );

    const status = response.status;
    const passed =
      (expectedBehavior === 'reject' && (status === 400 || status === 422)) ||
      (expectedBehavior === 'accept' && status === 200) ||
      (expectedBehavior === 'sanitize' && status === 200 && response.data?.data?.name !== projectName);

    results.push({
      scenario,
      category: 'project-creation',
      passed,
      error: !passed ? `Got status ${status}, expected ${expectedBehavior}` : undefined,
      severity: !passed ? severity : undefined
    });

    // Cleanup created projects
    if (status === 200 && response.data?.data?.id) {
      try {
        await axios.delete(`${AI_DAWG_API}/projects/${response.data.data.id}`);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  } catch (error: any) {
    // Network errors should fail the test
    results.push({
      scenario,
      category: 'project-creation',
      passed: false,
      error: `Network/timeout error: ${error.message}`,
      severity: 'critical'
    });
  }
}

async function runProjectCreationEdgeCases(): Promise<void> {
  console.log('\n=== AI DAWG Project Creation Edge Cases ===\n');

  // 1. SPECIAL CHARACTERS
  await testProjectCreation(
    'Emoji in project name',
    'My Project 🎵🎤',
    'sanitize',
    'medium'
  );

  await testProjectCreation(
    'Unicode characters (Chinese)',
    '我的项目',
    'accept',
    'low'
  );

  await testProjectCreation(
    'Unicode characters (Arabic)',
    'مشروعي',
    'accept',
    'low'
  );

  await testProjectCreation(
    'SQL injection attempt in name',
    "Project'; DROP TABLE projects; --",
    'sanitize',
    'critical'
  );

  await testProjectCreation(
    'XSS attempt in name',
    '<script>alert("xss")</script>',
    'sanitize',
    'critical'
  );

  await testProjectCreation(
    'Path traversal in name',
    '../../../etc/passwd',
    'sanitize',
    'high'
  );

  await testProjectCreation(
    'Null bytes in name',
    'Project\x00.txt',
    'sanitize',
    'high'
  );

  await testProjectCreation(
    'Control characters',
    'Project\n\r\t\x00\x1b',
    'sanitize',
    'medium'
  );

  // 2. EMPTY/NULL/UNDEFINED VALUES
  await testProjectCreation(
    'Empty string name',
    '',
    'reject',
    'high'
  );

  await testProjectCreation(
    'Only whitespace',
    '   \t\n   ',
    'reject',
    'high'
  );

  // 3. MAX LENGTH STRINGS
  await testProjectCreation(
    'Very long name (10000 chars)',
    'A'.repeat(10000),
    'reject',
    'medium'
  );

  await testProjectCreation(
    'Exactly 255 chars',
    'A'.repeat(255),
    'accept',
    'low'
  );

  await testProjectCreation(
    'Exactly 256 chars',
    'A'.repeat(256),
    'reject',
    'medium'
  );

  // 4. DUPLICATE NAMES
  try {
    const name = 'Duplicate Test Project ' + Date.now();
    const res1 = await axios.post(`${AI_DAWG_API}/projects`, { name }, { timeout: 5000 });

    if (res1.status === 200) {
      const res2 = await axios.post(`${AI_DAWG_API}/projects`, { name }, {
        timeout: 5000,
        validateStatus: () => true
      });

      results.push({
        scenario: 'Duplicate project name',
        category: 'project-creation',
        passed: res2.status === 400 || res2.status === 409,
        error: res2.status === 200 ? 'System allowed duplicate names' : undefined,
        severity: res2.status === 200 ? 'high' : undefined
      });

      // Cleanup
      if (res1.data?.data?.id) {
        await axios.delete(`${AI_DAWG_API}/projects/${res1.data.data.id}`);
      }
      if (res2.data?.data?.id) {
        await axios.delete(`${AI_DAWG_API}/projects/${res2.data.data.id}`);
      }
    }
  } catch (error: any) {
    results.push({
      scenario: 'Duplicate project name',
      category: 'project-creation',
      passed: false,
      error: error.message,
      severity: 'medium'
    });
  }

  // 5. INVALID CHARACTERS
  await testProjectCreation(
    'Forward slash in name',
    'Project/Name',
    'sanitize',
    'medium'
  );

  await testProjectCreation(
    'Backslash in name',
    'Project\\Name',
    'sanitize',
    'medium'
  );

  await testProjectCreation(
    'Colon in name',
    'Project:Name',
    'sanitize',
    'medium'
  );

  await testProjectCreation(
    'Asterisk in name',
    'Project*Name',
    'sanitize',
    'low'
  );

  await testProjectCreation(
    'Pipe in name',
    'Project|Name',
    'sanitize',
    'low'
  );

  await testProjectCreation(
    'Question mark in name',
    'Project?Name',
    'sanitize',
    'low'
  );

  // 6. BOUNDARY CASES
  await testProjectCreation(
    'Single character name',
    'A',
    'accept',
    'low'
  );

  await testProjectCreation(
    'Numbers only',
    '12345',
    'accept',
    'low'
  );

  await testProjectCreation(
    'Special chars only',
    '!@#$%^&*()',
    'sanitize',
    'medium'
  );

  // 7. CASE SENSITIVITY
  try {
    const baseName = 'CaseSensitive' + Date.now();
    const res1 = await axios.post(`${AI_DAWG_API}/projects`, { name: baseName }, { timeout: 5000 });
    const res2 = await axios.post(`${AI_DAWG_API}/projects`, { name: baseName.toLowerCase() }, {
      timeout: 5000,
      validateStatus: () => true
    });

    // Both should succeed if case-sensitive, second should fail if case-insensitive
    results.push({
      scenario: 'Case sensitivity check',
      category: 'project-creation',
      passed: true, // Document behavior, don't fail
      error: res2.status === 200 ? 'System is case-sensitive (allows both)' : 'System is case-insensitive (blocks second)',
      severity: undefined
    });

    // Cleanup
    if (res1.data?.data?.id) await axios.delete(`${AI_DAWG_API}/projects/${res1.data.data.id}`);
    if (res2.data?.data?.id) await axios.delete(`${AI_DAWG_API}/projects/${res2.data.data.id}`);
  } catch (error: any) {
    results.push({
      scenario: 'Case sensitivity check',
      category: 'project-creation',
      passed: false,
      error: error.message,
      severity: 'low'
    });
  }

  // 8. RACE CONDITIONS
  try {
    const raceName = 'RaceCondition' + Date.now();
    const promises = Array(10).fill(0).map(() =>
      axios.post(`${AI_DAWG_API}/projects`, { name: raceName }, {
        timeout: 5000,
        validateStatus: () => true
      })
    );

    const responses = await Promise.all(promises);
    const successCount = responses.filter(r => r.status === 200).length;

    results.push({
      scenario: 'Race condition (10 concurrent creates)',
      category: 'project-creation',
      passed: successCount <= 1, // Only one should succeed
      error: successCount > 1 ? `${successCount} requests succeeded (race condition!)` : undefined,
      severity: successCount > 1 ? 'critical' : undefined
    });

    // Cleanup
    for (const res of responses) {
      if (res.data?.data?.id) {
        try {
          await axios.delete(`${AI_DAWG_API}/projects/${res.data.data.id}`);
        } catch (e) {}
      }
    }
  } catch (error: any) {
    results.push({
      scenario: 'Race condition (10 concurrent creates)',
      category: 'project-creation',
      passed: false,
      error: error.message,
      severity: 'high'
    });
  }
}

export { runProjectCreationEdgeCases, results };
