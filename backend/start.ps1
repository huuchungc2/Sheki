$env:SSH_HOST = "103.172.238.165"
$env:SSH_PORT = "2782"
$env:SSH_USER = "root"
$env:SSH_PASSWORD = "BeTrang@12345#"

Set-Location "D:\project\erp\backend"

Write-Host "Starting ERP Backend..."
Write-Host "SSH Host: $env:SSH_HOST`:$env:SSH_PORT"
Write-Host ""

node server.js
