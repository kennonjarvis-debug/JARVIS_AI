# JARVIS: macOS & iOS Deployment Architecture

## Date: October 15, 2025

---

## EXECUTIVE SUMMARY

**Current State:** Jarvis-v0 is a Node.js backend service designed to run on servers.

**Target State:** Jarvis running natively on macOS and accessible from iPhone with system-level integration.

**Architecture Decision:** Hybrid approach with macOS daemon + iOS companion app.

---

## DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                      macOS System                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Jarvis Daemon (launchd service)            │    │
│  │  • Node.js backend (existing codebase)             │    │
│  │  • System-level permissions                        │    │
│  │  • Auto-start on boot                              │    │
│  │  • Background processing                           │    │
│  │  • Local API server (localhost:3000)               │    │
│  └────────────────┬───────────────────────────────────┘    │
│                   │                                          │
│  ┌────────────────▼───────────────────────────────────┐    │
│  │         macOS Menu Bar App (Swift)                 │    │
│  │  • Status icon in menu bar                         │    │
│  │  • Quick controls                                  │    │
│  │  • Approval notifications                          │    │
│  │  • System integration                              │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ iCloud Sync / Local Network
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      iPhone                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Jarvis iOS App (Swift/SwiftUI)             │    │
│  │  • View agent activity                             │    │
│  │  • Approve/reject decisions                        │    │
│  │  • Configure settings                              │    │
│  │  • Push notifications                              │    │
│  │  • Connects to Mac via local network or cloud     │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## CLARIFYING QUESTIONS

Before updating prompts, I need to understand what you mean by "root access":

### Option A: System Daemon (Recommended)
- Jarvis runs as a system service (launchd) on macOS
- Starts automatically on boot
- Runs in background 24/7
- Has standard user permissions (not actual root)
- Can access:
  - Network
  - Notifications
  - Files in user directory
  - API integrations

### Option B: Elevated Privileges (Not Recommended)
- Jarvis runs with sudo/root permissions
- Security risk
- Not needed for business automation
- Avoid unless absolutely necessary

### Option C: Sandboxed App Store Distribution
- Jarvis packaged as Mac App Store app
- Limited permissions (sandbox)
- User approves specific permissions
- More secure but limited capabilities

**Which approach do you prefer?** I recommend **Option A** (System Daemon).

---

## PROPOSED ARCHITECTURE: HYBRID APPROACH

### Component 1: macOS Daemon (Node.js)
**Location:** Existing Jarvis-v0 codebase
**Role:** Core business logic and agent processing
**Deployment:** launchd service (system daemon)
**Permissions:** User-level (non-root)

### Component 2: macOS Menu Bar App (Swift)
**Location:** New project - `/Jarvis-MenuBar`
**Role:** User interface and system integration
**Technology:** Swift + SwiftUI
**Features:**
- Menu bar icon showing Jarvis status
- Quick access to controls
- Approval notifications (native macOS notifications)
- System tray integration
- Launch daemon management

### Component 3: iOS Companion App (Swift)
**Location:** New project - `/Jarvis-iOS`
**Role:** Mobile access and approvals
**Technology:** Swift + SwiftUI
**Features:**
- View agent activity
- Approve/reject high-risk actions
- Configure settings
- Push notifications
- Connect to Mac over local network or cloud

### Component 4: Sync Bridge (Optional)
**Technology:** CloudKit or Supabase
**Role:** Sync state between Mac and iPhone when not on same network

---

## IMPLEMENTATION PHASES

### Phase 1: macOS Daemon Setup (Week 1)
**Goal:** Jarvis runs as background service on macOS

**Tasks:**
1. Create launchd plist configuration
2. Add startup script
3. Configure logging to system log
4. Set up auto-restart on failure
5. Create install/uninstall scripts

**Deliverable:** Jarvis starts on boot, runs in background

### Phase 2: macOS Menu Bar App (Week 2)
**Goal:** Native macOS UI for Jarvis

**Tasks:**
1. Create Swift macOS app project
2. Build menu bar icon and menu
3. Connect to Jarvis API (localhost:3000)
4. Implement approval notification UI
5. Add system notification integration
6. Create settings panel

