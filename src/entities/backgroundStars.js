// Класс для создания и управления фоновой анимацией звездных облаков с эффектом параллакса
class BackgroundStars {
    constructor() {
        this.starLayers = [];
        this.layerCount = 3; // Количество слоев параллакса
        this.initialized = false;
        
        // Пути к SVG-изображениям звездных облаков
        this.cloudAssets = [
            './assets/backgrounds/star-cloud-1.svg', // Голубоватое облако
            './assets/backgrounds/star-cloud-2.svg', // Белое облако
            './assets/backgrounds/star-cloud-3.svg', // Красная туманность
            './assets/backgrounds/star-cloud-4.svg'  // Фиолетовая туманность
        ];
    }

    // Инициализация звездных облаков
    initialize() {
        if (this.initialized) return;
        
        // Создаем группу для всего звездного фона
        this.backgroundGroup = new paper.Group();
        this.backgroundGroup.sendToBack(); // Отправляем звездный фон на задний план
        
        // Создаем слои со звездными облаками с разной скоростью для эффекта параллакса
        for (let i = 0; i < this.layerCount; i++) {
            const layer = {
                group: new paper.Group(),
                speed: 0.1 + (i * 0.2), // Скорость движения слоя (чем дальше слой, тем медленнее)
                clouds: []
            };
            
            // Добавляем звездные облака в слой
            const cloudCount = Math.floor(Math.random() * 2) + 2; // 2-3 облака на слой
            
            for (let j = 0; j < cloudCount; j++) {
                // Выбираем случайный тип облака
                const cloudType = Math.floor(Math.random() * this.cloudAssets.length);
                
                // Размер на основе слоя (дальние слои меньше)
                const size = 0.6 + (i * 0.2); // от 0.6 до 1.0
                
                // Создаем облако из SVG
                this.createStarCloudFromSVG(this.cloudAssets[cloudType], size, layer);
            }
            
            this.backgroundGroup.addChild(layer.group);
            this.starLayers.push(layer);
        }
        
        this.initialized = true;
    }
    
    // Создание звездного облака из SVG-файла
    createStarCloudFromSVG(svgPath, scale, layer) {
        // Импортируем SVG-изображение
        paper.project.importSVG(svgPath, (item) => {
            // Масштабируем облако
            item.scale(scale);
            
            // Случайное начальное положение
            item.position = new paper.Point(
                Math.random() * paper.view.size.width,
                Math.random() * paper.view.size.height
            );
            
            // Добавляем облако в слой
            layer.clouds.push(item);
            layer.group.addChild(item);
        });
    }
    
    // Обновление позиции звездных облаков для создания эффекта параллакса
    update(playerVelocity) {
        if (!this.initialized) return;
        
        // Если скорость не передана, используем значение по умолчанию
        const velocity = playerVelocity || new paper.Point(0.5, 0.2);
        
        // Обновляем каждый слой
        for (const layer of this.starLayers) {
            // Движение в направлении, противоположном движению игрока,
            // со скоростью, соответствующей слою
            const moveVector = velocity.multiply(-layer.speed);
            
            // Перемещаем все облака в слое
            for (const cloud of layer.clouds) {
                // Проверяем, что облако уже загружено (импорт SVG может быть асинхронным)
                if (cloud && cloud.position) {
                    cloud.position = cloud.position.add(moveVector);
                    
                    // Если облако вышло за пределы экрана, перемещаем его на другую сторону
                    this.wrapAroundScreen(cloud);
                }
            }
        }
    }
    
    // Обработка выхода облака за границы экрана
    wrapAroundScreen(cloud) {
        const bounds = cloud.bounds;
        const viewSize = paper.view.size;
        let repositioned = false;
        
        // Проверяем, вышло ли облако полностью за пределы экрана
        if (bounds.right < 0) {
            // Если вышло слева, перемещаем справа
            cloud.position.x = viewSize.width + bounds.width / 2;
            repositioned = true;
        } else if (bounds.left > viewSize.width) {
            // Если вышло справа, перемещаем слева
            cloud.position.x = -bounds.width / 2;
            repositioned = true;
        }
        
        if (bounds.bottom < 0) {
            // Если вышло сверху, перемещаем снизу
            cloud.position.y = viewSize.height + bounds.height / 2;
            repositioned = true;
        } else if (bounds.top > viewSize.height) {
            // Если вышло снизу, перемещаем сверху
            cloud.position.y = -bounds.height / 2;
            repositioned = true;
        }
        
        // Если облако было перемещено, добавляем небольшую случайность к новой позиции
        if (repositioned) {
            cloud.position.x += (Math.random() - 0.5) * 100;
            cloud.position.y += (Math.random() - 0.5) * 100;
        }
    }
}

module.exports = { BackgroundStars }; 