#!/bin/bash

# ==========================================
# Jarvis AI - Let's Encrypt Certificate Renewal
# Automated SSL/TLS certificate management
# ==========================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAINS="${DOMAINS:-jarvis.ai,www.jarvis.ai,api.jarvis.ai}"
EMAIL="${LETSENCRYPT_EMAIL:-admin@jarvis.ai}"
STAGING="${STAGING:-0}"
WEBROOT_PATH="/var/www/certbot"
CERT_PATH="/etc/letsencrypt"
LOG_FILE="/var/log/certbot/renewal.log"

# Notification settings
ENABLE_EMAIL_NOTIFICATIONS="${ENABLE_EMAIL_NOTIFICATIONS:-false}"
NOTIFICATION_EMAIL="${NOTIFICATION_EMAIL:-$EMAIL}"
DAYS_BEFORE_EXPIRY_ALERT="${DAYS_BEFORE_EXPIRY_ALERT:-14}"

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Send notification (email or webhook)
send_notification() {
    local subject="$1"
    local message="$2"
    local level="${3:-info}" # info, warning, error

    log "Notification: $subject"

    # Email notification
    if [ "$ENABLE_EMAIL_NOTIFICATIONS" = "true" ]; then
        if command -v mail &> /dev/null; then
            echo "$message" | mail -s "[Jarvis AI] $subject" "$NOTIFICATION_EMAIL"
            log "Email notification sent to $NOTIFICATION_EMAIL"
        else
            warning "Mail command not available, skipping email notification"
        fi
    fi

    # Slack webhook notification
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local color="good"
        [ "$level" = "warning" ] && color="warning"
        [ "$level" = "error" ] && color="danger"

        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"$subject\",
                    \"text\": \"$message\",
                    \"footer\": \"Jarvis AI - Certbot\",
                    \"ts\": $(date +%s)
                }]
            }" &> /dev/null || warning "Failed to send Slack notification"
    fi
}

# Check if certificate is close to expiry
check_certificate_expiry() {
    local domain="$1"
    local cert_file="$CERT_PATH/live/$domain/cert.pem"

    if [ ! -f "$cert_file" ]; then
        warning "Certificate file not found: $cert_file"
        return 1
    fi

    # Get expiry date
    local expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
    local expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry_date" +%s)
    local current_epoch=$(date +%s)
    local days_until_expiry=$(( ($expiry_epoch - $current_epoch) / 86400 ))

    log "Certificate for $domain expires in $days_until_expiry days"

    if [ $days_until_expiry -le $DAYS_BEFORE_EXPIRY_ALERT ]; then
        warning "Certificate for $domain is expiring soon ($days_until_expiry days)"
        send_notification \
            "SSL Certificate Expiring Soon - $domain" \
            "The SSL certificate for $domain will expire in $days_until_expiry days. Renewal will be attempted." \
            "warning"
        return 0
    fi

    return 1
}

# Initial certificate request
request_certificate() {
    log "Requesting new certificate for domains: $DOMAINS"

    # Build certbot command
    local certbot_args=(
        "certonly"
        "--webroot"
        "--webroot-path=$WEBROOT_PATH"
        "--email" "$EMAIL"
        "--agree-tos"
        "--no-eff-email"
        "--force-renewal"
    )

    # Add staging flag if enabled
    if [ "$STAGING" = "1" ]; then
        certbot_args+=("--staging")
        warning "Using Let's Encrypt staging server (test mode)"
    fi

    # Add domains
    IFS=',' read -ra DOMAIN_ARRAY <<< "$DOMAINS"
    for domain in "${DOMAIN_ARRAY[@]}"; do
        certbot_args+=("-d" "$domain")
    done

    # Request certificate
    if certbot "${certbot_args[@]}" 2>&1 | tee -a "$LOG_FILE"; then
        log "Certificate successfully obtained for: $DOMAINS"
        send_notification \
            "SSL Certificate Obtained" \
            "Successfully obtained SSL certificate for domains: $DOMAINS" \
            "info"

        # Reload nginx
        reload_nginx
        return 0
    else
        error "Failed to obtain certificate for: $DOMAINS"
        send_notification \
            "SSL Certificate Request Failed" \
            "Failed to obtain SSL certificate for domains: $DOMAINS. Please check the logs." \
            "error"
        return 1
    fi
}

