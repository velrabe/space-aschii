// Key visualizer module for displaying keyboard controls on screen

/**
 * Creates a key visualizer UI element at the specified position
 * @param {number} x - The x coordinate of the visualizer
 * @param {number} y - The y coordinate of the visualizer
 * @param {string} key - The key label to display
 * @param {string} color - The color of the key when inactive
 * @returns {Object} The key visualizer object
 */
function createKeyVisualizer(x, y, key, color = 'gray') {
    // Create a group to hold the key visual elements
    const keyGroup = new paper.Group();
    
    // Create the key background
    const keyBackground = new paper.Path.Rectangle({
        point: [0, 0],
        size: [30, 30],
        radius: 5,
        fillColor: color,
        strokeColor: 'white',
        strokeWidth: 1
    });
    
    // Create the key label
    const keyLabel = new paper.PointText({
        point: [15, 20],
        content: key,
        fillColor: 'white',
        fontFamily: 'Arial',
        fontSize: 18,
        justification: 'center'
    });
    
    // Add elements to the group
    keyGroup.addChild(keyBackground);
    keyGroup.addChild(keyLabel);
    
    // Position the group
    keyGroup.position = new paper.Point(x, y);
    
    // Function to highlight the key when pressed
    function highlightKey(isPressed) {
        if (isPressed) {
            keyBackground.fillColor = 'white';
            keyLabel.fillColor = 'black';
        } else {
            keyBackground.fillColor = color;
            keyLabel.fillColor = 'white';
        }
    }
    
    // Define key mappings for different layouts and arrow keys
    const keyMappings = {
        'W': ['w', 'W', 'ц', 'Ц', 'ArrowUp'],      // W key and up arrow
        'S': ['s', 'S', 'ы', 'Ы', 'ArrowDown'],    // S key and down arrow
        'A': ['a', 'A', 'ф', 'Ф', 'ArrowLeft'],    // A key and left arrow
        'D': ['d', 'D', 'в', 'В', 'ArrowRight'],   // D key and right arrow
        'Q': ['q', 'Q', 'й', 'Й'],                 // Q key
        'E': ['e', 'E', 'у', 'У'],                 // E key
        ' ': [' ']                                 // Space key
    };
    
    // Get the list of keys to check for this visualizer
    const keysToCheck = keyMappings[key.toUpperCase()] || [key];
    
    // Add event listeners for the key
    document.addEventListener('keydown', (event) => {
        if (keysToCheck.includes(event.key)) {
            highlightKey(true);
        }
    });
    
    document.addEventListener('keyup', (event) => {
        if (keysToCheck.includes(event.key)) {
            highlightKey(false);
        }
    });
    
    // Return the key visualizer object
    return {
        group: keyGroup,
        highlight: highlightKey
    };
}

// Export the createKeyVisualizer function
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createKeyVisualizer };
}
// If in browser context, make it globally available
else if (typeof window !== 'undefined') {
    window.createKeyVisualizer = createKeyVisualizer;
} 