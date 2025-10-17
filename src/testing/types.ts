/**
 * Testing Engine Type Definitions
 */

export interface Endpoint {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  expectedStatus: number;
  timeout?: number;
  validation?: ResponseValidation;
}

export interface ResponseValidation {
  contentType?: string;
  requiredFields?: string[];
  schema?: any;
  custom?: (response: any) => boolean | Promise<boolean>;
}

export interface TestResult {
  endpoint: string;
  timestamp: Date;
  success: boolean;
  status_code?: number;
  response_time_ms: number;
  error?: string;
  validation_errors?: string[];
}

export interface TestSuite {
  name: string;
  description: string;
  endpoints: Endpoint[];
  schedule?: string; // cron expression
  enabled: boolean;
}

export interface TestReport {
  suite: string;
  timestamp: Date;
  total_tests: number;
  passed: number;
  failed: number;
  avg_response_time: number;
  results: TestResult[];
}

export interface TestConfig {
  test_suites: TestSuite[];
  default_timeout: number;
  retry_failed_tests: boolean;
  max_retries: number;
  alert_on_failure: boolean;
  report_path: string;
}
