@echo off
title Damoa Launcher
echo ==========================================
echo    Starting Damoa Services in Background
echo ==========================================
start /min powershell -WindowStyle Hidden -Command "Set-Location '%~dp0backend'; $env:PYTHONUTF8='1'; .\venv\Scripts\uvicorn main:app --host 127.0.0.1 --port 8000"
start /min powershell -WindowStyle Hidden -Command "Set-Location '%~dp0frontend'; npm run dev"
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo Damoa services are running!
