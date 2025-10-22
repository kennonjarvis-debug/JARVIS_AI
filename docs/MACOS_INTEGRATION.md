# macOS Integration Guide for Jarvis AI

This guide covers all macOS-specific features and integrations for Jarvis AI.

## Table of Contents

1. [Installation](#installation)
2. [Permissions](#permissions)
3. [iMessage Integration](#imessage-integration)
4. [Notifications](#notifications)
5. [Apple Shortcuts](#apple-shortcuts)
6. [AppleScript Automation](#applescript-automation)
7. [Contacts Integration](#contacts-integration)
8. [Calendar Integration](#calendar-integration)
9. [Spotlight Search](#spotlight-search)
10. [System Integration](#system-integration)
11. [Performance Optimization](#performance-optimization)
12. [CLI Tool](#cli-tool)
13. [Quick Actions](#quick-actions)
14. [LaunchAgent](#launchagent)
15. [Troubleshooting](#troubleshooting)

---

## Installation

### Automated Installation

Run the macOS installation script:

```bash
cd /Users/benkennon/Jarvis
chmod +x scripts/install-macos.sh
./scripts/install-macos.sh
```

This script will:
- Install Homebrew (if not present)
- Install required dependencies
- Build the project
- Set up the CLI tool
- Configure LaunchAgent
- Create example scripts

### Manual Installation

1. **Install dependencies:**
   ```bash
   brew install node fswatch terminal-notifier
   ```

2. **Install npm packages:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Set up CLI:**
   ```bash
   npm install --save commander readline
   chmod +x src/cli/jarvis-cli.ts
   sudo ln -s $(pwd)/src/cli/jarvis-cli.ts /usr/local/bin/jarvis
   ```

---

## Permissions

Jarvis requires several macOS permissions for full functionality.

### Required Permissions

#### 1. Full Disk Access (for iMessage)

**Purpose:** Read iMessage database

**How to grant:**
1. Open **System Settings** → **Privacy & Security** → **Full Disk Access**
2. Click the **+** button
3. Add your Terminal app (or the app running Jarvis)
4. Restart the Terminal

**Verify:**
```bash
ls ~/Library/Messages/chat.db
```

#### 2. Contacts

**Purpose:** Access contacts for personalization

**How to grant:**
- Permission prompt will appear when first accessing Contacts
- Or: **System Settings** → **Privacy & Security** → **Contacts**

**Verify:**
```bash
osascript -e 'tell application "Contacts" to return count of people'
```

#### 3. Calendar

**Purpose:** Read and create calendar events

**How to grant:**
- Permission prompt will appear when first accessing Calendar
- Or: **System Settings** → **Privacy & Security** → **Calendars**

**Verify:**
```bash
osascript -e 'tell application "Calendar" to return count of calendars'
```

#### 4. Notifications

**Purpose:** Show native macOS notifications

**How to grant:**
- Permission granted automatically
- Configure in: **System Settings** → **Notifications** → **Terminal** (or your app)

---

## iMessage Integration

Send and receive iMessages programmatically.

### Features

- Read incoming messages
- Send messages to contacts
- Monitor messages in real-time
- AI-powered auto-response
- Message search and history

### Usage

#### Initialize iMessage Service

```typescript
import { imessageService } from './src/integrations/macos/imessage.service';

// Initialize
await imessageService.initialize();

// Start monitoring
imessageService.startMonitoring();

// Listen for new messages
imessageService.on('message', (message) => {
  console.log(`New message from ${message.sender}: ${message.text}`);
});
```

#### Send a Message

```typescript
// Send to email or phone
await imessageService.sendMessage('user@icloud.com', 'Hello from Jarvis!');
await imessageService.sendMessageToNumber('+1234567890', 'Hello!');
```

#### Get Recent Messages

```typescript
const messages = imessageService.getRecentMessages(10);
console.log(messages);
```

#### Search Messages

```typescript
const results = imessageService.searchMessages('meeting', 20);
console.log(results);
```

### Auto-Response

Enable AI-powered auto-response:

```typescript
const service = new iMessageService({
  autoResponse: true,
  aiProvider: 'anthropic',
  responsePrompt: 'You are a helpful assistant. Respond concisely.',
});
```

---

## Notifications

Display native macOS notifications with rich features.

### Features

- Native macOS notifications
- Rich notifications (buttons, images, sounds)
- Notification actions
- Custom sounds

### Usage

#### Basic Notification

```typescript
import { notificationsService } from './src/integrations/macos/notifications.service';

await notificationsService.notify({
  title: 'Jarvis',
  message: 'Task completed successfully!',
  sound: true,
});
```

#### Quick Notifications

```typescript
// Success
await notificationsService.success('Task Complete', 'All tests passed');

// Error
await notificationsService.error('Error', 'Failed to connect to API');

// Warning
await notificationsService.warning('Warning', 'Disk space running low');

// Info
await notificationsService.info('Info', 'Update available');
```

#### Notification with Actions

```typescript
const action = await notificationsService.notifyWithActions(
  'File Downloaded',
  'document.pdf is ready',
  ['Open', 'Show in Finder', 'Dismiss']
);

console.log('User selected:', action.action);
```

#### Notification with Reply

```typescript
const reply = await notificationsService.notifyWithReply(
  'Message Received',
  'How should I respond?'
);

if (reply) {
  console.log('User replied:', reply);
}
```

---

## Apple Shortcuts

Trigger and interact with Apple Shortcuts.

### Features

- Run shortcuts from Node.js
- Pass parameters to shortcuts
- Receive return values
- List available shortcuts

### Usage

#### Run a Shortcut

```typescript
import { shortcutsService } from './src/integrations/macos/shortcuts.service';

const result = await shortcutsService.runShortcut('My Shortcut', {
  input: 'Hello, World!'
});

console.log(result.output);
```

#### List Shortcuts

```typescript
const shortcuts = await shortcutsService.listShortcuts();
console.log(shortcuts);
```

#### Jarvis Shortcuts

```typescript
const jarvis = await shortcutsService.jarvisShortcuts();

// Send file to Observatory
await jarvis.sendToObservatory('/path/to/file.pdf');

// Process text
await jarvis.processText('Summarize this text...');

// Create task
await jarvis.createTask({ title: 'Review document', priority: 'high' });

// Get status
await jarvis.getStatus();
```

### Creating Jarvis Shortcuts

See setup instructions:
```bash
node -e "const s = require('./dist/integrations/macos/shortcuts.service'); console.log(s.shortcutsService.getSetupInstructions().join('\n'))"
```

---

## AppleScript Automation

Control macOS applications using AppleScript.

### Features

- Execute AppleScript from Node.js
- Control Mail, Calendar, Contacts
- Finder automation
- System automation

### Usage

#### Execute AppleScript

```typescript
import { applescriptService } from './src/integrations/macos/applescript.service';

const script = `
  tell application "Finder"
    return name of front window
  end tell
`;

const result = await applescriptService.execute(script);
console.log(result.output);
```

#### Send Email

```typescript
await applescriptService.mail.sendEmail({
  to: ['user@example.com'],
  subject: 'Hello from Jarvis',
  body: 'This is an automated email.',
  attachments: ['/path/to/file.pdf'],
});
```

#### Create Calendar Event

```typescript
await applescriptService.calendar.createEvent({
  title: 'Team Meeting',
  startDate: new Date('2024-12-25T10:00:00'),
  endDate: new Date('2024-12-25T11:00:00'),
  location: 'Conference Room',
  notes: 'Quarterly review',
});
```

#### Search Contacts

```typescript
const contacts = await applescriptService.contacts.search('John');
console.log(contacts);
```

#### System Automation

```typescript
// Display dialog
const button = await applescriptService.system.dialog(
  'Are you sure?',
  ['Yes', 'No']
);

// Choose file
const file = await applescriptService.system.chooseFile('Select a document');

// Speak text
await applescriptService.system.speak('Hello, I am Jarvis');

// Get/Set clipboard
const clipboard = await applescriptService.system.getClipboard();
await applescriptService.system.setClipboard('New clipboard content');
```

---

## Contacts Integration

Access and search macOS Contacts.

### Usage

```typescript
import { contactsService } from './src/integrations/macos/contacts.service';

// Search by name
const contacts = await contactsService.searchByName('John Doe');

// Search by email
const contact = await contactsService.searchByEmail('john@example.com');

// Search by phone
const contact = await contactsService.searchByPhone('+1234567890');

// Get personalization data
const data = await contactsService.getPersonalizationData('john@example.com');
console.log(`Hello, ${data.firstName}!`);
```

---

## Calendar Integration

Manage calendar events and reminders.

### Usage

```typescript
import { calendarService } from './src/integrations/macos/calendar.service';

// Get today's events
const events = await calendarService.getTodayEvents();

// Get upcoming events
const upcoming = await calendarService.getUpcomingEvents(7); // Next 7 days

// Create event
await calendarService.createEvent({
  title: 'Dentist Appointment',
  startDate: new Date('2024-12-20T14:00:00'),
  endDate: new Date('2024-12-20T15:00:00'),
  location: 'Downtown Dental',
  notes: 'Annual checkup',
});

// Get next event
const next = await calendarService.getNextEvent();
console.log(`Next: ${next?.title} at ${next?.startDate}`);

// Get daily briefing
const briefing = await calendarService.getDailyBriefing();
console.log(briefing);
```

---

## Spotlight Search

Fast file and content search using Spotlight.

### Usage

```typescript
import { spotlightService } from './src/integrations/macos/spotlight.service';

// Search files
const results = await spotlightService.search('project proposal');

// Search by name
const files = await spotlightService.searchByName('document.pdf');

// Search by content
const matches = await spotlightService.searchByContent('budget 2024');

// Search documents
const docs = await spotlightService.searchDocuments('meeting notes');

// Search code
const code = await spotlightService.searchCode('function processData');

// Presets
const pdfs = await spotlightService.presets.pdfs();
const screenshots = await spotlightService.presets.screenshots();
const downloads = await spotlightService.presets.downloads(7);
```

---

## System Integration

Monitor system status and resources.

### Usage

```typescript
import { systemService } from './src/integrations/macos/system.service';

// Get battery status
const battery = await systemService.getBatteryStatus();
console.log(`Battery: ${battery.percentage}% (${battery.health})`);

// Get network status
const network = await systemService.getNetworkStatus();
console.log(`Connected to: ${network.ssid} (${network.ipAddress})`);

// Get disk space
const disk = await systemService.getDiskSpace();
console.log(`Disk: ${disk.percentage}% used`);

// Get system load
const load = await systemService.getSystemLoad();
console.log(`CPU: ${load.cpuUsage}%, Memory: ${load.memoryUsage}%`);

// Check dark mode
const darkMode = await systemService.isDarkMode();
console.log(`Dark mode: ${darkMode ? 'enabled' : 'disabled'}`);

// Get comprehensive status
const status = await systemService.getStatus();
console.log(status);

// Start monitoring
systemService.startMonitoring();
systemService.on('battery_low', (battery) => {
  console.log('Battery low!', battery);
});
```

---

## Performance Optimization

Optimize Jarvis for macOS, especially Apple Silicon.

### Usage

```typescript
import { macosOptimizerService } from './src/services/macos-optimizer.service';

// Initialize
await macosOptimizerService.initialize();

// Optimize for specific workload
await macosOptimizerService.optimizeForWorkload('ai'); // ai, web, database, realtime

// Execute optimized task
await macosOptimizerService.executeOptimized(async () => {
  // CPU-intensive task here
}, { priority: 'high', useWorker: true });

// Get metrics
const metrics = await macosOptimizerService.getMetrics();
console.log(metrics);

// Get recommendations
const recommendations = await macosOptimizerService.getRecommendations();
console.log(recommendations);
```

### Apple Silicon Optimizations

Jarvis automatically detects and optimizes for M-series chips:

- Native ARM64 modules
- Increased thread pool
- Optimized memory management
- Better CPU core utilization

---

## CLI Tool

Command-line interface for managing Jarvis.

### Installation

```bash
# Installed automatically via install-macos.sh
# Or manually:
sudo ln -s $(pwd)/src/cli/jarvis-cli.ts /usr/local/bin/jarvis
```

### Commands

```bash
# Check status
jarvis status

# Start Jarvis
jarvis start

# Stop Jarvis
jarvis stop

# Restart Jarvis
jarvis restart

# View logs
jarvis logs
jarvis logs --follow
jarvis logs --lines 100

# System info
jarvis system

# Configuration
jarvis config show
jarvis config edit KEY VALUE

# Interactive mode
jarvis interactive
jarvis i
```

### Interactive Mode

```bash
$ jarvis interactive

=== Jarvis Interactive Mode ===
Type "help" for available commands, "exit" to quit

jarvis> status
jarvis> start
jarvis> logs
jarvis> exit
```

---

## Quick Actions

Right-click integration in Finder.

### Setup

See detailed guide: `/Users/benkennon/Jarvis/macos/QuickActions/README.md`

### Available Quick Actions

1. **Send to Jarvis Observatory** - Upload files for analysis
2. **Analyze with Jarvis Vision** - AI image analysis
3. **Transcribe Audio** - Audio/video transcription
4. **Process Text** - AI text processing
5. **Create Jarvis Task** - Quick task creation

### Usage

1. Right-click a file in Finder
2. Select **Quick Actions** → **Send to Jarvis**
3. The file is processed by Jarvis

---

## LaunchAgent

Auto-start Jarvis on login.

### Installation

```bash
# Automatic (via install script)
./scripts/install-macos.sh

# Manual
cp macos/LaunchAgents/com.jarvis.ai.plist ~/Library/LaunchAgents/
# Edit the plist file to replace YOUR_USERNAME
launchctl load ~/Library/LaunchAgents/com.jarvis.ai.plist
```

### Management

```bash
# Load (enable auto-start)
launchctl load ~/Library/LaunchAgents/com.jarvis.ai.plist

# Unload (disable auto-start)
launchctl unload ~/Library/LaunchAgents/com.jarvis.ai.plist

# Check status
launchctl list | grep jarvis

# View logs
tail -f ~/Jarvis/logs/jarvis-stdout.log
tail -f ~/Jarvis/logs/jarvis-stderr.log
```

---

## Troubleshooting

### iMessage Not Working

**Problem:** Cannot read messages

**Solution:**
1. Grant Full Disk Access to Terminal
2. Restart Terminal
3. Verify access: `ls ~/Library/Messages/chat.db`

### Contacts/Calendar Permission Denied

**Problem:** Permission errors when accessing Contacts/Calendar

**Solution:**
1. Grant permission in **System Settings** → **Privacy & Security**
2. Or wait for permission prompt when running Jarvis
3. Restart the application after granting permission

### CLI Command Not Found

**Problem:** `jarvis` command not recognized

**Solution:**
```bash
# Recreate symlink
sudo ln -sf $(pwd)/src/cli/jarvis-cli.ts /usr/local/bin/jarvis

# Or add to PATH
export PATH="$PATH:$(pwd)/src/cli"
```

### LaunchAgent Not Starting

**Problem:** Jarvis doesn't start on login

**Solution:**
1. Check plist file: `plutil ~/Library/LaunchAgents/com.jarvis.ai.plist`
2. Check logs: `tail ~/Jarvis/logs/jarvis-stderr.log`
3. Reload: `launchctl unload && launchctl load ~/Library/LaunchAgents/com.jarvis.ai.plist`

### Shortcuts Not Found

**Problem:** Shortcuts CLI not available

**Solution:**
- Requires macOS 12 (Monterey) or later
- Shortcuts must be created in the Shortcuts app first
- Verify: `shortcuts list`

### High CPU Usage

**Problem:** Jarvis using too much CPU

**Solution:**
```typescript
// Optimize for your workload
await macosOptimizerService.optimizeForWorkload('web'); // Lower priority
await macosOptimizerService.setProcessPriority('low');
```

### Memory Issues

**Problem:** High memory usage

**Solution:**
```typescript
// Force garbage collection
await macosOptimizerService.optimizeMemory();
```

---

## Best Practices

### 1. Security

- Never commit `.env` with API keys
- Use Keychain for sensitive data
- Grant minimum required permissions
- Review Quick Actions before installing

### 2. Performance

- Use Apple Silicon optimizations on M-series Macs
- Enable background throttling for non-critical tasks
- Monitor system resources regularly
- Optimize for your primary workload type

### 3. Privacy

- iMessage integration respects user privacy
- Auto-response should be carefully configured
- Contact data is only accessed when needed
- All data stays local unless explicitly shared

### 4. Reliability

- Use LaunchAgent for auto-start
- Monitor logs regularly
- Keep dependencies updated
- Test integrations after macOS updates

---

## Example Scripts

All example scripts are in: `/Users/benkennon/Jarvis/examples/applescript/`

- `send-imessage.scpt` - Send iMessage
- `create-event.scpt` - Create calendar event
- `show-notification.scpt` - Show notification
- `get-contacts.scpt` - Search contacts
- `send-email.scpt` - Send email via Mail.app
- `control-music.scpt` - Control Music app

### Running Examples

```bash
# Send iMessage
osascript examples/applescript/send-imessage.scpt "user@icloud.com" "Hello!"

# Create event
osascript examples/applescript/create-event.scpt "Meeting" "2024-12-25 10:00:00"

# Show notification
osascript examples/applescript/show-notification.scpt "Title" "Message"
```

---

## Support

For issues or questions:

1. Check this documentation
2. Review logs: `jarvis logs`
3. Check system status: `jarvis system`
4. Verify permissions: `jarvis status`

---

## Version Requirements

- macOS: 12.0 (Monterey) or later
- Node.js: 18.0 or later
- Homebrew: Latest version

### Compatibility

| Feature | macOS 12 | macOS 13 | macOS 14 | macOS 15 |
|---------|----------|----------|----------|----------|
| iMessage | ✅ | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ | ✅ |
| Shortcuts | ✅ | ✅ | ✅ | ✅ |
| AppleScript | ✅ | ✅ | ✅ | ✅ |
| Contacts | ✅ | ✅ | ✅ | ✅ |
| Calendar | ✅ | ✅ | ✅ | ✅ |
| Spotlight | ✅ | ✅ | ✅ | ✅ |
| LaunchAgent | ✅ | ✅ | ✅ | ✅ |

---

## Updates

Check for updates:
```bash
cd /Users/benkennon/Jarvis
git pull
npm install
npm run build
```

---

**Last Updated:** October 2024
**Version:** 2.0.0
**Platform:** macOS (Darwin 24.1.0)
