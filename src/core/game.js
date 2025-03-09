// Import необходимых модулей
const { Ship } = require('../entities/ship.js');
const { Asteroid } = require('../entities/asteroid.js');
const { InputManager } = require('../input/inputManager.js');

// Set up paper.js
paper.install(window);

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
    
    // Create input manager
    const inputManager = new InputManager();

    // Game state
    const gameState = {
        canExtract: true,
        activeExtractors: [],
        activeLoot: [],
        shotsFired: 0,  // Счетчик выстрелов при подлете к комете
        debugShots: true,  // Включить отладку выстрелов
        keyDebug: {}, // Объект для хранения отладочной информации о клавишах
        ship: null, // Корабль игрока
    };

    // ResourceManager class to handle resources
    class ResourceManager {
        constructor() {
            this.resources = {
                ordinaryMinerals: 0,
                metalScraps: 0,
                titaniumFragments: 0,
                quartzCrystals: 0,
                exoticMinerals: 0,
                energyCrystals: 0,
                ancientArtifacts: 0,
                antimatterCores: 0
            };
            
            this.resourceText = new paper.PointText({
                point: new paper.Point(20, 100),
                content: 'Resources: 0',
                fillColor: 'lightgreen',
                fontFamily: 'Courier New',
                fontSize: 16
            });
        }
        
        addResources(resourceObject) {
            for (const [type, amount] of Object.entries(resourceObject)) {
                if (this.resources.hasOwnProperty(type)) {
                    this.resources[type] += amount;
                }
            }
            
            this.updateDisplay();
        }
        
        getResourceTotal() {
            return Object.values(this.resources).reduce((sum, value) => sum + value, 0);
        }
        
        spendResources(amount) {
            const total = this.getResourceTotal();
            if (total >= amount) {
                // Simplified approach: just reduce total by proportion
                const factor = (total - amount) / total;
                for (const type in this.resources) {
                    this.resources[type] = Math.floor(this.resources[type] * factor);
                }
                
                this.updateDisplay();
                return true;
            }
            
            return false;
        }
        
        updateDisplay() {
            this.resourceText.content = `Resources: ${this.getResourceTotal()}`;
        }
    }

    // Create instances
    const resourceManager = new ResourceManager();
    
    // Создаем корабль игрока
    gameState.ship = new Ship(paper.view.center);
    
    // Отображение энергии корабля
    const energyText = new paper.PointText({
        point: new paper.Point(20, 60),
        content: 'Energy: ' + gameState.ship.getEnergy(),
        fillColor: 'lightblue',
        fontFamily: 'Courier New',
        fontSize: 16
    });
    
    // Отображение количества ресурсов
    const resourceCountText = new paper.PointText({
        point: new paper.Point(20, 80),
        content: 'Resources: ' + gameState.ship.getResources(),
        fillColor: 'green',
        fontFamily: 'Courier New',
        fontSize: 16
    });
    
    // Отладочный текст для клавиш и других событий
    const keyDebugText = new paper.PointText({
        point: new paper.Point(20, paper.view.size.height - 20),
        content: 'Key Debug: Ready',
        fillColor: 'yellow',
        fontFamily: 'Courier New',
        fontSize: 14
    });
    
    // Отладочный текст для выстрелов
    const debugText = new paper.PointText({
        point: new paper.Point(20, paper.view.size.height - 40),
        content: 'Debug: Ready',
        fillColor: 'orange',
        fontFamily: 'Courier New',
        fontSize: 14
    });
    
    // Создаем астероид
    const asteroid = new Asteroid(new paper.Point(600, 300), 'high');
    
    // Визуализация клавиш
    const keySize = 30;
    const keysGroup = new paper.Group();
    
    // Создать клавишу с заданными параметрами
    function createKeyVisualizer(x, y, label, fillColor = 'gray') {
        const key = new paper.Path.Rectangle({
            point: [x, y],
            size: [keySize, keySize],
            radius: 5,
            fillColor: fillColor,
            strokeColor: 'white',
            strokeWidth: 2
        });
        
        const keyLabel = new paper.PointText({
            point: new paper.Point(x + keySize/2, y + keySize/2 + 5),
            content: label,
            fillColor: 'white',
            fontFamily: 'Courier New',
            fontSize: 14,
            justification: 'center'
        });
        
        const keyGroup = new paper.Group([key, keyLabel]);
        return {group: keyGroup, background: key};
    }
    
    // Создаем группу визуализаторов клавиш
    const keysX = paper.view.size.width - 120;
    const keysY = paper.view.size.height - 120;
    
    // Up key
    const upKey = createKeyVisualizer(keysX, keysY - keySize, '↑').background;
    
    // Left, Down, Right keys
    const leftKey = createKeyVisualizer(keysX - keySize, keysY, '←').background;
    const downKey = createKeyVisualizer(keysX, keysY, '↓').background;
    const rightKey = createKeyVisualizer(keysX + keySize, keysY, '→').background;
    
    // Обновление визуализации состояния клавиш
    function updateKeyStateVisualizer() {
        // Get key states from input manager instead of gameState
        const keyStates = inputManager.getKeyStates();
        
        upKey.fillColor = keyStates.forward ? 'green' : 'gray';
        downKey.fillColor = keyStates.backward ? 'green' : 'gray';
        leftKey.fillColor = keyStates.rotateLeft ? 'green' : 'gray';
        rightKey.fillColor = keyStates.rotateRight ? 'green' : 'gray';
    }
    
    // Create UI elements
    const fpsText = new paper.PointText({
        point: new paper.Point(20, 20),
        content: 'FPS: 0',
        fillColor: 'white',
        fontFamily: 'Courier New',
        fontSize: 16
    });
    
    const positionText = new paper.PointText({
        point: new paper.Point(20, 40),
        content: 'Position: 0, 0',
        fillColor: 'white',
        fontFamily: 'Courier New',
        fontSize: 16
    });
    
    const velocityText = new paper.PointText({
        point: new paper.Point(20, 60),
        content: 'Velocity: 0, 0',
        fillColor: 'white',
        fontFamily: 'Courier New',
        fontSize: 16
    });
    
    const angleText = new paper.PointText({
        point: new paper.Point(20, 80),
        content: 'Angle: 0°',
        fillColor: 'white',
        fontFamily: 'Courier New',
        fontSize: 16
    });
    
    // Main game loop
    paper.view.onFrame = function(event) {
        // Calculate FPS
        const fps = Math.round(1 / (event.delta || 0.001));
        fpsText.content = `FPS: ${fps}`;
        
        // Update ship position
        if (gameState.ship) {
            gameState.ship.update(inputManager.getInputState());
            
            // Update position text
            positionText.content = `Position: ${Math.round(gameState.ship.position.x)}, ${Math.round(gameState.ship.position.y)}`;
            
            // Update velocity text
            velocityText.content = `Velocity: ${Math.round(gameState.ship.velocity.x * 100) / 100}, ${Math.round(gameState.ship.velocity.y * 100) / 100}`;
            
            // Update angle text
            angleText.content = `Angle: ${Math.round(gameState.ship.angle)}°`;
        }
        
        // Update extractors
        for (let i = gameState.activeExtractors.length - 1; i >= 0; i--) {
            const extractor = gameState.activeExtractors[i];
            extractor.update();
            
            // Check if extractor has reached its target
            if (extractor.hasReachedTarget()) {
                // Create loot at the target position
                createLoot(extractor.position, {
                    ordinaryMinerals: Math.floor(Math.random() * 10) + 1
                });
                
                // Remove extractor
                extractor.remove();
                gameState.activeExtractors.splice(i, 1);
            }
        }
        
        // Update loot
        for (let i = gameState.activeLoot.length - 1; i >= 0; i--) {
            const loot = gameState.activeLoot[i];
            
            // Check if ship is close enough to collect loot
            if (gameState.ship && loot.position.getDistance(gameState.ship.position) < 50) {
                // Add resources to player
                resourceManager.addResources(loot.contents);
                
                // Remove loot
                loot.remove();
                gameState.activeLoot.splice(i, 1);
            }
        }
        
        // Update key state visualizer
        updateKeyStateVisualizer();
    };
    
    // Handle window resize
    window.addEventListener('resize', function() {
        paper.view.viewSize = new paper.Size(window.innerWidth, window.innerHeight);
    });

    // Detect keyboard API support
    function detectKeyboardAPISupport() {
        // For legacy browsers
        keyboardSupport = {
            hasCode: 'code' in new KeyboardEvent('keydown'),
            hasKey: 'key' in new KeyboardEvent('keydown'),
            hasKeyCode: 'keyCode' in new KeyboardEvent('keydown')
        };
        
        console.log('Keyboard API support:', keyboardSupport);
    }
    
    // Detect Russian keyboard key codes
    function detectRussianKeyboardKeyCodes() {
        // Создаем таблицу кодов клавиш для поддержки разных раскладок
        keyCodeMap = {
            // English/Latin layout
            87: { code: 'KeyW', key: 'w' },     // W
            83: { code: 'KeyS', key: 's' },     // S
            65: { code: 'KeyA', key: 'a' },     // A
            68: { code: 'KeyD', key: 'd' },     // D
            
            // Russian layout
            67: { code: 'KeyW', key: 'ц' },     // Ц (matches position of W)
            89: { code: 'KeyS', key: 'ы' },     // Ы (matches position of S)
            70: { code: 'KeyA', key: 'ф' },     // Ф (matches position of A)
            86: { code: 'KeyD', key: 'в' },     // В (matches position of D)
            
            // Arrow keys (same in all layouts)
            38: { code: 'ArrowUp', key: 'ArrowUp' },       // Up Arrow
            40: { code: 'ArrowDown', key: 'ArrowDown' },   // Down Arrow 
            37: { code: 'ArrowLeft', key: 'ArrowLeft' },   // Left Arrow
            39: { code: 'ArrowRight', key: 'ArrowRight' }  // Right Arrow
        };
    }

    // Initialize game
    createKeyVisualizer(paper.view.size.width - 100, paper.view.size.height - 100, 'W', 'gray');
    createKeyVisualizer(paper.view.size.width - 100, paper.view.size.height - 60, 'S', 'gray');
    createKeyVisualizer(paper.view.size.width - 140, paper.view.size.height - 60, 'A', 'gray');
    createKeyVisualizer(paper.view.size.width - 60, paper.view.size.height - 60, 'D', 'gray');
    createKeyVisualizer(paper.view.size.width - 180, paper.view.size.height - 100, 'Q', 'gray');
    createKeyVisualizer(paper.view.size.width - 20, paper.view.size.height - 100, 'E', 'gray');
    
    // Detect keyboard API support
    detectKeyboardAPISupport();
    
    // Detect Russian keyboard key codes
    detectRussianKeyboardKeyCodes();
}); 