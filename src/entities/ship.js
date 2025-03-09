// Ship configuration
const SHIP_CONFIG = {
    size: 22,             // Size of the player's ship
    speed: 4,             // Ship movement speed
    rotationSpeed: 2,     // Ship rotation speed (degrees per frame) - reduced for smoother control
    maxVelocity: 5,       // Maximum velocity
    acceleration: 0.15,   // Acceleration rate
    deceleration: 0.05,   // Deceleration rate when not accelerating
    rotationAcceleration: 0.2, // How quickly rotation speed builds up
    rotationDeceleration: 0.3, // How quickly rotation slows down
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
        
        // Physics properties for inertia
        this.velocity = new paper.Point(0, 0); // Current velocity vector
        this.currentSpeed = 0; // Current speed scalar
        this.targetSpeed = 0; // Target speed scalar
        this.currentRotationSpeed = 0; // Current rotation speed (with inertia)
        this.targetRotationSpeed = 0; // Target rotation speed
        this.isMovingBackward = false; // Flag to track backward movement

        // Новые параметры
        this.angle = this.direction;
        this.speed = SHIP_CONFIG.speed;
        this.acceleration = SHIP_CONFIG.acceleration;
        this.deceleration = SHIP_CONFIG.deceleration;
        this.turnRate = SHIP_CONFIG.rotationSpeed;
        this.hitbox = { radius: this.size / 2 };

        this.health = 100;
        this.shield = 0;
        this.armor = 0;

        this.fuel = 100;
        this.capacity = 50;
        this.xp = 0;
        this.level = 1;

        this.modules = [];
        this.skin = shipType;
        this.colorScheme = 'default';
        this.customizationOptions = {};

        this.boost = false;
        this.extractionRate = 1;
        this.fireRate = 1;
        this.cooldowns = {};

        this.inventory = [];
        this.capacityUsage = 0;

        this.state = 'idle';
        this.statusEffects = [];
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
        // If moving backward, invert rotation direction
        if (this.isMovingBackward) {
            this.targetRotationSpeed = amount; // Invert for backward movement
        } else {
            this.targetRotationSpeed = -amount; // Normal rotation for forward
        }
    }

    rotateRight(amount = SHIP_CONFIG.rotationSpeed) {
        // If moving backward, invert rotation direction
        if (this.isMovingBackward) {
            this.targetRotationSpeed = -amount; // Invert for backward movement
        } else {
            this.targetRotationSpeed = amount; // Normal rotation for forward
        }
    }

    move(forward, backward, speed = SHIP_CONFIG.speed) {
        // Update backward movement flag
        this.isMovingBackward = (backward && !forward);
        
        // Set target speed based on input
        if (forward) {
            this.targetSpeed = speed;
        } else if (backward) {
            this.targetSpeed = -speed * 0.5; // Backward is slower
        } else {
            this.targetSpeed = 0; // No input, gradually slow down
        }
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
        // Return direction in degrees, as stored in the ship
        return this.direction;
    }
    
    // Process input from InputManager to update ship movement
    update(keyStates) {
        // Handle rotation with inertia
        if (keyStates.rotateLeft) {
            this.rotateLeft();
        } else if (keyStates.rotateRight) {
            this.rotateRight();
        } else {
            // No rotation input, gradually slow down rotation
            this.targetRotationSpeed = 0;
        }
        
        // Update current rotation speed with acceleration/deceleration
        if (this.currentRotationSpeed < this.targetRotationSpeed) {
            this.currentRotationSpeed = Math.min(
                this.targetRotationSpeed, 
                this.currentRotationSpeed + SHIP_CONFIG.rotationAcceleration
            );
        } else if (this.currentRotationSpeed > this.targetRotationSpeed) {
            this.currentRotationSpeed = Math.max(
                this.targetRotationSpeed, 
                this.currentRotationSpeed - SHIP_CONFIG.rotationDeceleration
            );
        }
        
        // Apply the rotation if there's any rotation speed
        if (Math.abs(this.currentRotationSpeed) > 0.01) {
            this.shipGroup.rotate(this.currentRotationSpeed);
            this.direction = (this.direction + this.currentRotationSpeed) % 360;
            if (this.direction < 0) this.direction += 360;
        }
        
        // Handle movement
        this.move(keyStates.forward, keyStates.backward);
        
        // Update current speed with acceleration/deceleration
        if (this.currentSpeed < this.targetSpeed) {
            this.currentSpeed = Math.min(
                this.targetSpeed, 
                this.currentSpeed + this.acceleration
            );
        } else if (this.currentSpeed > this.targetSpeed) {
            this.currentSpeed = Math.max(
                this.targetSpeed, 
                this.currentSpeed - this.deceleration
            );
        }
        
        // Only move if we have some speed
        if (Math.abs(this.currentSpeed) > 0.01) {
            // Convert direction from degrees to radians
            const directionRad = this.direction * (Math.PI / 180);
            
            // Calculate movement vector
            const moveX = Math.cos(directionRad) * this.currentSpeed;
            const moveY = Math.sin(directionRad) * this.currentSpeed;
            
            // Save current velocity for parallax
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
        
        // Handle shooting
        if (keyStates.shoot) {
            // Вызываем метод shoot
            return this.shoot();
        }
        
        this.modules.forEach(module => module.updateCooldown());
        // Обработка эффектов модулей и статусов
        
        return null; // No shooting happened
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

    render(ctx) {
        // Отрисовка корабля с учетом скина и модулей
    }

    applyModuleEffect(module) {
        // Применение эффекта модуля
    }

    changeSkin(skinID) {
        this.skin = skinID;
        // Обновление визуального оформления
    }

    updateInventory(item, action = 'add') {
        if (action === 'add') {
            this.inventory.push(item);
            this.capacityUsage++;
        } else if (action === 'remove') {
            const index = this.inventory.indexOf(item);
            if (index > -1) {
                this.inventory.splice(index, 1);
                this.capacityUsage--;
            }
        }
    }

    activateAbility(ability) {
        // Активация специальной способности
    }

    checkCollision(entity) {
        const distance = this.shipGroup.position.getDistance(entity.position);
        return distance < (this.hitbox.radius + entity.hitbox.radius);
    }

    // Новый метод для выстрела
    shoot() {
        // Этот метод используется как интерфейс для инициирования выстрела
        // Фактическая логика стрельбы будет в ShootingManager
        console.log("Ship: Выстрел инициирован с позиции X:", this.shipGroup.position.x, "Y:", this.shipGroup.position.y, "Угол:", this.direction);
        return true;
    }
}

// Export the Ship class and config for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Ship, SHIP_CONFIG };
} 