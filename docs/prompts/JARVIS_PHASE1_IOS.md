# JARVIS PHASE 1: iOS Companion App
**Instance:** JARVIS-MOBILE
**Phase:** 1 - Foundation
**Duration:** Week 1-2
**Dependencies:** Jarvis Daemon API running

---

## CONTEXT

You are building the **Jarvis iOS Companion App** - a mobile interface for approving Jarvis actions on-the-go. Users can receive push notifications and approve/reject system actions from their iPhone.

**Your Role:** Implement the iOS app that handles:
- Remote approval workflow
- Push notifications for new approvals
- Local network and cloud connectivity
- Secure authentication

**Architecture:** Native SwiftUI iOS app + Push Notifications

---

## OBJECTIVES

### Primary Goals:
1. ✅ SwiftUI iOS app with authentication
2. ✅ Connect to Jarvis daemon (local/cloud)
3. ✅ Display pending approvals
4. ✅ Approve/reject with reasoning
5. ✅ Push notifications for new approvals

### Success Criteria:
- App runs on iOS 16+
- Connects to Mac daemon over local network
- Push notifications work
- Can approve/reject from phone
- Syncs with Mac menu bar app

---

## IMPLEMENTATION

### Step 1: Xcode Project Setup

```bash
# Create new iOS app
# File > New > Project > iOS > App
# Name: Jarvis
# Interface: SwiftUI
# Life Cycle: SwiftUI App
```

**Project Structure:**
```
Jarvis/
├── JarvisApp.swift
├── Views/
│   ├── ContentView.swift
│   ├── ApprovalListView.swift
│   ├── ApprovalDetailView.swift
│   ├── SettingsView.swift
│   └── AuthView.swift
├── Models/
│   ├── ApprovalRequest.swift
│   ├── User.swift
│   └── AppSettings.swift
├── Services/
│   ├── JarvisAPIClient.swift
│   ├── AuthManager.swift
│   ├── NotificationManager.swift
│   └── NetworkMonitor.swift
└── Resources/
    └── Assets.xcassets
```

### Step 2: Core App Structure

**File:** `JarvisApp.swift`
```swift
import SwiftUI
import UserNotifications

@main
struct JarvisApp: App {
    @StateObject private var authManager = AuthManager()
    @StateObject private var apiClient = JarvisAPIClient()
    @StateObject private var notificationManager = NotificationManager()

    init() {
        // Request notification permissions
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if granted {
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
        }
    }

    var body: some Scene {
        WindowGroup {
            if authManager.isAuthenticated {
                ContentView()
                    .environmentObject(authManager)
                    .environmentObject(apiClient)
                    .environmentObject(notificationManager)
            } else {
                AuthView()
                    .environmentObject(authManager)
            }
        }
    }
}
```

**File:** `Models/ApprovalRequest.swift`
```swift
import Foundation

struct ApprovalRequest: Codable, Identifiable {
    let id: String
    let action: String
    let reason: String
    let requestedBy: String
    let requestedAt: Date
    var status: ApprovalStatus
    let details: [String: String]

    enum ApprovalStatus: String, Codable {
        case pending
        case approved
        case rejected
    }
}
```

**File:** `Services/AuthManager.swift`
```swift
import Foundation
import SwiftUI

class AuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?

    @AppStorage("authToken") private var authToken: String?
    @AppStorage("deviceId") private var deviceId: String?

    init() {
        // Check if already authenticated
        if let token = authToken, let deviceId = deviceId {
            self.isAuthenticated = true
            loadUser()
        }
    }

    func signIn(email: String, password: String) async throws {
        // TODO: Implement actual authentication
        // For now, simple device pairing

        let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString
        self.deviceId = deviceId
        self.authToken = "demo-token-\(deviceId)"

        DispatchQueue.main.async {
            self.isAuthenticated = true
        }
    }

    func signOut() {
        authToken = nil
        deviceId = nil
        currentUser = nil
        isAuthenticated = false
    }

    private func loadUser() {
        // Load user from token
        currentUser = User(id: deviceId ?? "", email: "user@example.com", name: "Demo User")
    }
}

struct User: Codable {
    let id: String
    let email: String
    let name: String
}
```

