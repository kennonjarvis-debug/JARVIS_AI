# Jarvis Memory Scripts

Secure CLI-safe memory management scripts designed for restricted environments that block shell command chaining, output redirection, and complex inline commands.

## Features

- ✅ **Base64 encoding** - Safely pass large/complex values as CLI arguments
- ✅ **No shell chaining** - Pure Node.js implementation, no `>`, `&&`, `|`, etc.
- ✅ **Persistent storage** - JSON-based file storage
- ✅ **Timestamp tracking** - Automatic timestamp on all writes
- ✅ **Error handling** - Comprehensive validation and error messages

## Quick Reference

```bash
# Complete workflow with helper scripts
ENCODED=$(node scripts/memory/encode.js "Your message here")
node scripts/memory/mem-save.js my_key "$ENCODED"
node scripts/memory/mem-load.js my_key

# One-liner for restricted CLI environments
node scripts/memory/mem-save.js my_key $(node scripts/memory/encode.js "Your message")
```

## Scripts

### `encode.js` - Encode to Base64

Helper script to encode text to Base64.

```bash
# Encode text as argument
node scripts/memory/encode.js "Your text here"

# Encode from stdin
echo "Your text" | node scripts/memory/encode.js
```

### `decode.js` - Decode from Base64

Helper script to decode Base64 to text.

```bash
# Decode as argument
node scripts/memory/decode.js SGVsbG8gV29ybGQ=

# Decode from stdin
echo "SGVsbG8gV29ybGQ=" | node scripts/memory/decode.js
```

### `mem-save.js` - Save to Memory

Save a value to persistent memory using Base64 encoding.

```bash
# Direct usage (pre-encoded value)
node scripts/memory/mem-save.js cost_audit_complete Q29tcGxldGUgT3BlcmF0aW5nIENvc3QgQXVkaXQ=

# With encode helper
ENCODED=$(node scripts/memory/encode.js "Complete Operating Cost Audit")
node scripts/memory/mem-save.js cost_audit_complete "$ENCODED"

# One-liner
node scripts/memory/mem-save.js cost_audit_complete $(node scripts/memory/encode.js "Complete Operating Cost Audit")
```

### `mem-load.js` - Load from Memory

Retrieve values from persistent memory.

```bash
# Get specific key
node scripts/memory/mem-load.js cost_audit_complete

# List all keys
node scripts/memory/mem-load.js --list

# Get all entries
node scripts/memory/mem-load.js --all
```

### `mem-delete.js` - Delete from Memory

Remove entries from persistent memory.

```bash
# Delete specific key
node scripts/memory/mem-delete.js cost_audit_complete

# Clear all memory
node scripts/memory/mem-delete.js --clear
```

## Storage Format

Data is stored in `scripts/memory/persistent_memory.json`:

```json
{
  "cost_audit_complete": {
    "value": "Complete Operating Cost Audit",
    "timestamp": "2025-10-07T17:30:00.000Z",
    "updatedBy": "mem-save.js"
  }
}
```

## Integration with Jarvis Actions

These scripts are designed to work with automation systems that have strict CLI constraints:

```javascript
// In your Jarvis action - Programmatic approach
const value = "Complete Operating Cost Audit";
const encoded = Buffer.from(value).toString('base64');
const cmd = `node scripts/memory/mem-save.js cost_audit_complete ${encoded}`;
// Execute cmd safely - no shell chaining required

// Alternative - Using the encode helper
const encodeCmd = `node scripts/memory/encode.js "${value}"`;
// Get encoded value, then save it
```

### Example: Safe CLI Usage in Restricted Environment

```bash
# ✅ SAFE - No chaining, no redirection, single command
node scripts/memory/mem-save.js key1 SGVsbG8gV29ybGQ=

# ✅ SAFE - Using variable (if supported)
ENCODED=$(node scripts/memory/encode.js "My message")
node scripts/memory/mem-save.js key1 "$ENCODED"

# ❌ UNSAFE - Would be blocked in restricted environments
echo "My message" > file.txt
echo "My message" | base64 | xargs ...
node scripts/memory/mem-save.js key1 "value" && other-command
```

## Security

- **No shell injection** - All input is processed in Node.js, not shell
- **Input validation** - Keys and values are validated before processing
- **Safe encoding** - Base64 prevents special character issues
- **File permissions** - JSON file is created with default user permissions

## Error Handling

All scripts exit with proper exit codes:
- `0` - Success
- `1` - Error (with descriptive message to stderr)

## Testing

```bash
# Test encode/decode
node scripts/memory/encode.js "Hello World"
# Output: SGVsbG8gV29ybGQ=

node scripts/memory/decode.js SGVsbG8gV29ybGQ=
# Output: Hello World

# Test save
node scripts/memory/mem-save.js test_key SGVsbG8gV29ybGQ=
# Output: ✓ Successfully saved: test_key

# Test load
node scripts/memory/mem-load.js test_key
# Output: {"value": "Hello World", "timestamp": "...", "updatedBy": "mem-save.js"}

# Test list
node scripts/memory/mem-load.js --list
# Output: Memory contains 1 key(s): - test_key (...)

# Test delete
node scripts/memory/mem-delete.js test_key
# Output: ✓ Successfully deleted: test_key

# Complete workflow test
ENCODED=$(node scripts/memory/encode.js "Integration test")
node scripts/memory/mem-save.js workflow_test "$ENCODED"
node scripts/memory/mem-load.js workflow_test
node scripts/memory/mem-delete.js workflow_test
```

## Troubleshooting

**Q: Why Base64 encoding?**
A: Base64 encoding prevents shell interpretation of special characters (`>`, `|`, `&&`, `$`, etc.) and allows passing long/complex strings as single CLI arguments in restricted environments.

**Q: Can I use this with JSON values?**
A: Yes! Encode the JSON string to Base64 first:
```bash
JSON='{"status":"complete","items":["a","b","c"]}'
ENCODED=$(node scripts/memory/encode.js "$JSON")
node scripts/memory/mem-save.js my_json_data "$ENCODED"
```

**Q: What if my CLI blocks variables/substitution?**
A: Pre-compute the Base64 value separately:
```bash
# Step 1: Get the encoded value
node scripts/memory/encode.js "My message"
# Copy output: TXkgbWVzc2FnZQ==

# Step 2: Use it directly
node scripts/memory/mem-save.js my_key TXkgbWVzc2FnZQ==
```
