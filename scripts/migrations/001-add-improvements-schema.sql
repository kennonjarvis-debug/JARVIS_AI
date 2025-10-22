-- Migration: Add Improvements Schema
-- Description: Add tables for task history, AI usage, circuit breakers, music versioning, and health metrics
-- Date: 2025-01-10

-- Task History
CREATE TABLE IF NOT EXISTS task_history (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL,
    domain VARCHAR(100) NOT NULL,
    action VARCHAR(255) NOT NULL,
    decision VARCHAR(50) NOT NULL,
    success BOOLEAN NOT NULL,
    duration INTEGER NOT NULL,
    resources_used JSONB NOT NULL,
    impact_score FLOAT NOT NULL,
    user_feedback VARCHAR(50),
    error TEXT,
    metadata JSONB,
    executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_history_domain_action ON task_history(domain, action);
CREATE INDEX IF NOT EXISTS idx_task_history_executed_at ON task_history(executed_at);
CREATE INDEX IF NOT EXISTS idx_task_history_success ON task_history(success);

-- AI Usage Tracking
CREATE TABLE IF NOT EXISTS ai_usage (
    id VARCHAR(36) PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    cost FLOAT NOT NULL,
    duration INTEGER NOT NULL,
    task_type VARCHAR(50),
    complexity VARCHAR(50),
    correlation_id VARCHAR(100),
    user_id VARCHAR(100),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_provider_model ON ai_usage(provider, model);
CREATE INDEX IF NOT EXISTS idx_ai_usage_timestamp ON ai_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_usage_correlation ON ai_usage(correlation_id);

-- Circuit Breaker State
CREATE TABLE IF NOT EXISTS circuit_breaker_state (
    id VARCHAR(36) PRIMARY KEY,
    service_name VARCHAR(100) UNIQUE NOT NULL,
    state VARCHAR(20) NOT NULL,
    failure_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    last_failure_time TIMESTAMP,
    next_attempt_time TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_circuit_breaker_service ON circuit_breaker_state(service_name);

-- Music Project Versions
CREATE TABLE IF NOT EXISTS music_project_versions (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(100) NOT NULL,
    version VARCHAR(20) NOT NULL,
    commit_message TEXT NOT NULL,
    author VARCHAR(255) NOT NULL,
    snapshot JSONB NOT NULL,
    parent_version VARCHAR(36),
    tags TEXT[] DEFAULT '{}',
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_music_versions_project ON music_project_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_music_versions_project_version ON music_project_versions(project_id, version);

-- Health Metrics
CREATE TABLE IF NOT EXISTS health_metrics (
    id VARCHAR(36) PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    value FLOAT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_health_metrics_service_type ON health_metrics(service_name, metric_type);
CREATE INDEX IF NOT EXISTS idx_health_metrics_timestamp ON health_metrics(timestamp);

-- Agent Performance Snapshots
CREATE TABLE IF NOT EXISTS agent_performance_snapshots (
    id VARCHAR(36) PRIMARY KEY,
    domain VARCHAR(100) NOT NULL,
    total_tasks INTEGER NOT NULL,
    success_count INTEGER NOT NULL,
    failure_count INTEGER NOT NULL,
    avg_duration FLOAT NOT NULL,
    avg_impact_score FLOAT NOT NULL,
    cost_incurred FLOAT NOT NULL,
    tasks_per_hour FLOAT NOT NULL,
    snapshot_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_snapshots_domain ON agent_performance_snapshots(domain);
CREATE INDEX IF NOT EXISTS idx_agent_snapshots_date ON agent_performance_snapshots(snapshot_date);

-- Add any existing tables if needed
