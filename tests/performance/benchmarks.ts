/**
 * Performance Benchmarks
 *
 * Features:
 * - Load testing
 * - Stress testing
 * - Response time benchmarks
 * - Throughput tests
 * - Database performance tests
 * - Cache performance tests
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

export interface BenchmarkResult {
  name: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  p50: number;
  p95: number;
  p99: number;
  minResponseTime: number;
  maxResponseTime: number;
  throughput: number; // requests per second
  duration: number;
  errors: string[];
}

export interface LoadTestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  concurrent?: number;
  totalRequests?: number;
  duration?: number; // seconds
  rampUp?: number; // seconds
  timeout?: number; // milliseconds
}

export class PerformanceBenchmark {
  /**
   * Run load test
   */
  static async loadTest(
    name: string,
    options: LoadTestOptions
  ): Promise<BenchmarkResult> {
    console.log(`\nStarting load test: ${name}`);
    console.log(`URL: ${options.url}`);
    console.log(`Concurrent: ${options.concurrent || 10}`);
    console.log(`Total Requests: ${options.totalRequests || 'Duration-based'}`);

    const startTime = performance.now();
    const responseTimes: number[] = [];
    const errors: string[] = [];
    let successCount = 0;
    let failCount = 0;

    const concurrent = options.concurrent || 10;
    const totalRequests = options.totalRequests || 1000;
    const duration = options.duration || 60;
    const timeout = options.timeout || 30000;

    let requestsSent = 0;
    let requestsCompleted = 0;

    // Create worker pool
    const workers = Array(concurrent)
      .fill(null)
      .map(async () => {
        while (
          (options.totalRequests && requestsSent < totalRequests) ||
          (options.duration && (performance.now() - startTime) / 1000 < duration)
        ) {
          requestsSent++;
          const reqStartTime = performance.now();

          try {
            await axios({
              method: options.method || 'GET',
              url: options.url,
              headers: options.headers,
              data: options.body,
              timeout,
            });

            const reqTime = performance.now() - reqStartTime;
            responseTimes.push(reqTime);
            successCount++;
          } catch (error: any) {
            const reqTime = performance.now() - reqStartTime;
            responseTimes.push(reqTime);
            failCount++;
            errors.push(error.message);
          } finally {
            requestsCompleted++;
          }

          // Small delay to prevent overwhelming the server
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      });

    await Promise.all(workers);

    const endTime = performance.now();
    const totalDuration = (endTime - startTime) / 1000; // seconds

    // Calculate percentiles
    const sorted = responseTimes.sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    const result: BenchmarkResult = {
      name,
      totalRequests: requestsCompleted,
      successfulRequests: successCount,
      failedRequests: failCount,
      avgResponseTime:
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      p50,
      p95,
      p99,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      throughput: requestsCompleted / totalDuration,
      duration: totalDuration,
      errors: [...new Set(errors)].slice(0, 10), // Unique errors, max 10
    };

    this.printResult(result);
    return result;
  }

  /**
   * Run stress test (increasing load)
   */
  static async stressTest(
    name: string,
    baseOptions: LoadTestOptions,
    steps: number[] = [10, 50, 100, 200, 500]
  ): Promise<BenchmarkResult[]> {
    console.log(`\nStarting stress test: ${name}`);

    const results: BenchmarkResult[] = [];

    for (const concurrent of steps) {
      console.log(`\nTesting with ${concurrent} concurrent requests...`);

      const result = await this.loadTest(`${name} - ${concurrent} concurrent`, {
        ...baseOptions,
        concurrent,
        totalRequests: concurrent * 10, // 10 requests per concurrent connection
      });

      results.push(result);

      // Check if system is breaking
      if (result.failedRequests / result.totalRequests > 0.5) {
        console.log('\nSystem breaking point reached. Stopping stress test.');
        break;
      }

      // Cool down period
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return results;
  }

  /**
   * Benchmark API endpoint
   */
  static async benchmarkEndpoint(
    url: string,
    warmupRequests: number = 10,
    benchmarkRequests: number = 100
  ): Promise<BenchmarkResult> {
    console.log(`\nBenchmarking endpoint: ${url}`);

    // Warmup
    console.log(`Warming up with ${warmupRequests} requests...`);
    for (let i = 0; i < warmupRequests; i++) {
      await axios.get(url).catch(() => {});
    }

    // Benchmark
    console.log(`Running ${benchmarkRequests} benchmark requests...`);
    return await this.loadTest(`Endpoint: ${url}`, {
      url,
      totalRequests: benchmarkRequests,
      concurrent: 10,
    });
  }

  /**
   * Compare cache vs no-cache performance
   */
  static async benchmarkCache(
    cachedUrl: string,
    uncachedUrl: string,
    requests: number = 100
  ): Promise<{
    cached: BenchmarkResult;
    uncached: BenchmarkResult;
    improvement: number;
  }> {
    console.log('\nBenchmarking cache performance...');

    const cached = await this.benchmarkEndpoint(cachedUrl, 10, requests);
    const uncached = await this.benchmarkEndpoint(uncachedUrl, 10, requests);

    const improvement = ((uncached.avgResponseTime - cached.avgResponseTime) / uncached.avgResponseTime) * 100;

    console.log(`\nCache Performance Improvement: ${improvement.toFixed(2)}%`);

    return { cached, uncached, improvement };
  }

  /**
   * Print benchmark result
   */
  private static printResult(result: BenchmarkResult): void {
    console.log('\n' + '='.repeat(60));
    console.log(`Benchmark: ${result.name}`);
    console.log('='.repeat(60));
    console.log(`Total Requests:      ${result.totalRequests}`);
    console.log(`Successful:          ${result.successfulRequests}`);
    console.log(`Failed:              ${result.failedRequests}`);
    console.log(`Success Rate:        ${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%`);
    console.log(`\nResponse Times:`);
    console.log(`  Average:           ${result.avgResponseTime.toFixed(2)}ms`);
    console.log(`  P50 (Median):      ${result.p50.toFixed(2)}ms`);
    console.log(`  P95:               ${result.p95.toFixed(2)}ms`);
    console.log(`  P99:               ${result.p99.toFixed(2)}ms`);
    console.log(`  Min:               ${result.minResponseTime.toFixed(2)}ms`);
    console.log(`  Max:               ${result.maxResponseTime.toFixed(2)}ms`);
    console.log(`\nThroughput:          ${result.throughput.toFixed(2)} req/s`);
    console.log(`Duration:            ${result.duration.toFixed(2)}s`);

    if (result.errors.length > 0) {
      console.log(`\nErrors:`);
      result.errors.forEach((err) => console.log(`  - ${err}`));
    }

    console.log('='.repeat(60));
  }

  /**
   * Generate benchmark report
   */
  static generateReport(results: BenchmarkResult[]): string {
    let report = '\n# Performance Benchmark Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    // Summary table
    report += '## Summary\n\n';
    report += '| Benchmark | Total Requests | Success Rate | Avg Response | P95 | P99 | Throughput |\n';
    report += '|-----------|----------------|--------------|--------------|-----|-----|------------|\n';

    for (const result of results) {
      const successRate = ((result.successfulRequests / result.totalRequests) * 100).toFixed(2);
      report += `| ${result.name} | ${result.totalRequests} | ${successRate}% | ${result.avgResponseTime.toFixed(2)}ms | ${result.p95.toFixed(2)}ms | ${result.p99.toFixed(2)}ms | ${result.throughput.toFixed(2)} req/s |\n`;
    }

    report += '\n## Detailed Results\n\n';

    for (const result of results) {
      report += `### ${result.name}\n\n`;
      report += `- **Total Requests:** ${result.totalRequests}\n`;
      report += `- **Successful:** ${result.successfulRequests}\n`;
      report += `- **Failed:** ${result.failedRequests}\n`;
      report += `- **Success Rate:** ${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%\n`;
      report += `- **Average Response Time:** ${result.avgResponseTime.toFixed(2)}ms\n`;
      report += `- **P50:** ${result.p50.toFixed(2)}ms\n`;
      report += `- **P95:** ${result.p95.toFixed(2)}ms\n`;
      report += `- **P99:** ${result.p99.toFixed(2)}ms\n`;
      report += `- **Throughput:** ${result.throughput.toFixed(2)} req/s\n`;
      report += `- **Duration:** ${result.duration.toFixed(2)}s\n\n`;

      if (result.errors.length > 0) {
        report += '**Errors:**\n';
        result.errors.forEach((err) => {
          report += `- ${err}\n`;
        });
        report += '\n';
      }
    }

    return report;
  }
}

/**
 * Database performance benchmarks
 */
export class DatabaseBenchmark {
  /**
   * Benchmark query performance
   */
  static async benchmarkQuery(
    queryFn: () => Promise<any>,
    iterations: number = 100
  ): Promise<{
    avgTime: number;
    minTime: number;
    maxTime: number;
    p95: number;
  }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await queryFn();
      const time = performance.now() - start;
      times.push(time);
    }

    const sorted = times.sort((a, b) => a - b);

    return {
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      p95: sorted[Math.floor(sorted.length * 0.95)],
    };
  }

  /**
   * Benchmark with and without index
   */
  static async compareIndexPerformance(
    withIndexFn: () => Promise<any>,
    withoutIndexFn: () => Promise<any>,
    iterations: number = 50
  ): Promise<{
    withIndex: number;
    withoutIndex: number;
    improvement: number;
  }> {
    console.log('\nBenchmarking index performance...');

    const withIndex = await this.benchmarkQuery(withIndexFn, iterations);
    const withoutIndex = await this.benchmarkQuery(withoutIndexFn, iterations);

    const improvement = ((withoutIndex.avgTime - withIndex.avgTime) / withoutIndex.avgTime) * 100;

    console.log(`With Index: ${withIndex.avgTime.toFixed(2)}ms`);
    console.log(`Without Index: ${withoutIndex.avgTime.toFixed(2)}ms`);
    console.log(`Improvement: ${improvement.toFixed(2)}%`);

    return {
      withIndex: withIndex.avgTime,
      withoutIndex: withoutIndex.avgTime,
      improvement,
    };
  }
}

// Example usage
if (require.main === module) {
  const baseUrl = process.env.API_URL || 'http://localhost:3000';

  (async () => {
    // Run benchmarks
    const results: BenchmarkResult[] = [];

    // Benchmark health endpoint
    results.push(
      await PerformanceBenchmark.benchmarkEndpoint(`${baseUrl}/health`, 10, 100)
    );

    // Run load test
    results.push(
      await PerformanceBenchmark.loadTest('API Load Test', {
        url: `${baseUrl}/api/test`,
        concurrent: 50,
        totalRequests: 500,
      })
    );

    // Generate report
    const report = PerformanceBenchmark.generateReport(results);
    console.log(report);
  })();
}

export default PerformanceBenchmark;
