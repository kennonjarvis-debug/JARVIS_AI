# JARVIS PHASE 1: macOS System Daemon
**Instance:** JARVIS-CORE
**Phase:** 1 - Foundation
**Duration:** Week 1-2
**Dependencies:** None

---

## CONTEXT

You are building the **core Jarvis daemon** - a macOS system service that runs autonomously with an approval workflow. This is part of a larger parallel development effort with DAWG AI (audio workstation) and Jarvis mobile apps.

**Your Role:** Implement the macOS daemon that handles:
- System-level command execution
- Approval workflow (request → approve → execute)
- REST API for external control
- Status monitoring and logging

**Architecture:** System daemon (non-root) + Menu bar app + REST API

---

## PROJECT OVERVIEW

```
Jarvis System Architecture:

┌─────────────────────────────────────────┐
│          LaunchAgent (System)            │
│     com.jarvis.daemon.plist              │
└────────────┬────────────────────────────┘
             │
     ┌───────▼────────┐
     │  Jarvis Daemon │ ← You are building this
     │  (Swift/Rust)  │
     │                │
     │  - Approval    │
     │  - Execution   │
     │  - REST API    │
     │  - IPC         │
     └───────┬────────┘
             │
     ┌───────▼────────────┐
     │   Menu Bar App     │ ← Also you
     │   (SwiftUI)        │
     │                    │
     │  - Status          │
     │  - Approvals       │
     │  - Settings        │
     └────────────────────┘

External Integrations:
- iOS App (JARVIS-MOBILE instance)
- DAWG AI (DAWG-CORE instance)
- Claude API
```

---

## OBJECTIVES

### Primary Goals:
1. ✅ Create macOS daemon that runs on boot (LaunchAgent)
2. ✅ Implement approval workflow system
3. ✅ Build REST API for external control
4. ✅ Create menu bar app for user interaction
5. ✅ Set up IPC between daemon and menu bar app

### Success Criteria:
- Daemon runs on system startup
- Can request approval for actions
- User can approve/reject from menu bar
- REST API responds on localhost:9000
- Status file updates every 5 minutes

---

## TECHNICAL STACK

### Language: Swift (recommended) or Rust
**Recommendation:** Swift for better macOS integration

### Components:
1. **Daemon** (`JarvisDaemon`)
   - Swift Package with executable
   - Runs as LaunchAgent
   - No GUI, background only

2. **Menu Bar App** (`JarvisMenuBar`)
   - SwiftUI app
   - Lives in menu bar
   - Communicates with daemon via IPC

3. **Shared Framework** (`JarvisCore`)
   - Shared data models
   - IPC protocol
   - Approval logic

### Dependencies:
```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/apple/swift-log.git", from: "1.0.0"),
    .package(url: "https://github.com/vapor/vapor.git", from: "4.0.0"), // REST API
    .package(url: "https://github.com/apple/swift-argument-parser.git", from: "1.0.0")
]
```

---

## IMPLEMENTATION STEPS

### Step 1: Project Setup

**Create Xcode Project:**
```bash
cd ~/Development
mkdir -p Jarvis
cd Jarvis

# Create Swift package
swift package init --type executable --name JarvisDaemon

# Create Xcode project for menu bar app
# File > New > Project > macOS > App
# Name: JarvisMenuBar
# Interface: SwiftUI
# Life Cycle: SwiftUI App
```

**Directory Structure:**
```
~/Development/Jarvis/
├── JarvisDaemon/          # Daemon executable
│   ├── Package.swift
│   ├── Sources/
│   │   ├── main.swift
│   │   ├── Daemon.swift
│   │   ├── ApprovalManager.swift
│   │   ├── CommandExecutor.swift
│   │   ├── APIServer.swift
│   │   └── Logger.swift
│   └── Tests/
├── JarvisMenuBar/         # Menu bar app
│   ├── JarvisMenuBar.xcodeproj
│   ├── JarvisMenuBar/
│   │   ├── JarvisMenuBarApp.swift
│   │   ├── Views/
│   │   ├── Models/
│   │   └── Services/
│   └── Assets.xcassets
├── JarvisCore/            # Shared framework
│   ├── Models.swift
│   ├── IPCProtocol.swift
│   └── SharedTypes.swift
└── LaunchAgents/
    └── com.jarvis.daemon.plist
```

### Step 2: Daemon Core Implementation

