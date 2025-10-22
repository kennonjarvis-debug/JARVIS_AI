import AVFoundation
import Combine

class AudioService: NSObject, ObservableObject {
    @Published var isRecording = false
    @Published var audioLevel: Float = 0.0

    private var audioEngine = AVAudioEngine()
    private var audioRecorder: AVAudioRecorder?
    private var recordingData = Data()
    private var recordingURL: URL?
    private var completion: ((Data) -> Void)?

    // Audio buffer for real-time processing
    private var audioBuffer: [Float] = []

    override init() {
        super.init()
        setupAudioSession()
    }

    private func setupAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
            try session.setActive(true)
            print("✅ Audio session initialized")
        } catch {
            print("❌ Audio session setup failed: \(error)")
        }
    }

    func startRecording() {
        guard !isRecording else { return }

        // Create temporary file URL
        let tempDir = FileManager.default.temporaryDirectory
        recordingURL = tempDir.appendingPathComponent(UUID().uuidString + ".wav")

        guard let url = recordingURL else { return }

        // Audio settings
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatLinearPCM),
            AVSampleRateKey: AppConfig.sampleRate,
            AVNumberOfChannelsKey: AppConfig.audioChannels,
            AVLinearPCMBitDepthKey: AppConfig.audioBitDepth,
            AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsFloatKey: false
        ]

        do {
            audioRecorder = try AVAudioRecorder(url: url, settings: settings)
            audioRecorder?.delegate = self
            audioRecorder?.isMeteringEnabled = true
            audioRecorder?.record()

            isRecording = true
            print("🎙️ Recording started")

            // Start metering updates
            startMeteringTimer()

        } catch {
            print("❌ Failed to start recording: \(error)")
        }
    }

    func stopRecording(completion: @escaping (Data) -> Void) {
        guard isRecording else { return }

        self.completion = completion
        audioRecorder?.stop()
        isRecording = false

        print("🛑 Recording stopped")
    }

    private func startMeteringTimer() {
        Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] timer in
            guard let self = self, self.isRecording else {
                timer.invalidate()
                return
            }

            self.audioRecorder?.updateMeters()
            let level = self.audioRecorder?.averagePower(forChannel: 0) ?? -160.0
            self.audioLevel = self.normalizeAudioLevel(level)
        }
    }

    private func normalizeAudioLevel(_ level: Float) -> Float {
        // Convert dB to 0.0-1.0 scale
        let minDb: Float = -80.0
        let maxDb: Float = 0.0

        if level < minDb {
            return 0.0
        } else if level > maxDb {
            return 1.0
        }

        return (level - minDb) / (maxDb - minDb)
    }

    // MARK: - Playback
    func playAudio(data: Data) {
        let tempDir = FileManager.default.temporaryDirectory
        let playbackURL = tempDir.appendingPathComponent(UUID().uuidString + ".wav")

        do {
            try data.write(to: playbackURL)

            let audioPlayer = try AVAudioPlayer(contentsOf: playbackURL)
            audioPlayer.play()

            print("🔊 Playing audio")
        } catch {
            print("❌ Failed to play audio: \(error)")
        }
    }
}

// MARK: - AVAudioRecorderDelegate
extension AudioService: AVAudioRecorderDelegate {
    func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        guard flag, let url = recordingURL else {
            print("❌ Recording failed")
            return
        }

        do {
            let data = try Data(contentsOf: url)
            completion?(data)

            // Clean up
            try? FileManager.default.removeItem(at: url)
            recordingURL = nil
            completion = nil

        } catch {
            print("❌ Failed to read recording: \(error)")
        }
    }

    func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
        print("❌ Recording encode error: \(error?.localizedDescription ?? "unknown")")
        isRecording = false
    }
}

// MARK: - Audio Processing
extension AudioService {
    /// Process audio buffer for wake word detection
    func processAudioBuffer(_ buffer: AVAudioPCMBuffer) -> [Float] {
        let channelData = buffer.floatChannelData?[0]
        let frameLength = Int(buffer.frameLength)

        var samples: [Float] = []
        if let data = channelData {
            for i in 0..<frameLength {
                samples.append(data[i])
            }
        }

        return samples
    }

    /// Calculate RMS (Root Mean Square) for volume detection
    func calculateRMS(_ samples: [Float]) -> Float {
        let squares = samples.map { $0 * $0 }
        let sum = squares.reduce(0, +)
        let mean = sum / Float(samples.count)
        return sqrt(mean)
    }

    /// Detect silence in audio samples
    func detectSilence(_ samples: [Float], threshold: Float = 0.01) -> Bool {
        let rms = calculateRMS(samples)
        return rms < threshold
    }
}
