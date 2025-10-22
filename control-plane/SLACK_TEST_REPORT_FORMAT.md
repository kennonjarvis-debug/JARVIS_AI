# Slack Test Report Format

## Real-Time Test Execution Report

Sent after each test run (push, PR, manual trigger)

### Message Format

```json
{
  "username": "Jarvis Test Bot",
  "icon_emoji": ":robot_face:",
  "attachments": [
    {
      "color": "#36a64f",
      "fallback": "Test Results: 5/6 passed",
      "pretext": "✅ *Jarvis V2 Automated Test Results*",
      "title": "Test Execution Summary",
      "fields": [
        {
          "title": "Repository",
          "value": "jarvis/v2",
          "short": true
        },
        {
          "title": "Branch",
          "value": "main",
          "short": true
        },
        {
          "title": "Trigger",
          "value": "push",
          "short": true
        },
        {
          "title": "Actor",
          "value": "developer",
          "short": true
        },
        {
          "title": "Total Suites",
          "value": "6",
          "short": true
        },
        {
          "title": "Success Rate",
          "value": "95.5%",
          "short": true
        },
        {
          "title": "Passed",
          "value": "✅ 5",
          "short": true
        },
        {
          "title": "Failed",
          "value": "❌ 1",
          "short": true
        }
      ],
      "footer": "Jarvis V2 Testing Infrastructure",
      "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
      "ts": 1696689000
    },
    {
      "color": "#36a64f",
      "title": "Detailed Results",
      "fields": [
        {
          "title": "Unit Tests (Vitest)",
          "value": "Status: ✅ PASSED\nDuration: 2.34s\nCoverage: 94.2%",
          "short": true
        },
        {
          "title": "Unit Tests (Jest)",
          "value": "Status: ✅ PASSED\nDuration: 3.12s\nCoverage: 92.8%",
          "short": true
        },
        {
          "title": "E2E Tests",
          "value": "Status: ✅ PASSED\nDuration: 45.23s",
          "short": true
        },
        {
          "title": "API Tests",
          "value": "Status: ❌ FAILED\nDuration: 12.56s\nErrors: 2",
          "short": true
        },
        {
          "title": "Automation Tests",
          "value": "Status: ✅ PASSED\nDuration: 8.71s",
          "short": true
        },
        {
          "title": "Journey Tests",
          "value": "Status: ✅ PASSED\nDuration: 18.34s",
          "short": true
        }
      ],
      "mrkdwn_in": ["fields"]
    }
  ]
}
```

### Visual Representation

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Jarvis Test Bot

✅ Jarvis V2 Automated Test Results

Test Execution Summary
┌─────────────────────────────────────┐
│ Repository  │ jarvis/v2             │
│ Branch      │ main                  │
│ Trigger     │ push                  │
│ Actor       │ developer             │
├─────────────────────────────────────┤
│ Total       │ 6                     │
│ Success     │ 95.5%                 │
│ Passed      │ ✅ 5                  │
│ Failed      │ ❌ 1                  │
└─────────────────────────────────────┘

Detailed Results
┌──────────────────────────────────────┐
│ ✅ Unit Tests (Vitest)               │
│    Duration: 2.34s                   │
│    Coverage: 94.2%                   │
├──────────────────────────────────────┤
│ ✅ Unit Tests (Jest)                 │
│    Duration: 3.12s                   │
│    Coverage: 92.8%                   │
├──────────────────────────────────────┤
│ ✅ E2E Tests                         │
│    Duration: 45.23s                  │
├──────────────────────────────────────┤
│ ❌ API Tests                         │
│    Duration: 12.56s                  │
│    Errors: 2                         │
├──────────────────────────────────────┤
│ ✅ Automation Tests                  │
│    Duration: 8.71s                   │
├──────────────────────────────────────┤
│ ✅ Journey Tests                     │
│    Duration: 18.34s                  │
└──────────────────────────────────────┘

Jarvis V2 Testing Infrastructure
Oct 7, 2025 2:30 PM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Daily Summary Report

Sent daily at 6 AM UTC

### Message Format

