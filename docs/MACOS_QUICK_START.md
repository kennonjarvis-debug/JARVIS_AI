# macOS Integration - Quick Start Guide

Get up and running with Jarvis macOS integrations in minutes.

## 1. Installation (5 minutes)

```bash
cd /Users/benkennon/Jarvis
./scripts/install-macos.sh
```

This script will:
- ✅ Install dependencies (Homebrew, Node.js)
- ✅ Build the project
- ✅ Set up the CLI tool
- ✅ Configure LaunchAgent
- ✅ Create example scripts

## 2. Grant Permissions (2 minutes)

When prompted, grant these permissions:

### Full Disk Access (for iMessage)
System Settings → Privacy & Security → Full Disk Access → Add Terminal

### Contacts
Allow when prompted (or System Settings → Privacy & Security → Contacts)

### Calendar
Allow when prompted (or System Settings → Privacy & Security → Calendars)

## 3. Start Jarvis

```bash
jarvis start
```

Check status:
```bash
jarvis status
```

## 4. Test Integrations

### iMessage
```typescript
import { imessageService } from './src/integrations/macos';

await imessageService.initialize();
await imessageService.sendMessage('user@icloud.com', 'Hello!');
```

### Notifications
```typescript
import { notificationsService } from './src/integrations/macos';

await notificationsService.success('Test', 'It works!');
```

### Shortcuts
```bash
shortcuts list
```

### System Info
```bash
jarvis system
```

## 5. Optional Enhancements

### Enable Auto-Start
```bash
launchctl load ~/Library/LaunchAgents/com.jarvis.ai.plist
```

### Create Shortcuts
1. Open Shortcuts app
2. Follow guide in `/Users/benkennon/Jarvis/docs/MACOS_INTEGRATION.md`

### Install Quick Actions
1. Open Automator
2. Follow guide in `/Users/benkennon/Jarvis/macos/QuickActions/README.md`

## CLI Commands

```bash
jarvis status          # Show status
jarvis start           # Start Jarvis
jarvis stop            # Stop Jarvis
jarvis restart         # Restart Jarvis
jarvis logs            # View logs
jarvis system          # System info
jarvis interactive     # Interactive mode
```

## Troubleshooting

### iMessage not working?
```bash
# Check database access
ls ~/Library/Messages/chat.db

# Grant Full Disk Access in System Settings
```

### CLI not found?
```bash
# Recreate symlink
sudo ln -sf $(pwd)/src/cli/jarvis-cli.ts /usr/local/bin/jarvis
```

### Permissions denied?
```bash
# Check permissions
jarvis status

# Grant in System Settings → Privacy & Security
```

## Next Steps

- Read full documentation: `/Users/benkennon/Jarvis/docs/MACOS_INTEGRATION.md`
- Try example scripts: `/Users/benkennon/Jarvis/examples/applescript/`
- Set up Shortcuts and Quick Actions
- Configure auto-responses and automation

## Support

Run `jarvis status` to diagnose issues.

Check logs: `jarvis logs --follow`

---

**Installation Time:** ~10 minutes
**Difficulty:** Easy
**Requirements:** macOS 12+ (Monterey or later)
