# JARVIS PHASE 1: Menu Bar App
**Instance:** JARVIS-CORE (complementary to daemon)
**Phase:** 1 - Foundation
**Duration:** Week 1-2
**Dependencies:** Jarvis Daemon running

---

## CONTEXT

You are building the **Jarvis Menu Bar App** - a SwiftUI macOS app that lives in the menu bar and provides user interface for the Jarvis daemon's approval workflow.

**Your Role:** Implement the menu bar UI that handles:
- Displaying approval notifications
- Approve/reject interface
- System status display
- Settings configuration

**Architecture:** SwiftUI app with NSStatusItem (menu bar extra)

---

## OBJECTIVES

### Primary Goals:
1. ✅ Create menu bar icon with notification badge
2. ✅ Show pending approvals list
3. ✅ Approve/reject UI with reasons
4. ✅ Settings panel for daemon configuration
5. ✅ Real-time updates from daemon

### Success Criteria:
- App runs in menu bar (no dock icon)
- Shows approval count badge
- Can approve/reject from menu
- Updates in real-time
- Persists settings

---

## IMPLEMENTATION

### Step 1: Xcode Project Setup

```bash
# Create new macOS app
# File > New > Project > macOS > App
# Name: JarvisMenuBar
# Interface: SwiftUI
# Life Cycle: SwiftUI App
```

**Configure Info.plist:**
Add these keys:
- `LSUIElement` = `YES` (hide dock icon)
- `LSBackgroundOnly` = `NO`

### Step 2: App Structure

**File:** `JarvisMenuBarApp.swift`
```swift
import SwiftUI

@main
struct JarvisMenuBarApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        Settings {
            EmptyView()
        }
    }
}

class AppDelegate: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem!
    private var popover: NSPopover!
    private var daemonClient: JarvisDaemonClient!

    func applicationDidFinishLaunching(_ notification: Notification) {
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
        popover.contentViewController = NSHostingController(rootView: ContentView())

        // Connect to daemon
        daemonClient = JarvisDaemonClient()
        daemonClient.connect()

        // Start monitoring approvals
        startMonitoring()
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

    func startMonitoring() {
        // Poll for approvals every 5 seconds
        Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { _ in
            Task {
                await self.checkForApprovals()
            }
        }

        // Listen for distributed notifications
        DistributedNotificationCenter.default().addObserver(
            self,
            selector: #selector(approvalRequested),
            name: .jarvisApprovalRequested,
            object: nil
        )
    }

    @objc func approvalRequested(_ notification: Notification) {
        Task {
            await checkForApprovals()
        }
    }

    func checkForApprovals() async {
        guard let approvals = try? await daemonClient.getPendingApprovals() else {
            return
        }

        // Update badge
        updateBadge(count: approvals.count)

        // Show notification if new approvals
        if approvals.count > 0 {
            showNotification(count: approvals.count)
        }
    }

    func updateBadge(count: Int) {
        guard let button = statusItem.button else { return }

        if count > 0 {
            button.image = NSImage(systemSymbolName: "brain.head.profile", accessibilityDescription: "Jarvis - \(count) pending")
            button.imagePosition = .imageTrailing
            button.title = "\(count)"
        } else {
            button.image = NSImage(systemSymbolName: "brain", accessibilityDescription: "Jarvis")
            button.title = ""
        }
    }

    func showNotification(count: Int) {
        let notification = NSUserNotification()
        notification.title = "Jarvis Approval Required"
        notification.informativeText = "\(count) action\(count == 1 ? "" : "s") awaiting approval"
        notification.soundName = NSUserNotificationDefaultSoundName

        NSUserNotificationCenter.default.deliver(notification)
    }
}

extension Notification.Name {
    static let jarvisApprovalRequested = Notification.Name("com.jarvis.approval.requested")
}
```