**Deliverable:** Menu bar app showing Jarvis status and controls

### Phase 3: iOS Companion App (Week 3)
**Goal:** iPhone app for remote Jarvis control

**Tasks:**
1. Create Swift iOS app project
2. Build dashboard UI
3. Implement approval flow
4. Add push notifications
5. Connect to Jarvis API (via local network or cloud)
6. Implement authentication

**Deliverable:** iPhone app for Jarvis management

### Phase 4: Integration & Polish (Week 4)
**Goal:** Seamless experience across devices

**Tasks:**
1. Set up iCloud sync or CloudKit
2. Test Mac-to-iPhone communication
3. Optimize performance
4. Add App Store assets
5. Create installation documentation

**Deliverable:** Production-ready native apps

---

## UPDATED IMPLEMENTATION PROMPTS

### PROMPT 1: macOS Daemon Configuration

```markdown
# JARVIS: Configure macOS Daemon with launchd

## Context
You're configuring Jarvis-v0 to run as a system daemon on macOS using launchd (macOS native service manager). This will make Jarvis start automatically on boot and run continuously in the background.

## Your Task

### 1. Create launchd Configuration

File: `com.jarvis.agent.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.jarvis.agent</string>

    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/benkennon/Jarvis-v0/dist/index.js</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>

    <key>StandardOutPath</key>
    <string>/Users/benkennon/Library/Logs/Jarvis/jarvis-stdout.log</string>

    <key>StandardErrorPath</key>
    <string>/Users/benkennon/Library/Logs/Jarvis/jarvis-stderr.log</string>

    <key>WorkingDirectory</key>
    <string>/Users/benkennon/Jarvis-v0</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>

    <key>ProcessType</key>
    <string>Background</string>

    <key>Nice</key>
    <integer>-10</integer>
</dict>
</plist>
```

### 2. Create Installation Script

File: `scripts/install-daemon.sh`

```bash
#!/bin/bash

# Jarvis macOS Daemon Installation Script

set -e

JARVIS_DIR="/Users/benkennon/Jarvis-v0"
PLIST_NAME="com.jarvis.agent.plist"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME"
LOG_DIR="$HOME/Library/Logs/Jarvis"

echo "🤖 Installing Jarvis as macOS daemon..."

# Create log directory
mkdir -p "$LOG_DIR"

# Build the project
echo "📦 Building Jarvis..."
cd "$JARVIS_DIR"
npm run build

# Copy plist to LaunchAgents
echo "📋 Installing launch agent..."
cp "$JARVIS_DIR/$PLIST_NAME" "$PLIST_PATH"

# Load the daemon
echo "🚀 Starting Jarvis daemon..."
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"

echo "✅ Jarvis daemon installed successfully!"
echo ""
echo "Commands:"
echo "  Start:   launchctl start com.jarvis.agent"
echo "  Stop:    launchctl stop com.jarvis.agent"
echo "  Restart: launchctl stop com.jarvis.agent && launchctl start com.jarvis.agent"
echo "  Logs:    tail -f $LOG_DIR/jarvis-stdout.log"
echo "  Errors:  tail -f $LOG_DIR/jarvis-stderr.log"
```

### 3. Create Uninstallation Script

File: `scripts/uninstall-daemon.sh`

```bash
#!/bin/bash

# Jarvis macOS Daemon Uninstallation Script

PLIST_NAME="com.jarvis.agent.plist"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo "🗑️  Uninstalling Jarvis daemon..."

# Unload the daemon
launchctl unload "$PLIST_PATH" 2>/dev/null || true

# Remove plist
rm -f "$PLIST_PATH"

echo "✅ Jarvis daemon uninstalled successfully!"
```

### 4. Update package.json Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "daemon:install": "chmod +x scripts/install-daemon.sh && scripts/install-daemon.sh",
    "daemon:uninstall": "chmod +x scripts/uninstall-daemon.sh && scripts/uninstall-daemon.sh",
    "daemon:start": "launchctl start com.jarvis.agent",
    "daemon:stop": "launchctl stop com.jarvis.agent",
    "daemon:restart": "npm run daemon:stop && npm run daemon:start",
    "daemon:logs": "tail -f ~/Library/Logs/Jarvis/jarvis-stdout.log",
    "daemon:status": "launchctl list | grep jarvis"
  }
}
```

