# Extractor

A minimalist 2D browser game where you control a spaceship (triangle) and extract resources from asteroids (red circles).

## Game Description

In Extractor, you control a vector-based spaceship that automatically launches extractors when approaching asteroids. The extractors travel from your ship to the asteroid to collect resources.

## Controls

- **W or Up Arrow**: Move forward in the direction the ship is facing
- **S or Down Arrow**: Move backward (reverse thrust)
- **A or Left Arrow**: Rotate ship counter-clockwise
- **D or Right Arrow**: Rotate ship clockwise

The ship can only move forward and backward along its facing direction. You need to rotate the ship to change direction.

## Game Mechanics

- Navigate your ship (white triangle) around the game field
- When you get close enough to an asteroid (red circle), an extractor (cyan dot) will automatically launch
- The extractor will travel to the asteroid and collect resources, shown by a visual pulse effect

## How to Run

1. Clone or download this repository
2. Open the `index.html` file in a modern web browser
   - For the best experience, serve the files using a local development server

### Using a Local Server

You can use any of these methods to run a local server:

**With Python:**
```
# Python 3
python -m http.server

# Python 2
python -m SimpleHTTPServer
```

**With Node.js:**
```
# Using npx
npx http-server

# Or if you have http-server installed globally
http-server
```

Then open your browser and navigate to `http://localhost:8000` (or whichever port your server is using).

## Technical Details

- Built with HTML5 Canvas and Paper.js for vector graphics
- Responsive design that adapts to browser window size
- Minimalist aesthetic with smooth animations

## Future Enhancements

- Multiple asteroids
- Scoring system
- Ship upgrades
- Visual and audio effects
- Resource collection and management

---

Developed as a minimalist game prototype. 