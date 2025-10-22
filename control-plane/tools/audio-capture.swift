#!/usr/bin/swift

import AVFoundation
import Foundation

// Simple Swift audio capture tool using AVFoundation
// Captures audio from default microphone and outputs RMS level

class AudioCapture: NSObject {
    var audioEngine: AVAudioEngine?
    var inputNode: AVAudioInputNode?
    var isRunning = false
    var sampleCount = 0
    var shouldStop = false

    func start() {
        audioEngine = AVAudioEngine()
        guard let engine = audioEngine else { return }

        inputNode = engine.inputNode
        guard let input = inputNode else { return }

        let bus = 0
        let format = input.inputFormat(forBus: bus)

        print("AUDIO_CAPTURE_STARTED", to: &standardError)
        print("SAMPLE_RATE:\(format.sampleRate)", to: &standardError)
        print("CHANNELS:\(format.channelCount)", to: &standardError)

        // Install tap to capture audio
        input.installTap(onBus: bus, bufferSize: 4096, format: format) { buffer, time in
            self.processBuffer(buffer)
        }

        do {
            try engine.start()
            isRunning = true
            print("ENGINE_STARTED", to: &standardError)
        } catch {
            print("ERROR:\(error.localizedDescription)", to: &standardError)
            return
        }

        // Run for specified duration
        let duration = CommandLine.arguments.count > 1 ? Double(CommandLine.arguments[1]) ?? 5.0 : 5.0
        let endTime = Date().addingTimeInterval(duration)

        while Date() < endTime && !shouldStop {
            RunLoop.current.run(until: Date().addingTimeInterval(0.1))
        }

        stop()
    }

    func processBuffer(_ buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.floatChannelData else { return }

        let frameLength = Int(buffer.frameLength)
        let channelCount = Int(buffer.format.channelCount)

        // Calculate RMS for first channel
        var sum: Float = 0.0
        let channel = channelData[0]

        for frame in 0..<frameLength {
            let sample = channel[frame]
            sum += sample * sample
        }

        let rms = sqrt(sum / Float(frameLength))

        // Output RMS level (stdout for easy parsing)
        print(String(format: "%.6f", rms))
        fflush(stdout)

        sampleCount += 1
    }

    func stop() {
        guard let engine = audioEngine else { return }

        inputNode?.removeTap(onBus: 0)
        engine.stop()
        isRunning = false

        print("AUDIO_CAPTURE_STOPPED", to: &standardError)
        print("TOTAL_SAMPLES:\(sampleCount)", to: &standardError)
    }
}

// Helper to print to stderr
var standardError = FileHandle.standardError

extension FileHandle: TextOutputStream {
    public func write(_ string: String) {
        guard let data = string.data(using: .utf8) else { return }
        self.write(data)
    }
}

// Main execution
let capture = AudioCapture()
capture.start()
