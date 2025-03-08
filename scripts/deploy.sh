#!/bin/bash

# Package the game files (excluding unnecessary files)
echo "Creating deployment package..."
tar -czf deploy.tar.gz --exclude='.git' --exclude='*.zip' --exclude='deploy.sh' --exclude='deploy.tar.gz' .

# Upload the package to the server with identity file
echo "Uploading to server..."
scp -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no deploy.tar.gz root@77.222.60.74:/root/

# Execute commands on the server to deploy the game
echo "Deploying on the server..."
ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no root@77.222.60.74 << 'EOF'
  # Create directory for the game if it doesn't exist
  mkdir -p /var/www/space-aschii
  
  # Extract files
  tar -xzf /root/deploy.tar.gz -C /var/www/space-aschii
  
  # Create assets directories if they don't exist
  mkdir -p /var/www/space-aschii/assets/ships
  mkdir -p /var/www/space-aschii/assets/asteroids
  mkdir -p /var/www/space-aschii/assets/resources
  mkdir -p /var/www/space-aschii/assets/effects
  mkdir -p /var/www/space-aschii/assets/ui
  
  # Set proper permissions for the web files
  chown -R www-data:www-data /var/www/space-aschii
  chmod -R 755 /var/www/space-aschii
  
  # Install dependencies (if needed)
  cd /var/www/space-aschii
  
  # Configure Nginx (if not already configured)
  if [ ! -f /etc/nginx/sites-available/space-aschii ]; then
    echo "Setting up Nginx configuration..."
    mkdir -p /etc/nginx/sites-available
    mkdir -p /etc/nginx/sites-enabled
    
    cat > /etc/nginx/sites-available/space-aschii << 'NGINX'
server {
    listen 80;
    server_name _;

    root /var/www/space-aschii;
    index index.html;
    
    # Include MIME types for the entire server
    include /etc/nginx/mime.types;
    
    # Explicitly set HTML MIME type
    types {
        text/html               html htm shtml;
        image/svg+xml           svg svgz;
    }
    
    # Force HTML files to be properly served for the preview.html file
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
    ln -sf /etc/nginx/sites-available/space-aschii /etc/nginx/sites-enabled/
    
    # Check if nginx is installed, if not, install it
    if ! command -v nginx &> /dev/null; then
        echo "Nginx not found. Installing..."
        apt update
        apt install -y nginx
    fi
    
    # Check if nginx config is valid
    nginx -t
    
    # Restart Nginx
    systemctl restart nginx
  else
    # Update existing Nginx config to support assets directory listing
    echo "Updating Nginx configuration..."
    cat > /etc/nginx/sites-available/space-aschii << 'NGINX'
server {
    listen 80;
    server_name _;

    root /var/www/space-aschii;
    index index.html;
    
    # Include MIME types for the entire server
    include /etc/nginx/mime.types;
    
    # Explicitly set HTML MIME type
    types {
        text/html               html htm shtml;
        image/svg+xml           svg svgz;
    }
    
    # Force HTML files to be properly served for the preview.html file
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
    
    # Check if nginx config is valid
    nginx -t
    
    # Restart Nginx
    systemctl restart nginx
  fi

  # Make sure the MIME types are correctly set
  echo "Ensuring preview.html has the correct MIME type..."
  touch /var/www/space-aschii/assets/preview.html
  
  # Verify Content-Type header
  echo "Testing preview.html Content-Type header..."
  curl -I http://localhost/assets/preview.html

  echo "Deployment complete! Your game should be accessible via the server's IP address: http://77.222.60.74"
  echo "The Wiki/Asset Preview is available at: http://77.222.60.74/assets/preview.html"
EOF

# Clean up local deployment package
rm deploy.tar.gz

echo "Deployment process completed!"
echo "Main game: http://77.222.60.74"
echo "Asset Wiki: http://77.222.60.74/assets/preview.html" 