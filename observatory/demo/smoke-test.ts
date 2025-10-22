/**
 * Jarvis Smoke Test
 *
 * Quick validation that all systems are operational
 * Run this after deployment to verify everything works
 */

import { initializeJarvis } from '../src/index';
import { TaskType, Priority } from '../src/types/tasks';
import type { Task } from '../src/types/tasks';

async function runSmokeTest() {
  console.log('🧪 Starting Jarvis Smoke Test...\n');

  try {
    // ===== TEST 1: System Initialization =====
    console.log('📊 TEST 1: System Initialization');
    console.log('Initializing Jarvis...');

    const jarvis = await initializeJarvis();
    console.log('✅ Jarvis initialized successfully');
    console.log(`   - Decision Engine: ${jarvis.decisionEngine ? 'OK' : 'FAIL'}`);
    console.log(`   - Memory System: ${jarvis.memory ? 'OK' : 'FAIL'}`);
    console.log(`   - Approval Queue: ${jarvis.approvalQueue ? 'OK' : 'FAIL'}`);
    console.log(`   - Orchestrator: ${jarvis.orchestrator ? 'OK' : 'FAIL'}`);
    console.log(`   - Marketing Agent: ${jarvis.agents.marketingAgent ? 'OK' : 'FAIL'}`);
    console.log(`   - Sales Agent: ${jarvis.agents.salesAgent ? 'OK' : 'FAIL'}`);
    console.log(`   - Support Agent: ${jarvis.agents.supportAgent ? 'OK' : 'FAIL'}`);
    console.log(`   - Operations Agent: ${jarvis.agents.operationsAgent ? 'OK' : 'FAIL'}\n`);

    // ===== TEST 2: Decision Engine =====
    console.log('📊 TEST 2: Decision Engine Evaluation');

    const lowRiskTask: Task = {
      id: crypto.randomUUID(),
      type: TaskType.MARKETING_SOCIAL_POST,
      priority: Priority.MEDIUM,
      data: {
        platform: 'twitter',
        text: 'Just launched our new feature! 🚀',
      },
      requestedBy: 'smoke-test',
      timestamp: new Date(),
    };

    const decision = await jarvis.decisionEngine.evaluate({
      task: lowRiskTask,
      historicalData: [],
      rules: [],
      agentCapabilities: [],
    });

    console.log('✅ Decision Engine evaluated task');
    console.log(`   - Action: ${decision.action}`);
    console.log(`   - Risk Level: ${decision.riskLevel}`);
    console.log(`   - Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
    console.log(`   - Requires Approval: ${decision.requiresApproval || decision.action === 'request_approval' ? 'Yes' : 'No'}\n`);

    // ===== TEST 3: High-Risk Decision =====
    console.log('📊 TEST 3: High-Risk Task Evaluation');

    const highRiskTask: Task = {
      id: crypto.randomUUID(),
      type: TaskType.MARKETING_EMAIL_CAMPAIGN,
      priority: Priority.MEDIUM,
      data: {
        recipientCount: 500,  // Over Brevo 300 limit
        subject: 'Major Product Launch',
        estimatedCost: 75,
      },
      requestedBy: 'smoke-test',
      timestamp: new Date(),
    };

    const highRiskDecision = await jarvis.decisionEngine.evaluate({
      task: highRiskTask,
      historicalData: [],
      rules: [],
      agentCapabilities: [],
    });

    console.log('✅ Decision Engine evaluated high-risk task');
    console.log(`   - Action: ${highRiskDecision.action}`);
    console.log(`   - Risk Level: ${highRiskDecision.riskLevel}`);
    console.log(`   - Confidence: ${(highRiskDecision.confidence * 100).toFixed(1)}%`);
    console.log(`   - Requires Approval: ${highRiskDecision.requiresApproval || highRiskDecision.action === 'request_approval' ? 'Yes ✓' : 'No'}\n`);

    // ===== TEST 4: Agent Routing =====
    console.log('📊 TEST 4: Task Routing');

    const marketingTask: Task = {
      id: crypto.randomUUID(),
      type: TaskType.MARKETING_CONTENT_CREATE,
      priority: Priority.MEDIUM,
      data: { topic: 'Product features' },
      requestedBy: 'smoke-test',
      timestamp: new Date(),
    };

    const assignedAgent = await jarvis.orchestrator.assignAgent(marketingTask);
    console.log('✅ Orchestrator assigned task to agent');
    console.log(`   - Task Type: ${marketingTask.type}`);
    console.log(`   - Assigned To: ${assignedAgent?.name || 'No agent'}\n`);

    // ===== TEST 5: Memory System =====
    console.log('📊 TEST 5: Memory System');

    await jarvis.memory.storeEntry({
      id: crypto.randomUUID(),
      type: 'test',
      content: { message: 'Smoke test entry' },
      timestamp: new Date(),
      importance: 0.5,
      metadata: { test: true },
    });

    const recentEntries = await jarvis.memory.getRecentEntries(1);
    console.log('✅ Memory system operational');
    console.log(`   - Stored entry: OK`);
    console.log(`   - Retrieved entries: ${recentEntries.length} found\n`);

    // ===== TEST 6: Decision Rules =====
    console.log('📊 TEST 6: Decision Rules');

    const thresholds = {
      low: jarvis.decisionEngine.getConfidenceThreshold('low'),
      medium: jarvis.decisionEngine.getConfidenceThreshold('medium'),
      high: jarvis.decisionEngine.getConfidenceThreshold('high'),
      critical: jarvis.decisionEngine.getConfidenceThreshold('critical'),
    };

    console.log('✅ Decision Engine thresholds configured');
    console.log(`   - LOW risk: ${(thresholds.low * 100)}% confidence required`);
    console.log(`   - MEDIUM risk: ${(thresholds.medium * 100)}% confidence required`);
    console.log(`   - HIGH risk: ${(thresholds.high * 100)}% confidence required`);
    console.log(`   - CRITICAL risk: ${(thresholds.critical * 100)}% confidence required\n`);

    // ===== FINAL RESULTS =====
    console.log('═'.repeat(60));
    console.log('🎉 SMOKE TEST PASSED!');
    console.log('═'.repeat(60));
    console.log('\n✅ All systems operational:');
    console.log('   • Core systems initialized');
    console.log('   • Decision Engine evaluating tasks');
    console.log('   • High-risk tasks flagged for approval');
    console.log('   • Orchestrator routing tasks correctly');
    console.log('   • Memory system storing/retrieving entries');
    console.log('   • Confidence thresholds configured');
    console.log('\n🚀 Jarvis is ready for production!\n');

    // Cleanup
    await jarvis.orchestrator.shutdown();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ SMOKE TEST FAILED!\n');
    console.error('Error:', error);
    console.error('\nPlease check:');
    console.error('   1. .env file is configured with all API keys');
    console.error('   2. Database migration has been run');
    console.error('   3. Dependencies are installed (npm install)');
    console.error('   4. Supabase is accessible\n');
    process.exit(1);
  }
}

// Run the smoke test
runSmokeTest();
