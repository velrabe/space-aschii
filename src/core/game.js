// Import необходимых модулей
const { Ship } = require('../entities/ship.js');
const { Asteroid } = require('../entities/asteroid.js');
const { InputManager } = require('../input/inputManager.js');
const { createKeyVisualizer } = require('../ui/keyVisualizer.js');
const { BackgroundStars } = require('../entities/backgroundStars.js');
const { ShootingManager } = require('./shootingManager.js');

// Set up paper.js
paper.install(window);

// Определяем gameState как действительно глобальную переменную через объект window
window.gameState = null;

// Функция для отрисовки всех элементов игры
function renderGame() {
    // Проверяем инициализацию gameState
    if (!window.gameState) return;
    
    // Рисуем пули, если есть менеджер стрельбы
    if (window.gameState.shootingManager) {
        window.gameState.shootingManager.draw(paper.view.context);
    }
}

// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Paper.js with the canvas element
    paper.setup('gameCanvas');
    
    // Force an initial redraw to prevent blank screen
    paper.view.draw();
    
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
    window.gameState = {
        canExtract: true,
        activeExtractors: [],
        activeLoot: [],
        shotsFired: 0,  // Счетчик выстрелов при подлете к комете
        debugShots: true,  // Включить отладку выстрелов
        keyDebug: {}, // Объект для хранения отладочной информации о клавишах
        ship: null, // Корабль игрока
        backgroundStars: null, // Фоновые звезды
        shootingManager: null // Менеджер стрельбы
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
        }
        
        addResources(resourceObject) {
            for (const type in resourceObject) {
                if (this.resources.hasOwnProperty(type)) {
                    this.resources[type] += resourceObject[type];
                }
            }
            
            // Update total resources in ship
            if (window.gameState.ship) {
                window.gameState.ship.setResources(this.getResourceTotal());
            }
        }
        
        getResourceTotal() {
            return Object.values(this.resources).reduce((total, amount) => total + amount, 0);
        }
        
        spendResources(amount) {
            const total = this.getResourceTotal();
            
            if (total >= amount) {
                // Proportionally reduce all resources
                const ratio = (total - amount) / total;
                
                for (const type in this.resources) {
                    this.resources[type] = Math.floor(this.resources[type] * ratio);
                }
                
                // Update total resources in ship
                if (window.gameState.ship) {
                    window.gameState.ship.setResources(this.getResourceTotal());
                }
                
                return true;
            }
            
            return false;
        }
    }

    // Create instances
    const resourceManager = new ResourceManager();
    
    // Создаем корабль игрока
    window.gameState.ship = new Ship(paper.view.center);
    
    // Создаем менеджер стрельбы с включенным режимом отладки
    window.gameState.shootingManager = new ShootingManager(window.gameState.ship, paper.view, true);
    
    // Создаем астероид
    const asteroid = new Asteroid(new paper.Point(600, 300), 'high');
    
    // Создаем и инициализируем звездный фон
    window.gameState.backgroundStars = new BackgroundStars();
    window.gameState.backgroundStars.initialize();
    
    // Main game loop
    paper.view.onFrame = function(event) {
        // Обновляем фоновую анимацию звезд с небольшой фиксированной скоростью
        // или используем скорость корабля, если она доступна
        if (window.gameState.backgroundStars) {
            const velocity = window.gameState.ship ? window.gameState.ship.velocity : new paper.Point(0.3, 0.1);
            window.gameState.backgroundStars.update(velocity);
        }
        
        // Update ship position - pass the key states directly
        if (window.gameState.ship) {
            // Obtener estados de teclas
            const keyStates = inputManager.getKeyStates();
            
            // Comprobar si se debe disparar
            if (keyStates.shoot) {
                console.log("Game: Detectada tecla de disparo");
                if (window.gameState.shootingManager.shoot()) {
                    console.log("Game: Disparo exitoso");
                }
                // Reiniciar el estado de disparo para evitar disparos continuos
                inputManager.setKeyState('shoot', false);
            }
            
            // Actualizar el barco con los estados de las teclas
            window.gameState.ship.update(keyStates);
        }
        
        // Обновляем состояние пуль
        if (window.gameState.shootingManager) {
            window.gameState.shootingManager.update();
        }
        
        // Update extractors
        for (let i = window.gameState.activeExtractors.length - 1; i >= 0; i--) {
            const extractor = window.gameState.activeExtractors[i];
            extractor.update();
            
            // Check if extractor has reached its target
            if (extractor.hasReachedTarget()) {
                // Create loot at the target position
                createLoot(extractor.position, {
                    ordinaryMinerals: Math.floor(Math.random() * 10) + 1
                });
                
                // Remove extractor
                extractor.remove();
                window.gameState.activeExtractors.splice(i, 1);
            }
        }
        
        // Update loot
        for (let i = window.gameState.activeLoot.length - 1; i >= 0; i--) {
            const loot = window.gameState.activeLoot[i];
            
            // Check if ship is close enough to collect loot
            if (window.gameState.ship && loot.position.getDistance(window.gameState.ship.position) < 50) {
                // Add resources to player
                resourceManager.addResources(loot.contents);
                
                // Remove loot
                loot.remove();
                window.gameState.activeLoot.splice(i, 1);
            }
        }
        
        // Отрисовка всех элементов
        renderGame();
        
        // Force redraw to ensure all visual elements are updated
        paper.view.draw();
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