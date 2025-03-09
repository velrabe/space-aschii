# Space-ASCHII

Multiplayer space mining game with ASCII/SVG graphics.

## Test Deployment Automation
This is a test change to verify the deployment automation is working correctly.

## Project Structure

```
space-aschii/
├── src/                  # Source code
│   ├── core/             # Core game engine
│   ├── entities/         # Game entities (ships, asteroids)
│   ├── input/            # Input handling
│   ├── ui/               # User interface
│   ├── utils/            # Utility functions
│   └── index.js          # Main entry point
├── public/               # Static files
│   ├── assets/           # Game assets
│   ├── index.html        # Main HTML file
│   ├── style.css         # CSS styles
│   └── bundle.js         # Bundled JavaScript (generated)
├── server/               # Server-side code
│   └── server.js         # Game server
├── scripts/              # Utility scripts
│   └── deploy.sh         # Deployment script
├── config/               # Configuration files
│   └── nginx-config.conf # Nginx configuration
└── docs/                 # Documentation
```

## Development

```bash
# Install dependencies
npm install

# Build the client
npm run build

# Start the server
npm start

# Build and start (development)
npm run dev
```

## Deployment

The project includes an improved deployment script that handles:
- Nginx configuration
- HTTPS setup with Let's Encrypt (optional)
- Proper permissions
- Error handling

### Automatic Deployment

The project is configured to automatically deploy when changes are merged into the `main` branch using GitHub Actions.

### Manual Deployment

#### Option 1: Trigger GitHub Actions workflow manually

1. Go to the GitHub repository
2. Navigate to the "Actions" tab
3. Select the "Deploy" workflow
4. Click "Run workflow" button
5. Select the branch (usually `main`) and click "Run workflow"

#### Option 2: Deploy using the local script

To deploy manually from your local machine:

```bash
# Make the script executable (if not already)
chmod +x scripts/manual_deploy.sh

# Run the deployment script with server credentials
./scripts/manual_deploy.sh your-server.com user /var/www/space-aschii
```

The script will use your SSH configuration automatically. Make sure your SSH keys are properly set up for passwordless authentication.

#### Option 3: Direct server deployment

If you're already on the server:

```bash
# Copy the project to your server
scp -r space-aschii user@your-server:/path/to/destination

# SSH into your server
ssh user@your-server

# Navigate to the project
cd /path/to/destination/space-aschii

# Basic deployment (HTTP only)
sudo bash scripts/deploy.sh

# Deploy with HTTPS (requires domain name)
sudo DOMAIN_NAME=yourdomain.com USE_HTTPS=yes bash scripts/deploy.sh
```

After deployment, your game will be accessible at:
- HTTP: http://server-ip
- HTTPS (if configured): https://yourdomain.com
- Asset preview: http://server-ip/assets/preview.html
