# Jarvis Secrets Management

## Overview

Jarvis uses AWS Secrets Manager for secure secret storage and retrieval in production environments. This document explains how to configure, migrate, and manage secrets for the Jarvis application.

## Table of Contents

- [Architecture](#architecture)
- [Configuration Modes](#configuration-modes)
- [Setup Guide](#setup-guide)
- [Migration from .env to AWS](#migration-from-env-to-aws)
- [Usage in Application Code](#usage-in-application-code)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

## Architecture

### Components

1. **SecretsManager Class** (`src/security/secrets-manager.ts`)
   - Provides unified interface for secret retrieval
   - Supports both AWS Secrets Manager and local .env files
   - Implements caching for performance optimization
   - Handles fallback mechanisms

2. **Config Module** (`src/utils/config.ts`)
   - Integrates with SecretsManager
   - Provides synchronous and asynchronous configuration access
   - Supports credential rotation

3. **Migration Script** (`scripts/migrate-secrets.sh`)
   - Automates migration from .env to AWS Secrets Manager
   - Supports dry-run mode for testing
   - Creates backups automatically

### Secret Storage Strategy

```
┌─────────────────────────────────────────────────────┐
│                 Application Code                     │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────┐
│              Config Module                            │
│         (src/utils/config.ts)                         │
└───────────────┬──────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────┐
│          SecretsManager                               │
│    (src/security/secrets-manager.ts)                  │
└───────────────┬───────────────────────────────────────┘
                │
        ┌───────┴────────┐
        │                │
        ▼                ▼
┌──────────────┐  ┌──────────────────┐
│  Local .env  │  │  AWS Secrets     │
│  (Dev Mode)  │  │  Manager (Prod)  │
└──────────────┘  └──────────────────┘
```

## Configuration Modes

### Development Mode (Local Secrets)

Use local `.env` file for development:

```bash
# .env
USE_LOCAL_SECRETS=true
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
```

### Production Mode (AWS Secrets Manager)

Use AWS Secrets Manager in production:

```bash
# .env.production
USE_LOCAL_SECRETS=false
AWS_REGION=us-east-1
AWS_SECRET_NAME=jarvis/production
```

### Testing Mode (LocalStack)

Use LocalStack for testing AWS integration locally:

```bash
# .env.test
USE_LOCAL_SECRETS=false
AWS_REGION=us-east-1
AWS_SECRET_NAME=jarvis/test
AWS_SECRETS_ENDPOINT=http://localhost:4566
```

## Setup Guide

### Prerequisites

1. **AWS Account** with Secrets Manager access
2. **AWS CLI** installed and configured
3. **IAM Permissions** for Secrets Manager:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:ListSecrets"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:jarvis/*"
    }
  ]
}
```

### Initial Setup

1. **Install Dependencies**

```bash
npm install @aws-sdk/client-secrets-manager
```

2. **Configure AWS Credentials**

```bash
aws configure
# AWS Access Key ID: YOUR_ACCESS_KEY
# AWS Secret Access Key: YOUR_SECRET_KEY
# Default region name: us-east-1
# Default output format: json
```

3. **Copy Environment Template**

```bash
cp .env.example .env
```

4. **Configure Local Development**

Edit `.env` and set your development secrets:

```bash
USE_LOCAL_SECRETS=true
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
# ... other secrets
```

## Migration from .env to AWS

### Step 1: Prepare Your Environment

Ensure your `.env` file contains all required secrets:

```bash
cat .env | grep -E "(API_KEY|SECRET|PASSWORD|URL)" | grep -v "^#"
```

### Step 2: Run Dry-Run Migration

Test the migration without making changes:

```bash
./scripts/migrate-secrets.sh --dry-run
```

This will show you:
- Which secrets will be migrated
- The JSON structure that will be uploaded
- Any validation warnings

### Step 3: Execute Migration

Run the actual migration:

```bash
./scripts/migrate-secrets.sh \
  --secret-name jarvis/production \
  --region us-east-1
```

Output:
```
[INFO] ==========================================
[INFO] AWS Secrets Manager Migration for Jarvis
[INFO] ==========================================

[INFO] Checking prerequisites...
[INFO] All prerequisites met!

[INFO] Created backup: .env.backup.20251017_120000

[INFO] Parsing environment file: .env
[INFO]   Found: DATABASE_URL
[INFO]   Found: OPENAI_API_KEY
[INFO]   Found: JWT_SECRET
...

[INFO] Creating new secret...
[INFO] Secret created successfully!

[INFO] Successfully retrieved 15 secrets from AWS Secrets Manager
```

### Step 4: Verify Migration

Check AWS Console or use AWS CLI:

```bash
aws secretsmanager get-secret-value \
  --secret-id jarvis/production \
  --region us-east-1
```

### Step 5: Update Production Configuration

Create `.env.production`:

```bash
USE_LOCAL_SECRETS=false
AWS_REGION=us-east-1
AWS_SECRET_NAME=jarvis/production
NODE_ENV=production
```

### Step 6: Test Application

```bash
NODE_ENV=production npm start
```

Check logs for:
```
[Config] Loaded secrets from aws mode
```

## Usage in Application Code

### Basic Usage

```typescript
import { secretsManager } from '../security/secrets-manager';

// Get a single secret
const apiKey = await secretsManager.getSecret('OPENAI_API_KEY');

// Get all secrets
const secrets = await secretsManager.getAllSecrets();
console.log(secrets.DATABASE_URL);
```

### With Configuration Module

```typescript
import { getConfigAsync } from '../utils/config';

// Load configuration with secrets
const config = await getConfigAsync();
console.log(config.openaiApiKey);
console.log(config.databaseUrl);
```

### Credential Rotation

```typescript
import { reloadConfig } from '../utils/config';

// Reload secrets after rotation
const newConfig = await reloadConfig();
```

### Validation

```typescript
import { secretsManager } from '../security/secrets-manager';

// Validate required secrets exist
const isValid = await secretsManager.validateSecrets([
  'OPENAI_API_KEY',
  'DATABASE_URL',
  'JWT_SECRET'
]);

if (!isValid) {
  throw new Error('Missing required secrets');
}
```

## Security Best Practices

### 1. Never Commit Secrets

```bash
# .gitignore already configured to exclude:
.env
.env.*
!.env.example
```

### 2. Use Different Secrets for Each Environment

```
jarvis/development    # Dev secrets
jarvis/staging        # Staging secrets
jarvis/production     # Production secrets
```

### 3. Rotate Credentials Regularly

```bash
# Update secret in AWS
aws secretsmanager put-secret-value \
  --secret-id jarvis/production \
  --secret-string file://new-secrets.json

# Application will use new secrets after cache expiry (5 minutes)
# Or manually reload
```

### 4. Use IAM Roles in Production

Instead of access keys, use IAM roles for EC2/ECS:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:jarvis/production-*"
    }
  ]
}
```

### 5. Enable Secret Rotation

```bash
aws secretsmanager rotate-secret \
  --secret-id jarvis/production \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:ACCOUNT_ID:function:rotate-jarvis-secrets
```

### 6. Monitor Secret Access

Enable AWS CloudTrail for audit logging:

```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=jarvis/production \
  --max-results 50
```

## Troubleshooting

### Issue: "Failed to retrieve secrets"

**Solution:**

1. Check AWS credentials:
```bash
aws sts get-caller-identity
```

2. Verify IAM permissions:
```bash
aws secretsmanager describe-secret --secret-id jarvis/production
```

3. Check region configuration:
```bash
echo $AWS_REGION
```

### Issue: "Secret not found"

**Solution:**

1. List available secrets:
```bash
aws secretsmanager list-secrets
```

2. Verify secret name in `.env`:
```bash
grep AWS_SECRET_NAME .env
```

### Issue: "Cache not updating"

**Solution:**

1. Clear cache manually:
```typescript
secretsManager.clearCache();
```

2. Reload configuration:
```typescript
await reloadConfig();
```

3. Restart application to force fresh load

### Issue: "Local development using AWS instead of .env"

**Solution:**

Ensure `.env` has:
```bash
USE_LOCAL_SECRETS=true
```

### Issue: "AWS SDK timeout"

**Solution:**

1. Check network connectivity to AWS
2. Verify security group rules (if running in VPC)
3. Increase timeout (if needed):

```typescript
const client = new SecretsManagerClient({
  region: 'us-east-1',
  requestTimeout: 30000
});
```

## API Reference

### SecretsManager Class

#### Constructor

```typescript
new SecretsManager(config?: SecretsManagerConfig)
```

**Options:**
- `region` - AWS region (default: from AWS_REGION env)
- `useLocalSecrets` - Use local .env instead of AWS (default: from USE_LOCAL_SECRETS env)
- `secretName` - Secret name in AWS (default: from AWS_SECRET_NAME env)
- `endpoint` - Custom endpoint for LocalStack (optional)

#### Methods

##### `getSecret(key: string): Promise<string | undefined>`

Retrieve a single secret value.

```typescript
const apiKey = await secretsManager.getSecret('OPENAI_API_KEY');
```

##### `getAllSecrets(): Promise<SecretValue>`

Retrieve all secrets (cached for 5 minutes).

```typescript
const secrets = await secretsManager.getAllSecrets();
```

##### `setSecret(secrets: SecretValue): Promise<void>`

Create or update secrets in AWS Secrets Manager.

```typescript
await secretsManager.setSecret({
  OPENAI_API_KEY: 'sk-...',
  DATABASE_URL: 'postgresql://...'
});
```

##### `validateSecrets(requiredKeys: string[]): Promise<boolean>`

Validate that required secrets exist and are non-empty.

```typescript
const isValid = await secretsManager.validateSecrets([
  'OPENAI_API_KEY',
  'JWT_SECRET'
]);
```

##### `clearCache(): void`

Clear the in-memory cache.

```typescript
secretsManager.clearCache();
```

##### `getMode(): 'local' | 'aws'`

Get the current operating mode.

```typescript
const mode = secretsManager.getMode();
console.log(`Running in ${mode} mode`);
```

### Config Module

#### Functions

##### `getConfigAsync(): Promise<Config>`

Load configuration with secrets from AWS Secrets Manager.

```typescript
const config = await getConfigAsync();
```

##### `reloadConfig(): Promise<Config>`

Reload configuration and clear cache (useful after credential rotation).

```typescript
const config = await reloadConfig();
```

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment name | `production` |
| `USE_LOCAL_SECRETS` | Use local .env file | `false` |

### AWS Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_REGION` | AWS region | `us-east-1` |
| `AWS_SECRET_NAME` | Secret name in AWS | `jarvis/production` |
| `AWS_SECRETS_ENDPOINT` | Custom endpoint (LocalStack) | - |

### Secrets (stored in AWS Secrets Manager)

| Secret Key | Description | Required |
|------------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `ANTHROPIC_API_KEY` | Anthropic API key | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `CSRF_SECRET` | CSRF protection secret | Yes |
| `REFRESH_TOKEN_SECRET` | Refresh token secret | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key | No |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | No |

## Cost Considerations

### AWS Secrets Manager Pricing

- **Storage**: $0.40 per secret per month
- **API Calls**: $0.05 per 10,000 API calls

### Cost Optimization

1. **Use caching** - Secrets are cached for 5 minutes (included in implementation)
2. **Minimize secrets** - Store only sensitive data in Secrets Manager
3. **Use regional endpoints** - Avoid cross-region calls
4. **Batch retrieval** - Use `getAllSecrets()` instead of multiple `getSecret()` calls

### Estimated Monthly Cost

For typical Jarvis deployment:
- 1 secret (JSON with ~20 keys): $0.40/month
- ~10,000 API calls/month: $0.05/month
- **Total: ~$0.45/month**

## Support

For issues or questions:

1. Check this documentation
2. Review troubleshooting section
3. Check application logs
4. Consult AWS Secrets Manager documentation

## Additional Resources

- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Best Practices for Managing Secrets](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
