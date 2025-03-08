// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Paper.js with the canvas element
    paper.setup('gameCanvas');
    
    // Game configuration
    const config = {
        extractorSize: 5,         // Size of the extractor
        extractorSpeed: 8,        // Speed of the extractor
        extractorRange: 150,      // Distance at which extractor is launched
        extractorCooldown: 1000,  // Cooldown in ms before extractor can be launched again
    };
    
    // Game state
    const gameState = {
        keys: {
            forward: false,
            backward: false,
            rotateLeft: false,
            rotateRight: false
        },
        canExtract: true,
        activeExtractors: [],
        activeLoot: [],
        shotsFired: 0,  // Счетчик выстрелов при подлете к комете
        debugShots: true  // Включить отладку выстрелов
    };

    // ResourceManager class to handle resources
    class ResourceManager {
        constructor() {
            this.resources = {
                // Initialize all resource types with 0
                ordinaryMinerals: 0,
                metalScraps: 0,
                titaniumFragments: 0,
                quartzCrystals: 0,
                exoticMinerals: 0,
                energyCrystals: 0,
                ancientArtifacts: 0,
                antimatterCores: 0
            };
            
            this.resourcesText = new paper.PointText({
                point: new paper.Point(20, 30),
                content: 'Resources: 0',
                fillColor: 'white',
                fontFamily: 'Courier New',
                fontSize: 16,
                fontWeight: 'bold'
            });
            
            // Create detailed resource display that's initially hidden
            this.detailedDisplay = new paper.Group();
            
            let yOffset = 50;
            this.detailedTexts = {};
            
            for (const resourceType in this.resources) {
                this.detailedTexts[resourceType] = new paper.PointText({
                    point: new paper.Point(20, yOffset),
                    content: `${resourceType}: ${this.resources[resourceType]}`,
                    fillColor: 'white',
                    fontFamily: 'Courier New',
                    fontSize: 12
                });
                this.detailedDisplay.addChild(this.detailedTexts[resourceType]);
                yOffset += 20;
            }
        }

        addResources(resourceObject) {
            let totalAdded = 0;
            
            for (const [type, amount] of Object.entries(resourceObject)) {
                if (this.resources.hasOwnProperty(type)) {
                    this.resources[type] += amount;
                    totalAdded += amount;
                }
            }
            
            this.updateDisplay();
            return totalAdded;
        }

        getResourceTotal() {
            let total = 0;
            for (const type in this.resources) {
                total += this.resources[type];
            }
            return total;
        }

        spendResources(amount) {
            const total = this.getResourceTotal();
            if (total >= amount) {
                // Implement spending logic later
                this.updateDisplay();
                return true;
            }
            return false;
        }

        updateDisplay() {
            this.resourcesText.content = `Resources: ${this.getResourceTotal()}`;
            
            // Update detailed texts
            for (const type in this.resources) {
                this.detailedTexts[type].content = `${type}: ${this.resources[type]}`;
            }
        }
    }
    
    // Function to create loot object at a position
    function createLoot(position, lootContents) {
        const lootGroup = new paper.Group();
        
        // Create visual representation of the loot
        const lootCircle = new paper.Path.Circle({
            center: new paper.Point(0, 0),
            radius: 15,
            strokeColor: 'gold',
            strokeWidth: 2,
            dashArray: [4, 2]
        });
        
        // Add some sparkle effect
        for (let i = 0; i < 8; i++) {
            const angle = i * 45 * (Math.PI / 180);
            const sparkle = new paper.Path.Line(
                new paper.Point(
                    Math.cos(angle) * 8,
                    Math.sin(angle) * 8
                ),
                new paper.Point(
                    Math.cos(angle) * 20,
                    Math.sin(angle) * 20
                )
            );
            sparkle.strokeColor = 'gold';
            sparkle.strokeWidth = 1;
            lootGroup.addChild(sparkle);
        }
        
        // Add a small text indicator
        const lootText = new paper.PointText({
            point: new paper.Point(0, 0),
            content: '$',
            fillColor: 'gold',
            fontFamily: 'Courier New',
            fontSize: 16,
            fontWeight: 'bold',
            justification: 'center'
        });
        
        lootGroup.addChild(lootCircle);
        lootGroup.addChild(lootText);
        
        lootGroup.position = position;
        
        // Add properties to the loot
        lootGroup.contents = lootContents;
        
        // Add to active loot
        gameState.activeLoot.push(lootGroup);
        
        // Add a subtle animation
        const originalScale = lootGroup.scaling;
        const animateScale = (event) => {
            lootGroup.scaling = originalScale.multiply(1 + Math.sin(event.time * 2) * 0.1);
        };
        lootGroup.onFrame = animateScale;
        
        return lootGroup;
    }
    
    // Create instances
    const resourceManager = new ResourceManager();
    const ship = new Ship(paper.view.center);
    
    // Отображение энергии корабля
    const energyText = new paper.PointText({
        point: new paper.Point(20, 50),
        content: 'Energy: ' + ship.getEnergy(),
        fillColor: 'white',
        fontFamily: 'Courier New',
        fontSize: 16,
        fontWeight: 'bold'
    });

    // Добавляем отладочный текст
    const debugText = new paper.PointText({
        point: new paper.Point(20, 70),
        content: 'Debug: Ready',
        fillColor: 'yellow',
        fontFamily: 'Courier New',
        fontSize: 14,
        fontWeight: 'bold'
    });

    // Create asteroid
    const asteroid = new Asteroid(
        new paper.Point(
            Math.random() * paper.view.size.width,
            Math.random() * paper.view.size.height
        )
    );
    
    // Handle keyboard input
    document.addEventListener('keydown', function(event) {
        handleKeyEvent(event.key, true);
    });
    
    document.addEventListener('keyup', function(event) {
        handleKeyEvent(event.key, false);
    });
    
    // Map keys to game state
    function handleKeyEvent(key, isPressed) {
        switch(key.toLowerCase()) {
            case 'w':
            case 'arrowup':
                gameState.keys.forward = isPressed;
                break;
            case 's':
            case 'arrowdown':
                gameState.keys.backward = isPressed;
                break;
            case 'a':
            case 'arrowleft':
                gameState.keys.rotateLeft = isPressed;
                break;
            case 'd':
            case 'arrowright':
                gameState.keys.rotateRight = isPressed;
                break;
        }
    }
    
    // Create extractor function
    function createExtractor() {
        if (!gameState.canExtract) return;
        
        // Проверяем, есть ли у корабля энергия
        if (ship.getEnergy() <= 0) {
            if (gameState.debugShots) {
                debugText.content = 'Debug: No energy left';
            }
            return; // Если энергии нет, не создаем экстрактор
        }
        
        // Calculate direction vector from ship to asteroid
        const direction = asteroid.getPosition().subtract(ship.getPosition()).normalize();
        
        // Create the extractor (ASCII style)
        const extractor = new paper.Group();
        
        // Small dot (·)
        const dot = new paper.Path.Circle({
            center: new paper.Point(0, 0),
            radius: config.extractorSize,
            strokeColor: 'cyan',
            strokeWidth: 1
        });
        
        // Small cross (+)
        const hLine = new paper.Path.Line(
            new paper.Point(-config.extractorSize, 0),
            new paper.Point(config.extractorSize, 0)
        );
        hLine.strokeColor = 'cyan';
        hLine.strokeWidth = 1;
        
        const vLine = new paper.Path.Line(
            new paper.Point(0, -config.extractorSize),
            new paper.Point(0, config.extractorSize)
        );
        vLine.strokeColor = 'cyan';
        vLine.strokeWidth = 1;
        
        extractor.addChild(dot);
        extractor.addChild(hLine);
        extractor.addChild(vLine);
        
        extractor.position = ship.getPosition();
        
        // Add properties to the extractor
        extractor.direction = direction;
        extractor.speed = config.extractorSpeed;
        
        // Add to active extractors
        gameState.activeExtractors.push(extractor);
        
        // Уменьшаем энергию корабля и обновляем отображение
        // ВАЖНО: Уменьшаем энергию ТОЛЬКО здесь, а не при попадании
        ship.shootExtractor(false);
        energyText.content = 'Energy: ' + ship.getEnergy();
        
        // Увеличиваем счетчик выстрелов
        gameState.shotsFired++;
        
        if (gameState.debugShots) {
            debugText.content = `Debug: Shot fired #${gameState.shotsFired}, Energy: ${ship.getEnergy()}, ShotsFired < Energy: ${gameState.shotsFired < ship.getEnergy()}`;
        }
        
        // Set cooldown
        gameState.canExtract = false;
        setTimeout(() => {
            gameState.canExtract = true;
            if (gameState.debugShots) {
                debugText.content = `Debug: Cooldown finished, Energy: ${ship.getEnergy()}, ShotsFired: ${gameState.shotsFired}`;
            }
        }, config.extractorCooldown);
    }
    
    // Game loop
    paper.view.onFrame = function(event) {
        // Handle ship input and movement
        ship.handleInput(gameState.keys);
        
        // Check distance between ship and asteroid
        const distance = ship.getPosition().getDistance(asteroid.getPosition());
        
        // Launch extractor if close enough and asteroid not destroyed
        if (distance < config.extractorRange && !asteroid.isDestroyed()) {
            // Если корабль только что вошел в зону стрельбы, сбрасываем счетчик выстрелов
            if (gameState.lastDistance >= config.extractorRange || gameState.lastDistance === undefined) {
                gameState.shotsFired = 0;
                if (gameState.debugShots) {
                    debugText.content = `Debug: Entered fire range, resetting shots counter`;
                }
            }
            
            // Если у корабля есть энергия и мы еще не выстрелили столько раз, сколько зарядов
            if (gameState.canExtract && ship.getEnergy() > 0 && gameState.shotsFired < ship.getEnergy()) {
                createExtractor();
            }
        } else {
            // Если корабль вышел из зоны стрельбы, сбрасываем счетчик выстрелов
            if (gameState.shotsFired > 0 && gameState.debugShots) {
                debugText.content = `Debug: Left fire range, resetting shots counter`;
            }
            gameState.shotsFired = 0;
        }
        
        // Запоминаем текущую дистанцию для следующего кадра
        gameState.lastDistance = distance;
        
        // Update active extractors
        for (let i = gameState.activeExtractors.length - 1; i >= 0; i--) {
            const extractor = gameState.activeExtractors[i];
            
            // Move extractor
            extractor.position = extractor.position.add(
                extractor.direction.multiply(extractor.speed)
            );
            
            // Check if extractor reached asteroid and asteroid is not destroyed
            if (!asteroid.isDestroyed()) {
                const extractorToAsteroidDistance = extractor.position.getDistance(asteroid.getPosition());
                if (extractorToAsteroidDistance < asteroid.getRadius()) {
                    // Extractor reached asteroid, remove it
                    extractor.remove();
                    gameState.activeExtractors.splice(i, 1);
                    
                    // Attempt extraction and check if asteroid was destroyed
                    const asteroidDestroyed = asteroid.attemptExtraction();
                    
                    // При попадании в астероид ТОЛЬКО начисляем ресурс, но НЕ уменьшаем энергию
                    // Заменяем shootExtractor на более безопасный метод
                    // ship.shootExtractor(true); - это вызывало двойной расход энергии
                    
                    // Обновляем только ресурсы при попадании
                    if (ship.resources !== undefined) {
                        ship.resources += 1;
                    }
                    
                    if (gameState.debugShots) {
                        debugText.content = `Debug: Hit asteroid, Resources: ${ship.getResources()}, Energy: ${ship.getEnergy()}`;
                    }
                    
                    if (asteroidDestroyed) {
                        // Generate loot from asteroid contents
                        const lootContents = asteroid.generateLoot();
                        createLoot(asteroid.getPosition(), lootContents);
                    }
                    
                    // Optional: Add visual feedback (ASCII-style pulse)
                    const pulse = new paper.Group();
                    
                    // Outer ring
                    const outerCircle = new paper.Path.Circle({
                        center: asteroid.getPosition(),
                        radius: asteroid.getRadius() * 1.5,
                        strokeColor: 'cyan',
                        strokeWidth: 1,
                        opacity: 0.7
                    });
                    
                    // Inner asterisk
                    for (let angle = 0; angle < 360; angle += 45) {
                        const radians = angle * (Math.PI / 180);
                        const line = new paper.Path.Line(
                            new paper.Point(
                                asteroid.getPosition().x + Math.cos(radians) * asteroid.getRadius() * 0.8,
                                asteroid.getPosition().y + Math.sin(radians) * asteroid.getRadius() * 0.8
                            ),
                            new paper.Point(
                                asteroid.getPosition().x + Math.cos(radians) * asteroid.getRadius() * 1.3,
                                asteroid.getPosition().y + Math.sin(radians) * asteroid.getRadius() * 1.3
                            )
                        );
                        line.strokeColor = 'cyan';
                        line.strokeWidth = 1;
                        line.opacity = 0.7;
                        pulse.addChild(line);
                    }
                    
                    pulse.addChild(outerCircle);
                    
                    // Animate pulse and remove
                    pulse.scale(1.5);
                    pulse.opacity = 0;
                    setTimeout(() => pulse.remove(), 300);
                }
            }
            
            // Remove extractor if it goes off-screen
            if (extractor.position.x < 0 || 
                extractor.position.x > paper.view.size.width ||
                extractor.position.y < 0 || 
                extractor.position.y > paper.view.size.height) {
                extractor.remove();
                gameState.activeExtractors.splice(i, 1);
            }
        }
        
        // Check for ship colliding with loot
        for (let i = gameState.activeLoot.length - 1; i >= 0; i--) {
            const loot = gameState.activeLoot[i];
            const distanceToLoot = ship.getPosition().getDistance(loot.position);
            
            if (distanceToLoot < 30) {  // Ship collection radius
                // Collect the loot
                resourceManager.addResources(loot.contents);
                
                // Create collection animation
                const collectionEffect = new paper.Group();
                const circle = new paper.Path.Circle({
                    center: loot.position,
                    radius: 30,
                    strokeColor: 'gold',
                    strokeWidth: 2
                });
                collectionEffect.addChild(circle);
                
                // Animate and remove
                collectionEffect.onFrame = (event) => {
                    collectionEffect.scale(0.9);
                    collectionEffect.opacity -= 0.1;
                    if (collectionEffect.opacity <= 0) {
                        collectionEffect.remove();
                    }
                };
                
                // Remove loot
                loot.remove();
                gameState.activeLoot.splice(i, 1);
            }
        }
        
        // Generate new asteroid if the old one is destroyed and all loot is collected
        if (asteroid.isDestroyed() && gameState.activeLoot.length === 0) {
            // Create a new asteroid at a random position
            const newAsteroid = new Asteroid(
                new paper.Point(
                    Math.random() * paper.view.size.width,
                    Math.random() * paper.view.size.height
                )
            );
            
            // Replace the old asteroid reference
            asteroid.asteroidGroup.remove();
            Object.assign(asteroid, newAsteroid);
        }
    };
    
    // Handle window resize
    window.addEventListener('resize', function() {
        paper.view.viewSize = new paper.Size(window.innerWidth, window.innerHeight);
    });
}); 