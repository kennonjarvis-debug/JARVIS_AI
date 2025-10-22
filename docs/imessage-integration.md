# iMessage Integration for Jarvis

Privacy-first iMessage communication channel that allows Jarvis to respond to business inquiries automatically.

## 🎯 Features

- **📱 Real-time Monitoring**: Watches iMessage database for new messages
- **🤖 AI-Powered Responses**: Uses Claude to generate contextual responses
- **🔒 Privacy Protection**: Redacts sensitive information (credit cards, SSNs, passwords, etc.)
- **🎯 Smart Routing**: Routes messages to appropriate Jarvis agents (Marketing, Sales, Support, Operations)
- **✅ Approval Queue**: High-risk messages require human approval
- **🚦 Rate Limiting**: Prevents spam and abuse
- **📊 Conversation History**: Maintains context across conversations

## 🛠 Setup

### 1. System Requirements

- macOS (Messages.app)
- Node.js 18+
- Full Disk Access permission
- Messages.app signed in to iMessage

### 2. Grant Permissions

The iMessage integration needs Full Disk Access to read the Messages database:

1. Open **System Preferences** → **Security & Privacy** → **Privacy**
2. Select **Full Disk Access**
3. Click the lock icon and authenticate
4. Click **+** and add your terminal app:
   - `/Applications/Utilities/Terminal.app`
   - or `/Applications/iTerm.app`
5. Restart your terminal

### 3. Build the Project

```bash
cd Jarvis-v0
npm run build
```

### 4. Configure Auto-Start (Optional)

To run iMessage monitoring automatically at login:

```bash
# 1. Update the plist with your username
sed -i '' 's/YOUR_USERNAME/'$USER'/g' launch/com.jarvis.imessage.plist

# 2. Copy to LaunchAgents
cp launch/com.jarvis.imessage.plist ~/Library/LaunchAgents/

# 3. Load the service
launchctl load ~/Library/LaunchAgents/com.jarvis.imessage.plist

# 4. Check status
launchctl list | grep jarvis
```

To stop auto-start:

```bash
launchctl unload ~/Library/LaunchAgents/com.jarvis.imessage.plist
```

## 🚀 Usage

### CLI Commands

```bash
# Start monitoring (interactive mode)
npm run imessage start

# Check status
npm run imessage status

# Send a test message
npm run imessage send "+1234567890" "Hello from Jarvis!"

# View recent messages
npm run imessage recent

# View conversation with a specific contact
npm run imessage conversation "+1234567890"

# Add contact to auto-response whitelist
npm run imessage allow "user@example.com"

# Block a contact
npm run imessage block "spam@example.com"

# Run tests
npm run imessage test

# Show help
npm run imessage help
```

### Programmatic Usage

```typescript
import { IMessageAgent } from './agents/imessage-agent';

const agent = new IMessageAgent();

// Start monitoring
await agent.start();

// Add allowed contacts
agent.addAllowedContact('+1234567890');
agent.addAllowedContact('user@example.com');

// Send a message manually
await agent.sendMessage('+1234567890', 'Hello from Jarvis!');

// Get recent messages
const recent = agent.getRecentMessages(20);

// Get conversation history
const conversation = agent.getConversation('+1234567890', 50);

// Stop monitoring
agent.stop();
```

## 🧠 How It Works

### Message Flow

```
1. New iMessage arrives
   ↓
2. IMessageReader detects it (polls chat.db every 2s)
   ↓
3. MessageRedactor checks for sensitive info
   ↓
4. MessageRouter analyzes intent & determines action
   ↓
5a. AUTO_RESPOND → Claude generates response → Send
5b. REQUEST_APPROVAL → Queue for human review
5c. ESCALATE → Notify immediately
5d. IGNORE → Log and skip
```

### Intent Detection

The router detects these intents:

- **URGENT**: "help!", "emergency", "broken"
- **SUPPORT_REQUEST**: "help", "issue", "not working"
- **SALES_INQUIRY**: "price", "upgrade", "buy"
- **MARKETING_INQUIRY**: "features", "what can it do"
- **COMMAND**: "start", "stop", "status"
- **QUESTION**: Messages ending with "?"
- **GREETING**: "hi", "hello"
- **FEEDBACK**: "love it", "suggestion"
- **CASUAL**: Short, friendly messages

