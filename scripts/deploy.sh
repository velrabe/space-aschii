#!/bin/bash

# Improved deployment script that combines functionality from multiple scripts
# and includes error handling

set -e  # Exit on any error

echo "===== Starting deployment on server ====="

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Deploying from directory: $PROJECT_DIR"

# Function for error handling
handle_error() {
    echo "ERROR: Deployment failed at line $1"
    exit 1
}

# Set up error trap
trap 'handle_error $LINENO' ERR

# Check if running as root
if [ "$EUID" -ne 0 ] && [ -z "$SUDO_USER" ]; then
    echo "This script must be run with sudo privileges."
    echo "Please run: sudo $0"
    exit 1
fi

# Configure Nginx
echo "===== Setting up Nginx configuration ====="
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

# Check if domain name is set up
DOMAIN_NAME=${DOMAIN_NAME:-"_"}  # Default to catch-all if no domain specified
USE_HTTPS=${USE_HTTPS:-"no"}     # Default to no HTTPS

# Automatically use HTTPS if domain name is provided
if [ "$DOMAIN_NAME" != "_" ] && [ "$USE_HTTPS" = "no" ]; then
    echo "Domain name detected, enabling HTTPS by default. Set USE_HTTPS=no to disable."
    USE_HTTPS="yes"
fi

# Get server IP if domain name is not specified
if [ "$DOMAIN_NAME" = "_" ]; then
    SERVER_IP=$(hostname -I | awk '{print $1}')
    echo "No domain name specified. Using server IP: $SERVER_IP"
else
    echo "Using domain name: $DOMAIN_NAME"
fi

# Create the Nginx configuration with default server block for IP access
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

# Domain-specific configuration if domain is provided
NGINX

# Add domain-specific server block if domain is provided
if [ "$DOMAIN_NAME" != "_" ]; then
    cat >> /etc/nginx/sites-available/space-aschii << NGINX_DOMAIN
server {
    listen 80;
    server_name ${DOMAIN_NAME} www.${DOMAIN_NAME};
    
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
NGINX_DOMAIN
fi
    
# Enable the site
ln -sf /etc/nginx/sites-available/space-aschii /etc/nginx/sites-enabled/

# Check if Nginx is installed, if not, try to install it
if ! command -v nginx &> /dev/null; then
    echo "Nginx not found. Installing..."
    apt update
    apt install -y nginx
fi

# Setup HTTPS if requested
if [ "$USE_HTTPS" = "yes" ] && [ "$DOMAIN_NAME" != "_" ]; then
    echo "===== Setting up HTTPS for $DOMAIN_NAME ====="
    
    # Install Certbot if not already installed
    if ! command -v certbot &> /dev/null; then
        apt update
        apt install -y certbot python3-certbot-nginx
    fi
    
    # Obtain and install SSL certificate with Certbot
    certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME --non-interactive --agree-tos --email admin@$DOMAIN_NAME
    
    echo "HTTPS setup complete for $DOMAIN_NAME!"
fi

# Check if Nginx config is valid
nginx -t

# Restart Nginx
systemctl restart nginx

# Copy project files to the webroot if not already in the correct location
if [ "$PROJECT_DIR" != "/var/www/space-aschii" ]; then
    echo "===== Copying project files to web root ====="
    mkdir -p /var/www/space-aschii
    cp -R "$PROJECT_DIR"/* /var/www/space-aschii/
fi

# Install node modules if needed and build the bundle
if [ -f "/var/www/space-aschii/package.json" ]; then
    echo "===== Installing Node.js dependencies and building the bundle ====="
    cd /var/www/space-aschii
    if ! command -v npm &> /dev/null; then
        apt update
        apt install -y nodejs npm
    fi
    npm install
    npm run build
fi

# Fix permissions (from fix_403.sh)
echo "===== Setting correct permissions ====="
chown -R www-data:www-data /var/www/space-aschii
chmod -R 755 /var/www/space-aschii

# Check for index.html
if [ ! -f "/var/www/space-aschii/public/index.html" ]; then
    echo "WARNING: index.html not found in public directory!"
fi

echo "===== Checking Nginx status ====="
systemctl status nginx | head -n 10

echo "===== Deployment completed successfully! ====="
SERVER_IP=$(hostname -I | awk '{print $1}')

if [ "$USE_HTTPS" = "yes" ] && [ "$DOMAIN_NAME" != "_" ]; then
    echo "Your game should be accessible at https://$DOMAIN_NAME"
else
    if [ "$DOMAIN_NAME" != "_" ]; then
        echo "Your game should be accessible at http://$DOMAIN_NAME"
    fi
    echo "Your game should be accessible at http://$SERVER_IP"
fi
echo "The asset preview is available at http://$SERVER_IP/assets/preview.html" 