**File:** `ContentView.swift`
```swift
import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = JarvisViewModel()

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HeaderView(pendingCount: viewModel.pendingApprovals.count)

            Divider()

            // Approvals list
            if viewModel.pendingApprovals.isEmpty {
                EmptyStateView()
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(viewModel.pendingApprovals) { approval in
                            ApprovalCard(
                                approval: approval,
                                onApprove: {
                                    Task {
                                        await viewModel.approve(id: approval.id)
                                    }
                                },
                                onReject: { reason in
                                    Task {
                                        await viewModel.reject(id: approval.id, reason: reason)
                                    }
                                }
                            )
                        }
                    }
                    .padding()
                }
            }

            Divider()

            // Footer
            FooterView()
        }
        .frame(width: 400, height: 600)
        .onAppear {
            viewModel.startPolling()
        }
    }
}

struct HeaderView: View {
    let pendingCount: Int

    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text("Jarvis")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("\(pendingCount) pending approval\(pendingCount == 1 ? "" : "s")")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Button {
                // Open settings
                NSApp.sendAction(Selector(("showPreferencesWindow:")), to: nil, from: nil)
            } label: {
                Image(systemName: "gearshape.fill")
                    .foregroundColor(.secondary)
            }
            .buttonStyle(.plain)
        }
        .padding()
    }
}

struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(.green)

            Text("No Pending Approvals")
                .font(.title3)
                .fontWeight(.semibold)

            Text("All actions have been reviewed")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct FooterView: View {
    var body: some View {
        HStack {
            Button("Quit Jarvis") {
                NSApplication.shared.terminate(nil)
            }
            .buttonStyle(.plain)
            .foregroundColor(.red)

            Spacer()

            HStack(spacing: 4) {
                Circle()
                    .fill(.green)
                    .frame(width: 8, height: 8)

                Text("Connected")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
    }
}
```

**File:** `ApprovalCard.swift`
```swift
import SwiftUI

struct ApprovalCard: View {
    let approval: ApprovalRequest
    let onApprove: () -> Void
    let onReject: (String) -> Void

    @State private var isProcessing = false
    @State private var showRejectSheet = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Image(systemName: iconName)
                    .foregroundColor(iconColor)
                    .font(.title3)

                VStack(alignment: .leading, spacing: 2) {
                    Text(approval.action)
                        .font(.headline)

                    Text("Requested by \(approval.requestedBy)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()
            }

            // Reason
            Text(approval.reason)
                .font(.body)
                .foregroundColor(.primary)
                .lineLimit(3)

            // Details (if any)
            if !approval.details.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(Array(approval.details.keys.sorted()), id: \.self) { key in
                        HStack {
                            Text("\(key):")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text(approval.details[key] ?? "")
                                .font(.caption)
                                .fontWeight(.medium)
                        }
                    }
                }
                .padding(8)
                .background(Color(.systemGray).opacity(0.1))
                .cornerRadius(6)
            }

            // Timestamp
            Text(approval.requestedAt, style: .relative)
                .font(.caption2)
                .foregroundColor(.secondary)

            // Action buttons
            HStack(spacing: 12) {
                Button {
                    isProcessing = true
                    onApprove()
                } label: {
                    Label("Approve", systemImage: "checkmark.circle.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
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
        .background(Color(.controlBackgroundColor))
        .cornerRadius(12)
        .shadow(radius: 2)
        .sheet(isPresented: $showRejectSheet) {
            RejectSheet(approval: approval, onReject: onReject)
        }
    }

    var iconName: String {
        if approval.action.lowercased().contains("install") {
            return "arrow.down.circle.fill"
        } else if approval.action.lowercased().contains("delete") {
            return "trash.fill"
        } else if approval.action.lowercased().contains("modify") {
            return "pencil.circle.fill"
        } else {
            return "exclamationmark.triangle.fill"
        }
    }

    var iconColor: Color {
        if approval.action.lowercased().contains("delete") {
            return .red
        } else {
            return .orange
        }
    }
}

struct RejectSheet: View {
    let approval: ApprovalRequest
    let onReject: (String) -> Void

    @Environment(\.dismiss) var dismiss
    @State private var reason: String = ""

    var body: some View {
        VStack(spacing: 20) {
            Text("Reject Approval")
                .font(.title2)
                .fontWeight(.bold)

            Divider()

            VStack(alignment: .leading, spacing: 8) {
                Text("Action:")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text(approval.action)
                    .font(.body)
                    .fontWeight(.medium)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack(alignment: .leading, spacing: 8) {
                Text("Rejection Reason:")
                    .font(.caption)
                    .foregroundColor(.secondary)

                TextEditor(text: $reason)
                    .font(.body)
                    .frame(height: 100)
                    .padding(4)
                    .background(Color(.textBackgroundColor))
                    .cornerRadius(6)
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(Color(.separatorColor), lineWidth: 1)
                    )
            }

            HStack {
                Button("Cancel") {
                    dismiss()
                }
                .keyboardShortcut(.cancelAction)

                Spacer()

                Button("Confirm Rejection") {
                    onReject(reason.isEmpty ? "No reason provided" : reason)
                    dismiss()
                }
                .buttonStyle(.borderedProminent)
                .tint(.red)
                .disabled(reason.isEmpty)
                .keyboardShortcut(.defaultAction)
            }
        }
        .padding()
        .frame(width: 400)
    }
}
```

