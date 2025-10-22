#!/bin/bash

###############################################################################
# Jarvis Slack Notification Script
# Purpose: Send deployment notifications to Slack
# Usage: ./slack-notify.sh <status> <environment> [additional-info]
###############################################################################

set -euo pipefail

# Configuration
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
STATUS="${1:-unknown}"
ENVIRONMENT="${2:-staging}"
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if webhook URL is set
if [ -z "$SLACK_WEBHOOK_URL" ]; then
    log_error "SLACK_WEBHOOK_URL environment variable is not set"
    exit 1
fi

# Determine status emoji and color
case "$STATUS" in
    success)
        STATUS_EMOJI="✅"
        STATUS_COLOR="#36a64f"
        STATUS_TEXT="SUCCESS"
        ;;
    failure)
        STATUS_EMOJI="❌"
        STATUS_COLOR="#ff0000"
        STATUS_TEXT="FAILED"
        ;;
    warning)
        STATUS_EMOJI="⚠️"
        STATUS_COLOR="#ffaa00"
        STATUS_TEXT="WARNING"
        ;;
    started)
        STATUS_EMOJI="🚀"
        STATUS_COLOR="#0066cc"
        STATUS_TEXT="STARTED"
        ;;
    *)
        STATUS_EMOJI="ℹ️"
        STATUS_COLOR="#808080"
        STATUS_TEXT="INFO"
        ;;
esac

# Send deployment notification
send_deployment_notification() {
    local COMMIT_SHA="${COMMIT_SHA:-unknown}"
    local COMMIT_MESSAGE="${COMMIT_MESSAGE:-No message}"
    local AUTHOR="${AUTHOR:-system}"
    local VITALITY="${VITALITY:-N/A}"
    local DEPLOY_URL="${DEPLOY_URL:-}"

    log_info "Sending deployment notification to Slack..."

    PAYLOAD=$(cat <<EOF
{
    "text": "$STATUS_EMOJI Jarvis V2 Deployment $STATUS_TEXT",
    "blocks": [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": "$STATUS_EMOJI Jarvis V2 Deployment Report"
            }
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": "*Status:*\n$STATUS_TEXT"
                },
                {
                    "type": "mrkdwn",
                    "text": "*Environment:*\n$ENVIRONMENT"
                },
                {
                    "type": "mrkdwn",
                    "text": "*Commit:*\n\`$COMMIT_SHA\`"
                },
                {
                    "type": "mrkdwn",
                    "text": "*Author:*\n$AUTHOR"
                },
                {
                    "type": "mrkdwn",
                    "text": "*Vitality:*\n$VITALITY"
                },
                {
                    "type": "mrkdwn",
                    "text": "*Timestamp:*\n$TIMESTAMP"
                }
            ]
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*Commit Message:*\n> $COMMIT_MESSAGE"
            }
        }
    ]
}
EOF
)

    if [ -n "$DEPLOY_URL" ]; then
        PAYLOAD=$(echo "$PAYLOAD" | jq --arg url "$DEPLOY_URL" '.blocks += [{
            "type": "actions",
            "elements": [{
                "type": "button",
                "text": {"type": "plain_text", "text": "View Deployment"},
                "url": $url
            }]
        }]')
    fi

    RESPONSE=$(curl -s -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "$PAYLOAD")

    if [ "$RESPONSE" = "ok" ]; then
        log_info "✅ Slack notification sent successfully"
    else
        log_error "❌ Slack notification failed: $RESPONSE"
        exit 1
    fi
}

# Send backup notification
send_backup_notification() {
    local BACKUP_SIZE="${BACKUP_SIZE:-N/A}"
    local FILE_COUNT="${FILE_COUNT:-N/A}"
    local ENCRYPTED="${ENCRYPTED:-N/A}"

    log_info "Sending backup notification to Slack..."

    PAYLOAD=$(cat <<EOF
{
    "text": "$STATUS_EMOJI Jarvis S3 Backup $STATUS_TEXT",
    "blocks": [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": "☁️  Jarvis S3 Backup Report"
            }
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": "*Status:*\n$STATUS_TEXT"
                },
                {
                    "type": "mrkdwn",
                    "text": "*Timestamp:*\n$TIMESTAMP"
                },
                {
                    "type": "mrkdwn",
                    "text": "*Backup Size:*\n$BACKUP_SIZE"
                },
                {
                    "type": "mrkdwn",
                    "text": "*Files:*\n$FILE_COUNT"
                },
                {
                    "type": "mrkdwn",
                    "text": "*Encrypted:*\n$ENCRYPTED"
                }
            ]
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*Backed Up:*\n• Memory folder 💾\n• Adaptive data 🧠\n• Logs (7 days) 📋\n• Config files ⚙️"
            }
        }
    ]
}
EOF
)

    RESPONSE=$(curl -s -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "$PAYLOAD")

    if [ "$RESPONSE" = "ok" ]; then
        log_info "✅ Slack notification sent successfully"
    else
        log_error "❌ Slack notification failed: $RESPONSE"
        exit 1
    fi
}

# Send health alert
send_health_alert() {
    local VITALITY="${VITALITY:-0}"
    local THRESHOLD="${THRESHOLD:-60}"

    log_info "Sending health alert to Slack..."

    PAYLOAD=$(cat <<EOF
{
    "text": "🚨 ALERT: Jarvis Health Check Failed",
    "blocks": [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": "🚨 Jarvis Health Alert"
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*⚠️ Deployment Blocked*\n\nJarvis vitality is below the threshold. Deployment has been halted.\n\n*Current Vitality:* $VITALITY\n*Required Threshold:* $THRESHOLD\n*Timestamp:* $TIMESTAMP"
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*Recommended Actions:*\n• Investigate system health\n• Check error logs\n• Review recent changes\n• Verify service dependencies"
            }
        }
    ]
}
EOF
)

    RESPONSE=$(curl -s -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "$PAYLOAD")

    if [ "$RESPONSE" = "ok" ]; then
        log_info "✅ Health alert sent successfully"
    else
        log_error "❌ Health alert failed: $RESPONSE"
        exit 1
    fi
}

# Main execution
NOTIFICATION_TYPE="${NOTIFICATION_TYPE:-deployment}"

case "$NOTIFICATION_TYPE" in
    deployment)
        send_deployment_notification
        ;;
    backup)
        send_backup_notification
        ;;
    health)
        send_health_alert
        ;;
    *)
        log_error "Unknown notification type: $NOTIFICATION_TYPE"
        exit 1
        ;;
esac
