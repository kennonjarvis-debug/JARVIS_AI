# macOS App Build Instructions for Jarvis Desktop

Complete guide for building, signing, and distributing the Jarvis Desktop app on macOS.

---

## Prerequisites

- macOS 10.15 (Catalina) or later
- Xcode Command Line Tools installed
- Node.js v18+ and npm v9+
- Apple Developer Account (for distribution)
- Valid Developer ID Application certificate (for signing)

---

## Step 1: Install Dependencies

```bash
cd /Users/benkennon/Jarvis
npm install
```

### Key Dependencies
- `electron`: ^27.0.0
- `electron-builder`: ^24.6.4
- `electron-notarize`: ^1.2.2 (for notarization)

---

## Step 2: Configure TypeScript and Build Scripts

Ensure `tsconfig.json` is configured for Electron:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

---

## Step 3: Configure electron-builder

Update `package.json` with build configuration:

```json
{
  "build": {
    "appId": "com.jarvis.desktop",
    "productName": "Jarvis Desktop",
    "copyright": "Copyright © 2025 Jarvis",
    "mac": {
      "category": "public.app-category.productivity",
      "target": ["dmg", "zip"],
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist",
      "icon": "build/icon.icns",
      "type": "distribution",
      "extendInfo": "build/Info.plist"
    },
    "dmg": {
      "contents": [
        {
          "x": 130,
          "y": 220
        },
        {
          "x": 410,
          "y": 220,
          "type": "link",
          "path": "/Applications"
        }
      ]
    },
    "files": [
      "dist/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "directories": {
      "buildResources": "build",
      "output": "release"
    }
  }
}
```

---

## Step 4: Create Build Directory Structure

```bash
mkdir -p build
```

Required files in `build/`:
- `Info.plist` - App metadata and permissions
- `entitlements.mac.plist` - Hardened runtime entitlements
- `icon.icns` - App icon (1024x1024 PNG → ICNS)

---

## Step 5: Create App Icon

```bash
# Convert PNG to ICNS (requires iconutil)
mkdir icon.iconset
sips -z 16 16     icon-1024.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon-1024.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon-1024.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon-1024.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon-1024.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon-1024.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon-1024.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon-1024.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon-1024.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon-1024.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset -o build/icon.icns
rm -rf icon.iconset
```

---

## Step 6: Configure Permissions and Signing ⭐ **YOU ARE HERE**

### 6.1: Create Info.plist with Required Permissions

Create `build/Info.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- App Identification -->
    <key>CFBundleIdentifier</key>
    <string>com.jarvis.desktop</string>
    <key>CFBundleName</key>
    <string>Jarvis Desktop</string>
    <key>CFBundleDisplayName</key>
    <string>Jarvis</string>
    <key>CFBundleExecutable</key>
    <string>Jarvis Desktop</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>

    <!-- Privacy Permissions -->
    <key>NSMicrophoneUsageDescription</key>
    <string>Jarvis needs microphone access to process voice commands and enable AI-powered voice interactions for task automation.</string>

    <key>NSScreenCaptureUsageDescription</key>
    <string>Jarvis requires screen recording permission to capture screenshots for AI analysis, monitor system activity, and provide intelligent visual feedback.</string>

    <key>NSCameraUsageDescription</key>
    <string>Jarvis needs camera access for video-based AI features, visual recognition tasks, and video conferencing automation.</string>

    <key>NSSystemAdministrationUsageDescription</key>
    <string>Jarvis requires system administration privileges to automate workflows, manage background tasks, and optimize system performance.</string>

    <key>NSAppleEventsUsageDescription</key>
    <string>Jarvis needs to control other applications to automate tasks, integrate workflows, and coordinate system-wide operations.</string>

    <key>NSContactsUsageDescription</key>
    <string>Jarvis requires contacts access to personalize interactions and automate communication tasks.</string>

    <key>NSCalendarsUsageDescription</key>
    <string>Jarvis needs calendar access to schedule tasks, manage appointments, and coordinate automated workflows.</string>

    <!-- High Sierra+ Compatibility -->
    <key>LSMinimumSystemVersion</key>
    <string>10.15.0</string>

    <!-- Background Modes -->
    <key>LSUIElement</key>
    <false/>

    <!-- Allow background execution -->
    <key>LSBackgroundOnly</key>
    <false/>

    <!-- Network Client -->
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <false/>
        <key>NSExceptionDomains</key>
        <dict>
            <key>ngrok-free.dev</key>
            <dict>
                <key>NSExceptionAllowsInsecureHTTPLoads</key>
                <true/>
                <key>NSIncludesSubdomains</key>
                <true/>
            </dict>
        </dict>
    </dict>
</dict>
</plist>
```

### 6.2: Create Hardened Runtime Entitlements

