# Jarvis Quick Actions

Quick Actions allow you to interact with Jarvis directly from Finder.

## Installation

1. Open Automator app
2. Create a new "Quick Action"
3. Configure the workflow:
   - Workflow receives: **files or folders**
   - in: **Finder**
4. Add actions as described below
5. Save with name: **Send to Jarvis**
6. The Quick Action will appear in Finder's right-click menu

## Quick Actions to Create

### 1. Send to Jarvis Observatory

**Purpose:** Send files to Jarvis Observatory for analysis

**Workflow:**
```
1. Get Specified Finder Items
2. Run Shell Script:
   - Shell: /bin/bash
   - Pass input: as arguments

for f in "$@"
do
    curl -X POST http://localhost:3000/api/observatory/upload \
         -F "file=@$f" \
         -H "Authorization: Bearer YOUR_API_KEY"
done
```

### 2. Analyze with Jarvis Vision

**Purpose:** Analyze images with Jarvis Vision AI

**Workflow:**
```
1. Get Specified Finder Items (images only)
2. Run Shell Script:

for f in "$@"
do
    curl -X POST http://localhost:3000/api/vision/analyze \
         -F "image=@$f" \
         -H "Authorization: Bearer YOUR_API_KEY" | \
         osascript -e 'display notification "$(cat)" with title "Jarvis Vision"'
done
```

### 3. Transcribe Audio with Jarvis

**Purpose:** Transcribe audio/video files

**Workflow:**
```
1. Get Specified Finder Items (audio/video only)
2. Run Shell Script:

for f in "$@"
do
    curl -X POST http://localhost:3000/api/transcribe \
         -F "audio=@$f" \
         -H "Authorization: Bearer YOUR_API_KEY" > ~/Desktop/transcript.txt
done

osascript -e 'display notification "Transcription saved to Desktop" with title "Jarvis Transcribe"'
```

### 4. Process Text with Jarvis

**Purpose:** Send selected text to Jarvis for processing

**Workflow:**
```
1. Get Specified Text (from: any application)
2. Run Shell Script:

INPUT="$1"

RESPONSE=$(curl -s -X POST http://localhost:3000/api/ai/process \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -d "{\"text\": \"$INPUT\"}")

osascript -e "display notification \"$RESPONSE\" with title \"Jarvis AI\""
```

### 5. Create Jarvis Task

**Purpose:** Create a task in Jarvis from selected files

**Workflow:**
```
1. Get Specified Finder Items
2. Run Shell Script:

FILES=""
for f in "$@"
do
    FILES="$FILES $(basename "$f")"
done

osascript -e "display dialog \"Task description:\" default answer \"Review $FILES\""
DESCRIPTION=$(osascript -e 'text returned of result')

curl -X POST http://localhost:3000/api/tasks \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -d "{\"title\": \"$DESCRIPTION\", \"files\": [\"$@\"]}"

osascript -e 'display notification "Task created" with title "Jarvis"'
```

## Testing Quick Actions

1. Right-click on a file in Finder
2. Select **Quick Actions** → **Send to Jarvis**
3. Check Jarvis Observatory for the uploaded file

## Troubleshooting

- **Quick Action not showing:** Restart Finder or System Settings
- **Permission denied:** Ensure Jarvis is running and API key is correct
- **Nothing happens:** Check Console.app for errors
- **Workflow fails:** Verify the curl command works in Terminal first

## Advanced Configuration

### Add Keyboard Shortcuts

1. Open **System Settings** → **Keyboard** → **Keyboard Shortcuts**
2. Select **Services** in the sidebar
3. Find your Quick Action under **Files and Folders**
4. Assign a keyboard shortcut (e.g., ⌘⇧J)

### Customize Icons

Quick Actions use the Automator app icon by default. To customize:

1. Get an icon file (`.icns` or `.png`)
2. In Automator, select **File** → **Get Info**
3. Drag your icon to the icon area in the info window

## Integration with Jarvis

All Quick Actions communicate with Jarvis via its REST API. Ensure:

1. Jarvis is running (`jarvis start`)
2. API is accessible on `http://localhost:3000`
3. You have a valid API key (set in `.env` as `JARVIS_API_KEY`)

## Security Note

Quick Actions run with your user permissions. They can:
- Access files you select
- Make network requests
- Execute shell commands

Only install Quick Actions from trusted sources.
