#!/bin/bash

# Сначала собираем клиентскую часть
echo "Building client-side bundle..."
npm run build

# Создаем архив для деплоя, исключая ненужные файлы
echo "Creating deployment package..."
tar -czf deploy_mp.tar.gz --exclude='.git' --exclude='*.zip' --exclude='deploy*.sh' --exclude='*.tar.gz' --exclude='node_modules' .

# Загружаем архив на сервер
echo "Uploading to server..."
scp -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no deploy_mp.tar.gz root@77.222.60.74:/root/

# Выполняем команды на сервере для установки и запуска игры
echo "Deploying on the server..."
ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no root@77.222.60.74 << 'EOF'
  # Создаем директорию для игры, если ее нет
  mkdir -p /var/www/space-aschii
  
  # Распаковываем файлы
  tar -xzf /root/deploy_mp.tar.gz -C /var/www/space-aschii
  
  # Создаем директории для ассетов, если их нет
  mkdir -p /var/www/space-aschii/assets/ships
  mkdir -p /var/www/space-aschii/assets/asteroids
  
  # Устанавливаем права на файлы
  chown -R www-data:www-data /var/www/space-aschii
  chmod -R 755 /var/www/space-aschii
  
  # Переходим в директорию игры
  cd /var/www/space-aschii
  
  # Устанавливаем зависимости
  npm install
  
  # Останавливаем текущий процесс сервера, если он запущен
  pm2 stop space-aschii || true
  
  # Запускаем сервер с помощью PM2
  pm2 start server.js --name space-aschii || pm2 restart space-aschii
  
  # Убеждаемся, что PM2 сохраняет процесс для автозапуска
  pm2 save
  
  # Настраиваем Nginx для проксирования WebSocket соединений
  cat > /etc/nginx/sites-available/space-aschii << 'NGINX'
server {
    listen 80;
    server_name _;

    root /var/www/space-aschii;
    index index.html;
    
    # Включаем MIME типы для всего сервера
    include /etc/nginx/mime.types;
    
    # Явно задаем MIME тип для HTML
    types {
        text/html               html htm shtml;
        image/svg+xml           svg svgz;
    }
    
    # Принудительно устанавливаем MIME тип для preview.html
    location = /assets/preview.html {
        default_type text/html;
        add_header Content-Type text/html;
    }

    # Разрешаем просмотр содержимого директорий с ассетами
    location /assets/ {
        autoindex on;
        default_type text/html;
    }

    # Основной маршрут для статических файлов
    location / {
        try_files $uri $uri/ =404;
    }
    
    # Проксирование WebSocket соединений на порт 3000
    location /ws/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
    
    # Разрешаем CORS для всех запросов
    add_header Access-Control-Allow-Origin "*";
}
NGINX
  
  # Проверяем конфигурацию Nginx
  nginx -t
  
  # Перезапускаем Nginx
  systemctl restart nginx
  
  echo "Multiplayer server deployment complete!"
  echo "Game is available at: http://77.222.60.74"
  echo "Server is running on port 3000 with PM2"
EOF

# Очищаем локальный архив
rm deploy_mp.tar.gz

echo "Deployment process completed!"
echo "Main game: http://77.222.60.74"
echo "Multiplayer server is running on: ws://77.222.60.74:3000" 