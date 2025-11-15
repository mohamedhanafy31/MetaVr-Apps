# PowerShell script to start all services for Unity Showcase with RAG integration
# Double-click this file or run: powershell -ExecutionPolicy Bypass -File start-all.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Unity Showcase - Starting All Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory (project root)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Check if conda is available
$condaAvailable = $false
try {
    $condaInfo = conda info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $condaAvailable = $true
        Write-Host "✓ Conda detected" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠ Conda not found, using system Python" -ForegroundColor Yellow
}

# Function to start a service in a new window
function Start-Service {
    param(
        [string]$Name,
        [string]$Command,
        [string]$WorkingDir,
        [string]$CondaEnv
    )
    
    Write-Host "Starting $Name..." -ForegroundColor Yellow
    
    $psCommand = ""
    if ($CondaEnv -and $condaAvailable) {
        $psCommand = "conda activate $CondaEnv; cd '$WorkingDir'; $Command"
    } else {
        $psCommand = "cd '$WorkingDir'; $Command"
    }
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $psCommand
    Start-Sleep -Seconds 2
    Write-Host "✓ $Name started" -ForegroundColor Green
}

# Start services
Write-Host "Starting services in separate windows..." -ForegroundColor Cyan
Write-Host ""

# 1. Gateway API (port 8000)
Start-Service -Name "Gateway API (Port 8000)" `
    -Command "python gateway_api.py" `
    -WorkingDir "$scriptDir\ai-backend"

# 2. RAG Backend (port 8001)
Start-Service -Name "RAG Backend (Port 8001)" `
    -Command "python main.py" `
    -WorkingDir "$scriptDir\ai-backend\E-commerce-Arabic-RAG"

# 3. TTS API (port 8002)
Start-Service -Name "TTS API (Port 8002)" `
    -Command "python run.py" `
    -WorkingDir "$scriptDir\ai-backend\TTS_API"

# 4. Frontend (Vite dev server)
Start-Service -Name "Frontend (Vite Dev Server)" `
    -Command "npm run dev" `
    -WorkingDir "$scriptDir\vite-project"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  All services started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services running:" -ForegroundColor Yellow
Write-Host "  • Gateway API:     http://localhost:8000" -ForegroundColor White
Write-Host "  • RAG Backend:      http://localhost:8001" -ForegroundColor White
Write-Host "  • TTS API:          http://localhost:8002" -ForegroundColor White
Write-Host "  • Frontend:         http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Each service is running in its own window." -ForegroundColor Cyan
Write-Host "Close the windows to stop the services." -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")



