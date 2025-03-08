// Input manager to handle keyboard input
class InputManager {
    constructor() {
        // Object to track key states
        this.keys = {
            forward: false,
            backward: false,
            rotateLeft: false,
            rotateRight: false,
            shoot: false
        };
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    // Set up keyboard event listeners
    setupEventListeners() {
        // Track key down events
        document.addEventListener('keydown', (event) => {
            this.handleKeyDown(event);
        });
        
        // Track key up events
        document.addEventListener('keyup', (event) => {
            this.handleKeyUp(event);
        });
    }
    
    // Handle key down events
    handleKeyDown(event) {
        switch(event.key) {
            case 'ArrowUp':
            case 'w':
                this.keys.forward = true;
                break;
            case 'ArrowDown':
            case 's':
                this.keys.backward = true;
                break;
            case 'ArrowLeft':
            case 'a':
                this.keys.rotateLeft = true;
                break;
            case 'ArrowRight':
            case 'd':
                this.keys.rotateRight = true;
                break;
            case ' ':  // Space bar
                this.keys.shoot = true;
                break;
        }
    }
    
    // Handle key up events
    handleKeyUp(event) {
        switch(event.key) {
            case 'ArrowUp':
            case 'w':
                this.keys.forward = false;
                break;
            case 'ArrowDown':
            case 's':
                this.keys.backward = false;
                break;
            case 'ArrowLeft':
            case 'a':
                this.keys.rotateLeft = false;
                break;
            case 'ArrowRight':
            case 'd':
                this.keys.rotateRight = false;
                break;
            case ' ':  // Space bar
                this.keys.shoot = false;
                break;
        }
    }
    
    // Set the state of a specific key directly (used by external key handlers)
    setKeyState(key, isPressed) {
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = isPressed;
        }
    }
    
    // Get the current state of all keys
    getKeyStates() {
        return this.keys;
    }
    
    // Check if a specific key is pressed
    isKeyPressed(key) {
        return this.keys[key] === true;
    }
}

// Export the InputManager class for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InputManager };
} 