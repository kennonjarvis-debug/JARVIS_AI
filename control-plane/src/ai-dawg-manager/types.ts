/**
 * AI DAWG Manager Types
 * Defines interfaces for autonomous service management
 */

export interface ServiceConfig {
  port: number;
  name: string;
  start_command: string;
  health_endpoint: string;
  log_file: string;
  enabled?: boolean;
}

export interface ServiceState {
  name: string;
  port: number;
  status: 'running' | 'stopped' | 'unhealthy' | 'starting' | 'stopping' | 'unknown';
  pid?: number;
  uptime?: number;
  last_health_check?: Date;
  last_restart?: Date;
  restart_count: number;
  consecutive_failures: number;
}

export interface HealthCheckResult {
  service: string;
  healthy: boolean;
  status_code?: number;
  response_time_ms?: number;
  error?: string;
  timestamp: Date;
}

export interface ServiceOperation {
  service: string;
  operation: 'start' | 'stop' | 'restart' | 'health_check';
  success: boolean;
  error?: string;
  timestamp: Date;
  duration_ms: number;
}

export interface AutomonyConfig {
  enabled: boolean;
  ai_dawg: {
    root_path: string;
    services: Record<string, ServiceConfig>;
  };
  monitoring: {
    health_check_interval_seconds: number;
    health_check_timeout_seconds: number;
    max_restart_attempts: number;
    restart_cooldown_seconds: number;
    alert_on_failure: boolean;
  };
  testing: {
    enabled: boolean;
    interval_hours: number;
    endpoints_to_test: Array<{
      name: string;
      url: string;
      method: string;
      body?: any;
      expected_status: number;
    }>;
  };
  safety: {
    emergency_kill_switch: boolean;
    require_approval_for_destructive_ops: boolean;
    max_consecutive_failures_before_escalation: number;
    audit_all_commands: boolean;
  };
  notifications: {
    enabled: boolean;
    methods: string[];
    escalation_email?: string;
    slack_webhook?: string;
  };
}