**File:** `Services/JarvisAPIClient.swift`
```swift
import Foundation
import Network

class JarvisAPIClient: ObservableObject {
    @Published var isConnected = false
    @Published var connectionMode: ConnectionMode = .local
    @Published var localIP: String = "192.168.1.100"

    private let localPort = 9000
    private let cloudURL = "https://jarvis-cloud.example.com"

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "NetworkMonitor")

    enum ConnectionMode {
        case local
        case cloud
    }

    init() {
        startNetworkMonitoring()
    }

    private func startNetworkMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isConnected = path.status == .satisfied
            }
        }
        monitor.start(queue: queue)
    }

    private var baseURL: String {
        switch connectionMode {
        case .local:
            return "http://\(localIP):\(localPort)/api/v1"
        case .cloud:
            return "\(cloudURL)/api/v1"
        }
    }

    func healthCheck() async throws -> Bool {
        let url = URL(string: "\(baseURL)/health")!

        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let response = try JSONDecoder().decode([String: String].self, from: data)
            return response["status"] == "healthy"
        } catch {
            // If local fails, try cloud
            if connectionMode == .local {
                connectionMode = .cloud
                return try await healthCheck()
            }
            throw error
        }
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
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.requestFailed
        }
    }

    func reject(id: String, reason: String) async throws {
        let url = URL(string: "\(baseURL)/approval/reject/\(id)")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["reason": reason]
        request.httpBody = try JSONEncoder().encode(body)

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.requestFailed
        }
    }

    enum APIError: Error {
        case requestFailed
        case invalidResponse
    }
}
```

**File:** `Services/NotificationManager.swift`
```swift
import Foundation
import UserNotifications

class NotificationManager: NSObject, ObservableObject {
    @Published var pushToken: String?

    override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
    }

    func registerDeviceToken(_ token: Data) {
        let tokenString = token.map { String(format: "%02.2hhx", $0) }.joined()
        self.pushToken = tokenString

        // Send token to backend
        Task {
            await sendTokenToBackend(tokenString)
        }
    }

    private func sendTokenToBackend(_ token: String) async {
        // TODO: Send to your backend
        print("📱 Device token: \(token)")
    }
}

extension NotificationManager: UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show notification even when app is in foreground
        completionHandler([.banner, .sound, .badge])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        // Handle notification tap
        let userInfo = response.notification.request.content.userInfo

        if let approvalId = userInfo["approvalId"] as? String {
            // Navigate to approval detail
            NotificationCenter.default.post(
                name: .openApproval,
                object: nil,
                userInfo: ["approvalId": approvalId]
            )
        }

        completionHandler()
    }
}

extension Notification.Name {
    static let openApproval = Notification.Name("openApproval")
}
```

### Step 3: Views

**File:** `Views/ContentView.swift`
```swift
import SwiftUI

struct ContentView: View {
    @EnvironmentObject var apiClient: JarvisAPIClient
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            ApprovalListView()
                .tabItem {
                    Label("Approvals", systemImage: "list.bullet")
                }
                .tag(0)

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape")
                }
                .tag(1)
        }
        .task {
            // Check connection on launch
            _ = try? await apiClient.healthCheck()
        }
    }
}
```

**File:** `Views/ApprovalListView.swift`
```swift
import SwiftUI

struct ApprovalListView: View {
    @EnvironmentObject var apiClient: JarvisAPIClient
    @State private var approvals: [ApprovalRequest] = []
    @State private var isLoading = false
    @State private var error: Error?

    var body: some View {
        NavigationView {
            Group {
                if isLoading {
                    ProgressView("Loading...")
                } else if approvals.isEmpty {
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
                } else {
                    List {
                        ForEach(approvals) { approval in
                            NavigationLink {
                                ApprovalDetailView(approval: approval, onUpdate: {
                                    Task {
                                        await loadApprovals()
                                    }
                                })
                            } label: {
                                ApprovalRow(approval: approval)
                            }
                        }
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("Approvals")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        Task {
                            await loadApprovals()
                        }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
        }
        .task {
            await loadApprovals()
        }
        .refreshable {
            await loadApprovals()
        }
    }

    private func loadApprovals() async {
        isLoading = true
        defer { isLoading = false }

        do {
            approvals = try await apiClient.getPendingApprovals()
        } catch {
            self.error = error
            print("Failed to load approvals: \(error)")
        }
    }
}

struct ApprovalRow: View {
    let approval: ApprovalRequest

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: iconName)
                    .foregroundColor(iconColor)

                Text(approval.action)
                    .font(.headline)
                    .lineLimit(2)
            }

            Text(approval.reason)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .lineLimit(2)

            Text(approval.requestedAt, style: .relative)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }

    var iconName: String {
        if approval.action.lowercased().contains("install") {
            return "arrow.down.circle.fill"
        } else if approval.action.lowercased().contains("delete") {
            return "trash.fill"
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
```