### 5. Add System Notification Support

File: `src/utils/mac-notifier.ts`

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class MacNotifier {
  /**
   * Send native macOS notification
   */
  async notify(title: string, message: string, sound: boolean = true): Promise<void> {
    const soundArg = sound ? '-sound default' : '';

    const script = `osascript -e 'display notification "${message}" with title "${title}" ${soundArg}'`;

    try {
      await execAsync(script);
    } catch (error) {
      console.error('Failed to send macOS notification:', error);
    }
  }

  /**
   * Send approval request notification with actions
   */
  async notifyApproval(requestId: string, action: string, reason: string): Promise<void> {
    const script = `
      osascript -e 'display notification "${reason}" with title "🚨 Jarvis Approval Required" subtitle "${action}"'
    `;

    try {
      await execAsync(script);
    } catch (error) {
      console.error('Failed to send approval notification:', error);
    }
  }
}

export const macNotifier = new MacNotifier();
```

### 6. Integrate Notifications in Approval Queue

Update `src/core/approval-queue.ts`:

```typescript
import { macNotifier } from '../utils/mac-notifier';

// In requestApproval method, add:
await macNotifier.notifyApproval(
  request.id,
  action,
  reason
);
```

### 7. Create Health Check Endpoint

Add to `src/index.ts`:

```typescript
// Add simple HTTP server for health checks
import express from 'express';

const app = express();

app.get('/health', (req, res) => {
  res.json({
    status: 'operational',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    agents: Array.from(orchestrator.agents.keys()),
    pendingTasks: orchestrator.getPendingTaskCount(),
    memory: process.memoryUsage()
  });
});

app.listen(3000, 'localhost', () => {
  logger.info('Jarvis API listening on http://localhost:3000');
});
```

### 8. Test Installation

```bash
# Build and install
npm run build
npm run daemon:install

# Check status
npm run daemon:status

# View logs
npm run daemon:logs

# Test health endpoint
curl http://localhost:3000/health
```

## Success Criteria
- ✅ Jarvis starts automatically on macOS boot
- ✅ Runs continuously in background
- ✅ Logs to system log directory
- ✅ Auto-restarts on failure
- ✅ HTTP API accessible at localhost:3000
- ✅ Native macOS notifications working

## Deliverables
- launchd plist configuration
- Install/uninstall scripts
- System notification integration
- Health check API
- Documentation for daemon management
```

### PROMPT 2: macOS Menu Bar App

```markdown
# JARVIS: Build macOS Menu Bar App (Swift)

## Context
Create a native macOS menu bar application that provides UI for Jarvis daemon. This gives users quick access to Jarvis controls and approval notifications.

## Your Task

### 1. Create Xcode Project

```bash
# Create new macOS app in Xcode
# File → New → Project → macOS → App
# Name: Jarvis Menu Bar
# Interface: SwiftUI
# Language: Swift
```

### 2. Main App Structure

File: `JarvisMenuBarApp.swift`

```swift
import SwiftUI
import UserNotifications

@main
struct JarvisMenuBarApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var jarvisManager = JarvisManager()

    var body: some Scene {
        Settings {
            EmptyView()
        }
    }
}

class AppDelegate: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem!
    private var popover: NSPopover!
    private var jarvisManager: JarvisManager!

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Request notification permissions
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            print("Notification permission granted: \(granted)")
        }

        // Create menu bar item
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)

        if let button = statusItem.button {
            button.image = NSImage(systemSymbolName: "brain", accessibilityDescription: "Jarvis")
            button.action = #selector(togglePopover)
            button.target = self
        }

        // Create popover
        popover = NSPopover()
        popover.contentSize = NSSize(width: 400, height: 600)
        popover.behavior = .transient

        jarvisManager = JarvisManager.shared
        popover.contentViewController = NSHostingController(rootView: JarvisMenuView())

        // Start monitoring Jarvis
        jarvisManager.startMonitoring()
    }

    @objc func togglePopover() {
        if let button = statusItem.button {
            if popover.isShown {
                popover.performClose(nil)
            } else {
                popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
            }
        }
    }
}
```

### 3. Jarvis Manager (API Client)

File: `JarvisManager.swift`

```swift
import Foundation
import Combine