Create `build/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Hardened Runtime Entitlements -->

    <!-- Audio Input (Microphone) -->
    <key>com.apple.security.device.audio-input</key>
    <true/>

    <!-- Camera -->
    <key>com.apple.security.device.camera</key>
    <true/>

    <!-- Screen Recording -->
    <key>com.apple.security.device.screen-capture</key>
    <true/>

    <!-- Network -->
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>

    <!-- File Access -->
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>

    <!-- Apple Events (Automation) -->
    <key>com.apple.security.automation.apple-events</key>
    <true/>

    <!-- JIT (for Node.js) -->
    <key>com.apple.security.cs.allow-jit</key>
    <true/>

    <!-- Unsigned Executable Memory (for Node.js native modules) -->
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>

    <!-- Disable Library Validation (for npm packages) -->
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>

    <!-- Allow DYLD Environment Variables -->
    <key>com.apple.security.cs.allow-dyld-environment-variables</key>
    <true/>
</dict>
</plist>
```

### 6.3: Check Code Signing Configuration

```bash
# Check if you have a Developer ID certificate
security find-identity -v -p codesigning

# Expected output:
# 1) XXXXX "Developer ID Application: Your Name (TEAM_ID)"
```

**If you see a certificate:** You can sign and distribute the app.

**If no certificate found:** You can skip signing for local testing:

```json
// In package.json build config, add:
{
  "build": {
    "mac": {
      "identity": null  // Skip signing
    }
  }
}
```

---

## Step 7: Build the App

### Development Build (No Signing)

```bash
npm run build              # Compile TypeScript
npm run electron:build     # Build Electron app
```

### Production Build (With Signing)

**Option A: With Apple Developer Certificate**

```bash
# Set environment variables
export APPLE_ID="your@email.com"
export APPLE_ID_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="YOUR_TEAM_ID"

# Build and sign
npm run electron:build
```

**Option B: Without Certificate (Local Testing Only)**

```bash
# Build without signing
CSC_IDENTITY_AUTO_DISCOVERY=false npm run electron:build
```

---

## Step 8: Notarization (Distribution Only)

For distribution outside the App Store, you must notarize the app.

### Install electron-notarize

```bash
npm install --save-dev electron-notarize
```

### Create afterSign Hook

Create `build/notarize.js`:

```javascript
const { notarize } = require('electron-notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    appBundleId: 'com.jarvis.desktop',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID
  });
};
```

Update `package.json`:

```json
{
  "build": {
    "afterSign": "build/notarize.js"
  }
}
```

---

## Step 9: Test the Built App

```bash
# Test the .app file
open release/mac/Jarvis\ Desktop.app

# Test the DMG
open release/Jarvis-Desktop-1.0.0.dmg
```

### Verify Permissions

1. Launch the app
2. Trigger microphone access → Should show permission dialog
3. Trigger screen recording → Should prompt for permission in System Preferences
4. Check System Preferences → Security & Privacy → verify Jarvis has permissions

---

## Step 10: Distribution

### Upload to GitHub Releases

```bash
gh release create v1.0.0 \
  release/Jarvis-Desktop-1.0.0.dmg \
  --title "Jarvis Desktop v1.0.0" \
  --notes "Initial release"
```

### Auto-Update Configuration

Add to `package.json`:

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-username",
      "repo": "jarvis-desktop"
    }
  }
}
```

---

## Troubleshooting

### "App is damaged and can't be opened"

**Cause:** App is not signed or notarized.

**Solution:**
```bash
# For testing only
xattr -cr /path/to/Jarvis\ Desktop.app
```

### "Cannot verify developer"

**Cause:** App is signed but not notarized.

**Solution:** Complete Step 8 (Notarization).

### Permission dialogs not appearing

**Cause:** Info.plist keys missing or incorrect.

**Solution:** Verify Info.plist contains all `NSUsageDescription` keys.

### Signing fails with "no identity found"

**Cause:** No Developer ID certificate installed.

**Solution:**
1. Enroll in Apple Developer Program
2. Download certificate from developer.apple.com
3. Install in Keychain Access

---

## Testing Checklist

- [ ] App launches without errors
- [ ] Microphone permission dialog appears when needed
- [ ] Screen recording permission prompts user to System Preferences
- [ ] Camera access works (if using camera features)
- [ ] System tray icon appears
- [ ] App can be installed from DMG
- [ ] App survives macOS restarts
- [ ] All IPC communication works
- [ ] Background jobs execute on schedule
- [ ] Network requests succeed

---

## Quick Commands Reference

```bash
# Development
npm run dev                                    # Run in dev mode

# Build without signing (local testing)
CSC_IDENTITY_AUTO_DISCOVERY=false npm run electron:build

# Build with signing (distribution)
npm run electron:build

# Check signing
codesign -dvv release/mac/Jarvis\ Desktop.app/Contents/MacOS/Jarvis\ Desktop

# Verify notarization
spctl -a -vv release/mac/Jarvis\ Desktop.app

# Remove quarantine (testing only)
xattr -cr release/mac/Jarvis\ Desktop.app
```

---

## Additional Resources

- [Electron Builder macOS Signing](https://www.electron.build/code-signing)
- [Apple Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Hardened Runtime Entitlements](https://developer.apple.com/documentation/security/hardened_runtime)
- [macOS App Sandbox](https://developer.apple.com/documentation/security/app_sandbox)

---

**Status:** Ready for Step 6 execution ✅
