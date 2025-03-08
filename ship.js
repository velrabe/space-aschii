// Ship configuration
const SHIP_CONFIG = {
    size: 22,             // Size of the player's ship
    speed: 4,             // Ship movement speed
    rotationSpeed: 4,     // Ship rotation speed (degrees per frame)
};

// Ship class to encapsulate ship behavior
class Ship {
    constructor(position, size = SHIP_CONFIG.size) {
        this.size = size;
        this.direction = 270; // Start facing upward (in degrees)
        this.shipGroup = this.createShipGraphics(position);
        this.energy = 10; // Начальный заряд энергии
        this.resources = 0; // Начальное количество ресурсов
    }

    createShipGraphics(position) {
        // Create a group to hold all ship elements
        const shipGroup = new paper.Group();
        
        // ASCII-style spaceship components
        
        // Main body outline (>===<)
        const mainBody = new paper.Path();
        mainBody.strokeColor = 'white';
        mainBody.strokeWidth = 2;
        mainBody.add(new paper.Point(-this.size * 0.9, 0));
        mainBody.add(new paper.Point(-this.size * 0.6, -this.size * 0.5));
        mainBody.add(new paper.Point(this.size * 0.6, -this.size * 0.5));
        mainBody.add(new paper.Point(this.size * 0.9, 0));
        mainBody.add(new paper.Point(this.size * 0.6, this.size * 0.5));
        mainBody.add(new paper.Point(-this.size * 0.6, this.size * 0.5));
        mainBody.closed = true;
        
        // Center line (=)
        const centerLine = new paper.Path.Line(
            new paper.Point(-this.size * 0.4, 0),
            new paper.Point(this.size * 0.4, 0)
        );
        centerLine.strokeColor = 'white';
        centerLine.strokeWidth = 2;
        
        // Vertical line (|)
        const verticalLine = new paper.Path.Line(
            new paper.Point(0, -this.size * 0.3),
            new paper.Point(0, this.size * 0.3)
        );
        verticalLine.strokeColor = 'white';
        verticalLine.strokeWidth = 2;
        
        // Add red bumper at the forward-pointing edge of the ship (upward direction)
        // Note: When ship is created, it points upward (270 degrees), so the bumper should be at the top
        const frontBumper = new paper.Path.Arc(
            new paper.Point(-this.size * 0.3, this.size * 0.5),  // Changed from -this.size * 0.5 to this.size * 0.5
            new paper.Point(0, this.size * 0.7),                 // Changed from -this.size * 0.7 to this.size * 0.7
            new paper.Point(this.size * 0.3, this.size * 0.5)    // Changed from -this.size * 0.5 to this.size * 0.5
        );
        frontBumper.strokeColor = 'red';
        frontBumper.strokeWidth = 3;
        
        // Add all elements to group
        shipGroup.addChild(mainBody);
        shipGroup.addChild(centerLine);
        shipGroup.addChild(verticalLine);
        shipGroup.addChild(frontBumper);
        
        // Position the ship
        shipGroup.position = position;
        shipGroup.rotate(this.direction); // Rotate to point upward
        
        return shipGroup;
    }

    rotateLeft(amount = SHIP_CONFIG.rotationSpeed) {
        this.shipGroup.rotate(-amount);
        this.direction = (this.direction - amount) % 360;
        if (this.direction < 0) this.direction += 360;
    }

    rotateRight(amount = SHIP_CONFIG.rotationSpeed) {
        this.shipGroup.rotate(amount);
        this.direction = (this.direction + amount) % 360;
    }

    move(forward, backward, speed = SHIP_CONFIG.speed) {
        let moveX = 0;
        let moveY = 0;
        
        // Convert direction from degrees to radians
        const directionRad = this.direction * (Math.PI / 180);
        
        if (forward) {
            // Move forward in the direction the ship is facing
            moveX += Math.cos(directionRad) * speed;
            moveY += Math.sin(directionRad) * speed;
        }
        if (backward) {
            // Move backward (opposite direction)
            moveX -= Math.cos(directionRad) * speed * 0.5; // Backward is slower
            moveY -= Math.sin(directionRad) * speed * 0.5;
        }
        
        // Apply movement to ship
        this.shipGroup.position.x += moveX;
        this.shipGroup.position.y += moveY;
        
        // Keep ship within bounds
        const viewWidth = paper.view.size.width;
        const viewHeight = paper.view.size.height;
        this.shipGroup.position.x = Math.max(0, Math.min(viewWidth, this.shipGroup.position.x));
        this.shipGroup.position.y = Math.max(0, Math.min(viewHeight, this.shipGroup.position.y));
    }

    getPosition() {
        return this.shipGroup.position;
    }

    getDirection() {
        // Direction in radians
        return this.direction * (Math.PI / 180);
    }
    
    // Process keyboard input to update ship movement
    handleInput(keys) {
        if (keys.rotateLeft) {
            this.rotateLeft();
        }
        if (keys.rotateRight) {
            this.rotateRight();
        }
        
        this.move(keys.forward, keys.backward);
    }

    shootExtractor(hitAsteroid) {
        if (this.energy > 0) {
            this.energy -= 1; // Уменьшаем энергию на 1
            if (hitAsteroid) {
                this.resources += 1; // Начисляем ресурс при попадании
            }
        }
    }

    getEnergy() {
        return this.energy;
    }

    getResources() {
        return this.resources;
    }
}

// Export the Ship class and config for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Ship, SHIP_CONFIG };
} 