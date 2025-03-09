#!/bin/bash

# Simple deployment script to be run on the server after files are uploaded

echo "Starting deployment on server..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Deploying from directory: $PROJECT_DIR"

# Configure Nginx (if needed)
if [ ! -f /etc/nginx/sites-available/space-aschii ]; then
    echo "Setting up Nginx configuration..."
    
    # Create necessary directories if they don't exist
    sudo mkdir -p /etc/nginx/sites-available
    sudo mkdir -p /etc/nginx/sites-enabled
    
    # Create the Nginx configuration
    sudo tee /etc/nginx/sites-available/space-aschii > /dev/null << 'NGINX'
server {
    listen 80;
    server_name _;

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
        try_files $uri $uri/ =404;
    }
    
    # Allow cross-origin requests (useful for fetching SVGs)
    add_header Access-Control-Allow-Origin "*";
}
NGINX
    
    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/space-aschii /etc/nginx/sites-enabled/
    
    # Check if Nginx is installed, if not, try to install it
    if ! command -v nginx &> /dev/null; then
        echo "Nginx not found. Installing..."
        sudo apt update
        sudo apt install -y nginx
    fi
    
    # Check if Nginx config is valid
    sudo nginx -t
    
    # Restart Nginx
    sudo systemctl restart nginx
else
    echo "Nginx already configured. Reloading configuration..."
    
    # Make sure the configuration is updated
    sudo cp -f /etc/nginx/sites-available/space-aschii /etc/nginx/sites-available/space-aschii.bak
    
    sudo tee /etc/nginx/sites-available/space-aschii > /dev/null << 'NGINX'
server {
    listen 80;
    server_name _;

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
        try_files $uri $uri/ =404;
    }
    
    # Allow cross-origin requests (useful for fetching SVGs)
    add_header Access-Control-Allow-Origin "*";
}
NGINX
    
    # Reload Nginx
    sudo nginx -t && sudo systemctl reload nginx
fi

# Copy project files to the webroot if not already in the correct location
if [ "$PROJECT_DIR" != "/var/www/space-aschii" ]; then
    echo "Copying project files to web root..."
    sudo mkdir -p /var/www/space-aschii
    sudo cp -R "$PROJECT_DIR"/* /var/www/space-aschii/
    sudo chmod -R 755 /var/www/space-aschii
fi

echo "Deployment completed successfully!"
echo "Your game should be accessible at http://$(hostname -I | awk '{print $1}')"
echo "The asset preview is available at http://$(hostname -I | awk '{print $1}')/assets/preview.html" 