class JarvisManager: ObservableObject {
    static let shared = JarvisManager()

    @Published var status: JarvisStatus = .unknown
    @Published var agents: [Agent] = []
    @Published var pendingApprovals: [ApprovalRequest] = []
    @Published var recentActivity: [Activity] = []

    private let baseURL = "http://localhost:3000"
    private var cancellables = Set<AnyCancellable>()
    private var timer: Timer?

    enum JarvisStatus {
        case unknown
        case running
        case stopped
        case error
    }

    struct Agent: Identifiable, Codable {
        let id: String
        let name: String
        let status: String
    }

    struct ApprovalRequest: Identifiable, Codable {
        let id: String
        let action: String
        let reason: String
        let requestedAt: String
        let requestedBy: String
    }

    struct Activity: Identifiable, Codable {
        let id: String
        let timestamp: String
        let agent: String
        let action: String
        let status: String
    }

    func startMonitoring() {
        // Poll Jarvis API every 5 seconds
        timer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { _ in
            self.fetchStatus()
            self.fetchPendingApprovals()
        }
        timer?.fire()
    }

    func fetchStatus() {
        guard let url = URL(string: "\(baseURL)/api/status") else { return }

        URLSession.shared.dataTaskPublisher(for: url)
            .map(\.data)
            .decode(type: StatusResponse.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { completion in
                    if case .failure = completion {
                        self.status = .error
                    }
                },
                receiveValue: { response in
                    self.status = .running
                    self.agents = response.agents.map { name in
                        Agent(id: name, name: name, status: "active")
                    }
                }
            )
            .store(in: &cancellables)
    }

    func fetchPendingApprovals() {
        guard let url = URL(string: "\(baseURL)/api/approvals/pending") else { return }

        URLSession.shared.dataTaskPublisher(for: url)
            .map(\.data)
            .decode(type: [ApprovalRequest].self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { approvals in
                    // Check for new approvals and send notifications
                    let newApprovals = approvals.filter { approval in
                        !self.pendingApprovals.contains { $0.id == approval.id }
                    }

                    for approval in newApprovals {
                        self.sendApprovalNotification(approval)
                    }

                    self.pendingApprovals = approvals
                }
            )
            .store(in: &cancellables)
    }

    func approveRequest(_ requestId: String) async throws {
        guard let url = URL(string: "\(baseURL)/api/approvals/\(requestId)/approve") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["decidedBy": "menu-bar-app"]
        request.httpBody = try JSONEncoder().encode(body)

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        // Refresh approvals
        fetchPendingApprovals()
    }

    func rejectRequest(_ requestId: String, reason: String) async throws {
        guard let url = URL(string: "\(baseURL)/api/approvals/\(requestId)/reject") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["decidedBy": "menu-bar-app", "reason": reason]
        request.httpBody = try JSONEncoder().encode(body)

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        // Refresh approvals
        fetchPendingApprovals()
    }

    private func sendApprovalNotification(_ approval: ApprovalRequest) {
        let content = UNMutableNotificationContent()
        content.title = "🚨 Jarvis Approval Required"
        content.subtitle = approval.action
        content.body = approval.reason
        content.sound = .default
        content.categoryIdentifier = "APPROVAL"
        content.userInfo = ["requestId": approval.id]

        let request = UNNotificationRequest(
            identifier: approval.id,
            content: content,
            trigger: nil
        )

        UNUserNotificationCenter.current().add(request)
    }
}

extension JarvisManager {
    struct StatusResponse: Codable {
        let agents: [String]
        let pendingTasks: Int
        let memory: MemoryUsage
    }

    struct MemoryUsage: Codable {
        let heapUsed: Int
        let heapTotal: Int
    }
}
```

### 4. Menu View UI

File: `JarvisMenuView.swift`

```swift
import SwiftUI

