@echo off
title WebHealth - Cloud Dead Link Detection & Website Health Monitor
echo ================================================================
echo   WEBHEALTH: CLOUD DEAD LINK DETECTION & HEALTH MONITOR
echo              Cloud Distributed Implementation
echo ================================================================
echo Starting backend server and serving web dashboard...
cd /d "%~dp0\backend"
node src/server.js
pause
