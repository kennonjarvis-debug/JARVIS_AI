# Database Encryption Documentation

## Overview

Jarvis implements column-level encryption for sensitive data using AWS Key Management Service (KMS) and AES-256-GCM encryption. This provides defense-in-depth security for critical data at rest.

## Architecture

### Encryption Flow

```
Plaintext Data
    ↓
Generate Data Key via KMS
    ↓
Encrypt with AES-256-GCM
    ↓
Store: Ciphertext + IV + Auth Tag + Encrypted Data Key
```

### Decryption Flow

```
Retrieve: Ciphertext + IV + Auth Tag + Encrypted Data Key
    ↓
Decrypt Data Key via KMS
    ↓
Decrypt with AES-256-GCM
    ↓
Plaintext Data
```

## Security Model

### Encryption Algorithm

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256 bits
- **IV Length**: 16 bytes (randomly generated per operation)
- **Authentication Tag**: 16 bytes (provides integrity verification)

### Key Management

- **Master Key**: AWS KMS Customer Master Key (CMK)
- **Data Keys**: Unique per encryption operation (envelope encryption)
- **Key Rotation**: Automatic annual rotation via KMS
- **Key Cache**: 5-minute local cache for performance

### Encrypted Data Types

1. **API Keys** - Third-party service credentials
2. **OAuth Tokens** - Access and refresh tokens
3. **User Emails** - Personal identifiable information
4. **Backup Data** - Database backup archives

## Setup and Configuration

### Prerequisites

1. AWS account with KMS access
2. IAM user/role with KMS permissions
3. Node.js and npm installed

### Installation

```bash
npm install
```

This will install the required dependency:
- `@aws-sdk/client-kms@^3.913.0`

### Environment Variables

Add the following to your `.env` file:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# KMS Configuration
KMS_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012

# Encryption Configuration
ENCRYPTION_SEARCH_SALT=your-random-salt-change-in-production
```

### Initialize KMS

```typescript
import { getKMSManager } from './src/db/kms.js';

const kmsManager = getKMSManager('us-east-1');

// Initialize for Jarvis (creates key, alias, and sets policy)
const keyId = await kmsManager.initializeForJarvis(
  'your-aws-account-id',
  'production'
);

console.log('KMS Key ID:', keyId);
```

### Run Database Migration

**IMPORTANT**: Do NOT run the migration directly on production without a backup!

```bash
# 1. Backup your database first
pg_dump jarvis > backup_before_encryption.sql

# 2. Run the migration
psql jarvis < src/db/migrations/add-encryption.sql

# 3. Verify tables were created
psql jarvis -c "\dt"
```

## Usage

### Initialize Encryption Service

```typescript
import { getEncryption } from './src/db/encryption.js';

const encryption = getEncryption({
  region: 'us-east-1',
  keyId: process.env.KMS_KEY_ID,
});
```

### Encrypt API Keys

```typescript
// Encrypt an API key
const result = await encryption.encryptApiKey(
  'sk_live_1234567890abcdef',
  { service: 'stripe', environment: 'production' }
);

