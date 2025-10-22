# Edge Case Test Report

**Generated:** 10/9/2025, 8:57:13 AM
**Duration:** 13.28s

## Summary

- **Test Suites:** 5
- **Total Tests:** 95
- **Passed:** 13 (13.7%)
- **Failed:** 82
- **Bugs Found:** 82

## Test Suites

### Project Creation

- Tests: 25
- Passed: 1 (4.0%)
- Failed: 24
- Bugs: 24
- Duration: 0.09s

### Beat Generation

- Tests: 27
- Passed: 1 (3.7%)
- Failed: 26
- Bugs: 26
- Duration: 0.09s

### Vocal Recording

- Tests: 11
- Passed: 11 (100.0%)
- Failed: 0
- Bugs: 0
- Duration: 11.93s

### Service Health

- Tests: 15
- Passed: 0 (0.0%)
- Failed: 15
- Bugs: 15
- Duration: 1.12s

### Cost Tracking

- Tests: 17
- Passed: 0 (0.0%)
- Failed: 17
- Bugs: 17
- Duration: 0.05s

## Bugs Discovered

### 🔴 Critical Bugs

**[project-creation] SQL injection attempt in name**
- Error: Got status 401, expected sanitize

**[project-creation] XSS attempt in name**
- Error: Got status 401, expected sanitize

**[beat-generation] BPM = NaN**
- Error: Got status 404, expected reject

**[beat-generation] BPM = Infinity**
- Error: Got status 404, expected reject

**[beat-generation] BPM = -Infinity**
- Error: Got status 404, expected reject

**[beat-generation] Genre with SQL injection**
- Error: Got status 404, expected reject

**[beat-generation] Genre with XSS**
- Error: Got status 404, expected reject

**[health-monitoring] All services reporting as down (simulated)**
- Error: Exception: Error

**[cost-tracking] Division by zero in cost averages**
- Error: Exception: Error

### 🟠 High Priority Bugs

**[project-creation] Path traversal in name**
- Error: Got status 401, expected sanitize

**[project-creation] Null bytes in name**
- Error: Got status 401, expected sanitize

**[project-creation] Empty string name**
- Error: Got status 401, expected reject

**[project-creation] Only whitespace**
- Error: Got status 401, expected reject

**[beat-generation] BPM = 0 (zero)**
- Error: Got status 404, expected reject

**[beat-generation] BPM = -1 (negative)**
- Error: Got status 404, expected reject

**[beat-generation] Generation timeout (if backend hangs)**
- Error: Got status 404, expected reject

**[beat-generation] Concurrent beat generation (5 requests)**
- Error: Only 0/5 succeeded

**[beat-generation] Rate limiting (20 rapid requests)**
- Error: No rate limiting detected!

**[health-monitoring] Partial service failures (mixed health states)**
- Error: Exception: Error

**[health-monitoring] Cascade failure detection (one failure triggers others)**
- Error: Exception: Error

**[health-monitoring] Health endpoint returns malformed data**
- Error: Exception: Error

**[health-monitoring] Rapid health checks (100 requests in 1 second)**
- Error: System should handle rapid health checks without crashing

**[health-monitoring] Health check during simulated high load**
- Error: Exception: Error

**[health-monitoring] Circular dependency in health checks**
- Error: Exception: Error

**[cost-tracking] Negative cost values**
- Error: Exception: Error

**[cost-tracking] Null or undefined cost entries**
- Error: Exception: Error

**[cost-tracking] Runway calculation with zero burn rate**
- Error: Exception: Error

**[cost-tracking] Cost calculations with zero customers**
- Error: Exception: Error

### 🟡 Medium Priority Bugs

**[project-creation] Emoji in project name**
- Error: Got status 401, expected sanitize

**[project-creation] Control characters**
- Error: Got status 401, expected sanitize

**[project-creation] Very long name (10000 chars)**
- Error: Got status 401, expected reject

**[project-creation] Exactly 256 chars**
- Error: Got status 401, expected reject

**[project-creation] Duplicate project name**
- Error: Request failed with status code 401

**[project-creation] Forward slash in name**
- Error: Got status 401, expected sanitize

**[project-creation] Backslash in name**
- Error: Got status 401, expected sanitize

**[project-creation] Colon in name**
- Error: Got status 401, expected sanitize