**File:** `Sources/main.swift`
```swift
import Foundation
import ArgumentParser

@main
struct JarvisDaemonCLI: ParsableCommand {
    static let configuration = CommandConfiguration(
        commandName: "jarvis-daemon",
        abstract: "Jarvis autonomous system daemon"
    )

    @Flag(name: .long, help: "Run in foreground for debugging")
    var foreground = false

    @Option(name: .long, help: "Port for REST API")
    var port: Int = 9000

    func run() throws {
        let daemon = JarvisDaemon(port: port, foreground: foreground)
        try daemon.start()

        // Keep running
        dispatchMain()
    }
}
```

**File:** `Sources/Daemon.swift`
```swift
import Foundation
import Vapor

class JarvisDaemon {
    let port: Int
    let foreground: Bool
    var app: Application?

    let approvalManager: ApprovalManager
    let commandExecutor: CommandExecutor
    let apiServer: APIServer
    let logger: DaemonLogger

    init(port: Int, foreground: Bool) {
        self.port = port
        self.foreground = foreground

        self.logger = DaemonLogger()
        self.approvalManager = ApprovalManager(logger: logger)
        self.commandExecutor = CommandExecutor(logger: logger)
        self.apiServer = APIServer(
            port: port,
            approvalManager: approvalManager,
            commandExecutor: commandExecutor,
            logger: logger
        )
    }

    func start() throws {
        logger.info("🚀 Jarvis Daemon starting on port \(port)...")

        // Set up signal handling
        setupSignalHandlers()

        // Start REST API server
        try apiServer.start()

        // Start approval workflow
        approvalManager.start()

        // Update status file
        updateStatusFile()

        // Schedule periodic status updates
        Timer.scheduledTimer(withTimeInterval: 300, repeats: true) { _ in
            self.updateStatusFile()
        }

        logger.info("✅ Jarvis Daemon running")
    }

    func updateStatusFile() {
        let status = DaemonStatus(
            instance: "JARVIS-CORE",
            lastUpdate: Date(),
            phase: "Phase 1: Foundation",
            currentTask: "Daemon running and monitoring",
            completedTasks: [
                "Daemon setup",
                "REST API server",
                "Approval workflow"
            ],
            blockedOn: [],
            apiEndpointsReady: [
                "GET /api/v1/health",
                "POST /api/v1/approval/request",
                "GET /api/v1/approval/status/:id",
                "POST /api/v1/execute/command"
            ],
            nextSteps: [
                "Menu bar app integration",
                "iOS app connection"
            ]
        )

        let statusPath = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Development/status/JARVIS-CORE_status.json")

        do {
            let encoder = JSONEncoder()
            encoder.outputFormatting = .prettyPrinted
            encoder.dateEncodingStrategy = .iso8601
            let data = try encoder.encode(status)
            try data.write(to: statusPath)
        } catch {
            logger.error("Failed to write status file: \(error)")
        }
    }

    func setupSignalHandlers() {
        signal(SIGTERM) { _ in
            print("Received SIGTERM, shutting down...")
            exit(0)
        }
        signal(SIGINT) { _ in
            print("Received SIGINT, shutting down...")
            exit(0)
        }
    }
}

struct DaemonStatus: Codable {
    let instance: String
    let lastUpdate: Date
    let phase: String
    let currentTask: String
    let completedTasks: [String]
    let blockedOn: [String]
    let apiEndpointsReady: [String]
    let nextSteps: [String]
}
```