**File:** `JarvisViewModel.swift`
```swift
import Foundation
import Combine

@MainActor
class JarvisViewModel: ObservableObject {
    @Published var pendingApprovals: [ApprovalRequest] = []
    @Published var isConnected: Bool = false

    private let client = JarvisDaemonClient()
    private var pollingTimer: Timer?

    func startPolling() {
        // Initial fetch
        Task {
            await fetchApprovals()
        }

        // Poll every 5 seconds
        pollingTimer = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.fetchApprovals()
            }
        }
    }

    func fetchApprovals() async {
        do {
            let approvals = try await client.getPendingApprovals()
            self.pendingApprovals = approvals.sorted { $0.requestedAt > $1.requestedAt }
            self.isConnected = true
        } catch {
            print("Failed to fetch approvals: \(error)")
            self.isConnected = false
        }
    }

    func approve(id: String) async {
        do {
            try await client.approve(id: id)
            await fetchApprovals()
        } catch {
            print("Failed to approve: \(error)")
        }
    }

    func reject(id: String, reason: String) async {
        do {
            try await client.reject(id: id, reason: reason)
            await fetchApprovals()
        } catch {
            print("Failed to reject: \(error)")
        }
    }

    deinit {
        pollingTimer?.invalidate()
    }
}
```

**File:** `JarvisDaemonClient.swift`
```swift
import Foundation

class JarvisDaemonClient {
    let baseURL = "http://localhost:9000/api/v1"

    func connect() {
        // Test connection
        Task {
            _ = try? await healthCheck()
        }
    }

    func healthCheck() async throws -> [String: String] {
        let url = URL(string: "\(baseURL)/health")!
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode([String: String].self, from: data)
    }

    func getPendingApprovals() async throws -> [ApprovalRequest] {
        let url = URL(string: "\(baseURL)/approval/pending")!
        let (data, _) = try await URLSession.shared.data(from: url)

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode([ApprovalRequest].self, from: data)
    }

    func approve(id: String) async throws {
        let url = URL(string: "\(baseURL)/approval/approve/\(id)")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        let (_, _) = try await URLSession.shared.data(for: request)
    }

    func reject(id: String, reason: String) async throws {
        let url = URL(string: "\(baseURL)/approval/reject/\(id)")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["reason": reason]
        request.httpBody = try JSONEncoder().encode(body)

        let (_, _) = try await URLSession.shared.data(for: request)
    }
}
```

**File:** `Models.swift` (Shared)
```swift
import Foundation

struct ApprovalRequest: Codable, Identifiable {
    let id: String
    let action: String
    let reason: String
    let requestedBy: String
    let requestedAt: Date
    let status: String
    let details: [String: String]
}
```

### Step 3: Build & Run

```bash
cd ~/Development/Jarvis/JarvisMenuBar

# Open in Xcode
open JarvisMenuBar.xcodeproj

# Build and run (Cmd+R)
# App should appear in menu bar
```

### Step 4: Testing

**Test Scenarios:**
1. Launch app → Should appear in menu bar
2. Click icon → Popover should appear
3. Request approval via API → Badge should update
4. Approve from menu bar → Should disappear from list
5. Quit and relaunch → Should reconnect to daemon

**Manual API Test:**
```bash
# Request approval to trigger UI
curl -X POST http://localhost:9000/api/v1/approval/request \
  -H "Content-Type: application/json" \
  -d '{
    "action": "Install Homebrew package: ffmpeg",
    "reason": "Required for video processing automation",
    "requestedBy": "Jarvis AI",
    "details": {
      "package": "ffmpeg",
      "version": "latest"
    }
  }'

# Check menu bar - should show badge with "1"
# Click icon - should show approval card
# Click approve - should disappear
```

---

## DELIVERABLES

At end of this phase:

1. ✅ Menu bar app running
2. ✅ Shows approval notifications
3. ✅ Can approve/reject actions
4. ✅ Real-time updates
5. ✅ Persists across restarts
6. ✅ Clean, intuitive UI

---

## NEXT STEPS

1. Test with daemon running
2. Verify all API endpoints work
3. Add settings panel (optional)
4. Move to `JARVIS_PHASE1_IOS.md` for iOS app

---

**Ready to build the menu bar app!** Start with project setup in Xcode.