# Renew certificate
renew_certificate() {
    log "Attempting to renew certificates"

    if certbot renew --webroot --webroot-path="$WEBROOT_PATH" 2>&1 | tee -a "$LOG_FILE"; then
        log "Certificate renewal successful"
        send_notification \
            "SSL Certificate Renewed" \
            "SSL certificates have been successfully renewed." \
            "info"

        # Reload nginx to pick up new certificates
        reload_nginx
        return 0
    else
        error "Certificate renewal failed"
        send_notification \
            "SSL Certificate Renewal Failed" \
            "Failed to renew SSL certificates. Please check the logs and take manual action if needed." \
            "error"
        return 1
    fi
}

# Reload nginx configuration
reload_nginx() {
    log "Reloading nginx configuration"

    # Check if running in Docker
    if [ -f "/.dockerenv" ]; then
        # Signal nginx container to reload
        docker exec jarvis-nginx nginx -s reload 2>&1 | tee -a "$LOG_FILE" || \
            error "Failed to reload nginx in Docker"
    else
        # Reload nginx directly
        if command -v nginx &> /dev/null; then
            nginx -s reload 2>&1 | tee -a "$LOG_FILE" || \
                error "Failed to reload nginx"
        else
            warning "nginx command not found, skipping reload"
        fi
    fi
}

# Generate DH parameters if they don't exist
generate_dhparam() {
    local dhparam_file="/etc/nginx/ssl/dhparam.pem"

    if [ ! -f "$dhparam_file" ]; then
        log "Generating DH parameters (this may take a while)..."
        mkdir -p "$(dirname "$dhparam_file")"
        openssl dhparam -out "$dhparam_file" 2048 2>&1 | tee -a "$LOG_FILE"
        log "DH parameters generated successfully"
    else
        log "DH parameters already exist"
    fi
}

# Generate self-signed certificate for default server
generate_default_cert() {
    local cert_file="/etc/nginx/ssl/default-cert.pem"
    local key_file="/etc/nginx/ssl/default-key.pem"

    if [ ! -f "$cert_file" ] || [ ! -f "$key_file" ]; then
        log "Generating self-signed default certificate..."
        mkdir -p /etc/nginx/ssl
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$key_file" \
            -out "$cert_file" \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" \
            2>&1 | tee -a "$LOG_FILE"
        log "Default certificate generated successfully"
    else
        log "Default certificate already exists"
    fi
}

# Check certificate validity
check_certificate() {
    local domain="${1:-jarvis.ai}"
    local cert_file="$CERT_PATH/live/$domain/cert.pem"

    if [ ! -f "$cert_file" ]; then
        error "Certificate not found: $cert_file"
        return 1
    fi

    log "Certificate information for $domain:"
    openssl x509 -in "$cert_file" -noout -text | grep -E "(Subject:|Issuer:|Not Before|Not After)" | tee -a "$LOG_FILE"

    # Check if certificate is valid
    if openssl x509 -checkend 86400 -noout -in "$cert_file"; then
        log "Certificate is valid for at least 24 hours"
        return 0
    else
        warning "Certificate expires within 24 hours!"
        return 1
    fi
}

# Main execution
main() {
    log "=== Jarvis AI Certificate Management ==="

    # Parse command
    local command="${1:-renew}"

    case "$command" in
        init)
            log "Initializing certificate infrastructure..."
            generate_dhparam
            generate_default_cert
            request_certificate
            ;;
        renew)
            log "Running certificate renewal..."
            # Check expiry first
            IFS=',' read -ra DOMAIN_ARRAY <<< "$DOMAINS"
            check_certificate_expiry "${DOMAIN_ARRAY[0]}" || true
            renew_certificate
            ;;
        check)
            log "Checking certificate status..."
            IFS=',' read -ra DOMAIN_ARRAY <<< "$DOMAINS"
            check_certificate "${DOMAIN_ARRAY[0]}"
            ;;
        force)
            log "Forcing certificate renewal..."
            request_certificate
            ;;
        dhparam)
            generate_dhparam
            ;;
        default-cert)
            generate_default_cert
            ;;
        *)
            error "Unknown command: $command"
            echo "Usage: $0 {init|renew|check|force|dhparam|default-cert}"
            exit 1
            ;;
    esac

    log "=== Certificate management complete ==="
}

# Run main function
main "$@"
