const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Настройка Express и WebSocket сервера
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Статические файлы из директории public
app.use(express.static(path.join(__dirname, '../public')));

// Словарь игроков
const players = {};
// Словарь отключенных игроков (кэшируем для переподключения)
const disconnectedPlayers = {};
// Словарь комнат (roomId -> массив playerIds)
const rooms = {
    'default': [] // Создаем комнату по умолчанию
};

// Обработка WebSocket соединений
wss.on('connection', (ws) => {
    let playerId = null;
    let reconnected = false;
    let playerRoom = 'default'; // Комната по умолчанию
    
    // Обработка сообщений от клиента
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // Обработка запроса на присоединение/создание комнаты
            if (data.type === 'joinRoom' && data.roomId) {
                playerRoom = data.roomId;
                
                // Создаем комнату, если ее еще нет
                if (!rooms[playerRoom]) {
                    rooms[playerRoom] = [];
                    console.log(`New room created: ${playerRoom}`);
                }
                
                console.log(`Player ${playerId} joined room: ${playerRoom}`);
                
                // Отправляем подтверждение присоединения к комнате
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'roomJoined',
                        roomId: playerRoom
                    }));
                }
                
                // Добавляем игрока в комнату, если его еще нет в списке
                if (playerId && !rooms[playerRoom].includes(playerId)) {
                    rooms[playerRoom].push(playerId);
                }
                
                return;
            }
            
            // Проверка на сообщение о переподключении
            if (data.type === 'reconnect' && data.playerId) {
                // Проверяем, существует ли этот ID в словаре отключенных игроков
                if (disconnectedPlayers[data.playerId]) {
                    playerId = data.playerId;
                    reconnected = true;
                    
                    // Восстанавливаем данные игрока
                    const playerData = disconnectedPlayers[playerId];
                    delete disconnectedPlayers[playerId];
                    
                    // Используем комнату из данных, если она есть
                    if (data.roomId && rooms[data.roomId]) {
                        playerRoom = data.roomId;
                    }
                    
                    // Создаем новую запись игрока с тем же ID
                    players[playerId] = {
                        id: playerId,
                        ws: ws,
                        position: playerData.position || { x: Math.random() * 800, y: Math.random() * 600 },
                        direction: playerData.direction || 270,
                        shipType: playerData.shipType || (Math.random() > 0.5 ? 'spaceship.svg' : 'spaceship2.svg'),
                        room: playerRoom
                    };
                    
                    console.log(`Player reconnected: ${playerId} in room: ${playerRoom}`);
                    
                    // Добавляем игрока в комнату, если его еще нет в списке
                    if (!rooms[playerRoom].includes(playerId)) {
                        rooms[playerRoom].push(playerId);
                    }
                    
                    // Отправляем игроку его ID и информацию о текущих игроках В ЕГО КОМНАТЕ
                    const playersInRoom = rooms[playerRoom]
                        .filter(id => id !== playerId && players[id])
                        .map(id => ({
                            id: id,
                            position: players[id].position,
                            direction: players[id].direction,
                            shipType: players[id].shipType
                        }));
                    
                    const initMessage = {
                        type: 'init',
                        id: playerId,
                        roomId: playerRoom,
                        players: playersInRoom
                    };
                    ws.send(JSON.stringify(initMessage));
                    
                    // Оповещаем других игроков В ТОЙ ЖЕ КОМНАТЕ о переподключении игрока
                    const newPlayerMessage = {
                        type: 'newPlayer',
                        player: {
                            id: playerId,
                            position: players[playerId].position,
                            direction: players[playerId].direction,
                            shipType: players[playerId].shipType
                        }
                    };
                    
                    broadcastToRoom(JSON.stringify(newPlayerMessage), playerRoom, playerId);
                    return;
                }
            }
            
            // Если это первое сообщение и не было переподключения, назначаем ID
            if (!playerId && !reconnected) {
                // Назначаем ID игроку и отправляем подтверждение соединения
                playerId = uuidv4();
                console.log(`New player connected: ${playerId} in room: ${playerRoom}`);
                
                // Используем комнату из данных, если она есть
                if (data.roomId && typeof data.roomId === 'string') {
                    playerRoom = data.roomId;
                    
                    // Создаем комнату, если ее еще нет
                    if (!rooms[playerRoom]) {
                        rooms[playerRoom] = [];
                        console.log(`New room created: ${playerRoom}`);
                    }
                }
                
                // Сохраняем соединение и данные игрока
                players[playerId] = {
                    id: playerId,
                    ws: ws,
                    position: { x: Math.random() * 800, y: Math.random() * 600 },
                    direction: 270,
                    shipType: Math.random() > 0.5 ? 'spaceship.svg' : 'spaceship2.svg',
                    room: playerRoom
                };
                
                // Добавляем игрока в комнату
                if (!rooms[playerRoom].includes(playerId)) {
                    rooms[playerRoom].push(playerId);
                }
                
                // Отправляем игроку его ID и информацию о текущих игроках В ЕГО КОМНАТЕ
                const playersInRoom = rooms[playerRoom]
                    .filter(id => id !== playerId && players[id])
                    .map(id => ({
                        id: id,
                        position: players[id].position,
                        direction: players[id].direction,
                        shipType: players[id].shipType
                    }));
                
                const initMessage = {
                    type: 'init',
                    id: playerId,
                    roomId: playerRoom,
                    players: playersInRoom
                };
                ws.send(JSON.stringify(initMessage));
                
                // Оповещаем других игроков В ТОЙ ЖЕ КОМНАТЕ о новом игроке
                const newPlayerMessage = {
                    type: 'newPlayer',
                    player: {
                        id: playerId,
                        position: players[playerId].position,
                        direction: players[playerId].direction,
                        shipType: players[playerId].shipType
                    }
                };
                
                broadcastToRoom(JSON.stringify(newPlayerMessage), playerRoom, playerId);
            }
            
            // Обновление позиции и направления игрока
            if (data.type === 'update' && playerId) {
                if (players[playerId]) {
                    players[playerId].position = data.position;
                    players[playerId].direction = data.direction;
                    
                    // Рассылаем обновление всем остальным игрокам В ТОЙ ЖЕ КОМНАТЕ
                    const updateMessage = {
                        type: 'updatePlayer',
                        player: {
                            id: playerId,
                            position: data.position,
                            direction: data.direction
                        }
                    };
                    
                    broadcastToRoom(JSON.stringify(updateMessage), playerRoom, playerId);
                }
            }
        } catch (e) {
            console.error("Error processing message:", e);
        }
    });
    
    // Обработка отключения
    ws.on('close', () => {
        if (playerId) {
            console.log(`Player disconnected: ${playerId} from room: ${playerRoom}`);
            
            // Сохраняем данные игрока в словаре отключенных игроков
            if (players[playerId]) {
                disconnectedPlayers[playerId] = {
                    position: players[playerId].position,
                    direction: players[playerId].direction,
                    shipType: players[playerId].shipType,
                    room: playerRoom,
                    // Устанавливаем время отключения для возможной очистки кэша
                    disconnectTime: Date.now()
                };
                
                // Удаляем игрока из списка активных
                delete players[playerId];
                
                // Удаляем игрока из комнаты
                if (rooms[playerRoom]) {
                    const index = rooms[playerRoom].indexOf(playerId);
                    if (index !== -1) {
                        rooms[playerRoom].splice(index, 1);
                    }
                    
                    // Если комната пуста и это не комната по умолчанию, удаляем ее
                    if (rooms[playerRoom].length === 0 && playerRoom !== 'default') {
                        console.log(`Empty room removed: ${playerRoom}`);
                        delete rooms[playerRoom];
                    }
                }
                
                // Оповещаем других В ТОЙ ЖЕ КОМНАТЕ об отключении
                const disconnectMessage = {
                    type: 'playerDisconnect',
                    id: playerId
                };
                
                broadcastToRoom(JSON.stringify(disconnectMessage), playerRoom);
            }
        }
    });
});

// Функция для отправки сообщения всем клиентам
function broadcast(message) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Функция для отправки сообщения всем клиентам в определенной комнате
function broadcastToRoom(message, roomId, exceptId = null) {
    if (!rooms[roomId]) return;
    
    rooms[roomId].forEach(id => {
        if (id !== exceptId && players[id] && players[id].ws.readyState === WebSocket.OPEN) {
            players[id].ws.send(message);
        }
    });
}

// Функция для отправки сообщения всем, кроме указанного клиента
function broadcastExcept(message, exceptId) {
    Object.keys(players).forEach(id => {
        if (id !== exceptId && players[id].ws.readyState === WebSocket.OPEN) {
            players[id].ws.send(message);
        }
    });
}

// Периодическая очистка кэша отключенных игроков (убираем данные игроков, не подключавшихся более 1 часа)
setInterval(() => {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 час в миллисекундах
    
    Object.keys(disconnectedPlayers).forEach(id => {
        if (now - disconnectedPlayers[id].disconnectTime > maxAge) {
            console.log(`Removing cached player data: ${id}`);
            delete disconnectedPlayers[id];
        }
    });
}, 15 * 60 * 1000); // Проверяем каждые 15 минут

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 