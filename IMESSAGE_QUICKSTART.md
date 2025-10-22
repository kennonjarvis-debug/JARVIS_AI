# iMessage Integration - Quick Start Guide

Get Jarvis responding to iMessages in 5 minutes!

## ⚡ Quick Setup

### 1. Install Dependencies

```bash
cd Jarvis-v0
npm install
```

This installs:
- `better-sqlite3` - For reading iMessage database
- `chokidar` - For file watching
- Other Jarvis dependencies

### 2. Grant Permissions

**Critical**: Your terminal needs Full Disk Access to read iMessage database.

1. Open **System Preferences** → **Security & Privacy** → **Privacy**
2. Click **Full Disk Access** in sidebar
3. Click lock icon (🔒) and authenticate
4. Click **+** button
5. Navigate to and select your terminal:
   - **Terminal**: `/Applications/Utilities/Terminal.app`
   - **iTerm2**: `/Applications/iTerm.app`
6. Check the box next to your terminal
7. **Restart your terminal** (important!)

### 3. Build the Project

```bash
npm run build
```

### 4. Test the Integration

```bash
npm run imessage test
```

Expected output:
```
🧪 Running iMessage Integration Tests

1. Testing iMessage database access...
   ✅ Successfully read 5 recent messages

2. Testing redaction system...
   ✅ Redaction working correctly

3. Testing routing system...
   ✅ Routing working correctly

✅ All tests passed!
```

