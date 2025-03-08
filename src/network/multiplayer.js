// Класс для управления мультиплеером
class MultiplayerManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.socket = null;
        // Загружаем ID из localStorage, если он там есть
        this.playerId = localStorage.getItem('playerId') || null;
        this.roomId = localStorage.getItem('roomId') || 'default';
        this.remotePlayers = {};
        this.connected = false;
        this.updateInterval = null;
        
        // Слушатель для отключения соединения при закрытии страницы
        window.addEventListener('beforeunload', () => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.close();
            }
        });
    }
    
    // Подключение к серверу
    connect(url) {
        if (this.socket) {
            this.socket.close();
        }
        
        try {
            this.socket = new WebSocket(url);
            
            // Обработка подключения
            this.socket.onopen = () => {
                console.log('Connected to server');
                this.connected = true;
                
                // Отправляем ID игрока и комнату, если они у нас сохранены
                if (this.playerId) {
                    this.socket.send(JSON.stringify({
                        type: 'reconnect',
                        playerId: this.playerId,
                        roomId: this.roomId
                    }));
                } else {
                    // Для нового игрока отправляем только комнату
                    this.socket.send(JSON.stringify({
                        type: 'connect',
                        roomId: this.roomId
                    }));
                }
                
                // Запуск периодической отправки обновлений позиции
                this.startUpdates();
            };
            
            // Обработка сообщений от сервера
            this.socket.onmessage = (event) => {
                this.handleServerMessage(event.data);
            };
            
            // Обработка ошибок
            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
            // Обработка закрытия соединения
            this.socket.onclose = () => {
                console.log('Disconnected from server');
                this.connected = false;
                this.clearRemotePlayers();
                
                // Остановка отправки обновлений
                this.stopUpdates();
            };
            
        } catch (e) {
            console.error('WebSocket connection error:', e);
        }
    }
    
    // Обработка сообщений от сервера
    handleServerMessage(data) {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'init':
                    // Инициализация игрока
                    this.playerId = message.id;
                    // Сохраняем ID в localStorage для последующих подключений
                    localStorage.setItem('playerId', this.playerId);
                    
                    // Сохраняем ID комнаты, если он пришел с сервера
                    if (message.roomId) {
                        this.roomId = message.roomId;
                        localStorage.setItem('roomId', this.roomId);
                    }
                    
                    console.log('Received player ID:', this.playerId, 'in room:', this.roomId);
                    
                    // Добавление существующих игроков
                    message.players.forEach(player => {
                        this.addRemotePlayer(player);
                    });
                    break;
                
                case 'roomJoined':
                    // Подтверждение присоединения к комнате
                    this.roomId = message.roomId;
                    localStorage.setItem('roomId', this.roomId);
                    console.log(`Joined room: ${this.roomId}`);
                    break;
                
                case 'newPlayer':
                    // Добавление нового игрока
                    this.addRemotePlayer(message.player);
                    break;
                
                case 'updatePlayer':
                    // Обновление позиции удаленного игрока
                    this.updateRemotePlayer(message.player);
                    break;
                
                case 'playerDisconnect':
                    // Удаление отключившегося игрока
                    this.removeRemotePlayer(message.id);
                    break;
            }
        } catch (e) {
            console.error('Error parsing server message:', e);
        }
    }
    
    // Присоединение к комнате
    joinRoom(roomId) {
        if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.error('Cannot join room: not connected to server');
            return false;
        }
        
        // Отправляем запрос на присоединение к комнате
        this.socket.send(JSON.stringify({
            type: 'joinRoom',
            roomId: roomId
        }));
        
        // Очищаем список удаленных игроков при смене комнаты
        this.clearRemotePlayers();
        
        return true;
    }
    
    // Добавление удаленного игрока
    addRemotePlayer(playerData) {
        if (this.remotePlayers[playerData.id]) {
            // Игрок уже существует
            return;
        }
        
        console.log('Adding remote player:', playerData.id);
        
        // Создаем корабль для удаленного игрока
        const position = new paper.Point(playerData.position.x, playerData.position.y);
        const remoteShip = new Ship(
            position, 
            SHIP_CONFIG.size, 
            playerData.id, 
            true, 
            playerData.shipType
        );
        
        // Сохраняем игрока
        this.remotePlayers[playerData.id] = {
            ship: remoteShip,
            lastUpdate: Date.now()
        };
    }
    
    // Обновление позиции удаленного игрока
    updateRemotePlayer(playerData) {
        const remotePlayer = this.remotePlayers[playerData.id];
        
        if (remotePlayer) {
            const position = new paper.Point(playerData.position.x, playerData.position.y);
            remotePlayer.ship.setPositionAndRotation(position, playerData.direction);
            remotePlayer.lastUpdate = Date.now();
        }
    }
    
    // Удаление удаленного игрока
    removeRemotePlayer(playerId) {
        const remotePlayer = this.remotePlayers[playerId];
        
        if (remotePlayer) {
            console.log('Removing remote player:', playerId);
            remotePlayer.ship.remove();
            delete this.remotePlayers[playerId];
        }
    }
    
    // Удаление всех удаленных игроков
    clearRemotePlayers() {
        Object.keys(this.remotePlayers).forEach(id => {
            this.remotePlayers[id].ship.remove();
        });
        
        this.remotePlayers = {};
    }
    
    // Запуск периодической отправки обновлений позиции
    startUpdates() {
        this.stopUpdates(); // Остановка предыдущего интервала, если он был
        
        this.updateInterval = setInterval(() => {
            this.sendPositionUpdate();
        }, 50); // Отправка 20 раз в секунду
    }
    
    // Остановка отправки обновлений
    stopUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    // Отправка обновления позиции игрока на сервер
    sendPositionUpdate() {
        if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }
        
        // Получение текущей позиции корабля игрока
        const ship = this.gameState.ship;
        if (!ship) return;
        
        const position = ship.getPosition();
        const updateMessage = {
            type: 'update',
            position: {
                x: position.x,
                y: position.y
            },
            direction: ship.direction
        };
        
        this.socket.send(JSON.stringify(updateMessage));
    }
    
    // Проверка соединения и повторное подключение при необходимости
    checkConnection(url) {
        if (!this.connected && (!this.socket || this.socket.readyState === WebSocket.CLOSED)) {
            console.log('Attempting to reconnect...');
            this.connect(url);
        }
    }

    // Сброс ID игрока (для отладки или принудительного обновления ID)
    resetPlayerId() {
        localStorage.removeItem('playerId');
        this.playerId = null;
        console.log('Player ID has been reset. Reconnect to get a new ID.');
    }
    
    // Настройка комнаты/сессии (для будущих улучшений)
    setRoom(roomId) {
        localStorage.setItem('roomId', roomId);
        console.log(`Room set to: ${roomId}`);
        return roomId;
    }
    
    // Получение текущей комнаты/сессии
    getRoom() {
        return localStorage.getItem('roomId') || 'default';
    }
}

// Export the MultiplayerManager class for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MultiplayerManager };
} 