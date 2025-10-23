import Foundation

class TranscriptionService {
    private let apiKey: String
    private let baseURL = "https://api.openai.com/v1/audio/transcriptions"

    init() {
        // Get API key from environment or app settings
        self.apiKey = AppConfig.openAIAPIKey
    }

    func transcribe(_ audioData: Data) async throws -> String {
        guard !apiKey.isEmpty else {
            throw TranscriptionError.missingAPIKey
        }

        // Create multipart form data
        let boundary = UUID().uuidString
        var body = Data()

        // Add audio file
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"audio.wav\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: audio/wav\r\n\r\n".data(using: .utf8)!)
        body.append(audioData)
        body.append("\r\n".data(using: .utf8)!)

        // Add model parameter
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"model\"\r\n\r\n".data(using: .utf8)!)
        body.append("whisper-1\r\n".data(using: .utf8)!)

        // Close boundary
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        // Create request
        guard let url = URL(string: baseURL) else {
            throw TranscriptionError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = body

        // Send request
        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw TranscriptionError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            print("❌ Transcription API error: \(errorMessage)")
            throw TranscriptionError.apiError(statusCode: httpResponse.statusCode, message: errorMessage)
        }

        // Parse response
        let transcriptionResponse = try JSONDecoder().decode(TranscriptionResponse.self, from: data)

        print("✅ Transcription: \(transcriptionResponse.text)")
        return transcriptionResponse.text
    }
}

// MARK: - Errors
enum TranscriptionError: LocalizedError {
    case missingAPIKey
    case invalidURL
    case invalidResponse
    case apiError(statusCode: Int, message: String)

    var errorDescription: String? {
        switch self {
        case .missingAPIKey:
            return "OpenAI API key is missing. Please add it to your environment or app settings."
        case .invalidURL:
            return "Invalid API URL"
        case .invalidResponse:
            return "Invalid response from transcription service"
        case .apiError(let statusCode, let message):
            return "API error (\(statusCode)): \(message)"
        }
    }
}