struct JarvisMenuView: View {
    @StateObject private var manager = JarvisManager.shared

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Image(systemName: "brain")
                    .font(.title)
                Text("Jarvis")
                    .font(.title2)
                    .fontWeight(.bold)

                Spacer()

                StatusIndicator(status: manager.status)
            }
            .padding()
            .background(Color.blue.opacity(0.1))

            // Pending Approvals
            if !manager.pendingApprovals.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Pending Approvals")
                        .font(.headline)
                        .padding(.horizontal)
                        .padding(.top)

                    ForEach(manager.pendingApprovals) { approval in
                        ApprovalCard(approval: approval)
                    }
                }
            }

            // Agents Status
            VStack(alignment: .leading, spacing: 8) {
                Text("Active Agents")
                    .font(.headline)
                    .padding(.horizontal)
                    .padding(.top)

                ForEach(manager.agents) { agent in
                    AgentRow(agent: agent)
                }
            }

            Spacer()

            // Footer
            HStack {
                Button("Settings") {
                    // Open settings
                }

                Spacer()

                Button("Quit") {
                    NSApplication.shared.terminate(nil)
                }
            }
            .padding()
        }
        .frame(width: 400, height: 600)
    }
}

struct StatusIndicator: View {
    let status: JarvisManager.JarvisStatus

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(statusColor)
                .frame(width: 8, height: 8)
            Text(statusText)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }

    var statusColor: Color {
        switch status {
        case .running: return .green
        case .stopped: return .red
        case .error: return .orange
        case .unknown: return .gray
        }
    }

    var statusText: String {
        switch status {
        case .running: return "Running"
        case .stopped: return "Stopped"
        case .error: return "Error"
        case .unknown: return "Unknown"
        }
    }
}

struct ApprovalCard: View {
    let approval: JarvisManager.ApprovalRequest
    @State private var isProcessing = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(.orange)

                VStack(alignment: .leading) {
                    Text(approval.action)
                        .font(.headline)
                    Text(approval.reason)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()
            }

            HStack {
                Button("Approve") {
                    Task {
                        isProcessing = true
                        try? await JarvisManager.shared.approveRequest(approval.id)
                        isProcessing = false
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(isProcessing)

                Button("Reject") {
                    Task {
                        isProcessing = true
                        try? await JarvisManager.shared.rejectRequest(
                            approval.id,
                            reason: "Rejected from menu bar"
                        )
                        isProcessing = false
                    }
                }
                .buttonStyle(.bordered)
                .disabled(isProcessing)
            }
        }
        .padding()
        .background(Color.orange.opacity(0.1))
        .cornerRadius(8)
        .padding(.horizontal)
    }
}

struct AgentRow: View {
    let agent: JarvisManager.Agent

    var body: some View {
        HStack {
            Image(systemName: agentIcon)
                .foregroundColor(.blue)

            Text(agent.name)
                .font(.body)

            Spacer()

            Text(agent.status)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal)
        .padding(.vertical, 4)
    }

    var agentIcon: String {
        switch agent.name {
        case "MarketingAgent": return "megaphone"
        case "SalesAgent": return "dollarsign.circle"
        case "SupportAgent": return "headphones"
        case "OperationsAgent": return "gearshape"
        default: return "circle"
        }
    }
}
```

### 5. Add API Endpoints to Jarvis Backend

Update `src/index.ts`:

```typescript
// Add new endpoints for menu bar app
app.get('/api/approvals/pending', async (req, res) => {
  const approvals = await approvalQueue.getPendingRequests();
  res.json(approvals);
});

app.post('/api/approvals/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { decidedBy } = req.body;

  await approvalQueue.approve(id, decidedBy);
  res.json({ success: true });
});