### Response Actions

| Intent | Default Action | Rationale |
|--------|---------------|-----------|
| Urgent | ESCALATE | Needs immediate attention |
| Support Request | AUTO_RESPOND | Can handle automatically |
| Sales Inquiry | AUTO_RESPOND | Claude can provide info |
| Command | REQUEST_APPROVAL | Commands need approval |
| Unknown | REQUEST_APPROVAL | Safety first |

### Redaction Rules

Automatically redacts:

- Credit card numbers
- Social Security Numbers
- Email addresses
- Phone numbers
- API keys & tokens (32+ chars)
- IP addresses
- Passwords
- Bitcoin addresses
- AWS access keys
- URLs with auth tokens
- Street addresses
- Dates of birth

## 🔐 Privacy & Security

### What Gets Stored

- Message text (in memory system)
- Conversation history (last 50 messages per contact)
- Routing decisions
- Redaction events

### What's Redacted Before AI Processing

All sensitive information is redacted before being sent to Claude API. See redaction rules above.

### What's Never Shared

- Attachments (not processed)
- Messages from blocked contacts
- Messages containing explicit "don't share" requests

### Logging

All iMessage activity is logged with redacted handles:

```
✅ Message from ***4567: auto-responded via support agent
⚠️ Message from ***8901: contains sensitive info, queued for approval
🚫 Message from ***9999: contact blocked, ignored
```

## 🎛 Configuration

### Allowed Contacts

Only contacts in the allowed list get auto-responses. Others require approval.

```bash
# Add to allowed list
npm run imessage allow "+1234567890"
npm run imessage allow "user@example.com"
```

### Blocked Contacts

Blocked contacts are ignored completely:

```bash
npm run imessage block "spam@example.com"
```

### Custom Redaction Rules

Add custom redaction patterns:

```typescript
import { messageRedactor } from './integrations/imessage/redact';

messageRedactor.addRule({
  pattern: /\b[A-Z]{3}-\d{4}\b/g, // e.g., ABC-1234
  replacement: '[CUSTOM_ID]',
  description: 'Internal ID format'
});
```

## 📊 Monitoring

### Check Status

```bash
npm run imessage status
```

Output:
```
📊 iMessage Agent Status

Running: ✅ Yes
Messages Processed: 42
Last Activity: 2025-10-15 12:30:45
```

### View Logs

```bash
# Real-time logs
tail -f logs/imessage-stdout.log

# Error logs
tail -f logs/imessage-stderr.log

# Combined logs
tail -f logs/combined.log | grep IMessage
```

### Approval Queue

Messages requiring approval go to Jarvis's approval queue:

```bash
# View pending approvals
npm run jarvis approvals:list

# Approve a request
npm run jarvis approvals:approve <request-id>

# Reject a request
npm run jarvis approvals:reject <request-id> "reason"
```

## 🧪 Testing

### Test Database Access

```bash
npm run imessage test
```

This tests:
- iMessage database access
- Redaction system
- Routing logic
- Message sending (dry run)

### Manual Testing

1. Start monitoring:
```bash
npm run imessage start
```

2. Send yourself an iMessage from another device

3. Check logs for routing decision:
```bash
tail -f logs/combined.log | grep IMessage
```

4. Add yourself to allowed list:
```bash
npm run imessage allow "your@email.com"
```

5. Send another message and verify auto-response

## 🐛 Troubleshooting

### "Permission denied" error

**Solution**: Grant Full Disk Access (see Setup step 2)

### Messages.app not running

**Solution**: The agent will attempt to launch it automatically. If that fails:
```bash
open -a Messages
```

### No messages detected

**Check**:
1. Messages.app is signed in
2. Terminal has Full Disk Access
3. Database path is correct: `~/Library/Messages/chat.db`

```bash
# Verify database exists
ls -la ~/Library/Messages/chat.db

# Check permissions
sqlite3 ~/Library/Messages/chat.db "SELECT COUNT(*) FROM message"
```

### Responses not sending

