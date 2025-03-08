# Space-ASCHII

Multiplayer space mining game with ASCII/SVG graphics.

## Project Structure

```
space-aschii/
├── src/                  # Source code
│   ├── core/             # Core game engine
│   ├── entities/         # Game entities (ships, asteroids)
│   ├── input/            # Input handling
│   ├── ui/               # User interface
│   ├── network/          # Multiplayer networking
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
│   ├── deploy.sh         # Deployment script
│   └── deploy_multiplayer.sh # Multiplayer deployment
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
