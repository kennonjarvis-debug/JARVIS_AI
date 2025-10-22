# macOS Integration Installation Checklist

Use this checklist to ensure proper installation and setup of Jarvis macOS integrations.

---

## Pre-Installation ☑️

- [ ] macOS version 12.0 (Monterey) or later
- [ ] Node.js 18.0 or later installed
- [ ] Terminal or preferred terminal app
- [ ] Admin access (for Homebrew and symlinks)

---

## Installation Steps

### 1. Run Installation Script ☑️

```bash
cd /Users/benkennon/Jarvis
chmod +x scripts/install-macos.sh
./scripts/install-macos.sh
```

**Expected Output:**
- [x] Homebrew installed/updated
- [x] Node.js verified
- [x] npm dependencies installed
- [x] Project built successfully
- [x] CLI tool linked to `/usr/local/bin/jarvis`
- [x] LaunchAgent configured
- [x] Directories created (logs, pids, data)
- [x] AppleScript examples created

**Time:** ~5-10 minutes

---

### 2. Install Dependencies ☑️

The script should install these automatically:

- [ ] `commander` npm package
- [ ] `better-sqlite3` (for iMessage)
- [ ] `node-notifier` (for notifications)
- [ ] `fswatch` (via Homebrew)
- [ ] `terminal-notifier` (via Homebrew, optional)

**Verify:**
```bash
npm list commander better-sqlite3 node-notifier
brew list fswatch terminal-notifier
```

---

### 3. Grant Permissions ☑️

#### A. Full Disk Access (for iMessage)

- [ ] Open **System Settings**
- [ ] Navigate to **Privacy & Security** → **Full Disk Access**
- [ ] Click the **+** button
- [ ] Add your Terminal app (Terminal.app, iTerm2, etc.)
- [ ] Restart Terminal

**Verify:**
```bash
ls ~/Library/Messages/chat.db
# Should list the file without "Permission denied"
```

#### B. Contacts Permission

- [ ] Will be prompted on first access
- [ ] Or: **System Settings** → **Privacy & Security** → **Contacts**
- [ ] Enable for Terminal/Node

**Verify:**
```bash
osascript -e 'tell application "Contacts" to return count of people'
# Should return a number, not an error
```

#### C. Calendar Permission

- [ ] Will be prompted on first access
- [ ] Or: **System Settings** → **Privacy & Security** → **Calendars**
- [ ] Enable for Terminal/Node

**Verify:**
```bash
osascript -e 'tell application "Calendar" to return count of calendars'
# Should return a number, not an error
```

#### D. Notifications Permission

- [ ] Usually granted automatically
- [ ] Configure in: **System Settings** → **Notifications** → **Terminal**
- [ ] Enable alerts, sounds, badges as desired

---

### 4. Test CLI Tool ☑️

```bash
# Test global command
jarvis --version

# Check status
jarvis status

# View system info
jarvis system
```

**Expected:**
- [ ] `jarvis` command is recognized
- [ ] Status shows integrations
- [ ] System info displays correctly

**If `jarvis` not found:**
```bash
# Recreate symlink
sudo ln -sf $(pwd)/src/cli/jarvis-cli.ts /usr/local/bin/jarvis
```

---

### 5. Start Jarvis ☑️

```bash
jarvis start
```

**Expected:**
- [ ] "Jarvis started successfully" message
- [ ] Process running (check with `jarvis status`)
- [ ] Logs being written

**Verify:**
```bash
jarvis status
# Should show "Jarvis is running (PID: xxxxx)"

jarvis logs --lines 20
# Should show recent log entries
```

---

### 6. Test Integrations ☑️

#### iMessage Test

```bash
# Check if accessible
jarvis status | grep -i imessage
# Should show "iMessage: Accessible"
```

**If showing "No permission":**
- Grant Full Disk Access (see step 3A)
- Restart Terminal
- Run `jarvis status` again

#### Notifications Test

```typescript
// In Node REPL or test script
const { notificationsService } = require('./dist/integrations/macos');
await notificationsService.success('Test', 'Jarvis is working!');
```

**Expected:**
- [ ] macOS notification appears
- [ ] Sound plays (if enabled)

#### Shortcuts Test

```bash
shortcuts list
# Should list your shortcuts
```

**Expected:**
- [ ] Command works (macOS 12+ required)
- [ ] Lists available shortcuts

#### AppleScript Test

```bash
osascript examples/applescript/show-notification.scpt "Test" "Hello from Jarvis"
```

**Expected:**
- [ ] Notification appears with "Test" title
- [ ] Message shows "Hello from Jarvis"

---

### 7. Configure Environment ☑️

```bash
# Check if .env exists
ls -la /Users/benkennon/Jarvis/.env

# Edit if needed
nano /Users/benkennon/Jarvis/.env
```

**Verify these are set:**
- [ ] `ANTHROPIC_API_KEY` (if using Claude)
- [ ] `OPENAI_API_KEY` (if using OpenAI)
- [ ] `JARVIS_API_KEY` (for API access)
- [ ] Other integration keys as needed

---

### 8. Enable Auto-Start (Optional) ☑️

```bash
launchctl load ~/Library/LaunchAgents/com.jarvis.ai.plist
```