**[project-creation] Special chars only**
- Error: Got status 401, expected sanitize

**[beat-generation] BPM = 99999 (extreme high)**
- Error: Got status 404, expected reject

**[beat-generation] BPM = null**
- Error: Got status 404, expected fallback

**[beat-generation] BPM = undefined**
- Error: Got status 404, expected fallback

**[beat-generation] BPM = 1 (extreme low)**
- Error: Got status 404, expected reject

**[beat-generation] Invalid genre**
- Error: Got status 404, expected fallback

**[beat-generation] Empty genre**
- Error: Got status 404, expected fallback

**[beat-generation] Null genre**
- Error: Got status 404, expected fallback

**[beat-generation] No parameters at all**
- Error: Got status 404, expected fallback

**[beat-generation] Huge prompt (10000 chars)**
- Error: Got status 404, expected reject

**[beat-generation] Malformed JSON body**
- Error: Got status 500

**[beat-generation] All parameters as arrays**
- Error: Got status 404, expected reject

**[beat-generation] Nested objects as parameters**
- Error: Got status 404, expected reject

**[health-monitoring] Health check timeout (slow response)**
- Error: Exception: Error

**[health-monitoring] Stale health data detection**
- Error: Exception: Error

**[health-monitoring] Concurrent health checks (10 simultaneous)**
- Error: Exception: Error

**[health-monitoring] Health check when dependencies are missing**
- Error: Exception: Error

**[health-monitoring] Health check with network errors (DNS failure simulation)**
- Error: Exception: Error

**[health-monitoring] Health data accuracy (cross-check multiple endpoints)**
- Error: Exception: Error

**[cost-tracking] Extreme cost values (billions)**
- Error: Exception: Error

**[cost-tracking] Cost overflow (exceeds MAX_SAFE_INTEGER)**
- Error: Exception: Error

**[cost-tracking] Cost calculation consistency (ARR = MRR * 12)**
- Error: Exception: Error

**[cost-tracking] Concurrent cost metric requests (10 simultaneous)**
- Error: Exception: Error

**[cost-tracking] Percentage calculations (0-100 range)**
- Error: Exception: Error

**[cost-tracking] Currency values are valid numbers**
- Error: Exception: Error

**[cost-tracking] LTV/CAC ratio sanity check**
- Error: Exception: Error

### 🟢 Low Priority Bugs

**[project-creation] Unicode characters (Chinese)**
- Error: Got status 401, expected accept

**[project-creation] Unicode characters (Arabic)**
- Error: Got status 401, expected accept

**[project-creation] Exactly 255 chars**
- Error: Got status 401, expected accept

**[project-creation] Asterisk in name**
- Error: Got status 401, expected sanitize

**[project-creation] Pipe in name**
- Error: Got status 401, expected sanitize

**[project-creation] Question mark in name**
- Error: Got status 401, expected sanitize

**[project-creation] Single character name**
- Error: Got status 401, expected accept

**[project-creation] Numbers only**
- Error: Got status 401, expected accept

**[project-creation] Case sensitivity check**
- Error: Request failed with status code 401

**[beat-generation] BPM = string "120"**
- Error: Got status 404, expected accept

**[beat-generation] BPM = float 120.5**
- Error: Got status 404, expected accept

**[beat-generation] BPM = 300 (very high but valid)**
- Error: Got status 404, expected accept

**[beat-generation] Only BPM, no genre**
- Error: Got status 404, expected fallback

**[health-monitoring] Health check with invalid/missing auth**
- Error: Exception: Error

**[health-monitoring] Health check cache invalidation**
- Error: Exception: Error

**[cost-tracking] Extreme decimal precision (10+ places)**
- Error: Exception: Error

**[cost-tracking] Cost data caching (stale data detection)**
- Error: Exception: Error

**[cost-tracking] Cost aggregation accuracy**
- Error: Exception: Error

**[cost-tracking] Financial metrics consistency (multiple requests)**
- Error: Exception: Error

**[cost-tracking] Financial data includes calculation source**
- Error: Exception: Error

## Detailed Results

### Project Creation - Detailed Results