**Check**:
1. Messages.app is running
2. AppleScript has permission
3. Handle format is correct (phone: +1234567890, email: user@example.com)

**Test sending manually**:
```bash
osascript -e 'tell application "Messages" to send "test" to buddy "+1234567890" of (1st service whose service type = iMessage)'
```

### High CPU usage

The agent polls the database every 2 seconds. To reduce:

Edit `src/integrations/imessage/reader.ts`:
```typescript
this.pollInterval = setInterval(() => {
  this.checkForNewMessages();
}, 5000); // Change to 5 seconds (from 2000)
```

## 🔄 Integration with Jarvis

The iMessage agent is fully integrated with Jarvis's multi-agent system:

```typescript
// In src/index.ts
import { IMessageAgent } from './agents/imessage-agent';

// Register agent
const imessageAgent = new IMessageAgent();
orchestrator.registerAgent('imessage', imessageAgent);

// Start monitoring
await imessageAgent.start();
```

Messages are routed to appropriate agents:
- **Support Agent**: Questions, issues, help requests
- **Sales Agent**: Pricing, upgrades, purchases
- **Marketing Agent**: Features, capabilities, demos
- **Operations Agent**: Commands, status checks

## 📝 Examples

### Example 1: Support Request

**Incoming**: "Help! I can't access my account"

**Jarvis**:
1. Detects URGENT intent
2. Routes to Support Agent
3. Sends immediate acknowledgment:
   ```
   Thanks for reaching out. I've flagged this as urgent and
   a team member will respond shortly.
   ```
4. Creates high-priority approval request
5. Notifies via Discord webhook

### Example 2: Sales Inquiry

**Incoming**: "How much does the Pro plan cost?"

**Jarvis**:
1. Detects SALES_INQUIRY intent
2. Routes to Sales Agent
3. Claude generates response:
   ```
   DAWG AI Pro is $9-15/month and includes:
   • Unlimited projects
   • 10GB storage
   • All AI features

   Want to try it? I can send you a free trial link!
   ```
4. Sends automatically (if contact is allowed)
5. Logs conversation in memory

### Example 3: Sensitive Information

**Incoming**: "My credit card is 1234-5678-9012-3456"

**Jarvis**:
1. Redactor detects credit card
2. Redacts before processing: "My credit card is [CREDIT_CARD]"
3. Queues for approval: "Contains sensitive information"
4. Does NOT auto-respond
5. Waits for human review

## 🚀 Advanced Usage

### Custom Message Handlers

Create custom handlers for specific intents:

```typescript
import { IMessageAgent } from './agents/imessage-agent';
import { ResponseAction } from './integrations/imessage/router';

class CustomIMessageAgent extends IMessageAgent {
  protected async handleIncomingMessage(message: IMessage): Promise<void> {
    // Custom logic before routing
    if (message.text.includes('VIP_CODE')) {
      // Handle VIP customers differently
      await this.escalateMessage(message, 'VIP customer');
      return;
    }

    // Fall back to default handling
    await super.handleIncomingMessage(message);
  }
}
```

### Integration with Other Services

Forward messages to Slack, Discord, etc.:

```typescript
import { IMessageReader } from './integrations/imessage';
import axios from 'axios';

const reader = new IMessageReader();

reader.on('message', async (message) => {
  // Forward to Slack
  await axios.post(process.env.SLACK_WEBHOOK!, {
    text: `New iMessage from ${message.handleName}: ${message.text}`
  });
});

await reader.start();
```

## 📚 API Reference

See [API_QUICK_REFERENCE.md](./API_QUICK_REFERENCE.md) for full API documentation.

## 🤝 Contributing

To add new features:

1. Update routing logic in `src/integrations/imessage/router.ts`
2. Add redaction rules in `src/integrations/imessage/redact.ts`
3. Modify agent behavior in `src/agents/imessage-agent.ts`
4. Add tests in `tests/imessage/`
5. Update documentation

## 📄 License

Part of Jarvis autonomous business AI system.

## 🙋 Support

For issues or questions:
- Check logs: `tail -f logs/combined.log`
- Run tests: `npm run imessage test`
- File an issue on GitHub
- Contact: support@dawgai.com
