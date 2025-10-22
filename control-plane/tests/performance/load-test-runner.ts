#!/usr/bin/env tsx

/**
 * Comprehensive Load Testing Suite
 * Tests all critical endpoints at multiple load levels
 */

import autocannon from 'autocannon';
import { WebSocket } from 'ws';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface LoadTestConfig {
  url: string;
  method: 'GET' | 'POST';
  body?: any;
  headers?: Record<string, string>;
  connections: number;
  duration: number;
  name: string;
}

interface TestResult {
  name: string;
  connections: number;
  metrics: {
    latency: {
      p50: number;
      p95: number;
      p99: number;
      max: number;
      mean: number;
    };
    throughput: {
      requestsPerSecond: number;
      successfulRequests: number;
      failedRequests: number;
      totalRequests: number;
    };
    errorRate: number;
  };
  resourceUsage?: {
    cpu: number;
    memory: number;
  };
  requirementsMet: {
    responseTime: boolean;
    errorRate: boolean;
  };
  violations: string[];
}

interface WebSocketResult {
  name: string;
  connections: number;
  metrics: {
    connectionTime: {
      p50: number;
      p95: number;
      p99: number;
      max: number;
    };
    messageLatency: {
      p50: number;
      p95: number;
      p99: number;
      max: number;
    };
    successfulConnections: number;
    failedConnections: number;
    messagesReceived: number;
  };
  errorRate: number;
  violations: string[];
}

class PerformanceTester {
  private results: (TestResult | WebSocketResult)[] = [];
  private startTime: number = 0;

  async runAllTests(): Promise<void> {
    console.log('='.repeat(80));
    console.log('JARVIS PERFORMANCE TESTING SUITE');
    console.log('='.repeat(80));
    console.log('\nStarting comprehensive load tests...\n');

    this.startTime = Date.now();

    // Test configurations for all endpoints
    const apiEndpoints: LoadTestConfig[] = [
      {
        name: 'Desktop Health Check',
        url: 'http://localhost:3001/api/v1/jarvis/desktop/health',
        method: 'GET',
        connections: 10,
        duration: 30,
      },
      {
        name: 'Desktop Execute',
        url: 'http://localhost:3001/api/v1/jarvis/desktop/execute',
        method: 'POST',
        body: {
          command: 'test_command',
          parameters: { test: true }
        },
        headers: { 'Content-Type': 'application/json' },
        connections: 10,
        duration: 30,
      },
      {
        name: 'Create Project',
        url: 'http://localhost:3002/api/projects',
        method: 'POST',
        body: {
          name: 'Load Test Project',
          description: 'Performance testing project'
        },
        headers: { 'Content-Type': 'application/json' },
        connections: 10,
        duration: 30,
      },
      {
        name: 'Generate Beat (AI)',
        url: 'http://localhost:3002/api/ai/generate-beat',
        method: 'POST',
        body: {
          genre: 'hip-hop',
          tempo: 120,
          mood: 'energetic'
        },
        headers: { 'Content-Type': 'application/json' },
        connections: 10,
        duration: 30,
      },
    ];

    const loadLevels = [10, 100, 1000];

    // Run HTTP endpoint tests
    for (const config of apiEndpoints) {
      for (const connections of loadLevels) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Testing: ${config.name} with ${connections} concurrent users`);
        console.log('='.repeat(60));

        const testConfig = { ...config, connections };
        const result = await this.runLoadTest(testConfig);
        this.results.push(result);

        // Cool down between tests
        await this.sleep(5000);
      }
    }

    // Run WebSocket tests
    for (const connections of loadLevels) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Testing: WebSocket Connection with ${connections} concurrent users`);
      console.log('='.repeat(60));

      const wsResult = await this.runWebSocketTest('ws://localhost:3002', connections);
      this.results.push(wsResult);

      // Cool down between tests
      await this.sleep(5000);
    }

