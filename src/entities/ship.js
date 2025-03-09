// Ship configuration
const SHIP_CONFIG = {
    size: 22,             // Size of the player's ship
    speed: 4,             // Ship movement speed
    rotationSpeed: 4,     // Ship rotation speed (degrees per frame)
};

// Ship class to encapsulate ship behavior
class Ship {
    constructor(position, size = SHIP_CONFIG.size, shipType = 'spaceship.svg') {
        this.size = size;
        this.direction = 270; // Start facing upward (in degrees)
        this.shipType = shipType; // Тип корабля (спрайт)
        this.shipGroup = this.createShipGraphics(position);
        this.energy = 10; // Начальный заряд энергии
        this.resources = 0; // Начальное количество ресурсов
        this.velocity = new paper.Point(0, 0); // Добавляем свойство для скорости
    }

    createShipGraphics(position) {
        // Create a group to hold ship sprite
        const shipGroup = new paper.Group();
        
        // Load SVG sprite from assets directory
        paper.project.importSVG(`./assets/ships/${this.shipType}`, (item) => {
            // Adjust the size if needed
            const scale = this.size / 25; // Assuming the SVG is designed for a 25px base size
            item.scale(scale);
            
            // Add the SVG to the group
            shipGroup.addChild(item);
            
            // Position and rotate the ship
            shipGroup.position = position;
            // Apply additional 90 degree rotation to the sprite
            shipGroup.rotate(this.direction + 90);
        });
        
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
        
        // Сохраняем текущую скорость для параллакса
        this.velocity = new paper.Point(moveX, moveY);
        
        // Apply movement to ship
        this.shipGroup.position.x += moveX;
        this.shipGroup.position.y += moveY;
        
        // Keep ship within bounds
        const viewWidth = paper.view.size.width;
        const viewHeight = paper.view.size.height;
        this.shipGroup.position.x = Math.max(0, Math.min(viewWidth, this.shipGroup.position.x));
        this.shipGroup.position.y = Math.max(0, Math.min(viewHeight, this.shipGroup.position.y));
    }

    // Устанавливает позицию и вращение напрямую (используется для удаленных кораблей)
    setPositionAndRotation(position, direction) {
        const oldDirection = this.direction;
        // Обновляем позицию
        this.shipGroup.position = new paper.Point(position.x, position.y);
        
        // Обновляем направление с учетом разницы
        if (direction !== oldDirection) {
            const rotationDiff = direction - oldDirection;
            this.shipGroup.rotate(rotationDiff);
            this.direction = direction;
        }
    }

    getPosition() {
        return this.shipGroup.position;
    }

    getDirection() {
        // Direction in radians
        return this.direction * (Math.PI / 180);
    }
    
    // Process input from InputManager to update ship movement
    update(keyStates) {
        // No need to call getKeyStates() since we're receiving the key states directly
        
        // Handle rotation
        if (keyStates.rotateLeft) {
            this.rotateLeft();
        }
        if (keyStates.rotateRight) {
            this.rotateRight();
        }
        
        // Handle movement
        this.move(keyStates.forward, keyStates.backward);
        
        // Handle shooting
        if (keyStates.shoot) {
            // Will be handled by the game logic that calls this method
            return true; // Signal that player wants to shoot
        }
        
        return false; // No shooting this frame
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
    
    remove() {
        // Удаляем корабль из сцены
        if (this.shipGroup) {
            this.shipGroup.remove();
        }
    }
}

// Export the Ship class and config for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Ship, SHIP_CONFIG };
} 