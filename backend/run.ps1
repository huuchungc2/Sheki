$ErrorActionPreference = 'Stop'

$env:SSH_HOST = "103.172.238.165"
$env:SSH_PORT = "2782"
$env:SSH_USER = "root"
$env:SSH_PASSWORD = "BeTrang@12345#"

Set-Location "D:\project\erp\backend"

Write-Host "Starting ERP Backend..."
Write-Host "SSH: $env:SSH_HOST`:$env:SSH_PORT"

# Kill existing node processes on port 3000
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 1

# Start node in background
$process = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "D:\project\erp\backend" -PassThru

# Wait for startup
Start-Sleep -Seconds 5

# Test connection
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method Get -TimeoutSec 5
    Write-Host "✅ Server is running!"
    Write-Host "Health check: $($response.StatusCode)"
} catch {
    Write-Host "❌ Server may not be ready yet"
    Write-Host "Error: $_"
}

Write-Host ""
Write-Host "Server PID: $($process.Id)"
Write-Host "Press Ctrl+C to stop..."

# Keep process alive
while ($process -and !$process.HasExited) {
    Start-Sleep -Seconds 5
    
    # Periodic health check
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method Get -TimeoutSec 3 -ErrorAction SilentlyContinue
    } catch {
        Write-Host "⚠️ Server might be down, checking..."
    }
}