| Scenario | Status | Error |
|----------|--------|-------|
| Emoji in project name | ❌ FAIL (medium) | Got status 401, expected sanitize |
| Unicode characters (Chinese) | ❌ FAIL (low) | Got status 401, expected accept |
| Unicode characters (Arabic) | ❌ FAIL (low) | Got status 401, expected accept |
| SQL injection attempt in name | ❌ FAIL (critical) | Got status 401, expected sanitize |
| XSS attempt in name | ❌ FAIL (critical) | Got status 401, expected sanitize |
| Path traversal in name | ❌ FAIL (high) | Got status 401, expected sanitize |
| Null bytes in name | ❌ FAIL (high) | Got status 401, expected sanitize |
| Control characters | ❌ FAIL (medium) | Got status 401, expected sanitize |
| Empty string name | ❌ FAIL (high) | Got status 401, expected reject |
| Only whitespace | ❌ FAIL (high) | Got status 401, expected reject |
| Very long name (10000 chars) | ❌ FAIL (medium) | Got status 401, expected reject |
| Exactly 255 chars | ❌ FAIL (low) | Got status 401, expected accept |
| Exactly 256 chars | ❌ FAIL (medium) | Got status 401, expected reject |
| Duplicate project name | ❌ FAIL (medium) | Request failed with status code 401 |
| Forward slash in name | ❌ FAIL (medium) | Got status 401, expected sanitize |
| Backslash in name | ❌ FAIL (medium) | Got status 401, expected sanitize |
| Colon in name | ❌ FAIL (medium) | Got status 401, expected sanitize |
| Asterisk in name | ❌ FAIL (low) | Got status 401, expected sanitize |
| Pipe in name | ❌ FAIL (low) | Got status 401, expected sanitize |
| Question mark in name | ❌ FAIL (low) | Got status 401, expected sanitize |
| Single character name | ❌ FAIL (low) | Got status 401, expected accept |
| Numbers only | ❌ FAIL (low) | Got status 401, expected accept |
| Special chars only | ❌ FAIL (medium) | Got status 401, expected sanitize |
| Case sensitivity check | ❌ FAIL (low) | Request failed with status code 401 |
| Race condition (10 concurrent creates) | ✅ PASS | - |

### Beat Generation - Detailed Results

| Scenario | Status | Error |
|----------|--------|-------|
| BPM = 0 (zero) | ❌ FAIL (high) | Got status 404, expected reject |
| BPM = -1 (negative) | ❌ FAIL (high) | Got status 404, expected reject |
| BPM = 99999 (extreme high) | ❌ FAIL (medium) | Got status 404, expected reject |
| BPM = NaN | ❌ FAIL (critical) | Got status 404, expected reject |
| BPM = null | ❌ FAIL (medium) | Got status 404, expected fallback |
| BPM = undefined | ❌ FAIL (medium) | Got status 404, expected fallback |
| BPM = Infinity | ❌ FAIL (critical) | Got status 404, expected reject |
| BPM = -Infinity | ❌ FAIL (critical) | Got status 404, expected reject |
| BPM = string "120" | ❌ FAIL (low) | Got status 404, expected accept |
| BPM = float 120.5 | ❌ FAIL (low) | Got status 404, expected accept |
| BPM = 1 (extreme low) | ❌ FAIL (medium) | Got status 404, expected reject |
| BPM = 300 (very high but valid) | ❌ FAIL (low) | Got status 404, expected accept |
| Generation timeout (if backend hangs) | ❌ FAIL (high) | Got status 404, expected reject |
| Invalid genre | ❌ FAIL (medium) | Got status 404, expected fallback |
| Genre with SQL injection | ❌ FAIL (critical) | Got status 404, expected reject |
| Genre with XSS | ❌ FAIL (critical) | Got status 404, expected reject |
| Empty genre | ❌ FAIL (medium) | Got status 404, expected fallback |
| Null genre | ❌ FAIL (medium) | Got status 404, expected fallback |
| No parameters at all | ❌ FAIL (medium) | Got status 404, expected fallback |
| Only BPM, no genre | ❌ FAIL (low) | Got status 404, expected fallback |
| Huge prompt (10000 chars) | ❌ FAIL (medium) | Got status 404, expected reject |
| Concurrent beat generation (5 requests) | ❌ FAIL (high) | Only 0/5 succeeded |
| Rate limiting (20 rapid requests) | ❌ FAIL (high) | No rate limiting detected! |
| Malformed JSON body | ❌ FAIL (medium) | Got status 500 |
| All parameters as arrays | ❌ FAIL (medium) | Got status 404, expected reject |
| Nested objects as parameters | ❌ FAIL (medium) | Got status 404, expected reject |
| Interrupted generation (manual test required) | ✅ PASS | This requires manual testing with network interruption |

