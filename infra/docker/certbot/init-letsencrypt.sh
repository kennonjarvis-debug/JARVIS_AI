#!/bin/bash

# ==========================================
# Let's Encrypt Initial Setup Script
# One-time setup for TLS certificates
# ==========================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════╗
║   Jarvis AI - TLS/HTTPS Setup Wizard         ║
║   Let's Encrypt Certificate Initialization   ║
╚═══════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Configuration
DOMAINS="${DOMAINS:-jarvis.ai,www.jarvis.ai,api.jarvis.ai}"
EMAIL="${LETSENCRYPT_EMAIL:-admin@jarvis.ai}"
STAGING="${LETSENCRYPT_STAGING:-1}"  # Default to staging for safety
DATA_PATH="./certbot"
NGINX_CONF="./nginx/nginx.conf"

# Parse domains into array
IFS=',' read -ra DOMAIN_ARRAY <<< "$DOMAINS"
PRIMARY_DOMAIN="${DOMAIN_ARRAY[0]}"

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO:${NC} $1"
}

# Display configuration
echo ""
info "Configuration:"
echo "  Domains: $DOMAINS"
echo "  Email: $EMAIL"
echo "  Mode: $([ "$STAGING" = "1" ] && echo "STAGING (test)" || echo "PRODUCTION")"
echo ""

# Confirm before proceeding
if [ "$STAGING" = "0" ]; then
    warn "You are about to request PRODUCTION certificates!"
    warn "Let's Encrypt has rate limits: 50 certs per week"
    read -p "Are you sure? (yes/no): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        error "Aborted by user"
        exit 1
    fi
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    error "docker-compose is not installed"
    exit 1
fi

# Check DNS records
log "Checking DNS records..."
for domain in "${DOMAIN_ARRAY[@]}"; do
    if host "$domain" > /dev/null 2>&1; then
        IP=$(host "$domain" | grep "has address" | awk '{print $4}' | head -1)
        info "✓ $domain → $IP"
    else
        warn "✗ $domain - DNS not configured or not propagated"
        warn "  Please configure DNS and wait for propagation before continuing"
    fi
done
echo ""

# Create necessary directories
log "Creating directories..."
mkdir -p "$DATA_PATH/conf/live/$PRIMARY_DOMAIN"
mkdir -p "$DATA_PATH/www"
mkdir -p "$DATA_PATH/logs"

# Download recommended TLS parameters
if [ ! -e "$DATA_PATH/conf/options-ssl-nginx.conf" ] || [ ! -e "$DATA_PATH/conf/ssl-dhparams.pem" ]; then
    log "Downloading recommended TLS parameters..."
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$DATA_PATH/conf/options-ssl-nginx.conf"
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$DATA_PATH/conf/ssl-dhparams.pem"
fi

# Create dummy certificate (nginx needs certificates to start)
log "Creating dummy certificate for $PRIMARY_DOMAIN..."
path="/etc/letsencrypt/live/$PRIMARY_DOMAIN"
docker-compose run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout '$path/privkey.pem' \
    -out '$path/fullchain.pem' \
    -subj '/CN=localhost'" certbot

log "Starting nginx..."
docker-compose up --force-recreate -d nginx

# Delete dummy certificate
log "Removing dummy certificate..."
docker-compose run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/$PRIMARY_DOMAIN && \
  rm -Rf /etc/letsencrypt/archive/$PRIMARY_DOMAIN && \
  rm -Rf /etc/letsencrypt/renewal/$PRIMARY_DOMAIN.conf" certbot

# Request Let's Encrypt certificate
log "Requesting Let's Encrypt certificate..."

# Build certbot command
domain_args=""
for domain in "${DOMAIN_ARRAY[@]}"; do
    domain_args="$domain_args -d $domain"
done

staging_arg=""
if [ "$STAGING" = "1" ]; then
    staging_arg="--staging"
    warn "Using Let's Encrypt STAGING server (test mode)"
fi

# Request certificate
docker-compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $domain_args \
    --email $EMAIL \
    --rsa-key-size 4096 \
    --agree-tos \
    --force-renewal" certbot

# Check if certificate was obtained
if [ $? -eq 0 ]; then
    log "✓ Certificate obtained successfully!"

    # Reload nginx
    log "Reloading nginx..."
    docker-compose exec nginx nginx -s reload

    # Test HTTPS
    log "Testing HTTPS..."
    if curl -k -f "https://$PRIMARY_DOMAIN/health" > /dev/null 2>&1; then
        log "✓ HTTPS is working!"
    else
        warn "HTTPS test failed, check nginx logs"
    fi

    # Display certificate info
    log "Certificate information:"
    docker-compose run --rm --entrypoint "\
      certbot certificates" certbot

    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✓ TLS/HTTPS Setup Complete!                ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════╝${NC}"
    echo ""

    if [ "$STAGING" = "1" ]; then
        echo -e "${YELLOW}IMPORTANT:${NC} You are using STAGING certificates (not trusted by browsers)"
        echo ""
        echo "Next steps:"
        echo "1. Test your application: https://$PRIMARY_DOMAIN"
        echo "2. If everything works, switch to production:"
        echo "   - Set LETSENCRYPT_STAGING=0 in .env"
        echo "   - Run this script again"
        echo ""
    else
        echo -e "${GREEN}You have PRODUCTION certificates!${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Test your application: https://$PRIMARY_DOMAIN"
        echo "2. Run SSL Labs test: https://www.ssllabs.com/ssltest/analyze.html?d=$PRIMARY_DOMAIN"
        echo "3. After 30 days, submit to HSTS preload: https://hstspreload.org/"
        echo "4. Set up monitoring for certificate expiry"
        echo ""
        echo "Certificate auto-renewal is configured (runs twice daily)"
        echo ""
    fi

    echo "Useful commands:"
    echo "  Check certificate status: docker-compose exec certbot certbot certificates"
    echo "  Test renewal: docker-compose exec certbot certbot renew --dry-run"
    echo "  View nginx logs: docker-compose logs -f nginx"
    echo "  View certbot logs: docker-compose logs -f certbot"
    echo ""

else
    error "Failed to obtain certificate!"
    echo ""
    echo "Common issues:"
    echo "1. DNS not configured correctly"
    echo "2. Port 80 not accessible (check firewall)"
    echo "3. Domain already has rate-limited certificates"
    echo ""
    echo "Check logs:"
    echo "  docker-compose logs certbot"
    echo "  docker-compose logs nginx"
    echo ""
    exit 1
fi