**File:** `Sources/ApprovalManager.swift`
```swift
import Foundation

class ApprovalManager {
    private let logger: DaemonLogger
    private var pendingApprovals: [String: ApprovalRequest] = [:]
    private let queue = DispatchQueue(label: "com.jarvis.approval")

    init(logger: DaemonLogger) {
        self.logger = logger
    }

    func start() {
        logger.info("Approval manager started")

        // Monitor approval queue
        Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { _ in
            self.checkPendingApprovals()
        }
    }

    func requestApproval(
        action: String,
        reason: String,
        requestedBy: String,
        details: [String: String] = [:]
    ) -> String {
        let id = UUID().uuidString
        let request = ApprovalRequest(
            id: id,
            action: action,
            reason: reason,
            requestedBy: requestedBy,
            requestedAt: Date(),
            status: .pending,
            details: details
        )

        queue.sync {
            pendingApprovals[id] = request
        }

        logger.info("📋 Approval requested: \(action) - \(id)")

        // Notify menu bar app via IPC
        notifyMenuBarApp(request)

        // Notify iOS app via webhook/push
        notifyIOSApp(request)

        return id
    }

    func approve(id: String) throws {
        guard var request = pendingApprovals[id] else {
            throw ApprovalError.notFound
        }

        request.status = .approved
        request.resolvedAt = Date()

        queue.sync {
            pendingApprovals[id] = request
        }

        logger.info("✅ Approval granted: \(id)")
    }

    func reject(id: String, reason: String) throws {
        guard var request = pendingApprovals[id] else {
            throw ApprovalError.notFound
        }

        request.status = .rejected
        request.rejectionReason = reason
        request.resolvedAt = Date()

        queue.sync {
            pendingApprovals[id] = request
        }

        logger.info("❌ Approval rejected: \(id) - \(reason)")
    }

    func getStatus(id: String) -> ApprovalRequest? {
        return queue.sync {
            pendingApprovals[id]
        }
    }

    func getPending() -> [ApprovalRequest] {
        return queue.sync {
            Array(pendingApprovals.values.filter { $0.status == .pending })
        }
    }

    private func checkPendingApprovals() {
        let pending = getPending()

        // Auto-reject after 1 hour
        for request in pending {
            if Date().timeIntervalSince(request.requestedAt) > 3600 {
                try? reject(id: request.id, reason: "Timeout - no response after 1 hour")
            }
        }
    }

    private func notifyMenuBarApp(_ request: ApprovalRequest) {
        // Send via distributed notification
        DistributedNotificationCenter.default().post(
            name: .jarvisApprovalRequested,
            object: nil,
            userInfo: ["approvalId": request.id]
        )
    }

    private func notifyIOSApp(_ request: ApprovalRequest) {
        // TODO: Implement push notification via APNS
        // For now, iOS app will poll the API
    }
}

struct ApprovalRequest: Codable {
    let id: String
    let action: String
    let reason: String
    let requestedBy: String
    let requestedAt: Date
    var status: ApprovalStatus
    var resolvedAt: Date?
    var rejectionReason: String?
    let details: [String: String]
}

enum ApprovalStatus: String, Codable {
    case pending
    case approved
    case rejected
}

enum ApprovalError: Error {
    case notFound
    case alreadyResolved
}

extension Notification.Name {
    static let jarvisApprovalRequested = Notification.Name("com.jarvis.approval.requested")
}
```

**File:** `Sources/CommandExecutor.swift`
```swift
import Foundation

class CommandExecutor {
    private let logger: DaemonLogger

    init(logger: DaemonLogger) {
        self.logger = logger
    }

    func execute(command: String, args: [String] = []) async throws -> ExecutionResult {
        logger.info("⚡ Executing: \(command) \(args.joined(separator: " "))")

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        process.arguments = [command] + args

        let outputPipe = Pipe()
        let errorPipe = Pipe()

        process.standardOutput = outputPipe
        process.standardError = errorPipe

        try process.run()
        process.waitUntilExit()

        let outputData = outputPipe.fileHandleForReading.readDataToEndOfFile()
        let errorData = errorPipe.fileHandleForReading.readDataToEndOfFile()

        let output = String(data: outputData, encoding: .utf8) ?? ""
        let error = String(data: errorData, encoding: .utf8) ?? ""

        let result = ExecutionResult(
            command: command,
            args: args,
            exitCode: Int(process.terminationStatus),
            stdout: output,
            stderr: error,
            executedAt: Date()
        )

        logger.info("✅ Command completed with exit code: \(result.exitCode)")

        return result
    }
}

struct ExecutionResult: Codable {
    let command: String
    let args: [String]
    let exitCode: Int
    let stdout: String
    let stderr: String
    let executedAt: Date
}
```

