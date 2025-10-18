#!/bin/bash
set -euo pipefail

# Deployment Notification Script
# Usage: ./notify-deployment.sh <environment> <status> [message]
# Example: ./notify-deployment.sh production success "v2.0.0 deployed"

ENVIRONMENT="${1:-staging}"
STATUS="${2:-unknown}"
MESSAGE="${3:-Deployment status: $STATUS}"
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
COMMIT_SHA="${COMMIT_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')}"
DEPLOYER="${DEPLOYER:-${USER:-unknown}}"
VERSION="${VERSION:-$(git describe --tags --always 2>/dev/null || echo 'unknown')}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Determine status icon and color
get_status_emoji() {
    case "$STATUS" in
        success|completed|passed)
            echo "✅"
            ;;
        failure|failed|error)
            echo "❌"
            ;;
        warning|unstable)
            echo "⚠️"
            ;;
        running|in_progress)
            echo "🔄"
            ;;
        rollback)
            echo "⏪"
            ;;
        *)
            echo "ℹ️"
            ;;
    esac
}

# Get deployment URL
get_deployment_url() {
    case "$ENVIRONMENT" in
        production)
            echo "https://jarvis-ai.app"
            ;;
        staging)
            echo "https://staging.jarvis-ai.app"
            ;;
        *)
            echo "http://localhost:3000"
            ;;
    esac
}

# Send Slack notification
send_slack_notification() {
    if [ -z "${SLACK_WEBHOOK_URL:-}" ]; then
        log_info "SLACK_WEBHOOK_URL not set - skipping Slack notification"
        return 0
    fi

    log_info "Sending Slack notification..."

    EMOJI=$(get_status_emoji)
    DEPLOYMENT_URL=$(get_deployment_url)

    local PAYLOAD=$(cat <<EOF
{
  "username": "Jarvis CI/CD Bot",
  "icon_emoji": ":rocket:",
  "attachments": [{
    "color": $([ "$STATUS" = "success" ] && echo '"good"' || [ "$STATUS" = "failure" ] && echo '"danger"' || echo '"warning"'),
    "title": "$EMOJI Deployment Notification",
    "fields": [
      {
        "title": "Environment",
        "value": "$ENVIRONMENT",
        "short": true
      },
      {
        "title": "Status",
        "value": "$STATUS",
        "short": true
      },
      {
        "title": "Version",
        "value": "$VERSION",
        "short": true
      },
      {
        "title": "Commit",
        "value": "$COMMIT_SHA",
        "short": true
      },
      {
        "title": "Deployed By",
        "value": "$DEPLOYER",
        "short": true
      },
      {
        "title": "Timestamp",
        "value": "$TIMESTAMP",
        "short": true
      },
      {
        "title": "Message",
        "value": "$MESSAGE",
        "short": false
      },
      {
        "title": "URL",
        "value": "$DEPLOYMENT_URL",
        "short": false
      }
    ],
    "footer": "Jarvis CI/CD Pipeline",
    "footer_icon": "https://jarvis-ai.app/favicon.ico",
    "ts": $(date +%s)
  }]
}
EOF
)

    if curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "$PAYLOAD" \
        --silent --show-error --fail > /dev/null; then
        log_info "Slack notification sent successfully"
    else
        echo "Failed to send Slack notification"
    fi
}

# Send email notification
send_email_notification() {
    if [ -z "${EMAIL_TO:-}" ]; then
        log_info "EMAIL_TO not set - skipping email notification"
        return 0
    fi

    log_info "Sending email notification..."

    EMOJI=$(get_status_emoji)
    DEPLOYMENT_URL=$(get_deployment_url)

    local EMAIL_BODY=$(cat <<EOF
Subject: $EMOJI Deployment: $ENVIRONMENT - $STATUS

Jarvis AI Platform Deployment Notification
==========================================

Environment: $ENVIRONMENT
Status: $STATUS
Version: $VERSION
Commit: $COMMIT_SHA
Deployed By: $DEPLOYER
Timestamp: $TIMESTAMP

Message:
$MESSAGE

Deployment URL: $DEPLOYMENT_URL

---
This is an automated message from Jarvis CI/CD Pipeline
EOF
)

    if command -v sendmail &> /dev/null; then
        echo "$EMAIL_BODY" | sendmail "$EMAIL_TO"
        log_info "Email notification sent to $EMAIL_TO"
    else
        log_info "sendmail not available - skipping email"
    fi
}

