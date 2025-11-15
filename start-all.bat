@echo off
REM Batch file to start all services for Unity Showcase with RAG integration
REM Double-click this file to start all services

echo ========================================
echo   Unity Showcase - Starting All Services
echo ========================================
echo.

cd /d "%~dp0"

REM Start Gateway API (port 8000)
echo Starting Gateway API (Port 8000)...
start "Gateway API (Port 8000)" cmd /k "cd /d %~dp0ai-backend && python gateway_api.py"
timeout /t 2 /nobreak >nul

REM Start RAG Backend (port 8001)
echo Starting RAG Backend (Port 8001)...
start "RAG Backend (Port 8001)" cmd /k "cd /d %~dp0ai-backend\E-commerce-Arabic-RAG && python main.py"
timeout /t 2 /nobreak >nul

REM Start TTS API (port 8002)
echo Starting TTS API (Port 8002)...
start "TTS API (Port 8002)" cmd /k "cd /d %~dp0ai-backend\TTS_API && python run.py"
timeout /t 2 /nobreak >nul

REM Start Frontend (Vite dev server)
echo Starting Frontend (Vite Dev Server)...
start "Frontend (Vite Dev Server)" cmd /k "cd /d %~dp0vite-project && npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   All services started!
echo ========================================
echo.
echo Services running:
echo   Gateway API:     http://localhost:8000
echo   RAG Backend:      http://localhost:8001
echo   TTS API:          http://localhost:8002
echo   Frontend:         http://localhost:5173
echo.
echo Each service is running in its own window.
echo Close the windows to stop the services.
echo.
pause



