@echo off
cd /d "%~dp0"

echo ==============================================================================
echo       HACKSYNC SPENDGUARD - MICRO EXPENSE TRACKER
echo ==============================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

if not exist node_modules (
    echo [INFO] Installing required dependencies...
    call npm install
)

echo [INFO] Server starting at http://localhost:3000
echo [INFO] Opening web browser...
echo.

start "" "http://localhost:3000"

node server.js

pause