# Send GitHub deployment status
send_github_status() {
    if [ -z "${GITHUB_TOKEN:-}" ]; then
        log_info "GITHUB_TOKEN not set - skipping GitHub status update"
        return 0
    fi

    log_info "Updating GitHub deployment status..."

    local GH_STATE
    case "$STATUS" in
        success|completed)
            GH_STATE="success"
            ;;
        failure|failed)
            GH_STATE="failure"
            ;;
        *)
            GH_STATE="pending"
            ;;
    esac

    DEPLOYMENT_URL=$(get_deployment_url)

    if [ -n "${GITHUB_REPOSITORY:-}" ] && [ -n "$COMMIT_SHA" ]; then
        curl -X POST \
            "https://api.github.com/repos/${GITHUB_REPOSITORY}/deployments" \
            -H "Authorization: token $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            -d "{
                \"ref\": \"$COMMIT_SHA\",
                \"environment\": \"$ENVIRONMENT\",
                \"description\": \"$MESSAGE\",
                \"auto_merge\": false,
                \"required_contexts\": []
            }" \
            --silent > /tmp/deployment.json || true

        DEPLOYMENT_ID=$(jq -r '.id // empty' /tmp/deployment.json 2>/dev/null || echo "")

        if [ -n "$DEPLOYMENT_ID" ]; then
            curl -X POST \
                "https://api.github.com/repos/${GITHUB_REPOSITORY}/deployments/${DEPLOYMENT_ID}/statuses" \
                -H "Authorization: token $GITHUB_TOKEN" \
                -H "Accept: application/vnd.github.v3+json" \
                -d "{
                    \"state\": \"$GH_STATE\",
                    \"description\": \"$MESSAGE\",
                    \"environment_url\": \"$DEPLOYMENT_URL\"
                }" \
                --silent > /dev/null || true

            log_info "GitHub deployment status updated"
        fi
    fi
}

# Send PagerDuty alert (for failures)
send_pagerduty_alert() {
    if [ "$STATUS" != "failure" ] && [ "$STATUS" != "failed" ]; then
        return 0
    fi

    if [ -z "${PAGERDUTY_INTEGRATION_KEY:-}" ]; then
        log_info "PAGERDUTY_INTEGRATION_KEY not set - skipping PagerDuty alert"
        return 0
    fi

    log_info "Sending PagerDuty alert..."

    curl -X POST "https://events.pagerduty.com/v2/enqueue" \
        -H 'Content-Type: application/json' \
        -d "{
            \"routing_key\": \"$PAGERDUTY_INTEGRATION_KEY\",
            \"event_action\": \"trigger\",
            \"payload\": {
                \"summary\": \"Deployment Failed: $ENVIRONMENT\",
                \"severity\": \"error\",
                \"source\": \"Jarvis CI/CD\",
                \"custom_details\": {
                    \"environment\": \"$ENVIRONMENT\",
                    \"version\": \"$VERSION\",
                    \"commit\": \"$COMMIT_SHA\",
                    \"deployer\": \"$DEPLOYER\",
                    \"message\": \"$MESSAGE\"
                }
            }
        }" \
        --silent > /dev/null || true

    log_info "PagerDuty alert sent"
}

# Save deployment record
save_deployment_record() {
    local RECORDS_DIR="${HOME}/.jarvis/deployments"
    mkdir -p "$RECORDS_DIR"

    local RECORD_FILE="${RECORDS_DIR}/${ENVIRONMENT}-deployments.json"

    local RECORD=$(cat <<EOF
{
  "timestamp": "$TIMESTAMP",
  "environment": "$ENVIRONMENT",
  "status": "$STATUS",
  "version": "$VERSION",
  "commit": "$COMMIT_SHA",
  "deployer": "$DEPLOYER",
  "message": "$MESSAGE"
}
EOF
)

    # Append to deployment records
    if [ -f "$RECORD_FILE" ]; then
        local TEMP_FILE=$(mktemp)
        jq ". += [$RECORD]" "$RECORD_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$RECORD_FILE"
    else
        echo "[$RECORD]" > "$RECORD_FILE"
    fi

    log_info "Deployment record saved to $RECORD_FILE"
}

# Generate deployment metrics
generate_metrics() {
    if [ -z "${METRICS_ENDPOINT:-}" ]; then
        return 0
    fi

    log_info "Sending deployment metrics..."

    local METRIC_VALUE
    [ "$STATUS" = "success" ] && METRIC_VALUE=1 || METRIC_VALUE=0

    curl -X POST "$METRICS_ENDPOINT" \
        -H 'Content-Type: application/json' \
        -d "{
            \"metric\": \"deployment.status\",
            \"value\": $METRIC_VALUE,
            \"tags\": {
                \"environment\": \"$ENVIRONMENT\",
                \"version\": \"$VERSION\",
                \"status\": \"$STATUS\"
            },
            \"timestamp\": $(date +%s)
        }" \
        --silent > /dev/null || true
}

# Main notification flow
main() {
    log_info "========================================="
    log_info "Deployment Notification"
    log_info "Environment: $ENVIRONMENT"
    log_info "Status: $STATUS"
    log_info "========================================="

    # Send notifications in parallel
    send_slack_notification &
    send_email_notification &
    send_github_status &
    send_pagerduty_alert &
    save_deployment_record &
    generate_metrics &

    # Wait for all background jobs
    wait

    log_info "All notifications sent successfully"
}

# Run main function
main
