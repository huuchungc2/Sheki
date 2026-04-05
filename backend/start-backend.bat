@echo off
echo ========================================
echo ERP Backend Server
echo ========================================
echo.
echo Khoi dong Backend...
cd /d "%~dp0"
set SSH_HOST=103.172.238.165
set SSH_PORT=2782
set SSH_USER=root
set SSH_PASSWORD=BeTrang@12345#
node server.js
pause
