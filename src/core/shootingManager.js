class ShootingManager {
    constructor(ship, view, debug = false) {
        this.ship = ship;
        this.view = view; // Объект view из paper.js
        this.bullets = [];
        this.lastShotTime = 0;
        this.shootCooldown = 250; // Задержка между выстрелами в миллисекундах
        this.debugEnabled = debug; // Опция отладки в конструкторе
        this.bulletPath = 'assets/bullet.svg'; // Корректный путь к SVG изображению пули в public/assets
        
        console.log("ShootingManager: Инициализирован" + (this.debugEnabled ? " в режиме отладки" : ""));
    }

    // Метод для выстрела
    shoot() {
        const currentTime = Date.now();
        console.log("ShootingManager: Попытка выстрела, время с последнего выстрела:", currentTime - this.lastShotTime);
        
        if (currentTime - this.lastShotTime > this.shootCooldown) {
            // Получаем текущее положение корабля
            const shipPosition = this.ship.getPosition();
            
            // Получаем направление корабля
            const shipDirection = this.ship.getDirection();
            console.log("ShootingManager: Направление корабля (градусы):", shipDirection);
            
            // Конвертируем угол из градусов в радианы
            const directionRad = (shipDirection * Math.PI) / 180;
            
            // Создаем SVG пулю с бумагой
            const bullet = this.createBulletSVG(shipPosition, shipDirection);
            
            // Скорость пули
            const bulletSpeed = 10;
            
            // Вычисляем вектор скорости пули
            const bulletVelX = Math.cos(directionRad) * bulletSpeed;
            const bulletVelY = Math.sin(directionRad) * bulletSpeed;
            
            // Добавляем пулю в массив
            this.bullets.push({
                element: bullet,
                x: shipPosition.x,
                y: shipPosition.y,
                velX: bulletVelX,
                velY: bulletVelY,
                rotation: shipDirection, // Сохраняем изначальное направление
                active: true
            });
            
            this.lastShotTime = currentTime;
            console.log("ShootingManager: Пуля создана на позиции X:", shipPosition.x, "Y:", shipPosition.y);
            return true; // Выстрел произведен
        }
        return false; // Выстрел не произведен (cooldown)
    }
    
    // Создание SVG пули
    createBulletSVG(position, rotation) {
        // Создаем группу для пули
        const bulletGroup = new paper.Group();
        bulletGroup.position = new paper.Point(position.x, position.y);
        
        // Загружаем SVG изображение пули
        const self = this;
        paper.project.importSVG(this.bulletPath, {
            onLoad: function(item) {
                // Добавляем загруженный SVG в группу
                bulletGroup.addChild(item);
                
                // Масштабируем если нужно
                const scale = 1.0; // Можно настроить размер пули
                item.scale(scale);
                
                // Поворачиваем в направлении корабля
                // Paper.js использует 0 градусов направленным вправо,
                // и положительный угол - против часовой стрелки
                bulletGroup.rotate(rotation);
                
                if (self.debugEnabled) {
                    console.log("ShootingManager: Пуля SVG загружена и повернута на", rotation, "градусов");
                }
            },
            onError: function(error) {
                console.error("ShootingManager: Ошибка загрузки SVG пули:", error);
            }
        });
        
        return bulletGroup;
    }
    
    // Метод для обновления положения пуль
    update() {
        for (let i = 0; i < this.bullets.length; i++) {
            const bullet = this.bullets[i];
            
            // Обновляем позицию
            bullet.x += bullet.velX;
            bullet.y += bullet.velY;
            
            // Обновляем позицию SVG элемента
            if (bullet.element && bullet.element.position) {
                bullet.element.position = new paper.Point(bullet.x, bullet.y);
            }
            
            // Удаляем пули, которые вышли за пределы экрана
            if (bullet.x < 0 || bullet.x > this.view.size.width || 
                bullet.y < 0 || bullet.y > this.view.size.height) {
                // Удаляем SVG элемент
                if (bullet.element) {
                    bullet.element.remove();
                }
                bullet.active = false;
            }
        }
        
        // Удаляем неактивные пули
        this.bullets = this.bullets.filter(bullet => bullet.active);
    }
    
    // Метод для рисования пуль
    draw(ctx) {
        // Paper.js сам рисует SVG элементы, так что нам не нужно ничего делать тут
        // Метод оставлен для совместимости
        
        // Для отладки выводим количество пуль
        if (this.debugEnabled) {
            console.log("ShootingManager: Активных пуль:", this.bullets.length);
        }
        
        // Если включен режим отладки, добавляем информацию о пулях
        if (this.debugEnabled && ctx) {
            ctx.save();
            ctx.fillStyle = 'white';
            ctx.font = "10px Arial";
            
            for (const bullet of this.bullets) {
                ctx.fillText(`${Math.round(bullet.x)},${Math.round(bullet.y)}`, bullet.x + 10, bullet.y - 10);
            }
            
            ctx.restore();
        }
    }
    
    // Получение списка активных пуль (для проверки столкновений)
    getBullets() {
        return this.bullets;
    }

    // Метод для включения/выключения отладки
    enableDebug(enabled = true) {
        this.debugEnabled = enabled;
        console.log("ShootingManager: Режим отладки " + (enabled ? "включен" : "выключен"));
    }
}

// Экспорт класса ShootingManager для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShootingManager };
} else if (typeof window !== 'undefined') {
    // Делаем доступным глобально в контексте браузера
    window.ShootingManager = ShootingManager;
} 