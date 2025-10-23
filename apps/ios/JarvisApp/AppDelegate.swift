import UIKit
import AVFoundation

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil
    ) -> Bool {
        // Configure audio session for background recording
        configureAudioSession()

        // Request microphone permission
        requestMicrophonePermission()

        return true
    }

    private func configureAudioSession() {
        do {
            let audioSession = AVAudioSession.sharedInstance()

            // Enable background audio
            try audioSession.setCategory(
                .playAndRecord,
                mode: .voiceChat,
                options: [.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP]
            )

            // Enable background modes
            try audioSession.setActive(true)

            print("✅ Audio session configured for background recording")
        } catch {
            print("❌ Failed to configure audio session: \(error)")
        }
    }

    private func requestMicrophonePermission() {
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
            if granted {
                print("✅ Microphone permission granted")
            } else {
                print("❌ Microphone permission denied")
            }
        }
    }

    // Handle app entering background
    func applicationDidEnterBackground(_ application: UIApplication) {
        // Keep audio session active for wake word detection
        print("📱 App entered background - wake word detection active")
    }

    // Handle app entering foreground
    func applicationWillEnterForeground(_ application: UIApplication) {
        print("📱 App entering foreground")
    }
}