```json
{
  "username": "Jarvis Test Bot",
  "icon_emoji": ":chart_with_upwards_trend:",
  "text": "*📊 Daily Test Summary*",
  "attachments": [
    {
      "color": "#36a64f",
      "fields": [
        {
          "title": "Date",
          "value": "2025-10-07",
          "short": true
        },
        {
          "title": "Total Runs",
          "value": "12",
          "short": true
        },
        {
          "title": "Success Rate",
          "value": "94.3%",
          "short": true
        },
        {
          "title": "Avg Duration",
          "value": "87.2s",
          "short": true
        },
        {
          "title": "Trends",
          "value": "🟢 Excellent success rate! Fast execution times.",
          "short": false
        }
      ]
    },
    {
      "color": "#2196F3",
      "title": "📦 Tests by Category",
      "text": "```\nUNIT:       45/48  (93.8%)\nE2E:        23/24  (95.8%)\nAPI:        18/18  (100%)\nAUTOMATION:  5/5   (100%)\nJOURNEY:     9/9   (100%)\n```",
      "mrkdwn_in": ["text"]
    },
    {
      "color": "#FF9800",
      "title": "❌ Top Failures",
      "text": "```\n1. Unit Tests (Vitest) - 3x\n2. E2E Dashboard Tests - 2x\n3. API Query Tests - 1x\n```",
      "mrkdwn_in": ["text"]
    },
    {
      "color": "#4CAF50",
      "title": "⚡ Performance Metrics",
      "fields": [
        {
          "title": "Fastest Test",
          "value": "API Health Check (1.2s)",
          "short": true
        },
        {
          "title": "Slowest Test",
          "value": "Journey Tests (18.3s)",
          "short": true
        }
      ]
    }
  ]
}
```

### Visual Representation

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Jarvis Test Bot

📊 Daily Test Summary

┌─────────────────────────────────────┐
│ Date        │ 2025-10-07            │
│ Total Runs  │ 12                    │
│ Success     │ 94.3%                 │
│ Avg Time    │ 87.2s                 │
└─────────────────────────────────────┘

🟢 Excellent success rate! Fast execution times.

📦 Tests by Category
┌─────────────────────────────────────┐
│ UNIT:       45/48  (93.8%)          │
│ E2E:        23/24  (95.8%)          │
│ API:        18/18  (100%)           │
│ AUTOMATION:  5/5   (100%)           │
│ JOURNEY:     9/9   (100%)           │
└─────────────────────────────────────┘

❌ Top Failures
┌─────────────────────────────────────┐
│ 1. Unit Tests (Vitest) - 3x         │
│ 2. E2E Dashboard Tests - 2x         │
│ 3. API Query Tests - 1x             │
└─────────────────────────────────────┘

⚡ Performance Metrics
┌─────────────────────────────────────┐
│ Fastest │ API Health Check (1.2s)   │
│ Slowest │ Journey Tests (18.3s)     │
└─────────────────────────────────────┘

GitHub Actions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Color Codes

- **Green (#36a64f)**: All tests passed, success rate ≥95%
- **Yellow (#ff9900)**: Some failures, success rate 85-94%
- **Red (#ff0000)**: Multiple failures, success rate <85%
- **Blue (#2196F3)**: Informational sections
- **Orange (#FF9800)**: Warning sections

---

## Emoji Legend

- ✅ - Passed
- ❌ - Failed
- ⏭️ - Skipped
- 🟢 - Excellent status
- 🟡 - Good status (warning)
- 🔴 - Poor status (critical)
- 🤖 - Bot identity
- 📊 - Summary/Statistics
- 📈 - Trending up
- 📉 - Trending down
- ⚡ - Performance
- 📦 - Category grouping
- 🎯 - Target/Goal

---

## Setup Instructions

### 1. Create Slack Incoming Webhook

1. Go to https://api.slack.com/apps
2. Create new app or select existing
3. Enable "Incoming Webhooks"
4. Add webhook to desired channel
5. Copy webhook URL

### 2. Add to GitHub Secrets

```bash
# In your GitHub repository
Settings > Secrets and variables > Actions > New repository secret

Name: SLACK_WEBHOOK_URL
Value: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### 3. Test Webhook

```bash
curl -X POST \
  -H 'Content-type: application/json' \
  --data '{"text":"Test message from Jarvis V2"}' \
  YOUR_WEBHOOK_URL
```

---

## Customization

### Change Bot Name

Edit `scripts/test-reporter.ts`:

```typescript
const payload = {
  username: 'Your Custom Bot Name',
  icon_emoji: ':custom_emoji:',
  // ...
};
```

### Add Custom Fields

```typescript
{
  title: 'Custom Field',
  value: 'Custom Value',
  short: true
}
```

### Change Colors

```typescript
const color = failed === 0 ? '#36a64f' :
              failed > 2 ? '#ff0000' : '#ff9900';
```

---

## Troubleshooting

### Webhooks Not Sending

1. Check `SLACK_WEBHOOK_URL` is set
2. Verify webhook is active in Slack
3. Check network/firewall settings
4. Review GitHub Actions logs

### Formatting Issues

1. Use `mrkdwn_in` for markdown fields
2. Keep field values under 2000 chars
3. Use short fields for side-by-side display
4. Test with Slack Block Kit Builder

### Missing Data

1. Verify test results are being saved
2. Check log file permissions
3. Ensure all test suites complete
4. Review error logs in GitHub Actions

---

**Documentation Version**: 1.0
**Last Updated**: 2025-10-07