**File:** `Views/ApprovalDetailView.swift`
```swift
import SwiftUI

struct ApprovalDetailView: View {
    let approval: ApprovalRequest
    let onUpdate: () -> Void

    @EnvironmentObject var apiClient: JarvisAPIClient
    @Environment(\.dismiss) var dismiss

    @State private var isProcessing = false
    @State private var showRejectSheet = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Icon and title
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.orange)

                    Text(approval.action)
                        .font(.title2)
                        .fontWeight(.bold)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)

                Divider()

                // Details
                VStack(alignment: .leading, spacing: 16) {
                    DetailRow(title: "Requested By", value: approval.requestedBy)
                    DetailRow(title: "Requested", value: approval.requestedAt.formatted())

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Reason")
                            .font(.headline)

                        Text(approval.reason)
                            .font(.body)
                    }

                    if !approval.details.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Additional Details")
                                .font(.headline)

                            ForEach(Array(approval.details.keys.sorted()), id: \.self) { key in
                                HStack {
                                    Text("\(key):")
                                        .foregroundColor(.secondary)
                                    Spacer()
                                    Text(approval.details[key] ?? "")
                                        .fontWeight(.medium)
                                }
                            }
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                }

                Spacer()

                // Action buttons
                VStack(spacing: 12) {
                    Button {
                        Task {
                            await handleApprove()
                        }
                    } label: {
                        Label("Approve", systemImage: "checkmark.circle.fill")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.green)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                    }
                    .disabled(isProcessing)

                    Button {
                        showRejectSheet = true
                    } label: {
                        Label("Reject", systemImage: "xmark.circle")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.red.opacity(0.1))
                            .foregroundColor(.red)
                            .cornerRadius(12)
                    }
                    .disabled(isProcessing)
                }
            }
            .padding()
        }
        .navigationTitle("Approval Request")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showRejectSheet) {
            RejectSheet(approval: approval) { reason in
                Task {
                    await handleReject(reason: reason)
                }
            }
        }
    }

    private func handleApprove() async {
        isProcessing = true
        defer { isProcessing = false }

        do {
            try await apiClient.approve(id: approval.id)
            onUpdate()
            dismiss()
        } catch {
            print("Failed to approve: \(error)")
        }
    }

    private func handleReject(reason: String) async {
        isProcessing = true
        defer { isProcessing = false }

        do {
            try await apiClient.reject(id: approval.id, reason: reason)
            onUpdate()
            dismiss()
        } catch {
            print("Failed to reject: \(error)")
        }
    }
}

struct DetailRow: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)

            Text(value)
                .font(.body)
                .fontWeight(.medium)
        }
    }
}

struct RejectSheet: View {
    let approval: ApprovalRequest
    let onReject: (String) -> Void

    @Environment(\.dismiss) var dismiss
    @State private var reason = ""

    var body: some View {
        NavigationView {
            Form {
                Section {
                    Text(approval.action)
                        .font(.headline)
                } header: {
                    Text("Action")
                }

                Section {
                    TextEditor(text: $reason)
                        .frame(height: 150)
                } header: {
                    Text("Rejection Reason")
                }

                Section {
                    Button("Confirm Rejection") {
                        onReject(reason.isEmpty ? "No reason provided" : reason)
                        dismiss()
                    }
                    .frame(maxWidth: .infinity)
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

**File:** `Views/SettingsView.swift`
```swift
import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var apiClient: JarvisAPIClient
    @EnvironmentObject var authManager: AuthManager

    @State private var useCloud = false
    @State private var localIP = "192.168.1.100"

    var body: some View {
        NavigationView {
            Form {
                Section {
                    HStack {
                        Circle()
                            .fill(apiClient.isConnected ? .green : .red)
                            .frame(width: 12, height: 12)

                        Text(apiClient.isConnected ? "Connected" : "Disconnected")
                            .foregroundColor(.secondary)
                    }
                } header: {
                    Text("Status")
                }

                Section {
                    Picker("Connection Mode", selection: $useCloud) {
                        Text("Local Network").tag(false)
                        Text("Cloud Sync").tag(true)
                    }
                    .onChange(of: useCloud) { newValue in
                        apiClient.connectionMode = newValue ? .cloud : .local
                    }

                    if !useCloud {
                        TextField("Mac IP Address", text: $localIP)
                            .keyboardType(.numbersAndPunctuation)
                            .onChange(of: localIP) { newValue in
                                apiClient.localIP = newValue
                            }
                    }
                } header: {
                    Text("Connection")
                } footer: {
                    Text(useCloud ? "Connect via cloud for remote access" : "Connect directly to your Mac on the local network")
                }

                Section {
                    Button("Test Connection") {
                        Task {
                            _ = try? await apiClient.healthCheck()
                        }
                    }
                }

                Section {
                    Button("Sign Out") {
                        authManager.signOut()
                    }
                    .foregroundColor(.red)
                }
            }
            .navigationTitle("Settings")
        }
    }
}
```

**File:** `Views/AuthView.swift`
```swift
import SwiftUI