app.post('/api/approvals/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { decidedBy, reason } = req.body;

  await approvalQueue.reject(id, decidedBy, reason);
  res.json({ success: true });
});
```

## Success Criteria
- ✅ Menu bar icon shows Jarvis status
- ✅ Clicking icon shows popover with controls
- ✅ Pending approvals displayed with approve/reject buttons
- ✅ Native macOS notifications for new approvals
- ✅ Agent status displayed in real-time
- ✅ Communication with Jarvis daemon working

## Deliverables
- Xcode project for menu bar app
- Swift code for UI and API client
- Updated backend API endpoints
- App bundle for distribution
```

### PROMPT 3: iOS Companion App

```markdown
# JARVIS: Build iOS Companion App (Swift/SwiftUI)

## Context
Create a native iOS app that allows you to manage Jarvis from your iPhone. The app connects to your Mac's Jarvis daemon over local network or cloud.

## Your Task

### 1. Create Xcode Project

```bash
# Create new iOS app in Xcode
# File → New → Project → iOS → App
# Name: Jarvis
# Interface: SwiftUI
# Language: Swift
```

### 2. Main App Structure

File: `JarvisApp.swift`

```swift
import SwiftUI

@main
struct JarvisApp: App {
    @StateObject private var jarvisManager = JarvisIOSManager()
    @StateObject private var authManager = AuthManager()

    var body: some Scene {
        WindowGroup {
            if authManager.isAuthenticated {
                MainTabView()
                    .environmentObject(jarvisManager)
                    .environmentObject(authManager)
            } else {
                AuthView()
                    .environmentObject(authManager)
            }
        }
    }
}
```

### 3. iOS Manager (Extended)

File: `JarvisIOSManager.swift`

```swift
import Foundation
import Combine
import Network

class JarvisIOSManager: ObservableObject {
    @Published var connectionStatus: ConnectionStatus = .disconnected
    @Published var agents: [Agent] = []
    @Published var pendingApprovals: [ApprovalRequest] = []
    @Published var recentActivity: [Activity] = []

    private var baseURL: String {
        if useCloud {
            return "https://your-jarvis-cloud.com"
        } else {
            return "http://\(localIP):3000"
        }
    }

    @Published var useCloud: Bool = false
    @Published var localIP: String = "192.168.1.100"

    private var cancellables = Set<AnyCancellable>()
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "NetworkMonitor")

    enum ConnectionStatus {
        case disconnected
        case connecting
        case connected
        case error(String)
    }

    init() {
        startNetworkMonitoring()
        setupPushNotifications()
    }

    func connect() {
        connectionStatus = .connecting
        fetchStatus()
    }

    private func startNetworkMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                if path.status == .satisfied {
                    self?.connect()
                } else {
                    self?.connectionStatus = .disconnected
                }
            }
        }
        monitor.start(queue: queue)
    }

    private func setupPushNotifications() {
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .sound, .badge]
        ) { granted, _ in
            print("Push notification permission: \(granted)")
        }
    }

    func fetchStatus() {
        guard let url = URL(string: "\(baseURL)/api/status") else { return }

        var request = URLRequest(url: url)
        request.timeoutInterval = 5.0

        URLSession.shared.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: StatusResponse.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.connectionStatus = .error(error.localizedDescription)
                    }
                },
                receiveValue: { [weak self] response in
                    self?.connectionStatus = .connected
                    self?.agents = response.agents.map { name in
                        Agent(id: name, name: name, status: "active")
                    }
                    self?.fetchPendingApprovals()
                }
            )
            .store(in: &cancellables)
    }

    func fetchPendingApprovals() {
        guard let url = URL(string: "\(baseURL)/api/approvals/pending") else { return }

        URLSession.shared.dataTaskPublisher(for: url)
            .map(\.data)
            .decode(type: [ApprovalRequest].self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] approvals in
                    self?.pendingApprovals = approvals
                }
            )
            .store(in: &cancellables)
    }

    func approveRequest(_ requestId: String) async throws {
        guard let url = URL(string: "\(baseURL)/api/approvals/\(requestId)/approve") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["decidedBy": "iOS-app"]
        request.httpBody = try JSONEncoder().encode(body)

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        fetchPendingApprovals()
    }

    func rejectRequest(_ requestId: String, reason: String) async throws {
        // Similar to approveRequest
        guard let url = URL(string: "\(baseURL)/api/approvals/\(requestId)/reject") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["decidedBy": "iOS-app", "reason": reason]
        request.httpBody = try JSONEncoder().encode(body)

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        fetchPendingApprovals()
    }
}

