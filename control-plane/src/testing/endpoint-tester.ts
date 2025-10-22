/**
 * Automated Endpoint Testing Engine
 * Tests all AI DAWG service endpoints automatically
 */

import axios, { AxiosResponse } from 'axios';
import { Endpoint, TestResult, ResponseValidation } from './types';

export class EndpointTester {
  private readonly defaultTimeout: number;

  constructor(defaultTimeout: number = 30000) {
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Test a single endpoint
   */
  async testEndpoint(endpoint: Endpoint): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const response = await this.makeRequest(endpoint);
      const responseTime = Date.now() - startTime;

      // Validate response if validation rules exist
      const validationErrors = endpoint.validation
        ? await this.validateResponse(response, endpoint.validation)
        : [];

      return {
        endpoint: endpoint.name,
        timestamp: new Date(),
        success: validationErrors.length === 0 && response.status === endpoint.expectedStatus,
        status_code: response.status,
        response_time_ms: responseTime,
        validation_errors: validationErrors.length > 0 ? validationErrors : undefined
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      return {
        endpoint: endpoint.name,
        timestamp: new Date(),
        success: false,
        status_code: error.response?.status,
        response_time_ms: responseTime,
        error: error.message
      };
    }
  }

  /**
   * Test multiple endpoints in parallel
   */
  async testEndpoints(endpoints: Endpoint[]): Promise<TestResult[]> {
    const promises = endpoints.map(endpoint => this.testEndpoint(endpoint));
    return Promise.all(promises);
  }

  /**
   * Make HTTP request to endpoint
   */
  private async makeRequest(endpoint: Endpoint): Promise<AxiosResponse> {
    return axios({
      method: endpoint.method,
      url: endpoint.url,
      headers: endpoint.headers || {},
      data: endpoint.body,
      timeout: endpoint.timeout || this.defaultTimeout,
      validateStatus: () => true // Don't throw on any status code
    });
  }

  /**
   * Validate response against rules
   */
  private async validateResponse(
    response: AxiosResponse,
    validation: ResponseValidation
  ): Promise<string[]> {
    const errors: string[] = [];

    // Validate content type
    if (validation.contentType) {
      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.includes(validation.contentType)) {
        errors.push(`Expected content-type ${validation.contentType}, got ${contentType}`);
      }
    }

    // Validate required fields
    if (validation.requiredFields && response.data) {
      for (const field of validation.requiredFields) {
        if (!(field in response.data)) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // Custom validation
    if (validation.custom) {
      try {
        const isValid = await validation.custom(response.data);
        if (!isValid) {
          errors.push('Custom validation failed');
        }
      } catch (error: any) {
        errors.push(`Custom validation error: ${error.message}`);
      }
    }

    return errors;
  }

  /**
   * Retry failed test
   */
  async retryTest(endpoint: Endpoint, maxRetries: number = 3): Promise<TestResult> {
    let lastResult: TestResult | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      lastResult = await this.testEndpoint(endpoint);

      if (lastResult.success) {
        return lastResult;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await this.sleep(Math.pow(2, attempt) * 1000);
      }
    }

    return lastResult!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
