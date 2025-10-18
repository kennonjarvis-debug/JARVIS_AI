-- DAWG AI Integration Migration
-- Adds all required tables for DAWG AI integration

-- DAWG AI OAuth Connection
CREATE TABLE IF NOT EXISTS "DawgAIConnection" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL UNIQUE,
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "tokenIv" TEXT NOT NULL,
  "tokenAuthTag" TEXT NOT NULL,
  "tokenDataKey" TEXT NOT NULL,
  "scope" TEXT,
  "connected" BOOLEAN NOT NULL DEFAULT true,
  "lastSync" TIMESTAMP(3),
  "disconnectedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "DawgAIConnection_userId_idx" ON "DawgAIConnection"("userId");
CREATE INDEX IF NOT EXISTS "DawgAIConnection_connected_idx" ON "DawgAIConnection"("connected");

-- DAWG AI Projects
CREATE TABLE IF NOT EXISTS "DawgAIProject" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId", "externalId")
);

CREATE INDEX IF NOT EXISTS "DawgAIProject_userId_idx" ON "DawgAIProject"("userId");
CREATE INDEX IF NOT EXISTS "DawgAIProject_status_idx" ON "DawgAIProject"("status");
CREATE INDEX IF NOT EXISTS "DawgAIProject_userId_status_idx" ON "DawgAIProject"("userId", "status");

-- DAWG AI Workflows
CREATE TABLE IF NOT EXISTS "DawgAIWorkflow" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "projectId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "config" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "lastRun" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DawgAIWorkflow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DawgAIProject"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "DawgAIWorkflow_userId_idx" ON "DawgAIWorkflow"("userId");
CREATE INDEX IF NOT EXISTS "DawgAIWorkflow_projectId_idx" ON "DawgAIWorkflow"("projectId");
CREATE INDEX IF NOT EXISTS "DawgAIWorkflow_status_idx" ON "DawgAIWorkflow"("status");

-- DAWG AI Workflow Executions
CREATE TABLE IF NOT EXISTS "DawgAIWorkflowExecution" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflowId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "context" JSONB NOT NULL,
  "logs" JSONB NOT NULL,
  "error" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "DawgAIWorkflowExecution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "DawgAIWorkflow"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "DawgAIWorkflowExecution_workflowId_idx" ON "DawgAIWorkflowExecution"("workflowId");
CREATE INDEX IF NOT EXISTS "DawgAIWorkflowExecution_userId_idx" ON "DawgAIWorkflowExecution"("userId");
CREATE INDEX IF NOT EXISTS "DawgAIWorkflowExecution_status_idx" ON "DawgAIWorkflowExecution"("status");
CREATE INDEX IF NOT EXISTS "DawgAIWorkflowExecution_startedAt_idx" ON "DawgAIWorkflowExecution"("startedAt");

-- DAWG AI Automation Rules
CREATE TABLE IF NOT EXISTS "DawgAIAutomation" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "projectId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "trigger" JSONB NOT NULL,
  "action" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "lastTriggered" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "DawgAIAutomation_userId_idx" ON "DawgAIAutomation"("userId");
CREATE INDEX IF NOT EXISTS "DawgAIAutomation_projectId_idx" ON "DawgAIAutomation"("projectId");
CREATE INDEX IF NOT EXISTS "DawgAIAutomation_enabled_idx" ON "DawgAIAutomation"("enabled");

-- DAWG AI Analytics
CREATE TABLE IF NOT EXISTS "DawgAIAnalytics" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "endpoint" TEXT,
  "method" TEXT,
  "statusCode" INTEGER,
  "responseTime" INTEGER,
  "success" BOOLEAN NOT NULL,
  "metadata" JSONB,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "DawgAIAnalytics_userId_idx" ON "DawgAIAnalytics"("userId");
CREATE INDEX IF NOT EXISTS "DawgAIAnalytics_eventType_idx" ON "DawgAIAnalytics"("eventType");
CREATE INDEX IF NOT EXISTS "DawgAIAnalytics_timestamp_idx" ON "DawgAIAnalytics"("timestamp");
CREATE INDEX IF NOT EXISTS "DawgAIAnalytics_userId_timestamp_idx" ON "DawgAIAnalytics"("userId", "timestamp");

-- Add trigger for auto-updating updatedAt timestamp
CREATE OR REPLACE FUNCTION update_dawg_ai_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dawg_ai_connection_updated_at
  BEFORE UPDATE ON "DawgAIConnection"
  FOR EACH ROW
  EXECUTE FUNCTION update_dawg_ai_updated_at();

CREATE TRIGGER update_dawg_ai_project_updated_at
  BEFORE UPDATE ON "DawgAIProject"
  FOR EACH ROW
  EXECUTE FUNCTION update_dawg_ai_updated_at();

CREATE TRIGGER update_dawg_ai_workflow_updated_at
  BEFORE UPDATE ON "DawgAIWorkflow"
  FOR EACH ROW
  EXECUTE FUNCTION update_dawg_ai_updated_at();

CREATE TRIGGER update_dawg_ai_automation_updated_at
  BEFORE UPDATE ON "DawgAIAutomation"
  FOR EACH ROW
  EXECUTE FUNCTION update_dawg_ai_updated_at();
