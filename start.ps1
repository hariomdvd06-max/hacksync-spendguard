# ==============================================================================
# HackSync SpendGuard - PowerShell Startup Script
# ==============================================================================

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "      ⚡ HACKSYNC SPENDGUARD - MICRO EXPENSE TRACKER (SUPABASE DB) ⚡" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Install dependencies if missing
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Installing required dependencies (npm install)..." -ForegroundColor Yellow
    npm install
}

# Open browser after 2 seconds
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:3000"
} | Out-Null

Write-Host "[INFO] Starting SpendGuard Express Backend Server..." -ForegroundColor Green
Write-Host "[INFO] URL: http://localhost:3000" -ForegroundColor Cyan
Write-Host "[INFO] Press Ctrl+C to stop the server." -ForegroundColor Gray
Write-Host ""

npm start