### Vocal Recording - Detailed Results

| Scenario | Status | Error |
|----------|--------|-------|
| No microphone permission (client-side error) | ✅ PASS | - |
| WebSocket connection interrupted mid-recording | ✅ PASS | - |
| Extremely long recording (buffer overflow test) | ✅ PASS | - |
| Zero-length recording (no audio data) | ✅ PASS | - |
| Corrupt audio data (invalid base64) | ✅ PASS | - |
| Malformed WebSocket message (not JSON) | ✅ PASS | - |
| Missing session ID in recording request | ✅ PASS | - |
| Duplicate session IDs (concurrent recordings) | ✅ PASS | - |
| Rapid WebSocket reconnection (10 times) | ✅ PASS | - |
| Extremely large single WebSocket message (10MB) | ✅ PASS | - |
| Invalid audio format/encoding | ✅ PASS | - |

### Service Health - Detailed Results

| Scenario | Status | Error |
|----------|--------|-------|
| All services reporting as down (simulated) | ❌ FAIL (critical) | Exception: Error |
| Partial service failures (mixed health states) | ❌ FAIL (high) | Exception: Error |
| Cascade failure detection (one failure triggers others) | ❌ FAIL (high) | Exception: Error |
| Health check timeout (slow response) | ❌ FAIL (medium) | Exception: Error |
| Stale health data detection | ❌ FAIL (medium) | Exception: Error |
| Concurrent health checks (10 simultaneous) | ❌ FAIL (medium) | Exception: Error |
| Health endpoint returns malformed data | ❌ FAIL (high) | Exception: Error |
| Health check with invalid/missing auth | ❌ FAIL (low) | Exception: Error |
| Rapid health checks (100 requests in 1 second) | ❌ FAIL (high) | System should handle rapid health checks without crashing |
| Health check during simulated high load | ❌ FAIL (high) | Exception: Error |
| Health check when dependencies are missing | ❌ FAIL (medium) | Exception: Error |
| Circular dependency in health checks | ❌ FAIL (high) | Exception: Error |
| Health check cache invalidation | ❌ FAIL (low) | Exception: Error |
| Health check with network errors (DNS failure simulation) | ❌ FAIL (medium) | Exception: Error |
| Health data accuracy (cross-check multiple endpoints) | ❌ FAIL (medium) | Exception: Error |

### Cost Tracking - Detailed Results

| Scenario | Status | Error |
|----------|--------|-------|
| Negative cost values | ❌ FAIL (high) | Exception: Error |
| Extreme cost values (billions) | ❌ FAIL (medium) | Exception: Error |
| Extreme decimal precision (10+ places) | ❌ FAIL (low) | Exception: Error |
| Division by zero in cost averages | ❌ FAIL (critical) | Exception: Error |
| Null or undefined cost entries | ❌ FAIL (high) | Exception: Error |
| Cost overflow (exceeds MAX_SAFE_INTEGER) | ❌ FAIL (medium) | Exception: Error |
| Cost calculation consistency (ARR = MRR * 12) | ❌ FAIL (medium) | Exception: Error |
| Runway calculation with zero burn rate | ❌ FAIL (high) | Exception: Error |
| Concurrent cost metric requests (10 simultaneous) | ❌ FAIL (medium) | Exception: Error |
| Cost data caching (stale data detection) | ❌ FAIL (low) | Exception: Error |
| Percentage calculations (0-100 range) | ❌ FAIL (medium) | Exception: Error |
| Cost aggregation accuracy | ❌ FAIL (low) | Exception: Error |
| Currency values are valid numbers | ❌ FAIL (medium) | Exception: Error |
| LTV/CAC ratio sanity check | ❌ FAIL (medium) | Exception: Error |
| Cost calculations with zero customers | ❌ FAIL (high) | Exception: Error |
| Financial metrics consistency (multiple requests) | ❌ FAIL (low) | Exception: Error |
| Financial data includes calculation source | ❌ FAIL (low) | Exception: Error |
