#!/bin/bash

###############################################################################
# Jarvis Health Check Script
# Purpose: Check Jarvis vitality before deployment
# Usage: ./health-check.sh [--threshold 60] [--retries 3]
###############################################################################

set -euo pipefail

# Default configuration
JARVIS_API_URL="${JARVIS_API_URL:-http://localhost:3001}"
VITALITY_THRESHOLD="${VITALITY_THRESHOLD:-60}"
MAX_RETRIES="${MAX_RETRIES:-3}"
RETRY_DELAY="${RETRY_DELAY:-5}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --threshold)
            VITALITY_THRESHOLD="$2"
            shift 2
            ;;
        --retries)
            MAX_RETRIES="$2"
            shift 2
            ;;
        --url)
            JARVIS_API_URL="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Check if Jarvis API is accessible
check_api_connectivity() {
    log_info "Checking Jarvis API connectivity..."

    RETRY=0
    while [ $RETRY -lt $MAX_RETRIES ]; do
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${JARVIS_API_URL}/health" || echo "000")

        if [ "$HTTP_CODE" = "200" ]; then
            log_info "✅ Jarvis API is accessible (HTTP $HTTP_CODE)"
            return 0
        fi

        RETRY=$((RETRY + 1))
        log_warn "⏳ API not accessible (HTTP $HTTP_CODE). Retry $RETRY/$MAX_RETRIES..."

        if [ $RETRY -lt $MAX_RETRIES ]; then
            sleep $RETRY_DELAY
        fi
    done

    log_error "❌ Jarvis API is not accessible after $MAX_RETRIES attempts"
    return 1
}

# Get Jarvis status
get_jarvis_status() {
    log_info "Fetching Jarvis status..."

    STATUS_RESPONSE=$(curl -s "${JARVIS_API_URL}/api/v1/jarvis/status" || echo "{}")

    if [ "$STATUS_RESPONSE" = "{}" ] || [ -z "$STATUS_RESPONSE" ]; then
        log_error "❌ Failed to fetch Jarvis status"
        return 1
    fi

    echo "$STATUS_RESPONSE"
}

# Check vitality
check_vitality() {
    STATUS_JSON=$1

    VITALITY=$(echo "$STATUS_JSON" | jq -r '.vitality // 0')

    log_info "Current vitality: $VITALITY"

    if [ -z "$VITALITY" ] || [ "$VITALITY" = "null" ]; then
        log_error "❌ Vitality value is missing or invalid"
        return 1
    fi

    if [ "$VITALITY" -ge "$VITALITY_THRESHOLD" ]; then
        log_info "✅ Vitality check passed ($VITALITY >= $VITALITY_THRESHOLD)"
        return 0
    else
        log_error "❌ Vitality check failed ($VITALITY < $VITALITY_THRESHOLD)"
        return 1
    fi
}

# Check system health metrics
check_health_metrics() {
    STATUS_JSON=$1

    log_info "Checking system health metrics..."

    # Check CPU usage
    CPU_USAGE=$(echo "$STATUS_JSON" | jq -r '.metrics.cpu_usage // 0')
    log_debug "CPU Usage: ${CPU_USAGE}%"

    if [ "$(echo "$CPU_USAGE > 90" | bc -l 2>/dev/null || echo 0)" -eq 1 ]; then
        log_warn "⚠️  High CPU usage: ${CPU_USAGE}%"
    fi

    # Check memory usage
    MEMORY_USAGE=$(echo "$STATUS_JSON" | jq -r '.metrics.memory_usage // 0')
    log_debug "Memory Usage: ${MEMORY_USAGE}%"

    if [ "$(echo "$MEMORY_USAGE > 85" | bc -l 2>/dev/null || echo 0)" -eq 1 ]; then
        log_warn "⚠️  High memory usage: ${MEMORY_USAGE}%"
    fi

    # Check API response time
    API_RESPONSE_TIME=$(echo "$STATUS_JSON" | jq -r '.metrics.api_response_time // 0')
    log_debug "API Response Time: ${API_RESPONSE_TIME}ms"

    if [ "$(echo "$API_RESPONSE_TIME > 1000" | bc -l 2>/dev/null || echo 0)" -eq 1 ]; then
        log_warn "⚠️  Slow API response time: ${API_RESPONSE_TIME}ms"
    fi

    # Check error rate
    ERROR_RATE=$(echo "$STATUS_JSON" | jq -r '.metrics.error_rate // 0')
    log_debug "Error Rate: ${ERROR_RATE}%"

    if [ "$(echo "$ERROR_RATE > 5" | bc -l 2>/dev/null || echo 0)" -eq 1 ]; then
        log_warn "⚠️  High error rate: ${ERROR_RATE}%"
    fi
}

