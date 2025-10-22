# Privacy Policy for JARVIS Bridge API

**Last Updated:** October 22, 2025

## Overview

This Custom GPT connects to the JARVIS Bridge API, a secure bridge service that allows ChatGPT to interact with authorized local and cloud systems.

## What This GPT Does

The JARVIS Bridge GPT can:
- Execute whitelisted commands on connected systems
- Read files from authorized directories
- Write files to permitted locations
- Check system health and status

## Data Collection & Usage

### Information We Access
- File contents from paths you explicitly request to read
- Command outputs from commands you explicitly request to run
- File writes to paths you explicitly specify

### How Data is Used
- Data is only accessed when you make specific requests
- No data is stored permanently by the Bridge API
- All interactions are logged in standard ChatGPT conversation history
- File operations are restricted to pre-configured allowed paths

## Data Storage

- **Bridge API:** Does not store conversation data or file contents beyond standard application logs
- **ChatGPT:** Follows OpenAI's standard data retention policies for conversations
- **Local Files:** Any files created or modified are stored on your configured system only

## Security Measures

- All API communication uses HTTPS encryption
- Bearer token authentication required for all file/command operations
- Whitelisted commands only - unauthorized commands are blocked
- Path restrictions prevent access outside configured directories
- Health check endpoint does not require authentication

## Allowed Operations

### Commands (Whitelist)
Only pre-approved commands can be executed:
- Git operations (status, diff, log)
- File operations (ls, cat, grep, find)
- System information (whoami, date, uname, which)
- Development tools (node --version, npm --version, pnpm --version)

### File Access (Path Restrictions)
Files can only be read/written in authorized paths:
- `/tmp/*` and `/var/tmp/*`
- `/app/repos/*` (cloud deployment)
- User home directory (local deployment)

## Third-Party Services

- **Hosting:** Railway (cloud deployment)
- **AI Provider:** OpenAI ChatGPT
- No other third-party services have access to your data

## User Control

You control:
- Which files to read or write
- Which commands to execute
- When to use the Bridge API functions
- What content to share in conversations

## Data Sharing

- No data is shared with third parties beyond OpenAI's ChatGPT service
- No analytics or tracking beyond standard application logs
- No advertising or marketing use of your data

## Your Rights

- Access: View any conversation history in ChatGPT
- Deletion: Clear ChatGPT conversation history at any time
- Control: All Bridge API operations require your explicit authorization

## Changes to This Policy

This privacy policy may be updated periodically. The "Last Updated" date at the top indicates the most recent revision.

## Contact

For questions or concerns about this privacy policy or the JARVIS Bridge API:
- GitHub: https://github.com/kennonjarvis-debug/JARVIS_AI
- Issues: https://github.com/kennonjarvis-debug/JARVIS_AI/issues

## Disclaimer

This GPT is provided as-is for personal and authorized use only. The owner is not responsible for:
- Unauthorized access or misuse
- Data loss or system damage from improper use
- Actions taken on systems you don't own or have permission to access

**By using this GPT, you acknowledge that you have proper authorization to access and modify the systems and files you interact with.**
