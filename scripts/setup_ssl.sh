#!/bin/bash

# Script for manually setting up or renewing SSL certificates
# This script should be run on the server with root privileges

set -e  # Exit on any error

# Check if we're running as root
if [ "$EUID" -ne 0 ] && [ -z "$SUDO_USER" ]; then
    echo "This script must be run with sudo privileges."
    echo "Please run: sudo $0"
    exit 1
fi

# Get domain name from command line or prompt for it
DOMAIN_NAME=${1:-""}

if [ -z "$DOMAIN_NAME" ]; then
    read -p "Enter your domain name (e.g., example.com): " DOMAIN_NAME
    
    if [ -z "$DOMAIN_NAME" ]; then
        echo "Error: Domain name is required."
        exit 1
    fi
fi

echo "===== Setting up/renewing SSL certificate for $DOMAIN_NAME ====="

# Install Certbot if not already installed
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    apt update
    apt install -y certbot python3-certbot-nginx
fi

# Check if certificate already exists
if [ -d "/etc/letsencrypt/live/$DOMAIN_NAME" ]; then
    echo "SSL certificate already exists. Attempting to renew..."
    certbot renew --nginx
else
    echo "No existing SSL certificate found. Creating new certificate..."
    certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME --non-interactive --agree-tos --email admin@$DOMAIN_NAME
fi

# Update the Nginx configuration
echo "Updating Nginx configuration to use HTTPS..."

# Create or update space-aschii Nginx config
cat > /etc/nginx/sites-available/space-aschii << NGINX
# Default server configuration for IP-based access
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    root /var/www/space-aschii/public;
    index index.html;
    
    # Include MIME types for the entire server
    include /etc/nginx/mime.types;
    
    # Explicitly set SVG MIME type
    types {
        image/svg+xml           svg svgz;
    }
    
    # Force HTML files to be properly served for preview.html
    location = /assets/preview.html {
        default_type text/html;
        add_header Content-Type text/html;
    }

    # Allow directory listing for assets subdirectories to support preview.html
    location /assets/ {
        autoindex on;
        default_type text/html;
    }

    location / {
        try_files \$uri \$uri/ =404;
    }
    
    # Allow cross-origin requests (useful for fetching SVGs)
    add_header Access-Control-Allow-Origin "*";
}

# Domain-specific configuration with HTTPS redirect
server {
    listen 80;
    server_name ${DOMAIN_NAME} www.${DOMAIN_NAME};
    
    # Redirect HTTP to HTTPS
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name ${DOMAIN_NAME} www.${DOMAIN_NAME};
    
    ssl_certificate /etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN_NAME}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    root /var/www/space-aschii/public;
    index index.html;
    
    # Include MIME types for the entire server
    include /etc/nginx/mime.types;
    
    # Explicitly set SVG MIME type
    types {
        image/svg+xml           svg svgz;
    }
    
    # Force HTML files to be properly served for preview.html
    location = /assets/preview.html {
        default_type text/html;
        add_header Content-Type text/html;
    }

    # Allow directory listing for assets subdirectories to support preview.html
    location /assets/ {
        autoindex on;
        default_type text/html;
    }

    location / {
        try_files \$uri \$uri/ =404;
    }
    
    # Allow cross-origin requests (useful for fetching SVGs)
    add_header Access-Control-Allow-Origin "*";
}
NGINX

# Check if Nginx config is valid
nginx -t

# Apply the new configuration
systemctl restart nginx

echo "===== SSL certificate setup/renewal complete! ====="
echo "Your game should now be accessible at:"
echo "https://$DOMAIN_NAME"
echo "https://www.$DOMAIN_NAME"
echo "Asset preview is available at: https://$DOMAIN_NAME/assets/preview.html" 