**File:** `Sources/APIServer.swift`
```swift
import Vapor

class APIServer {
    let port: Int
    let approvalManager: ApprovalManager
    let commandExecutor: CommandExecutor
    let logger: DaemonLogger
    var app: Application?

    init(
        port: Int,
        approvalManager: ApprovalManager,
        commandExecutor: CommandExecutor,
        logger: DaemonLogger
    ) {
        self.port = port
        self.approvalManager = approvalManager
        self.commandExecutor = commandExecutor
        self.logger = logger
    }

    func start() throws {
        var env = Environment.production
        env.arguments = ["vapor"]

        let app = Application(env)
        self.app = app

        // Configure routes
        configureRoutes(app)

        // Start server
        app.http.server.configuration.hostname = "127.0.0.1"
        app.http.server.configuration.port = port

        try app.start()

        logger.info("🌐 REST API server started on port \(port)")
    }

    func configureRoutes(_ app: Application) {
        // Health check
        app.get("api", "v1", "health") { req in
            return [
                "status": "healthy",
                "version": "1.0.0",
                "timestamp": ISO8601DateFormatter().string(from: Date())
            ]
        }

        // Request approval
        app.post("api", "v1", "approval", "request") { req async throws -> ApprovalResponse in
            let body = try req.content.decode(ApprovalRequestBody.self)

            let id = self.approvalManager.requestApproval(
                action: body.action,
                reason: body.reason,
                requestedBy: body.requestedBy,
                details: body.details ?? [:]
            )

            return ApprovalResponse(
                id: id,
                status: "pending",
                message: "Approval requested"
            )
        }

        // Get approval status
        app.get("api", "v1", "approval", "status", ":id") { req -> ApprovalStatusResponse in
            guard let id = req.parameters.get("id") else {
                throw Abort(.badRequest)
            }

            guard let approval = self.approvalManager.getStatus(id: id) else {
                throw Abort(.notFound)
            }

            return ApprovalStatusResponse(
                id: approval.id,
                action: approval.action,
                status: approval.status.rawValue,
                requestedAt: approval.requestedAt,
                resolvedAt: approval.resolvedAt
            )
        }

        // Approve
        app.post("api", "v1", "approval", "approve", ":id") { req -> ApprovalResponse in
            guard let id = req.parameters.get("id") else {
                throw Abort(.badRequest)
            }

            try self.approvalManager.approve(id: id)

            return ApprovalResponse(
                id: id,
                status: "approved",
                message: "Approval granted"
            )
        }

        // Reject
        app.post("api", "v1", "approval", "reject", ":id") { req -> ApprovalResponse in
            guard let id = req.parameters.get("id") else {
                throw Abort(.badRequest)
            }

            let body = try req.content.decode(RejectBody.self)

            try self.approvalManager.reject(id: id, reason: body.reason)

            return ApprovalResponse(
                id: id,
                status: "rejected",
                message: "Approval rejected"
            )
        }

        // Get pending approvals
        app.get("api", "v1", "approval", "pending") { req -> [ApprovalRequest] in
            return self.approvalManager.getPending()
        }

        // Execute command (requires approval first)
        app.post("api", "v1", "execute", "command") { req async throws -> ExecutionResult in
            let body = try req.content.decode(ExecuteCommandBody.self)

            // Check if approval exists and is approved
            guard let approval = self.approvalManager.getStatus(id: body.approvalId) else {
                throw Abort(.notFound, reason: "Approval not found")
            }

            guard approval.status == .approved else {
                throw Abort(.forbidden, reason: "Command not approved")
            }

            return try await self.commandExecutor.execute(
                command: body.command,
                args: body.args
            )
        }
    }
}

// Request/Response models
struct ApprovalRequestBody: Content {
    let action: String
    let reason: String
    let requestedBy: String
    let details: [String: String]?
}

struct ApprovalResponse: Content {
    let id: String
    let status: String
    let message: String
}

struct ApprovalStatusResponse: Content {
    let id: String
    let action: String
    let status: String
    let requestedAt: Date
    let resolvedAt: Date?
}

struct RejectBody: Content {
    let reason: String
}

struct ExecuteCommandBody: Content {
    let approvalId: String
    let command: String
    let args: [String]
}
```

**File:** `Sources/Logger.swift`
```swift
import Foundation
import Logging

class DaemonLogger {
    let logger: Logger

    init() {
        var logger = Logger(label: "com.jarvis.daemon")
        logger.logLevel = .info
        self.logger = logger
    }

    func info(_ message: String) {
        logger.info("\(message)")
    }

    func error(_ message: String) {
        logger.error("\(message)")
    }

    func debug(_ message: String) {
        logger.debug("\(message)")
    }
}
```

### Step 3: LaunchAgent Setup

**File:** `LaunchAgents/com.jarvis.daemon.plist`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.jarvis.daemon</string>

    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/jarvis-daemon</string>
        <string>--port</string>
        <string>9000</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>

    <key>StandardOutPath</key>
    <string>/usr/local/var/log/jarvis-daemon.log</string>

    <key>StandardErrorPath</key>
    <string>/usr/local/var/log/jarvis-daemon-error.log</string>

    <key>WorkingDirectory</key>
    <string>/usr/local/var/jarvis</string>
