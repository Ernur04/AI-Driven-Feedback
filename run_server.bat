@echo off
set PORT=3000

echo [1/4] Проверка порта %PORT%...
powershell -Command "$conn = Get-NetTCPConnection -LocalPort %PORT% -ErrorAction SilentlyContinue; if ($conn) { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo [2/4] Переход в директорию frontend...
cd /d "%~dp0frontend"

echo [3/4] Установка необходимых библиотек (express, cors)...
call npm.cmd install

echo [4/4] Запуск сервера...
echo.
echo    Сервер запущен! Откройте: http://localhost:3000/frontend/index.html
echo.
node js\server.js
pause