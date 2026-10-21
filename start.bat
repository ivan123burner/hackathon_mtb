@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18+ is required. Install it from https://nodejs.org/
  pause
  exit /b 1
)

echo Starting Moby Family...
echo The QR on the page will use your local network address.
echo.
start "" cmd /c "timeout /t 2 >nul & start http://localhost:4173/"
node scripts\server.js
pause