**Verify:**
```bash
launchctl list | grep jarvis
# Should show com.jarvis.ai
```

**To disable:**
```bash
launchctl unload ~/Library/LaunchAgents/com.jarvis.ai.plist
```

---

### 9. Set Up Shortcuts (Optional) ☑️

- [ ] Open Shortcuts app
- [ ] Create shortcuts as documented in `docs/MACOS_INTEGRATION.md`
- [ ] Test each shortcut

**Recommended Shortcuts:**
- [ ] "Jarvis - Process Text"
- [ ] "Jarvis - Get Status"
- [ ] "Jarvis - Create Task"

**Verify:**
```bash
shortcuts run "Jarvis - Get Status"
# Should return Jarvis status
```

---

### 10. Install Quick Actions (Optional) ☑️

- [ ] Open Automator app
- [ ] Follow guide in `macos/QuickActions/README.md`
- [ ] Create desired Quick Actions

**Recommended Quick Actions:**
- [ ] Send to Jarvis Observatory
- [ ] Analyze with Jarvis Vision
- [ ] Transcribe Audio

**Test:**
- [ ] Right-click a file in Finder
- [ ] Look for "Quick Actions" menu
- [ ] Your actions should appear

---

## Post-Installation Verification

### Full System Check ☑️

Run comprehensive status check:

```bash
jarvis status
```

**Should show:**
- [ ] ✓ Jarvis is running
- [ ] ✓ iMessage: Accessible
- [ ] ✓ Shortcuts: Available
- [ ] ✓ Contacts: Accessible
- [ ] ✓ Calendar: Accessible

### Performance Check ☑️

```bash
jarvis system
```

**Should display:**
- [ ] macOS version
- [ ] CPU info
- [ ] Memory info
- [ ] Disk space
- [ ] Battery status (if laptop)

### Integration Tests ☑️

```bash
# Test all AppleScript examples
osascript examples/applescript/show-notification.scpt "Test" "1"
osascript examples/applescript/get-contacts.scpt "Smith"

# Test Spotlight
mdfind "test" | head -5
```

---

## Troubleshooting Common Issues

### Issue: CLI Command Not Found ❌

**Solution:**
```bash
sudo ln -sf /Users/benkennon/Jarvis/src/cli/jarvis-cli.ts /usr/local/bin/jarvis
chmod +x /Users/benkennon/Jarvis/src/cli/jarvis-cli.ts
```

### Issue: Permission Denied for iMessage ❌

**Solution:**
1. System Settings → Privacy & Security → Full Disk Access
2. Add Terminal app
3. Restart Terminal
4. Test: `ls ~/Library/Messages/chat.db`

### Issue: Jarvis Won't Start ❌

**Solution:**
```bash
# Check logs
jarvis logs --lines 50

# Check for port conflicts
lsof -i :3000

# Try manual start
npm run dev
```

### Issue: High Memory Usage ❌

**Solution:**
```typescript
// In code
await macosOptimizerService.optimizeMemory();
```

### Issue: LaunchAgent Not Working ❌

**Solution:**
```bash
# Check plist validity
plutil ~/Library/LaunchAgents/com.jarvis.ai.plist

# Check logs
tail -f ~/Jarvis/logs/jarvis-stderr.log

# Reload
launchctl unload ~/Library/LaunchAgents/com.jarvis.ai.plist
launchctl load ~/Library/LaunchAgents/com.jarvis.ai.plist
```

---

## Final Checklist Summary

### Core Installation ☑️
- [x] Installation script completed
- [x] Dependencies installed
- [x] Project built
- [x] CLI tool working

### Permissions ☑️
- [x] Full Disk Access granted (for iMessage)
- [x] Contacts permission granted
- [x] Calendar permission granted
- [x] Notifications enabled

### Services ☑️
- [x] Jarvis running
- [x] iMessage accessible
- [x] Notifications working
- [x] Shortcuts available
- [x] AppleScript working
- [x] System monitoring active

### Optional Components ☑️
- [ ] LaunchAgent enabled
- [ ] Shortcuts created
- [ ] Quick Actions installed
- [ ] Auto-response configured

---

## Quick Start Commands

```bash
# Check everything
jarvis status

# Start/stop
jarvis start
jarvis stop
jarvis restart

# View logs
jarvis logs
jarvis logs --follow

# System info
jarvis system

# Interactive mode
jarvis interactive
```

---

## Documentation References

- **Complete Guide:** `/Users/benkennon/Jarvis/docs/MACOS_INTEGRATION.md`
- **Quick Start:** `/Users/benkennon/Jarvis/docs/MACOS_QUICK_START.md`
- **Quick Actions:** `/Users/benkennon/Jarvis/macos/QuickActions/README.md`
- **Summary:** `/Users/benkennon/Jarvis/MACOS_INTEGRATION_SUMMARY.md`

---

## Support

If you encounter issues:

1. Check `jarvis status`
2. Review `jarvis logs`
3. Verify permissions in System Settings
4. Consult documentation
5. Check GitHub issues

---

**Installation Time:** ~10-15 minutes
**Difficulty:** Easy to Moderate
**macOS Version:** 12.0+ (Monterey or later)

**Status:** Ready to Install! ✅
