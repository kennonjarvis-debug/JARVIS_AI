import Foundation
import CloudKit
import Combine

class CloudSyncService: ObservableObject {
    @Published var isSyncing = false
    @Published var lastSyncDate: Date?

    private let container: CKContainer
    private let privateDatabase: CKDatabase

    // CloudKit record types
    private let conversationRecordType = "Conversation"
    private let messageRecordType = "Message"

    init() {
        // Use default container or custom container
        container = CKContainer.default()
        privateDatabase = container.privateCloudDatabase

        // Check iCloud status
        checkCloudKitStatus()
    }

    private func checkCloudKitStatus() {
        container.accountStatus { status, error in
            if let error = error {
                print("❌ CloudKit error: \(error)")
                return
            }

            switch status {
            case .available:
                print("✅ iCloud available")
            case .noAccount:
                print("⚠️ No iCloud account")
            case .restricted:
                print("⚠️ iCloud restricted")
            case .couldNotDetermine:
                print("⚠️ Could not determine iCloud status")
            case .temporarilyUnavailable:
                print("⚠️ iCloud temporarily unavailable")
            @unknown default:
                print("⚠️ Unknown iCloud status")
            }
        }
    }

    // MARK: - Sync Conversations
    func syncConversations(_ conversations: [Conversation]) async throws {
        guard !isSyncing else { return }

        await MainActor.run {
            isSyncing = true
        }

        defer {
            Task { @MainActor in
                self.isSyncing = false
                self.lastSyncDate = Date()
            }
        }

        print("🔄 Syncing \(conversations.count) conversations to iCloud...")

        for conversation in conversations {
            try await uploadConversation(conversation)
        }

        print("✅ Sync complete")
    }

    private func uploadConversation(_ conversation: Conversation) async throws {
        let record = CKRecord(recordType: conversationRecordType)
        record["id"] = conversation.id as CKRecordValue
        record["title"] = conversation.title as CKRecordValue
        record["createdAt"] = conversation.createdAt as CKRecordValue
        record["updatedAt"] = conversation.updatedAt as CKRecordValue

        _ = try await privateDatabase.save(record)

        // Upload messages
        for message in conversation.messages {
            try await uploadMessage(message, conversationId: conversation.id)
        }
    }

    private func uploadMessage(_ message: Message, conversationId: String) async throws {
        let record = CKRecord(recordType: messageRecordType)
        record["id"] = message.id as CKRecordValue
        record["conversationId"] = conversationId as CKRecordValue
        record["role"] = message.role as CKRecordValue
        record["content"] = message.content as CKRecordValue
        record["timestamp"] = message.timestamp as CKRecordValue

        _ = try await privateDatabase.save(record)
    }

    // MARK: - Fetch Conversations
    func fetchConversations() async throws -> [Conversation] {
        print("📥 Fetching conversations from iCloud...")

        let query = CKQuery(recordType: conversationRecordType, predicate: NSPredicate(value: true))
        query.sortDescriptors = [NSSortDescriptor(key: "updatedAt", ascending: false)]

        let results = try await privateDatabase.records(matching: query)

        var conversations: [Conversation] = []

        for (_, result) in results.matchResults {
            switch result {
            case .success(let record):
                if let conversation = try? await parseConversation(record) {
                    conversations.append(conversation)
                }
            case .failure(let error):
                print("❌ Failed to fetch conversation: \(error)")
            }
        }

        print("✅ Fetched \(conversations.count) conversations")
        return conversations
    }

    private func parseConversation(_ record: CKRecord) async throws -> Conversation {
        guard let id = record["id"] as? String,
              let title = record["title"] as? String,
              let createdAt = record["createdAt"] as? Date,
              let updatedAt = record["updatedAt"] as? Date else {
            throw CloudSyncError.invalidRecord
        }

        // Fetch messages for this conversation
        let messages = try await fetchMessages(conversationId: id)

        return Conversation(
            id: id,
            title: title,
            messages: messages,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }

    private func fetchMessages(conversationId: String) async throws -> [Message] {
        let predicate = NSPredicate(format: "conversationId == %@", conversationId)
        let query = CKQuery(recordType: messageRecordType, predicate: predicate)
        query.sortDescriptors = [NSSortDescriptor(key: "timestamp", ascending: true)]

        let results = try await privateDatabase.records(matching: query)

        var messages: [Message] = []

        for (_, result) in results.matchResults {
            switch result {
            case .success(let record):
                if let message = parseMessage(record) {
                    messages.append(message)
                }
            case .failure(let error):
                print("❌ Failed to fetch message: \(error)")
            }
        }

        return messages
    }

    private func parseMessage(_ record: CKRecord) -> Message? {
        guard let id = record["id"] as? String,
              let role = record["role"] as? String,
              let content = record["content"] as? String,
              let timestamp = record["timestamp"] as? Date else {
            return nil
        }

        return Message(
            id: id,
            role: role,
            content: content,
            timestamp: timestamp
        )
    }

    // MARK: - Delete Conversation
    func deleteConversation(_ conversationId: String) async throws {
        // Find and delete conversation record
        let predicate = NSPredicate(format: "id == %@", conversationId)
        let query = CKQuery(recordType: conversationRecordType, predicate: predicate)

        let results = try await privateDatabase.records(matching: query)

        for (recordId, _) in results.matchResults {
            try await privateDatabase.deleteRecord(withID: recordId)
        }

        // Delete associated messages
        let messageQuery = CKQuery(
            recordType: messageRecordType,
            predicate: NSPredicate(format: "conversationId == %@", conversationId)
        )

        let messageResults = try await privateDatabase.records(matching: messageQuery)

        for (recordId, _) in messageResults.matchResults {
            try await privateDatabase.deleteRecord(withID: recordId)
        }

        print("✅ Deleted conversation and messages from iCloud")
    }
}

// MARK: - Errors
enum CloudSyncError: LocalizedError {
    case invalidRecord
    case notAvailable

    var errorDescription: String? {
        switch self {
        case .invalidRecord:
            return "Invalid CloudKit record"
        case .notAvailable:
            return "iCloud is not available"
        }
    }
}