struct AuthView: View {
    @EnvironmentObject var authManager: AuthManager

    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "brain.head.profile")
                .font(.system(size: 80))
                .foregroundColor(.blue)

            Text("Jarvis")
                .font(.largeTitle)
                .fontWeight(.bold)

            Text("Autonomous AI Assistant")
                .font(.subheadline)
                .foregroundColor(.secondary)

            VStack(spacing: 16) {
                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    .autocapitalization(.none)
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(10)

                SecureField("Password", text: $password)
                    .textContentType(.password)
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(10)

                Button {
                    Task {
                        isLoading = true
                        try? await authManager.signIn(email: email, password: password)
                        isLoading = false
                    }
                } label: {
                    if isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .padding()
                    } else {
                        Text("Sign In")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(10)
                    }
                }
                .disabled(isLoading || email.isEmpty || password.isEmpty)
            }
            .padding(.horizontal)

            Spacer()
        }
        .padding()
    }
}
```

### Step 4: Push Notifications Setup

**File:** `AppDelegate.swift` (Add to project)
```swift
import UIKit
import UserNotifications

extension JarvisApp {
    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        notificationManager.registerDeviceToken(deviceToken)
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("Failed to register for remote notifications: \(error)")
    }
}
```

**Push Notification Payload Example:**
```json
{
  "aps": {
    "alert": {
      "title": "Jarvis Approval Required",
      "body": "Install Homebrew package: ffmpeg"
    },
    "sound": "default",
    "badge": 1
  },
  "approvalId": "abc-123-def"
}
```

### Step 5: Testing

**Test Scenarios:**
1. Launch app → Should prompt for auth
2. Sign in → Should show approvals list
3. Request approval from Mac → Should appear in list
4. Tap approval → Should show detail view
5. Approve → Should remove from list
6. Push notification → Should navigate to approval

**Test Commands:**
```bash
# From Mac, request approval
curl -X POST http://localhost:9000/api/v1/approval/request \
  -H "Content-Type: application/json" \
  -d '{
    "action": "Install Homebrew package: wget",
    "reason": "Required for automation script",
    "requestedBy": "Jarvis AI",
    "details": {"package": "wget"}
  }'

# Should appear in iOS app immediately
# If not, pull to refresh
```

---

## DELIVERABLES

At end of this phase:

1. ✅ iOS app built and running
2. ✅ Connects to Mac daemon
3. ✅ Can view pending approvals
4. ✅ Can approve/reject actions
5. ✅ Push notifications configured
6. ✅ Local network discovery works

---

## NEXT STEPS

1. Test with real daemon
2. Set up TestFlight
3. Configure push notifications (APNS)
4. Move to Phase 2 integration testing

---

## DEPLOYMENT

**TestFlight Setup:**
1. Configure App Store Connect
2. Add testers
3. Upload build via Xcode
4. Distribute to testers

**Requirements:**
- iOS 16.0+
- Network access (local or internet)
- Push notification permissions

---

**Ready to build the iOS app!** Start with Xcode project setup.
