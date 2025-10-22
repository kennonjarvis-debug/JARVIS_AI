#!/usr/bin/env tsx

/**
 * Simple Load Testing Suite (No External Dependencies)
 * Tests all critical endpoints at multiple load levels
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';
import fs from 'fs/promises';
import path from 'path';

interface RequestStats {
  startTime: number;
  endTime: number;
  statusCode: number;
  error?: string;
}

interface LoadTestConfig {
  url: string;
  method: 'GET' | 'POST';
  body?: any;
  headers?: Record<string, string>;
  connections: number;
  duration: number;
  name: string;
  isAI?: boolean;
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
  requirementsMet: {
    responseTime: boolean;
    errorRate: boolean;
  };
  violations: string[];
}

class SimpleLoadTester {
  private results: TestResult[] = [];
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
        duration: 10,
        isAI: false,
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
        duration: 10,
        isAI: false,
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
        duration: 10,
        isAI: false,
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
        duration: 10,
        isAI: true,
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
        await this.sleep(2000);
      }
    }

    // Generate report
    await this.generateReport();
  }

  private async runLoadTest(config: LoadTestConfig): Promise<TestResult> {
    const p95Requirement = config.isAI ? 500 : 100;
    const stats: RequestStats[] = [];
    const startTime = Date.now();
    const endTime = startTime + (config.duration * 1000);

    console.log(`Running test for ${config.duration} seconds...`);

    // Create worker promises
    const workers = Array.from({ length: config.connections }, () =>
      this.runWorker(config, endTime, stats)
    );

    await Promise.all(workers);

    const actualDuration = (Date.now() - startTime) / 1000;

    // Calculate metrics
    const latencies = stats
      .filter(s => !s.error)
      .map(s => s.endTime - s.startTime)
      .sort((a, b) => a - b);

    const successfulRequests = stats.filter(s => !s.error && s.statusCode >= 200 && s.statusCode < 300).length;
    const failedRequests = stats.length - successfulRequests;
    const errorRate = stats.length > 0 ? (failedRequests / stats.length) * 100 : 0;

    const getPercentile = (arr: number[], percentile: number): number => {
      if (arr.length === 0) return 0;
      const index = Math.ceil((percentile / 100) * arr.length) - 1;
      return arr[Math.max(0, index)] || 0;
    };

    const latency = {
      p50: getPercentile(latencies, 50),
      p95: getPercentile(latencies, 95),
      p99: getPercentile(latencies, 99),
      max: latencies[latencies.length - 1] || 0,
      mean: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
    };

    const throughput = {
      requestsPerSecond: stats.length / actualDuration,
      successfulRequests,
      failedRequests,
      totalRequests: stats.length,
    };

    const violations: string[] = [];
    const responseTimeMet = latency.p95 <= p95Requirement;
    const errorRateMet = errorRate <= 0.1;

    if (!responseTimeMet) {
      violations.push(`p95 latency ${latency.p95.toFixed(2)}ms exceeds requirement ${p95Requirement}ms`);
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
  }

  private async runWorker(
    config: LoadTestConfig,
    endTime: number,
    stats: RequestStats[]
  ): Promise<void> {
    while (Date.now() < endTime) {
      const stat = await this.makeRequest(config);
      stats.push(stat);
    }
  }

  private makeRequest(config: LoadTestConfig): Promise<RequestStats> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const url = new URL(config.url);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: config.method,
        headers: config.headers || {},
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            startTime,
            endTime: Date.now(),
            statusCode: res.statusCode || 0,
          });
        });
      });

      req.on('error', (error) => {
        resolve({
          startTime,
          endTime: Date.now(),
          statusCode: 0,
          error: error.message,
        });
      });

      if (config.body) {
        req.write(JSON.stringify(config.body));
      }

      req.end();
    });
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
    console.log(`  Latency p50: ${latency.p50.toFixed(2)}ms`);
    console.log(`  Latency p95: ${latency.p95.toFixed(2)}ms`);
    console.log(`  Latency p99: ${latency.p99.toFixed(2)}ms`);
    console.log(`  Latency max: ${latency.max.toFixed(2)}ms`);
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
      console.log(`  p95 Latency: ${result.metrics.latency.p95.toFixed(2)}ms`);
      console.log(`  Error Rate: ${result.metrics.errorRate.toFixed(2)}%`);
      console.log(`  Throughput: ${result.metrics.throughput.requestsPerSecond.toFixed(2)} req/s`);

      if (result.violations.length > 0) {
        allPassed = false;
        console.log(`  Status: FAILED`);
        result.violations.forEach(v => console.log(`    - ${v}`));

        // Identify bottlenecks
        if (result.metrics.latency.p95 > 500) {
          bottlenecks.push(`${result.name}: High latency at ${result.connections} users`);
        }
        if (result.metrics.errorRate > 0.1) {
          bottlenecks.push(`${result.name}: High error rate at ${result.connections} users`);
        }
      } else {
        console.log(`  Status: PASSED`);
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
      recommendations.push('9. Use async processing for heavy operations');
      recommendations.push('10. Implement proper database indexing');

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
    markdown += `**Overall Status:** ${allPassed ? 'PASSED' : 'FAILED'}\n\n`;

    markdown += `## Performance Requirements\n\n`;
    markdown += `- API endpoints: p95 < 100ms\n`;
    markdown += `- AI endpoints: p95 < 500ms\n`;
    markdown += `- Error rate < 0.1%\n`;
    markdown += `- System should handle 1000 concurrent users\n\n`;

    markdown += `## Test Results Summary\n\n`;

    // Group results by endpoint
    const resultsByEndpoint = new Map<string, TestResult[]>();
    for (const result of this.results) {
      if (!resultsByEndpoint.has(result.name)) {
        resultsByEndpoint.set(result.name, []);
      }
      resultsByEndpoint.get(result.name)!.push(result);
    }

    for (const [name, results] of resultsByEndpoint) {
      markdown += `### ${name}\n\n`;
      markdown += `| Load Level | p50 | p95 | p99 | max | Error Rate | Throughput | Status |\n`;
      markdown += `|------------|-----|-----|-----|-----|------------|------------|--------|\n`;

      for (const result of results) {
        const status = result.violations.length === 0 ? 'PASS' : 'FAIL';
        markdown += `| ${result.connections} users | `;
        markdown += `${result.metrics.latency.p50.toFixed(2)}ms | `;
        markdown += `${result.metrics.latency.p95.toFixed(2)}ms | `;
        markdown += `${result.metrics.latency.p99.toFixed(2)}ms | `;
        markdown += `${result.metrics.latency.max.toFixed(2)}ms | `;
        markdown += `${result.metrics.errorRate.toFixed(2)}% | `;
        markdown += `${result.metrics.throughput.requestsPerSecond.toFixed(2)} req/s | `;
        markdown += `${status} |\n`;

        if (result.violations.length > 0) {
          markdown += `\n**Violations:**\n`;
          result.violations.forEach(v => markdown += `- ${v}\n`);
          markdown += `\n`;
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
      markdown += `## Recommendations for Optimization\n\n`;
      recommendations.forEach(r => markdown += `${r}\n`);
      markdown += `\n`;
    }

    markdown += `## Test Configuration\n\n`;
    markdown += `- **Load Levels:** 10, 100, 1000 concurrent users\n`;
    markdown += `- **Test Duration:** 10 seconds per test\n`;
    markdown += `- **Total Tests:** ${this.results.length}\n`;
    markdown += `- **Endpoints Tested:** 4\n\n`;

    markdown += `## Next Steps\n\n`;
    if (allPassed) {
      markdown += `All performance requirements met. System is ready for production load.\n`;
    } else {
      markdown += `Performance issues detected. Review bottlenecks and implement recommended optimizations.\n`;
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
  const tester = new SimpleLoadTester();
  await tester.runAllTests();
}

main().catch(console.error);