// Reuse Agent, ApprovalRequest, Activity structs from macOS version
```

### 4. Main Tab View

File: `MainTabView.swift`

```swift
import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var manager: JarvisIOSManager

    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "gauge")
                }

            ApprovalsView()
                .tabItem {
                    Label("Approvals", systemImage: "checkmark.circle")
                }
                .badge(manager.pendingApprovals.count)

            AgentsView()
                .tabItem {
                    Label("Agents", systemImage: "person.3")
                }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape")
                }
        }
    }
}
```

### 5. Dashboard View

File: `DashboardView.swift`

```swift
import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var manager: JarvisIOSManager

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Connection Status
                    ConnectionStatusCard(status: manager.connectionStatus)

                    // Quick Stats
                    HStack(spacing: 15) {
                        StatCard(
                            title: "Active Agents",
                            value: "\(manager.agents.count)",
                            icon: "person.3.fill",
                            color: .blue
                        )

                        StatCard(
                            title: "Pending",
                            value: "\(manager.pendingApprovals.count)",
                            icon: "exclamationmark.circle.fill",
                            color: .orange
                        )
                    }

                    // Recent Activity
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Recent Activity")
                            .font(.headline)
                            .padding(.horizontal)

                        ForEach(manager.recentActivity.prefix(5)) { activity in
                            ActivityRow(activity: activity)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Jarvis")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        manager.connect()
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
        }
    }
}

struct ConnectionStatusCard: View {
    let status: JarvisIOSManager.ConnectionStatus