If you see errors, check [Troubleshooting](#troubleshooting) below.

### 5. Add Yourself to Allowed Contacts

```bash
# Use your phone number or email
npm run imessage allow "+1234567890"
# or
npm run imessage allow "your@email.com"
```

### 6. Start Monitoring

```bash
npm run imessage start
```

Output:
```
🚀 Starting Jarvis iMessage agent...

✅ iMessage agent is now running
📱 Monitoring incoming messages...

💡 Press Ctrl+C to stop
```

### 7. Test It!

1. From another device, send yourself an iMessage
2. Watch the logs for the routing decision
3. If you're in the allowed list, Jarvis will auto-respond!

Example incoming message:
```
You: "What features does DAWG AI have?"
```

Jarvis response (via Claude):
```
Jarvis: "DAWG AI is an AI-powered web DAW with:
• AI-assisted beat generation
• Voice control for hands-free production
• Cloud-based collaboration
• Free tier with 5 projects

Want to learn more about a specific feature?"
```

---

## 📱 Common Commands

```bash
# View recent messages
npm run imessage recent

# View conversation with specific contact
npm run imessage conversation "+1234567890"

# Send a message manually
npm run imessage send "+1234567890" "Hello from Jarvis!"

# Check status
npm run imessage status

# Stop monitoring
# (Ctrl+C in the terminal running the agent)

# Get help
npm run imessage help
```

---

## 🔧 Configuration

### Adding Multiple Contacts

```bash
npm run imessage allow "+1234567890"
npm run imessage allow "alice@example.com"
npm run imessage allow "bob@example.com"
```

### Blocking Spam

```bash
npm run imessage block "spam@example.com"
```

### Auto-Start on Login

```bash
# Update username in plist
sed -i '' "s/YOUR_USERNAME/$USER/g" launch/com.jarvis.imessage.plist

# Copy to LaunchAgents
cp launch/com.jarvis.imessage.plist ~/Library/LaunchAgents/

# Load service
launchctl load ~/Library/LaunchAgents/com.jarvis.imessage.plist

# Verify it's running
launchctl list | grep jarvis
```

To disable:
```bash
launchctl unload ~/Library/LaunchAgents/com.jarvis.imessage.plist
```

---

## 🎯 How It Works

```
┌─────────────┐
│  New iMessage │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ IMessageReader   │ Polls chat.db every 2s
│ (Watches chat.db)│
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ MessageRedactor  │ Removes credit cards, SSNs, etc.
│ (Privacy Check)  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ MessageRouter    │ Detects intent (support, sales, etc.)
│ (Intent Detection)│
└──────┬───────────┘
       │
       ├─AUTO_RESPOND──┐
       │               ▼
       │         ┌─────────────┐
       │         │   Claude    │ Generates response
       │         └──────┬──────┘
       │                │
       │                ▼
       │         ┌─────────────┐
       │         │IMessageSender│ Sends via AppleScript
       │         └─────────────┘
       │
       ├─REQUEST_APPROVAL──┐
       │                   ▼
       │            ┌──────────────┐
       │            │Approval Queue│ Waits for human
       │            └──────────────┘
       │
       └─IGNORE─────────► [Skip]
```

---

## 🔒 Privacy & Safety

### What Gets Redacted

Before sending to Claude, these are automatically removed:
- Credit card numbers
- Social Security Numbers
- Passwords
- API keys
- Phone numbers (in message content)
- Email addresses (in message content)
- IP addresses
- Crypto wallet addresses
- URLs with auth tokens

### What Requires Approval

- Messages from unknown contacts (not in allowed list)
- Messages containing sensitive information
- Commands (e.g., "start the deploy")
- High-risk intents

### What's Auto-Responded

- Questions from allowed contacts
- Support requests (non-sensitive)
- Sales inquiries (basic info)
- Greetings

---

## 🐛 Troubleshooting

### "Permission denied" when accessing chat.db

**Solution**: Grant Full Disk Access (see step 2 above). **Restart terminal after granting!**

Test permission:
```bash
sqlite3 ~/Library/Messages/chat.db "SELECT COUNT(*) FROM message"
```

If you see a number, permissions are correct!

### "Messages.app not running"

**Solution**: Open Messages.app. The agent will try to launch it automatically, but manual opening is more reliable.

```bash
open -a Messages
```

### No messages detected

**Check**:
1. Messages.app is signed in to iMessage
2. You've received messages recently
3. Terminal has Full Disk Access

**Debug**:
```bash
# Check database exists
ls -la ~/Library/Messages/chat.db

# Check database is readable
npm run imessage recent
```

### Responses not sending

**Check**:
1. Messages.app is open and signed in
2. Phone number format: `+1234567890` (with country code)
3. Email format: `user@example.com`

**Test manually**:
```bash
# Try sending via AppleScript directly
osascript -e 'tell application "Messages"
    set targetService to 1st service whose service type = iMessage
    set targetBuddy to buddy "+1234567890" of targetService
    send "test" to targetBuddy
end tell'
```

### "Module not found" errors

**Solution**: Rebuild the project

```bash
npm install
npm run build
```

### High CPU usage

The agent polls the database every 2 seconds. To reduce:

Edit `src/integrations/imessage/reader.ts`:
```typescript
// Line ~82
this.pollInterval = setInterval(() => {
  this.checkForNewMessages();
}, 5000); // Change from 2000 to 5000 (5 seconds)
```

Then rebuild:
```bash
npm run build
```

---

## 📚 Next Steps

### Customize Responses

The iMessage agent routes to specialized Jarvis agents. Customize their behavior:

- **Support responses**: Edit `src/agents/support-agent.ts`
- **Sales responses**: Edit `src/agents/sales-agent.ts`
- **Marketing responses**: Edit `src/agents/marketing-agent.ts`

### Add Custom Routing Rules

Edit `src/integrations/imessage/router.ts`:

```typescript
private detectIntent(text: string): MessageIntent {
  const lowerText = text.toLowerCase();

  // Add custom rule
  if (lowerText.includes('my special keyword')) {
    return MessageIntent.CUSTOM;
  }

  // ... existing rules
}
```

### Custom Redaction Rules

Add sensitive patterns specific to your business:

```typescript
import { messageRedactor } from './integrations/imessage/redact';

messageRedactor.addRule({
  pattern: /\b[A-Z]{3}-\d{6}\b/g, // e.g., ABC-123456
  replacement: '[ORDER_ID]',
  description: 'Order ID'
});
```

### Connect to Discord for Approvals

Approval requests are sent to Discord webhooks. Set in `.env`:

```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

When a message requires approval, you'll get a Discord notification with approve/reject buttons.

---

## 🎓 Learn More

- **Full Documentation**: [docs/imessage-integration.md](docs/imessage-integration.md)
- **Architecture**: [CLAUDE.md](CLAUDE.md)
- **API Reference**: [docs/api-reference.md](docs/api-reference.md)
- **Jarvis Overview**: [README.md](README.md)

---

## ✅ Checklist

Before going live, verify:

- [ ] Full Disk Access granted to terminal
- [ ] Messages.app signed in and working
- [ ] `npm run imessage test` passes
- [ ] Added your phone/email to allowed contacts
- [ ] Tested receiving and responding to a message
- [ ] Approval queue configured (Discord webhook)
- [ ] Auto-start configured (optional)
- [ ] Reviewed privacy settings

---

## 💡 Pro Tips

1. **Test with yourself first**: Add your own number/email to allowed contacts and test thoroughly before adding others

2. **Start with approval mode**: Don't add contacts to allowed list initially. Review all messages in approval queue first.

3. **Monitor logs**: Keep `tail -f logs/combined.log` open in a terminal to watch activity

4. **Business hours**: Consider only auto-responding during business hours (9 AM - 6 PM)

5. **Rate limiting**: If you get many messages, the agent will handle them sequentially. Monitor for backlogs.

6. **Backup your rules**: Export allowed/blocked contacts periodically

---

**You're ready to go! Send yourself a test message and watch Jarvis respond.** 🚀

For issues or questions, see [docs/imessage-integration.md](docs/imessage-integration.md) or file an issue on GitHub.