    // Generate report
    await this.generateReport();
  }

  private async runLoadTest(config: LoadTestConfig): Promise<TestResult> {
    const isAIEndpoint = config.name.includes('AI') || config.name.includes('Generate');
    const p95Requirement = isAIEndpoint ? 500 : 100;

    const autocannonConfig: any = {
      url: config.url,
      connections: config.connections,
      duration: config.duration,
      method: config.method,
    };

    if (config.body) {
      autocannonConfig.body = JSON.stringify(config.body);
    }

    if (config.headers) {
      autocannonConfig.headers = config.headers;
    }

    try {
      const result = await autocannon(autocannonConfig);

      const latency = {
        p50: result.latency.p50 || 0,
        p95: result.latency.p95 || 0,
        p99: result.latency.p99 || 0,
        max: result.latency.max || 0,
        mean: result.latency.mean || 0,
      };

      const throughput = {
        requestsPerSecond: result.requests.average || 0,
        successfulRequests: result.requests.total - (result.errors || 0),
        failedRequests: result.errors || 0,
        totalRequests: result.requests.total || 0,
      };

      const errorRate = throughput.totalRequests > 0
        ? (throughput.failedRequests / throughput.totalRequests) * 100
        : 0;

      const violations: string[] = [];
      const responseTimeMet = latency.p95 <= p95Requirement;
      const errorRateMet = errorRate <= 0.1;

      if (!responseTimeMet) {
        violations.push(`p95 latency ${latency.p95}ms exceeds requirement ${p95Requirement}ms`);
      }
      if (!errorRateMet) {
        violations.push(`Error rate ${errorRate.toFixed(2)}% exceeds requirement 0.1%`);
      }

      this.printTestResults(config.name, config.connections, latency, throughput, errorRate, violations);

      return {
        name: config.name,
        connections: config.connections,
        metrics: {
          latency,
          throughput,
          errorRate,
        },
        requirementsMet: {
          responseTime: responseTimeMet,
          errorRate: errorRateMet,
        },
        violations,
      };
    } catch (error) {
      console.error(`Error testing ${config.name}:`, error);
      return {
        name: config.name,
        connections: config.connections,
        metrics: {
          latency: { p50: 0, p95: 0, p99: 0, max: 0, mean: 0 },
          throughput: {
            requestsPerSecond: 0,
            successfulRequests: 0,
            failedRequests: config.connections * config.duration,
            totalRequests: config.connections * config.duration,
          },
          errorRate: 100,
        },
        requirementsMet: {
          responseTime: false,
          errorRate: false,
        },
        violations: ['Test failed to execute', error instanceof Error ? error.message : String(error)],
      };
    }
  }

  private async runWebSocketTest(url: string, connections: number): Promise<WebSocketResult> {
    const connectionTimes: number[] = [];
    const messageLatencies: number[] = [];
    let successfulConnections = 0;
    let failedConnections = 0;
    let messagesReceived = 0;

    const promises = Array.from({ length: connections }, async () => {
      const connectStart = Date.now();

      return new Promise<void>((resolve) => {
        const ws = new WebSocket(url);
        let connected = false;

        ws.on('open', () => {
          connected = true;
          successfulConnections++;
          connectionTimes.push(Date.now() - connectStart);

          // Send test message
          const sendTime = Date.now();
          ws.send(JSON.stringify({ type: 'ping', timestamp: sendTime }));
        });

        ws.on('message', () => {
          messagesReceived++;
          messageLatencies.push(Date.now() - connectStart);
        });

        ws.on('error', () => {
          if (!connected) {
            failedConnections++;
          }
        });

        ws.on('close', () => {
          resolve();
        });

        // Close after 5 seconds
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          } else {
            resolve();
          }
        }, 5000);
      });
    });

    await Promise.all(promises);

    const connectionTimesSorted = connectionTimes.sort((a, b) => a - b);
    const messageLatenciesSorted = messageLatencies.sort((a, b) => a - b);

    const getPercentile = (arr: number[], percentile: number): number => {
      if (arr.length === 0) return 0;
      const index = Math.ceil((percentile / 100) * arr.length) - 1;
      return arr[index] || 0;
    };

    const connectionMetrics = {
      p50: getPercentile(connectionTimesSorted, 50),
      p95: getPercentile(connectionTimesSorted, 95),
      p99: getPercentile(connectionTimesSorted, 99),
      max: connectionTimesSorted[connectionTimesSorted.length - 1] || 0,
    };

    const latencyMetrics = {
      p50: getPercentile(messageLatenciesSorted, 50),
      p95: getPercentile(messageLatenciesSorted, 95),
      p99: getPercentile(messageLatenciesSorted, 99),
      max: messageLatenciesSorted[messageLatenciesSorted.length - 1] || 0,
    };

    const errorRate = connections > 0 ? (failedConnections / connections) * 100 : 0;
    const violations: string[] = [];

    if (connectionMetrics.p95 > 100) {
      violations.push(`Connection p95 ${connectionMetrics.p95}ms exceeds 100ms requirement`);
    }
    if (errorRate > 0.1) {
      violations.push(`Error rate ${errorRate.toFixed(2)}% exceeds 0.1% requirement`);
    }

    console.log(`\nWebSocket Results (${connections} connections):`);
    console.log(`  Connection Time p50: ${connectionMetrics.p50}ms`);
    console.log(`  Connection Time p95: ${connectionMetrics.p95}ms`);
    console.log(`  Connection Time p99: ${connectionMetrics.p99}ms`);
    console.log(`  Successful Connections: ${successfulConnections}`);
    console.log(`  Failed Connections: ${failedConnections}`);
    console.log(`  Error Rate: ${errorRate.toFixed(2)}%`);
    if (violations.length > 0) {
      console.log(`  Violations: ${violations.join(', ')}`);
    }

    return {
      name: 'WebSocket Connection',
      connections,
      metrics: {
        connectionTime: connectionMetrics,
        messageLatency: latencyMetrics,
        successfulConnections,
        failedConnections,
        messagesReceived,
      },
      errorRate,
      violations,
    };
  }

  private printTestResults(
    name: string,
    connections: number,
    latency: any,
    throughput: any,
    errorRate: number,
    violations: string[]
  ): void {
    console.log(`\nResults for ${name} (${connections} connections):`);
    console.log(`  Latency p50: ${latency.p50}ms`);
    console.log(`  Latency p95: ${latency.p95}ms`);
    console.log(`  Latency p99: ${latency.p99}ms`);
    console.log(`  Latency max: ${latency.max}ms`);
    console.log(`  Requests/sec: ${throughput.requestsPerSecond.toFixed(2)}`);
    console.log(`  Successful: ${throughput.successfulRequests}`);
    console.log(`  Failed: ${throughput.failedRequests}`);
    console.log(`  Error Rate: ${errorRate.toFixed(2)}%`);

    if (violations.length > 0) {
      console.log(`  VIOLATIONS:`);
      violations.forEach(v => console.log(`    - ${v}`));
    } else {
      console.log(`  Status: All requirements met`);
    }
  }

  private async generateReport(): Promise<void> {
    const totalTime = ((Date.now() - this.startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(80));
    console.log('PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(80));

    let allPassed = true;
    const bottlenecks: string[] = [];
    const recommendations: string[] = [];

    // Analyze results
    for (const result of this.results) {
      console.log(`\n${result.name} (${result.connections} users):`);

      if ('metrics' in result && 'latency' in result.metrics) {
        const testResult = result as TestResult;
        console.log(`  p95 Latency: ${testResult.metrics.latency.p95}ms`);
        console.log(`  Error Rate: ${testResult.metrics.errorRate.toFixed(2)}%`);
        console.log(`  Throughput: ${testResult.metrics.throughput.requestsPerSecond.toFixed(2)} req/s`);

        if (testResult.violations.length > 0) {
          allPassed = false;
          console.log(`  Status: FAILED`);
          testResult.violations.forEach(v => console.log(`    - ${v}`));

          // Identify bottlenecks
          if (testResult.metrics.latency.p95 > 500) {
            bottlenecks.push(`${result.name}: High latency at ${result.connections} users`);
          }
          if (testResult.metrics.errorRate > 0.1) {
            bottlenecks.push(`${result.name}: High error rate at ${result.connections} users`);
          }
        } else {
          console.log(`  Status: PASSED`);
        }
      } else {
        const wsResult = result as WebSocketResult;
        console.log(`  Connection p95: ${wsResult.metrics.connectionTime.p95}ms`);
        console.log(`  Error Rate: ${wsResult.errorRate.toFixed(2)}%`);
        console.log(`  Success Rate: ${((wsResult.metrics.successfulConnections / wsResult.connections) * 100).toFixed(2)}%`);

        if (wsResult.violations.length > 0) {
          allPassed = false;
          console.log(`  Status: FAILED`);
          wsResult.violations.forEach(v => console.log(`    - ${v}`));
          bottlenecks.push(`WebSocket: Issues at ${result.connections} connections`);
        } else {
          console.log(`  Status: PASSED`);
        }
      }
    }

    // Generate recommendations
    if (bottlenecks.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('BOTTLENECKS IDENTIFIED:');
      console.log('='.repeat(80));
      bottlenecks.forEach(b => console.log(`  - ${b}`));

      console.log('\n' + '='.repeat(80));
      console.log('RECOMMENDATIONS:');
      console.log('='.repeat(80));

      recommendations.push('1. Implement request caching for frequently accessed data');
      recommendations.push('2. Add database connection pooling and optimize queries');
      recommendations.push('3. Implement rate limiting per user to prevent abuse');
      recommendations.push('4. Consider horizontal scaling for high-load endpoints');
      recommendations.push('5. Add CDN for static assets');
      recommendations.push('6. Optimize AI model inference with batching');
      recommendations.push('7. Implement circuit breakers for external dependencies');
      recommendations.push('8. Add response compression (gzip/brotli)');

      recommendations.forEach(r => console.log(`  ${r}`));
    }

    console.log('\n' + '='.repeat(80));
    console.log(`OVERALL STATUS: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
    console.log(`Total Test Time: ${totalTime} seconds`);
    console.log('='.repeat(80));

    // Write detailed JSON report
    const reportData = {
      timestamp: new Date().toISOString(),
      totalTestTime: `${totalTime}s`,
      overallStatus: allPassed ? 'PASSED' : 'FAILED',
      results: this.results,
      bottlenecks,
      recommendations,
    };

    const reportPath = path.join('/Users/benkennon/Jarvis/tests/performance', 'performance-report.json');
    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\nDetailed report saved to: ${reportPath}`);

    // Generate markdown report
    await this.generateMarkdownReport(reportData, totalTime, allPassed, bottlenecks, recommendations);
  }

  private async generateMarkdownReport(
    reportData: any,
    totalTime: string,
    allPassed: boolean,
    bottlenecks: string[],
    recommendations: string[]
  ): Promise<void> {
    let markdown = `# Jarvis Performance Test Report\n\n`;
    markdown += `**Test Date:** ${new Date().toISOString()}\n`;
    markdown += `**Total Test Time:** ${totalTime} seconds\n`;
    markdown += `**Overall Status:** ${allPassed ? '✅ PASSED' : '❌ FAILED'}\n\n`;

    markdown += `## Performance Requirements\n\n`;
    markdown += `- API endpoints: p95 < 100ms\n`;
    markdown += `- AI endpoints: p95 < 500ms\n`;
    markdown += `- Error rate < 0.1%\n`;
    markdown += `- System should handle 1000 concurrent users\n\n`;

    markdown += `## Test Results Summary\n\n`;

    // Group results by endpoint
    const resultsByEndpoint = new Map<string, (TestResult | WebSocketResult)[]>();
    for (const result of this.results) {
      if (!resultsByEndpoint.has(result.name)) {
        resultsByEndpoint.set(result.name, []);
      }
      resultsByEndpoint.get(result.name)!.push(result);
    }

    for (const [name, results] of resultsByEndpoint) {
      markdown += `### ${name}\n\n`;
      markdown += `| Load Level | p50 | p95 | p99 | Error Rate | Throughput | Status |\n`;
      markdown += `|------------|-----|-----|-----|------------|------------|--------|\n`;

      for (const result of results) {
        if ('metrics' in result && 'latency' in result.metrics) {
          const testResult = result as TestResult;
          const status = testResult.violations.length === 0 ? '✅' : '❌';
          markdown += `| ${result.connections} users | `;
          markdown += `${testResult.metrics.latency.p50}ms | `;
          markdown += `${testResult.metrics.latency.p95}ms | `;
          markdown += `${testResult.metrics.latency.p99}ms | `;
          markdown += `${testResult.metrics.errorRate.toFixed(2)}% | `;
          markdown += `${testResult.metrics.throughput.requestsPerSecond.toFixed(2)} req/s | `;
          markdown += `${status} |\n`;
        } else {
          const wsResult = result as WebSocketResult;
          const status = wsResult.violations.length === 0 ? '✅' : '❌';
          markdown += `| ${result.connections} connections | `;
          markdown += `${wsResult.metrics.connectionTime.p50}ms | `;
          markdown += `${wsResult.metrics.connectionTime.p95}ms | `;
          markdown += `${wsResult.metrics.connectionTime.p99}ms | `;
          markdown += `${wsResult.errorRate.toFixed(2)}% | `;
          markdown += `N/A | `;
          markdown += `${status} |\n`;
        }
      }
      markdown += `\n`;
    }

    if (bottlenecks.length > 0) {
      markdown += `## Bottlenecks Identified\n\n`;
      bottlenecks.forEach(b => markdown += `- ${b}\n`);
      markdown += `\n`;
    }

    if (recommendations.length > 0) {
      markdown += `## Recommendations\n\n`;
      recommendations.forEach(r => markdown += `${r}\n`);
      markdown += `\n`;
    }

    const reportPath = path.join('/Users/benkennon/Jarvis/tests/performance', 'PERFORMANCE_REPORT.md');
    await fs.writeFile(reportPath, markdown);
    console.log(`Markdown report saved to: ${reportPath}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  const tester = new PerformanceTester();
  await tester.runAllTests();
}

main().catch(console.error);