# Check service dependencies
check_dependencies() {
    STATUS_JSON=$1

    log_info "Checking service dependencies..."

    # Check Redis
    REDIS_STATUS=$(echo "$STATUS_JSON" | jq -r '.dependencies.redis // "unknown"')
    log_debug "Redis: $REDIS_STATUS"

    if [ "$REDIS_STATUS" != "healthy" ] && [ "$REDIS_STATUS" != "connected" ]; then
        log_warn "⚠️  Redis is not healthy: $REDIS_STATUS"
    fi

    # Check Database
    DB_STATUS=$(echo "$STATUS_JSON" | jq -r '.dependencies.database // "unknown"')
    log_debug "Database: $DB_STATUS"

    if [ "$DB_STATUS" != "healthy" ] && [ "$DB_STATUS" != "connected" ]; then
        log_warn "⚠️  Database is not healthy: $DB_STATUS"
    fi

    # Check S3
    S3_STATUS=$(echo "$STATUS_JSON" | jq -r '.dependencies.s3 // "unknown"')
    log_debug "S3: $S3_STATUS"

    if [ "$S3_STATUS" != "healthy" ] && [ "$S3_STATUS" != "connected" ]; then
        log_warn "⚠️  S3 is not healthy: $S3_STATUS"
    fi
}

# Generate health report
generate_report() {
    STATUS_JSON=$1
    DEPLOY_ALLOWED=$2

    VITALITY=$(echo "$STATUS_JSON" | jq -r '.vitality // 0')
    TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

    cat << EOF

╔═══════════════════════════════════════════════╗
║        Jarvis Health Check Report            ║
╚═══════════════════════════════════════════════╝

  Timestamp:        $TIMESTAMP
  API URL:          $JARVIS_API_URL
  Vitality:         $VITALITY
  Threshold:        $VITALITY_THRESHOLD
  Deploy Allowed:   $DEPLOY_ALLOWED

  Metrics:
    • CPU Usage:          $(echo "$STATUS_JSON" | jq -r '.metrics.cpu_usage // "N/A"')%
    • Memory Usage:       $(echo "$STATUS_JSON" | jq -r '.metrics.memory_usage // "N/A"')%
    • API Response Time:  $(echo "$STATUS_JSON" | jq -r '.metrics.api_response_time // "N/A"')ms
    • Error Rate:         $(echo "$STATUS_JSON" | jq -r '.metrics.error_rate // "N/A"')%

  Dependencies:
    • Redis:              $(echo "$STATUS_JSON" | jq -r '.dependencies.redis // "unknown"')
    • Database:           $(echo "$STATUS_JSON" | jq -r '.dependencies.database // "unknown"')
    • S3:                 $(echo "$STATUS_JSON" | jq -r '.dependencies.s3 // "unknown"')

EOF

    if [ "$DEPLOY_ALLOWED" = "YES" ]; then
        echo -e "${GREEN}  ✅ DEPLOYMENT ALLOWED${NC}\n"
    else
        echo -e "${RED}  ❌ DEPLOYMENT BLOCKED${NC}\n"
    fi
}

# Export metrics to JSON
export_metrics() {
    STATUS_JSON=$1
    DEPLOY_ALLOWED=$2
    VITALITY=$(echo "$STATUS_JSON" | jq -r '.vitality // 0')
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    cat > /tmp/health-check-result.json << EOF
{
    "timestamp": "$TIMESTAMP",
    "vitality": $VITALITY,
    "threshold": $VITALITY_THRESHOLD,
    "deploy_allowed": $([ "$DEPLOY_ALLOWED" = "YES" ] && echo "true" || echo "false"),
    "api_url": "$JARVIS_API_URL",
    "status": $(echo "$STATUS_JSON" | jq -c '.')
}
EOF

    log_info "Health check results exported to /tmp/health-check-result.json"
}

# Main execution
main() {
    log_info "Starting Jarvis health check..."
    log_info "Vitality threshold: $VITALITY_THRESHOLD"

    # Check API connectivity
    if ! check_api_connectivity; then
        log_error "Cannot proceed with health check - API is not accessible"
        export_metrics "{}" "NO"
        exit 1
    fi

    # Get status
    STATUS_JSON=$(get_jarvis_status)

    if [ -z "$STATUS_JSON" ] || [ "$STATUS_JSON" = "{}" ]; then
        log_error "Failed to retrieve Jarvis status"
        export_metrics "{}" "NO"
        exit 1
    fi

    # Check vitality
    DEPLOY_ALLOWED="YES"
    if ! check_vitality "$STATUS_JSON"; then
        DEPLOY_ALLOWED="NO"
    fi

    # Check health metrics
    check_health_metrics "$STATUS_JSON"

    # Check dependencies
    check_dependencies "$STATUS_JSON"

    # Generate report
    generate_report "$STATUS_JSON" "$DEPLOY_ALLOWED"

    # Export metrics
    export_metrics "$STATUS_JSON" "$DEPLOY_ALLOWED"

    # Exit based on deploy allowed status
    if [ "$DEPLOY_ALLOWED" = "YES" ]; then
        log_info "Health check completed successfully ✅"
        exit 0
    else
        log_error "Health check failed - deployment should be blocked ❌"
        exit 1
    fi
}

# Run main
main "$@"
