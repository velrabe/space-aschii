// Import необходимых модулей
const { Ship } = require('../entities/ship.js');
const { Asteroid } = require('../entities/asteroid.js');
const { InputManager } = require('../input/inputManager.js');
const { MultiplayerManager } = require('../network/multiplayer.js');

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
        multiplayer: null, // Объект для управления мультиплеером
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
    
    // Текст для отображения статуса мультиплеера
    const multiplayerText = new paper.PointText({
        point: new paper.Point(20, 40),
        content: 'Multiplayer: Offline',
        fillColor: 'red',
        fontFamily: 'Courier New',
        fontSize: 16
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
    
    // Инициализация мультиплеера
    function initMultiplayer() {
        // Создаем менеджер мультиплеера
        gameState.multiplayer = new MultiplayerManager(gameState);
        
        // Определяем адрес WebSocket сервера
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname || 'localhost';
        const port = 3000; // Порт сервера
        const websocketUrl = `${protocol}//${host}:${port}`;
        
        // Подключаемся к серверу
        gameState.multiplayer.connect(websocketUrl);
        
        // Создаем кнопку для сброса ID игрока
        const resetButton = new paper.PointText({
            point: new paper.Point(paper.view.size.width - 200, 60),
            content: '[Reset Player ID]',
            fillColor: 'orange',
            fontFamily: 'Courier New',
            fontSize: 12
        });
        
        // Добавляем обработчик клика для кнопки сброса ID
        resetButton.onMouseDown = function(event) {
            if (gameState.multiplayer) {
                gameState.multiplayer.resetPlayerId();
                // Перезагружаем страницу для применения нового ID
                location.reload();
            }
        };
        
        // Делаем кнопку интерактивной
        resetButton.onMouseEnter = function() {
            this.fillColor = 'yellow';
            document.body.style.cursor = 'pointer';
        };
        
        resetButton.onMouseLeave = function() {
            this.fillColor = 'orange';
            document.body.style.cursor = 'default';
        };
        
        // Создаем интерфейс для управления комнатами
        const roomText = new paper.PointText({
            point: new paper.Point(paper.view.size.width - 200, 80),
            content: `Room: ${gameState.multiplayer.roomId}`,
            fillColor: 'lightblue',
            fontFamily: 'Courier New',
            fontSize: 12
        });
        
        // Создаем кнопку для смены комнаты
        const changeRoomButton = new paper.PointText({
            point: new paper.Point(paper.view.size.width - 200, 100),
            content: '[Change Room]',
            fillColor: 'lightblue',
            fontFamily: 'Courier New',
            fontSize: 12
        });
        
        // Добавляем обработчик клика для кнопки смены комнаты
        changeRoomButton.onMouseDown = function(event) {
            // Спрашиваем у пользователя ID новой комнаты
            const newRoomId = prompt('Enter room ID (letters and numbers only):', gameState.multiplayer.roomId);
            
            // Проверяем, что ID комнаты корректный
            if (newRoomId && /^[a-zA-Z0-9-_]+$/.test(newRoomId)) {
                // Присоединяемся к новой комнате
                if (gameState.multiplayer.joinRoom(newRoomId)) {
                    // Обновляем отображение комнаты
                    roomText.content = `Room: ${newRoomId}`;
                }
            } else if (newRoomId) {
                alert('Invalid room ID. Use only letters, numbers, hyphens, and underscores.');
            }
        };
        
        // Делаем кнопку интерактивной
        changeRoomButton.onMouseEnter = function() {
            this.fillColor = 'cyan';
            document.body.style.cursor = 'pointer';
        };
        
        changeRoomButton.onMouseLeave = function() {
            this.fillColor = 'lightblue';
            document.body.style.cursor = 'default';
        };
        
        // Периодическая проверка соединения
        setInterval(() => {
            if (gameState.multiplayer) {
                gameState.multiplayer.checkConnection(websocketUrl);
                
                // Обновляем статус мультиплеера
                if (gameState.multiplayer.connected) {
                    multiplayerText.content = `Multiplayer: Online (ID: ${gameState.multiplayer.playerId.substr(0, 6)})`;
                    multiplayerText.fillColor = 'lightgreen';
                    
                    // Отображаем количество игроков
                    const playerCount = Object.keys(gameState.multiplayer.remotePlayers).length + 1;
                    multiplayerText.content += ` - Players: ${playerCount}`;
                    
                    // Обновляем отображение комнаты
                    roomText.content = `Room: ${gameState.multiplayer.roomId}`;
                } else {
                    multiplayerText.content = 'Multiplayer: Connecting...';
                    multiplayerText.fillColor = 'yellow';
                }
            }
        }, 5000);
    }
    
    // Вызываем инициализацию мультиплеера
    initMultiplayer();
    
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
    
    // NOTE: These handlers are kept for reference and potential backward compatibility,
    // but the main input handling is now done by the InputManager class.
    // They are currently only used to support the visual key state display
    // and for handling specialized keyboard layouts like Russian.
    
    // Map keys to game state using key codes (layout independent)
    function handleKeyEvent(code, isPressed) {
        switch(code) {
            case 'KeyW':
            case 'ArrowUp':
                inputManager.setKeyState('forward', isPressed);
                console.log(`Forward set to ${isPressed} by code ${code}`);
                break;
            case 'KeyS':
            case 'ArrowDown':
                inputManager.setKeyState('backward', isPressed);
                console.log(`Backward set to ${isPressed} by code ${code}`);
                break;
            case 'KeyA':
            case 'ArrowLeft':
                inputManager.setKeyState('rotateLeft', isPressed);
                console.log(`RotateLeft set to ${isPressed} by code ${code}`);
                break;
            case 'KeyD':
            case 'ArrowRight':
                inputManager.setKeyState('rotateRight', isPressed);
                console.log(`RotateRight set to ${isPressed} by code ${code}`);
                break;
            case 'Space':
                inputManager.setKeyState('shoot', isPressed);
                console.log(`Shoot set to ${isPressed} by code ${code}`);
                break;
            default:
                return false; // If the key wasn't handled, return false
        }
        
        updateKeyStateVisualizer();
        return true; // Key was handled
    }
    
    // Fallback method for browsers without KeyboardEvent.code
    function handleKeyEventFallback(key, isPressed) {
        // Convert key to lowercase for case-insensitive matching
        const lowerKey = key.toLowerCase();
        
        switch(lowerKey) {
            case 'w':
            case 'ц': // Russian 'w'
            case 'arrowup':
                inputManager.setKeyState('forward', isPressed);
                console.log(`Forward set to ${isPressed} by key ${key}`);
                break;
            case 's':
            case 'ы': // Russian 's'
            case 'arrowdown':
                inputManager.setKeyState('backward', isPressed);
                console.log(`Backward set to ${isPressed} by key ${key}`);
                break;
            case 'a':
            case 'ф': // Russian 'a'
            case 'arrowleft':
                inputManager.setKeyState('rotateLeft', isPressed);
                console.log(`RotateLeft set to ${isPressed} by key ${key}`);
                break;
            case 'd':
            case 'в': // Russian 'd'
            case 'arrowright':
                inputManager.setKeyState('rotateRight', isPressed);
                console.log(`RotateRight set to ${isPressed} by key ${key}`);
                break;
            case ' ': // Space
                inputManager.setKeyState('shoot', isPressed);
                console.log(`Shoot set to ${isPressed} by key ${key}`);
                break;
            default:
                return false; // Key wasn't handled
        }
        
        updateKeyStateVisualizer();
        return true; // Key was handled
    }
    
    // Вызываем функцию определения keyCode русских клавиш
    detectRussianKeyboardKeyCodes();
    
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
    
    function createExtractor() {
        if (!gameState.canExtract) return;
        
        // Проверяем, есть ли у корабля энергия
        if (gameState.ship.getEnergy() <= 0) {
            if (gameState.debugShots) {
                debugText.content = 'Debug: No energy left';
            }
            return; // Если энергии нет, не создаем экстрактор
        }
        
        // Calculate direction vector from ship to asteroid
        const direction = asteroid.getPosition().subtract(gameState.ship.getPosition()).normalize();
        
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
        
        extractor.position = gameState.ship.getPosition();
        
        // Add properties to the extractor
        extractor.direction = direction;
        extractor.speed = config.extractorSpeed;
        
        // Add to active extractors
        gameState.activeExtractors.push(extractor);
        
        // Уменьшаем энергию корабля и обновляем отображение
        // ВАЖНО: Уменьшаем энергию ТОЛЬКО здесь, а не при попадании
        gameState.ship.shootExtractor(false);
        energyText.content = 'Energy: ' + gameState.ship.getEnergy();
        
        // Увеличиваем счетчик выстрелов
        gameState.shotsFired++;
        
        if (gameState.debugShots) {
            debugText.content = `Debug: Shot fired #${gameState.shotsFired}, Energy: ${gameState.ship.getEnergy()}, ShotsFired < Energy: ${gameState.shotsFired < gameState.ship.getEnergy()}`;
        }
        
        // Set cooldown
        gameState.canExtract = false;
        setTimeout(() => {
            gameState.canExtract = true;
            if (gameState.debugShots) {
                debugText.content = `Debug: Cooldown finished, Energy: ${gameState.ship.getEnergy()}, ShotsFired: ${gameState.shotsFired}`;
            }
        }, config.extractorCooldown);
    }
    
    // Главный игровой цикл
    paper.view.onFrame = function(event) {
        // Обновляем визуализацию состояния клавиш
        updateKeyStateVisualizer();
        
        // Update ship movement based on input manager
        const wantsToShoot = gameState.ship.update(inputManager);
        
        // If the player wants to shoot, create an extractor
        if (wantsToShoot && gameState.canExtract) {
            createExtractor();
        }
        
        // Check distance between ship and asteroid
        const distance = gameState.ship.getPosition().getDistance(asteroid.getPosition());
        
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
            if (gameState.canExtract && gameState.ship.getEnergy() > 0 && gameState.shotsFired < gameState.ship.getEnergy()) {
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
                    // gameState.ship.shootExtractor(true); - это вызывало двойной расход энергии
                    
                    // Обновляем только ресурсы при попадании
                    if (gameState.ship.resources !== undefined) {
                        gameState.ship.resources += 1;
                    }
                    
                    if (gameState.debugShots) {
                        debugText.content = `Debug: Hit asteroid, Resources: ${gameState.ship.getResources()}, Energy: ${gameState.ship.getEnergy()}`;
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
            const distanceToLoot = gameState.ship.getPosition().getDistance(loot.position);
            
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
        
        // Обновляем текст ресурсов игрока
        resourceCountText.content = 'Resources: ' + gameState.ship.getResources();
    };
    
    // Handle window resize
    window.addEventListener('resize', function() {
        paper.view.viewSize = new paper.Size(window.innerWidth, window.innerHeight);
    });
}); 