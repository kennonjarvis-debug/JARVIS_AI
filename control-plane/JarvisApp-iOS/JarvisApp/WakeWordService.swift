import AVFoundation
import NaturalLanguage
import Combine

class WakeWordService: NSObject, ObservableObject {
    @Published var isListening = false
    @Published var detectedWord: String?

    private var audioEngine = AVAudioEngine()
    private var inputNode: AVAudioInputNode!
    private var audioBuffer: [Float] = []

    var onWakeWordDetected: (() -> Void)?

    // Wake word detection
    private let wakeWord = AppConfig.wakeWord.lowercased()
    private var speechRecognizer: SpeechRecognizer?

    override init() {
        super.init()
        setupAudioEngine()
        speechRecognizer = SpeechRecognizer(wakeWord: wakeWord)
    }

    private func setupAudioEngine() {
        inputNode = audioEngine.inputNode

        let recordingFormat = inputNode.outputFormat(forBus: 0)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            self?.processAudioBuffer(buffer)
        }

        print("✅ Audio engine configured for wake word detection")
    }

    func start() {
        guard !isListening else { return }

        do {
            try audioEngine.start()
            isListening = true
            print("👂 Wake word detection started (listening for '\(wakeWord)')")
        } catch {
            print("❌ Failed to start audio engine: \(error)")
        }
    }

    func stop() {
        guard isListening else { return }

        audioEngine.stop()
        isListening = false
        print("🛑 Wake word detection stopped")
    }

    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer) {
        let channelData = buffer.floatChannelData?[0]
        let frameLength = Int(buffer.frameLength)

        guard let data = channelData else { return }

        // Collect samples
        for i in 0..<frameLength {
            audioBuffer.append(data[i])
        }

        // Keep buffer at manageable size (3 seconds at 16kHz)
        let maxBufferSize = Int(AppConfig.sampleRate * 3)
        if audioBuffer.count > maxBufferSize {
            audioBuffer.removeFirst(audioBuffer.count - maxBufferSize)
        }

        // Check for wake word every 0.5 seconds worth of data
        let checkInterval = Int(AppConfig.sampleRate * 0.5)
        if audioBuffer.count >= checkInterval {
            checkForWakeWord()
        }
    }

    private func checkForWakeWord() {
        // Use speech recognizer to check for wake word
        speechRecognizer?.processAudioSamples(audioBuffer) { [weak self] detected in
            if detected {
                self?.handleWakeWordDetected()
            }
        }
    }

    private func handleWakeWordDetected() {
        print("🎯 Wake word detected: '\(wakeWord)'")

        DispatchQueue.main.async {
            self.detectedWord = self.wakeWord
            self.onWakeWordDetected?()

            // Clear buffer after detection
            self.audioBuffer.removeAll()

            // Reset detection flag after timeout
            DispatchQueue.main.asyncAfter(deadline: .now() + AppConfig.wakeWordTimeout) {
                self.detectedWord = nil
            }
        }
    }
}

// MARK: - Speech Recognizer
private class SpeechRecognizer {
    private let wakeWord: String
    private let threshold: Float

    init(wakeWord: String, threshold: Float = AppConfig.wakeWordThreshold) {
        self.wakeWord = wakeWord
        self.threshold = threshold
    }

    func processAudioSamples(_ samples: [Float], completion: @escaping (Bool) -> Void) {
        // TODO: Implement actual wake word detection algorithm
        // Options:
        // 1. Use Core ML model trained on wake word
        // 2. Use Speech framework for continuous recognition
        // 3. Use third-party library (e.g., Porcupine, Snowboy)

        // For now, implement a simple energy-based detection
        let rms = calculateRMS(samples)

        // Check if audio has sufficient energy
        if rms > 0.1 {
            // Simulate wake word detection (replace with actual implementation)
            let detected = simulateWakeWordDetection()
            completion(detected)
        } else {
            completion(false)
        }
    }

    private func calculateRMS(_ samples: [Float]) -> Float {
        let squares = samples.map { $0 * $0 }
        let sum = squares.reduce(0, +)
        let mean = sum / Float(samples.count)
        return sqrt(mean)
    }

    private func simulateWakeWordDetection() -> Bool {
        // TODO: Replace with actual wake word detection
        // This is a placeholder that randomly detects (for testing)
        return Float.random(in: 0...1) < 0.01 // 1% chance per check
    }
}

// MARK: - Wake Word Models
// TODO: Add Core ML models for wake word detection
// Recommended approaches:
// 1. Train custom Core ML model:
//    - Collect "hey jarvis" samples
//    - Train CreateML audio classifier
//    - Export as .mlmodel
//
// 2. Use Porcupine SDK:
//    - Free tier: 1 wake word
//    - iOS framework available
//    - Low latency, offline
//
// 3. Use Apple Speech framework:
//    - Real-time recognition
//    - Requires internet
//    - Higher battery usage