// Store in database
await pool.query(
  `INSERT INTO api_keys (
    service_name,
    encrypted_key,
    key_iv,
    key_auth_tag,
    key_data_key,
    key_hash,
    metadata
  ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
  [
    'stripe',
    result.ciphertext,
    result.iv,
    result.authTag,
    result.dataKeyEncrypted,
    encryption.generateSearchHash('sk_live_1234567890abcdef'),
    { environment: 'production' },
  ]
);

// Decrypt API key
const decrypted = await encryption.decryptApiKey({
  ciphertext: row.encrypted_key,
  iv: row.key_iv,
  authTag: row.key_auth_tag,
  dataKeyEncrypted: row.key_data_key,
});

console.log('API Key:', decrypted.key);
console.log('Metadata:', decrypted.metadata);
```

### Encrypt OAuth Tokens

```typescript
// Encrypt OAuth token
const tokenResult = await encryption.encryptOAuthToken({
  accessToken: 'ya29.a0AfH6SMBx...',
  refreshToken: '1//0gHF7K...',
  expiresAt: new Date('2025-12-31'),
  scope: 'https://www.googleapis.com/auth/drive.readonly',
});

// Store in database
await pool.query(
  `INSERT INTO oauth_tokens (
    provider,
    encrypted_access_token,
    access_token_iv,
    access_token_auth_tag,
    access_token_data_key,
    encrypted_refresh_token,
    refresh_token_iv,
    refresh_token_auth_tag,
    refresh_token_data_key,
    scope,
    expires_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
  [
    'google',
    tokenResult.ciphertext,
    tokenResult.iv,
    tokenResult.authTag,
    tokenResult.dataKeyEncrypted,
    // ... refresh token fields
    tokenResult.scope,
    tokenResult.expiresAt,
  ]
);

// Decrypt OAuth token
const token = await encryption.decryptOAuthToken({
  ciphertext: row.encrypted_access_token,
  iv: row.access_token_iv,
  authTag: row.access_token_auth_tag,
  dataKeyEncrypted: row.access_token_data_key,
});

console.log('Access Token:', token.accessToken);
```

### Encrypt User Emails

```typescript
// Encrypt email
const emailResult = await encryption.encryptEmail('user@example.com');
const emailHash = encryption.generateSearchHash('user@example.com');

// Update user record
await pool.query(
  `UPDATE users SET
    encrypted_email = $1,
    email_iv = $2,
    email_auth_tag = $3,
    email_data_key = $4,
    email_hash = $5
  WHERE id = $6`,
  [
    emailResult.ciphertext,
    emailResult.iv,
    emailResult.authTag,
    emailResult.dataKeyEncrypted,
    emailHash,
    userId,
  ]
);

// Search by email (using hash)
const user = await pool.query(
  'SELECT * FROM users WHERE email_hash = $1',
  [encryption.generateSearchHash('user@example.com')]
);

// Decrypt email
const email = await encryption.decryptEmail({
  ciphertext: row.encrypted_email,
  iv: row.email_iv,
  authTag: row.email_auth_tag,
  dataKeyEncrypted: row.email_data_key,
});
```

### Encrypt Backups

```typescript
// Create and encrypt backup
const backupData = {
  timestamp: new Date().toISOString(),
  tables: ['users', 'api_keys', 'oauth_tokens'],
  data: {
    // ... backup data
  },
};

const backupResult = await encryption.encryptBackup(backupData);

// Store backup metadata
await pool.query(
  `INSERT INTO encrypted_backups (
    backup_name,
    backup_type,
    storage_path,
    encrypted_data,
    data_iv,
    data_auth_tag,
    data_data_key
  ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
  [
    `backup-${Date.now()}`,
    'full',
    '/backups/encrypted/',
    backupResult.ciphertext,
    backupResult.iv,
    backupResult.authTag,
    backupResult.dataKeyEncrypted,
  ]
);

// Decrypt backup
const decryptedBackup = await encryption.decryptBackup({
  ciphertext: row.encrypted_data,
  iv: row.data_iv,
  authTag: row.data_auth_tag,
  dataKeyEncrypted: row.data_data_key,
});
```

## Migration Guide

### Migrating Existing Data

If you have existing plaintext data that needs to be encrypted:

```typescript
import { pool } from './src/db/pool.js';
import { getEncryption } from './src/db/encryption.js';

const encryption = getEncryption();

async function migrateUserEmails() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get all users with plaintext emails
    const result = await client.query(
      'SELECT id, email FROM users WHERE encrypted_email IS NULL'
    );

    for (const user of result.rows) {
      // Encrypt email
      const encrypted = await encryption.encryptEmail(user.email);
      const hash = encryption.generateSearchHash(user.email);

      // Update user record
      await client.query(
        `UPDATE users SET
          encrypted_email = $1,
          email_iv = $2,
          email_auth_tag = $3,
          email_data_key = $4,
          email_hash = $5
        WHERE id = $6`,
        [
          encrypted.ciphertext,
          encrypted.iv,
          encrypted.authTag,
          encrypted.dataKeyEncrypted,
          hash,
          user.id,
        ]
      );

      console.log(`Encrypted email for user ${user.id}`);
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration
migrateUserEmails().catch(console.error);
```

## Key Rotation

### Automatic KMS Key Rotation

AWS KMS automatically rotates the master key annually. No action required.

### Manual Data Key Rotation

To rotate data encryption keys for specific records:

```typescript
// Rotate encryption for an API key
const oldData = {
  ciphertext: row.encrypted_key,
  iv: row.key_iv,
  authTag: row.key_auth_tag,
  dataKeyEncrypted: row.key_data_key,
};

const newData = await encryption.rotateEncryption(oldData);

await pool.query(
  `UPDATE api_keys SET
    encrypted_key = $1,
    key_iv = $2,
    key_auth_tag = $3,
    key_data_key = $4,
    rotation_count = rotation_count + 1,
    last_rotated_at = NOW()
  WHERE id = $5`,
  [
    newData.ciphertext,
    newData.iv,
    newData.authTag,
    newData.dataKeyEncrypted,
    keyId,
  ]
);
```

### Rotation Schedule

Recommended rotation schedule:

- **Master Key (KMS)**: Annual (automatic via AWS)
- **Data Keys**: Every 90 days for active credentials
- **OAuth Tokens**: On each token refresh
- **API Keys**: When credentials are updated
- **User Emails**: Only when master key is compromised

## Monitoring and Auditing

### Encryption Audit Log

All encryption/decryption operations are logged in `encryption_audit_log`:

```sql
-- View recent encryption operations
SELECT * FROM encryption_audit_log
ORDER BY created_at DESC
LIMIT 100;

-- View failed operations
SELECT * FROM encryption_audit_log
WHERE status = 'error'
ORDER BY created_at DESC;

-- View operations by table
SELECT
  table_name,
  operation_type,
  COUNT(*) as count,
  AVG(duration_ms) as avg_duration
FROM encryption_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY table_name, operation_type;
```

### Monitoring Views

```sql
-- Active API keys summary
SELECT * FROM active_api_keys_summary;

-- OAuth tokens summary
SELECT * FROM oauth_tokens_summary;

-- Encryption operations summary (last 24 hours)
SELECT * FROM encryption_audit_summary;
```

### CloudWatch Integration

Monitor KMS usage and costs:

```bash
# View KMS API calls
aws cloudwatch get-metric-statistics \
  --namespace AWS/KMS \
  --metric-name NumberOfEncryptionKeys \
  --start-time 2025-10-10T00:00:00Z \
  --end-time 2025-10-17T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

## Performance Considerations

### Caching Strategy

- Data keys are cached for 5 minutes to reduce KMS API calls
- Cache is automatically cleaned up every operation
- Clear cache manually: `encryption.clearCache()`

### Batch Operations

For bulk encryption/decryption:

```typescript
// Bad: Sequential operations
for (const key of apiKeys) {
  await encryption.encryptApiKey(key);
}

// Good: Parallel operations
await Promise.all(
  apiKeys.map(key => encryption.encryptApiKey(key))
);
```

### Query Optimization

```sql
-- Use hash indexes for lookups
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_users_email_hash ON users(email_hash);

-- Use partial indexes for active records
CREATE INDEX idx_active_tokens ON oauth_tokens(is_active)
WHERE is_active = TRUE;
```

## Security Best Practices

### 1. Key Management

- ✅ Use separate KMS keys per environment (dev, staging, prod)
- ✅ Enable automatic key rotation
- ✅ Use KMS key policies to restrict access
- ✅ Monitor KMS API calls via CloudTrail
- ❌ Never hard-code KMS key IDs in code
- ❌ Never share KMS keys across AWS accounts

### 2. Access Control

- ✅ Use IAM roles with least privilege
- ✅ Enable MFA for KMS key deletion
- ✅ Audit KMS access regularly
- ✅ Use separate service accounts per application
- ❌ Never use root AWS credentials
- ❌ Never grant wildcard KMS permissions

### 3. Data Protection

- ✅ Encrypt before storing in database
- ✅ Use search hashes for lookups
- ✅ Validate decrypted data format
- ✅ Clear sensitive data from memory
- ❌ Never log decrypted values
- ❌ Never cache plaintext credentials

### 4. Backup and Recovery

- ✅ Encrypt all database backups
- ✅ Test restoration procedures regularly
- ✅ Store backups in separate AWS region
- ✅ Document key recovery procedures
- ❌ Never store unencrypted backups
- ❌ Never delete KMS keys immediately

## Troubleshooting

### Common Issues

#### 1. KMS Access Denied

```
Error: Failed to generate data key: AccessDeniedException
```

**Solution**: Verify IAM permissions include `kms:GenerateDataKey`, `kms:Decrypt`, and `kms:DescribeKey`.

#### 2. Invalid Decryption

```
Error: Decryption failed: Unsupported state or unable to authenticate data
```

**Solution**: Verify all encryption components (ciphertext, IV, auth tag) are correct and the data key matches.

#### 3. KMS Key Not Found

```
Error: Key 'arn:aws:kms:...' does not exist
```

**Solution**: Verify `KMS_KEY_ID` environment variable is set correctly and key exists in the specified region.

#### 4. Performance Issues

```
Slow encryption/decryption operations
```

**Solution**:
- Check KMS API throttling limits
- Verify data key cache is working
- Consider batching operations
- Review CloudWatch metrics for KMS

### Debug Mode

Enable debug logging:

```typescript
import { logger } from './src/utils/logger.js';

logger.level = 'debug';
```

### Testing Encryption

```typescript
import { getEncryption } from './src/db/encryption.js';

const encryption = getEncryption();

// Test encryption/decryption cycle
const testData = 'sensitive-test-data';
const encrypted = await encryption.encrypt(testData);
const decrypted = await encryption.decrypt(encrypted);

console.assert(
  testData === decrypted,
  'Encryption/decryption test failed!'
);

console.log('✅ Encryption test passed');
```

## Disaster Recovery

### Key Compromise Procedure

If KMS key is compromised:

1. **Immediate Actions**
   ```bash
   # Disable the compromised key
   aws kms disable-key --key-id <compromised-key-id>

   # Create new KMS key
   aws kms create-key --description "Jarvis DB Encryption - New Key"
   ```

2. **Re-encrypt All Data**
   ```typescript
   // Update KMS_KEY_ID to new key
   process.env.KMS_KEY_ID = 'new-key-id';

   // Re-encrypt all data
   await migrateUserEmails();
   // ... repeat for other tables
   ```

3. **Schedule Old Key Deletion**
   ```bash
   aws kms schedule-key-deletion \
     --key-id <old-key-id> \
     --pending-window-in-days 30
   ```

### Backup Recovery

```bash
# 1. Restore database from encrypted backup
psql jarvis < backup.sql

# 2. Verify KMS key access
aws kms describe-key --key-id $KMS_KEY_ID

# 3. Test decryption
tsx scripts/test-decryption.ts

# 4. Verify data integrity
psql jarvis -c "SELECT COUNT(*) FROM users WHERE encrypted_email IS NOT NULL"
```

## Compliance

### Regulatory Requirements

This encryption implementation helps meet:

- **GDPR**: Personal data encryption (Article 32)
- **HIPAA**: PHI encryption at rest
- **PCI DSS**: Cardholder data encryption (Requirement 3)
- **SOC 2**: Encryption controls (CC6.7)

### Audit Trail

All encryption operations are logged with:
- Operation type (encrypt/decrypt)
- Table and record ID
- User/system context
- Timestamp and duration
- Success/failure status

## Additional Resources

- [AWS KMS Documentation](https://docs.aws.amazon.com/kms/)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
- [AES-GCM Specification](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

## Support

For issues or questions:
- GitHub Issues: [jarvis/issues](https://github.com/jarvis/issues)
- Email: security@jarvis.ai
- Slack: #jarvis-security

## Version History

- **v1.0** (2025-10-17): Initial implementation
  - AES-256-GCM encryption
  - AWS KMS integration
  - API keys, OAuth tokens, emails, backups
  - Migration scripts
  - Audit logging
