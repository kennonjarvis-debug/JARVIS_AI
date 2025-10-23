# DAWG AI Project Exporter

This tool allows JARVIS Control Plane to fetch and export DAWG AI projects from the production instance.

## What This Does

- **Connects** to DAWG AI production Supabase database
- **Authenticates** with your DAWG AI account
- **Fetches** project data (tracks, clips, effects, automation, etc.)
- **Exports** to local directory as JSON
- **Strips** functional logic (optional) to create UI-only placeholder versions

## Setup

### 1. Install Dependencies

```bash
cd /Users/benkennon/JARVIS_AI/dev
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your DAWG AI credentials:

```bash
cp .env.example .env
# Edit .env with your actual credentials
```

You need:
- `DAWG_SUPABASE_URL` - Your DAWG AI Supabase project URL
- `DAWG_SUPABASE_ANON_KEY` - Your DAWG AI Supabase anon key
- `DAWG_USER_EMAIL` - Your DAWG AI account email
- `DAWG_USER_PASSWORD` - Your DAWG AI account password

**Where to find these:**
1. Log into your DAWG AI Supabase dashboard
2. Go to Settings → API
3. Copy the Project URL and anon/public key

### 3. Test Connection

```bash
# List all your projects
npm run export list
```

## Usage

### Export a Specific Project

**By Project Name:**
```bash
npm run export export "demo-project-2" /Users/benkennon/JARVIS_AI/dev/demo-project-2
```

**By Project ID (UUID):**
```bash
npm run export export "abc-123-def-456" /Users/benkennon/JARVIS_AI/dev/demo-project-2
```

**Export as UI-Only Placeholder:**
```bash
npm run export export "demo-project-2" /Users/benkennon/JARVIS_AI/dev/demo-project-2 --ui-only
```

This will:
- Remove all audio buffers, samples, and file references
- Remove automation curves and effect chains
- Keep track layout, names, and basic structure
- Perfect for creating mockups or templates

### Export Shared Project (No Auth Required)

If the project has a share link, you can export using the share token:

```bash
npm run export export-shared <share-token> /Users/benkennon/JARVIS_AI/dev/demo-project-2
```

## JARVIS Integration

### Via Control Plane

The Control Plane can call this exporter programmatically:

```typescript
// In JARVIS Control Plane
import { DAWGProjectExporter } from '../dev/dawg-project-exporter';

const exporter = new DAWGProjectExporter();
await exporter.authenticate(email, password);

// Fetch by name
const project = await exporter.fetchProjectByName('demo-project-2');

// Export with UI-only mode
await exporter.exportProject(
  project,
  '/Users/benkennon/JARVIS_AI/dev/demo-project-2',
  { stripFunctional: true }
);
```

### Via CLI/Shell Commands

JARVIS can also invoke the exporter via shell:

```bash
cd /Users/benkennon/JARVIS_AI/dev && npm run export export "demo-project-2" demo-project-2 --ui-only
```

## Output Format

### Full Export (Default)

```json
{
  "id": "project-uuid",
  "user_id": "user-uuid",
  "name": "Demo Project 2",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-20T14:30:00Z",
  "is_public": false,
  "data": {
    "tracks": [
      {
        "id": "track-1",
        "name": "Vocals",
        "type": "audio",
        "volume": 0.8,
        "pan": 0,
        "clips": [...],
        "effects": [...]
      }
    ],
    "tempo": 128,
    "timeSignature": [4, 4],
    "effects": [...],
    "automation": [...]
  }
}
```

### UI-Only Export (--ui-only flag)

```json
{
  "id": "project-uuid",
  "name": "Demo Project 2 (UI Only)",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-20T14:30:00Z",
  "data": {
    "tracks": [
      {
        "id": "track-placeholder",
        "name": "Vocals",
        "type": "audio",
        "volume": 0.8,
        "pan": 0,
        "muted": false,
        "solo": false,
        "clips": [],
        "effects": []
      }
    ],
    "tempo": 120,
    "timeSignature": [4, 4],
    "effects": [],
    "automation": [],
    "clips": []
  }
}
```

## Troubleshooting

### "Supabase credentials not found"

Make sure you've created `.env` file with proper credentials:
```bash
cat .env
```

Should show:
```
DAWG_SUPABASE_URL=https://...
DAWG_SUPABASE_ANON_KEY=eyJ...
DAWG_USER_EMAIL=...
DAWG_USER_PASSWORD=...
```

### "Authentication failed"

- Verify email and password are correct
- Try logging into DAWG AI web interface to confirm credentials
- Check if account requires 2FA (not currently supported)

### "Project not found"

- List all projects first: `npm run export list`
- Use exact project name or UUID from the list
- Check if project is actually yours (authentication required for private projects)

### "No projects returned"

- Verify Supabase URL is correct
- Check that you're using the PRODUCTION Supabase instance
- Confirm authentication was successful

## Security Notes

- **Never commit `.env` file** to version control
- Store credentials securely
- Use environment variables when possible
- For JARVIS automation, store credentials in JARVIS Control Plane's secure storage

## Next Steps

Once a project is exported:

1. **Review the exported JSON** at `/Users/benkennon/JARVIS_AI/dev/demo-project-2/`
2. **Use it in JARVIS workflows** for analysis, modification, or reproduction
3. **Create UI mockups** from the UI-only version
4. **Re-import to DAWG AI** (if needed) via the API

## API Reference

See `dawg-project-exporter.ts` for full TypeScript API documentation.

### Key Methods:

- `authenticate(email, password)` - Authenticate with DAWG AI
- `listProjects()` - Get all projects for authenticated user
- `fetchProject(id)` - Get project by UUID
- `fetchProjectByName(name)` - Search for project by name
- `fetchSharedProject(token)` - Get public shared project
- `exportProject(project, dir, options)` - Export to local directory