</dict>
</plist>
```

**Install Script:** `install-daemon.sh`
```bash
#!/bin/bash

echo "🚀 Installing Jarvis Daemon..."

# Build daemon
cd JarvisDaemon
swift build -c release

# Copy binary
sudo cp .build/release/JarvisDaemon /usr/local/bin/jarvis-daemon
sudo chmod +x /usr/local/bin/jarvis-daemon

# Create directories
sudo mkdir -p /usr/local/var/jarvis
sudo mkdir -p /usr/local/var/log
sudo chown $(whoami) /usr/local/var/jarvis
sudo chown $(whoami) /usr/local/var/log

# Install LaunchAgent
cp LaunchAgents/com.jarvis.daemon.plist ~/Library/LaunchAgents/
launchctl unload ~/Library/LaunchAgents/com.jarvis.daemon.plist 2>/dev/null
launchctl load ~/Library/LaunchAgents/com.jarvis.daemon.plist

echo "✅ Jarvis Daemon installed and started"
echo "📊 Check status: launchctl list | grep jarvis"
echo "📜 View logs: tail -f /usr/local/var/log/jarvis-daemon.log"
```

### Step 4: Menu Bar App

**See:** `JARVIS_PHASE1_MENUBAR.md` for detailed menu bar app implementation

Quick summary:
- SwiftUI app with menu bar extra
- Shows approval count
- Lists pending approvals
- Approve/reject buttons
- Connects to daemon via IPC/REST API

### Step 5: Testing

**Manual Tests:**
```bash
# Test daemon startup
launchctl list | grep jarvis

# Test REST API
curl http://localhost:9000/api/v1/health

# Request approval
curl -X POST http://localhost:9000/api/v1/approval/request \
  -H "Content-Type: application/json" \
  -d '{
    "action": "Install homebrew package",
    "reason": "Need wget for automation",
    "requestedBy": "Jarvis AI",
    "details": {"package": "wget"}
  }'

# Check status
curl http://localhost:9000/api/v1/approval/pending

# Approve (get ID from previous response)
curl -X POST http://localhost:9000/api/v1/approval/approve/APPROVAL_ID

# Execute command (after approval)
curl -X POST http://localhost:9000/api/v1/execute/command \
  -H "Content-Type: application/json" \
  -d '{
    "approvalId": "APPROVAL_ID",
    "command": "echo",
    "args": ["Hello from Jarvis!"]
  }'
```

**Unit Tests:**
Create tests for:
- Approval workflow
- Command execution
- API endpoints
- Status file updates

---

## INTEGRATION POINTS

### With JARVIS-MOBILE (iOS App):
- Expose REST API endpoints (already done above)
- iOS app will poll `/api/v1/approval/pending`
- iOS app will POST to `/api/v1/approval/approve/:id`

### With DAWG-CORE (Audio Workstation):
- Jarvis can call DAWG REST API
- Example: Request approval to "Generate bassline in DAWG project"
- On approval, call `POST http://localhost:8080/api/v1/generate/midi`

### Status File:
Update `~/Development/status/JARVIS-CORE_status.json` every 5 minutes (already implemented in Daemon.swift)

---

## DELIVERABLES

At end of Phase 1, you should have:

1. ✅ Working daemon executable
2. ✅ LaunchAgent configuration
3. ✅ REST API on localhost:9000
4. ✅ Approval workflow functional
5. ✅ Menu bar app (basic)
6. ✅ Status file updating
7. ✅ Installation script
8. ✅ Unit tests
9. ✅ Documentation

---

## NEXT STEPS

After completing this prompt:
1. Test all API endpoints
2. Verify daemon runs on boot
3. Update status file with completion
4. Move to `JARVIS_PHASE1_MENUBAR.md` for menu bar app details
5. Coordinate with JARVIS-MOBILE instance for iOS integration

---

## STATUS UPDATES

**Important:** Update your status file every time you complete a major task!

```swift
// Already implemented in Daemon.swift
// Updates ~/Development/status/JARVIS-CORE_status.json
```

Check other instances' progress:
```bash
cat ~/Development/status/*.json | jq .
```

---

## QUESTIONS?

If blocked, check:
1. Is Vapor installing correctly? (`swift package resolve`)
2. Are ports already in use? (`lsof -i :9000`)
3. Do you have permissions? (daemon should run as user, not root)

Reference the master plan: `~/MASTER_PARALLEL_DEVELOPMENT_PLAN.md`

---

**Ready to build!** Start with project setup and work through each step sequentially.
