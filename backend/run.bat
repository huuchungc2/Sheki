@echo off
setlocal
set SSH_HOST=103.172.238.165
set SSH_PORT=2782
set SSH_USER=root
set SSH_PASSWORD=BeTrang@12345#
cd /d "%~dp0"
node server.js > server.log 2>&1