    var body: some View {
        HStack {
            Image(systemName: statusIcon)
                .font(.title2)
                .foregroundColor(statusColor)

            VStack(alignment: .leading) {
                Text("Jarvis")
                    .font(.headline)
                Text(statusText)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
        .padding()
        .background(statusColor.opacity(0.1))
        .cornerRadius(12)
    }

    var statusIcon: String {
        switch status {
        case .connected: return "checkmark.circle.fill"
        case .disconnected: return "xmark.circle.fill"
        case .connecting: return "arrow.triangle.2.circlepath"
        case .error: return "exclamationmark.triangle.fill"
        }
    }

    var statusColor: Color {
        switch status {
        case .connected: return .green
        case .disconnected: return .gray
        case .connecting: return .blue
        case .error: return .red
        }
    }

    var statusText: String {
        switch status {
        case .connected: return "Connected"
        case .disconnected: return "Disconnected"
        case .connecting: return "Connecting..."
        case .error(let message): return message
        }
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack {
            Image(systemName: icon)
                .font(.title)
                .foregroundColor(color)

            Text(value)
                .font(.title.bold())

            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(color.opacity(0.1))
        .cornerRadius(12)
    }
}

struct ActivityRow: View {
    let activity: JarvisIOSManager.Activity

    var body: some View {
        HStack {
            Image(systemName: "circle.fill")
                .font(.caption)
                .foregroundColor(.blue)

            VStack(alignment: .leading) {
                Text(activity.action)
                    .font(.body)

                HStack {
                    Text(activity.agent)
                    Text("•")
                    Text(activity.timestamp)
                }
                .font(.caption)
                .foregroundColor(.secondary)
            }

            Spacer()

            Image(systemName: statusIcon(activity.status))
                .foregroundColor(statusColor(activity.status))
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }

    func statusIcon(_ status: String) -> String {
        switch status {
        case "completed": return "checkmark.circle.fill"
        case "failed": return "xmark.circle.fill"
        default: return "clock.fill"
        }
    }

    func statusColor(_ status: String) -> Color {
        switch status {
        case "completed": return .green
        case "failed": return .red
        default: return .orange
        }
    }
}
```

### 6. Approvals View

File: `ApprovalsView.swift`

```swift
import SwiftUI

struct ApprovalsView: View {
    @EnvironmentObject var manager: JarvisIOSManager

    var body: some View {
        NavigationView {
            List {
                if manager.pendingApprovals.isEmpty {
                    VStack(spacing: 20) {
                        Image(systemName: "checkmark.circle")
                            .font(.system(size: 60))
                            .foregroundColor(.green)

                        Text("No Pending Approvals")
                            .font(.headline)

                        Text("All clear! Jarvis is operating autonomously.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                } else {
                    ForEach(manager.pendingApprovals) { approval in
                        ApprovalCardIOS(approval: approval)
                    }
                }
            }
            .navigationTitle("Approvals")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

struct ApprovalCardIOS: View {
    let approval: JarvisIOSManager.ApprovalRequest
    @State private var isProcessing = false
    @State private var showRejectSheet = false
    @EnvironmentObject var manager: JarvisIOSManager

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(.orange)

                VStack(alignment: .leading) {
                    Text(approval.action)
                        .font(.headline)

                    Text("Requested by \(approval.requestedBy)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Text(approval.reason)
                .font(.body)
                .foregroundColor(.primary)

            Text(approval.requestedAt)
                .font(.caption)
                .foregroundColor(.secondary)

            HStack {
                Button {
                    Task {
                        isProcessing = true
                        try? await manager.approveRequest(approval.id)
                        isProcessing = false
                    }
                } label: {
                    Label("Approve", systemImage: "checkmark.circle.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(isProcessing)

                Button {
                    showRejectSheet = true
                } label: {
                    Label("Reject", systemImage: "xmark.circle")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .tint(.red)
                .disabled(isProcessing)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
        .sheet(isPresented: $showRejectSheet) {
            RejectSheet(approval: approval)
        }
    }
}

struct RejectSheet: View {
    let approval: JarvisIOSManager.ApprovalRequest
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var manager: JarvisIOSManager
    @State private var reason = ""

    var body: some View {
        NavigationView {
            Form {
                Section("Rejection Reason") {
                    TextEditor(text: $reason)
                        .frame(height: 150)
                }

                Section {
                    Button("Confirm Rejection") {
                        Task {
                            try? await manager.rejectRequest(approval.id, reason: reason)
                            dismiss()
                        }
                    }
                    .foregroundColor(.red)
                }
            }
            .navigationTitle("Reject Approval")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}
```

### 7. Settings View

File: `SettingsView.swift`

```swift
import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var manager: JarvisIOSManager
    @EnvironmentObject var auth: AuthManager

    var body: some View {
        NavigationView {
            Form {
                Section("Connection") {
                    Toggle("Use Cloud", isOn: $manager.useCloud)

                    if !manager.useCloud {
                        TextField("Local IP Address", text: $manager.localIP)
                            .keyboardType(.numbersAndPunctuation)
                    }
                }

                Section("Notifications") {
                    Toggle("Approval Notifications", isOn: .constant(true))
                    Toggle("Activity Updates", isOn: .constant(false))
                }

                Section {
                    Button("Sign Out") {
                        auth.signOut()
                    }
                    .foregroundColor(.red)
                }
            }
            .navigationTitle("Settings")
        }
    }
}
```

## Success Criteria
- ✅ iOS app connects to Mac Jarvis daemon
- ✅ View pending approvals on iPhone
- ✅ Approve/reject from iPhone
- ✅ Push notifications for new approvals
- ✅ Works over local network
- ✅ Optional cloud sync

## Deliverables
- Xcode iOS project
- Swift UI implementation
- Connection manager
- Push notification setup
- TestFlight build ready
```

---

## NEXT STEPS

1. **Answer Clarifying Questions:**
   - Do you want system daemon (recommended) or elevated privileges?
   - Do you want menu bar app + iOS app, or just daemon?
   - Do you want local network only, or cloud sync too?

2. **Implementation Order:**
   - Week 1: macOS daemon setup
   - Week 2: macOS menu bar app
   - Week 3: iOS companion app
   - Week 4: Integration & polish

3. **Review Updated Prompts:**
   - All prompts above are ready to use
   - Each builds on previous work
   - Can be executed in parallel (daemon + menu bar)

**Ready to proceed?** Let me know your preferences and I'll refine the prompts further.
